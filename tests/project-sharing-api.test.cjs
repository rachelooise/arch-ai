/* eslint-disable @typescript-eslint/no-require-imports -- Isolate Clerk/database boundaries for sharing authorization tests. */
const assert = require("node:assert/strict");
const { beforeEach, test } = require("node:test");
const { Module } = require("node:module");

let userId;
let userEmail;
let rows;
let writes;
let listReads;
let clerkQueries;
let clerkFailure;
let createError;

function replaceModule(name, exports) {
  const path = require.resolve(name);
  const stubModule = new Module(path);
  stubModule.exports = exports;
  stubModule.loaded = true;
  require.cache[path] = stubModule;
}

replaceModule("server-only", {});
replaceModule("next/navigation", { redirect() { throw new Error("Unexpected redirect"); } });
replaceModule("@clerk/nextjs/server", {
  auth: async () => ({ userId }),
  currentUser: async () => ({ primaryEmailAddress: { emailAddress: userEmail } }),
  clerkClient: async () => ({ users: { getUserList: async (query) => {
    clerkQueries.push(query);
    if (clerkFailure) throw new Error("Clerk unavailable");
    const known = [{ fullName: "Known Person", firstName: "Known", lastName: "Person", username: null,
      imageUrl: "https://img.clerk.com/known.png", emailAddresses: [{ emailAddress: "KNOWN@example.com" }] }];
    return { data: known.filter((user) => query.emailAddress.includes(user.emailAddresses[0].emailAddress.toLowerCase())), totalCount: 1 };
  } } }),
});

replaceModule("../lib/prisma.ts", {
  prisma: {
    project: {
      findUnique: async ({ where }) => where.id === "project" ? { ownerId: "owner" } : null,
      findFirst: async ({ where }) => {
        if (where.id !== "project") return null;
        return where.OR.some((rule) => rule.ownerId ? rule.ownerId === "owner"
          : rows.some((row) => row.projectId === where.id && row.email.toLowerCase() === rule.collaborators.some.email.equals.toLowerCase()))
          ? { id: "project", name: "Project" } : null;
      },
    },
    projectCollaborator: {
      findMany: async ({ where }) => { listReads++; return rows.filter((row) => row.projectId === where.projectId).map(({ id, email }) => ({ id, email })); },
      findFirst: async ({ where }) => rows.find((row) => row.projectId === where.projectId && row.email.toLowerCase() === where.email.equals.toLowerCase()) ?? null,
      create: async ({ data }) => {
        if (createError) throw createError;
        writes.push(data);
        const row = { id: "new", ...data };
        rows.push(row);
        return { id: row.id, email: row.email };
      },
      deleteMany: async ({ where }) => {
        assert.equal(where.project.ownerId, "owner");
        const row = rows.find((entry) => entry.id === where.id && entry.projectId === where.projectId);
        if (!row) return { count: 0 };
        rows = rows.filter((entry) => entry !== row);
        writes.push(where);
        return { count: 1 };
      },
    },
  },
});

const { GET, POST } = require("../app/api/projects/[projectId]/collaborators/route.ts");
const { DELETE } = require("../app/api/projects/[projectId]/collaborators/[collaboratorId]/route.ts");
const { Prisma } = require("../generated/prisma/client.ts");
const context = (projectId = "project", collaboratorId = "known") => ({ params: Promise.resolve({ projectId, collaboratorId }) });
function request(method, body) {
  return new Request("http://localhost/api/projects/project/collaborators", {
    method, ...(body === undefined || method === "GET" ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
}

beforeEach(() => {
  userId = "owner";
  userEmail = "owner@example.com";
  rows = [
    { id: "known", projectId: "project", email: "known@example.com" },
    { id: "unknown", projectId: "project", email: "unknown@example.com" },
    { id: "foreign", projectId: "other-project", email: "foreign@example.com" },
  ];
  writes = [];
  listReads = 0;
  clerkQueries = [];
  clerkFailure = false;
  createError = null;
});

for (const [method, handler] of [["GET", GET], ["POST", POST], ["DELETE", DELETE]]) {
  test(`${method} sharing rejects signed-out users without reading collaborator data`, async () => {
    userId = null;
    assert.equal((await handler(request(method, { email: "new@example.com" }), context())).status, 401);
    assert.equal(listReads, 0);
    assert.deepEqual(writes, []);
    assert.deepEqual(clerkQueries, []);
  });
  test(`${method} sharing rejects unrelated users`, async () => {
    userId = "outsider";
    userEmail = "outsider@example.com";
    assert.equal((await handler(request(method, { email: "new@example.com" }), context())).status, 403);
    assert.equal(listReads, 0);
    assert.deepEqual(writes, []);
    assert.deepEqual(clerkQueries, []);
  });
  test(`${method} sharing returns 404 for a missing project`, async () => {
    assert.equal((await handler(request(method, { email: "new@example.com" }), context("missing"))).status, 404);
  });
}

test("owners list collaborators with Clerk names/avatars and email-only fallbacks", async () => {
  const response = await GET(request("GET"), context());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await response.json(), { isOwner: true, collaborators: [
    { id: "known", email: "known@example.com", displayName: "Known Person", imageUrl: "https://img.clerk.com/known.png" },
    { id: "unknown", email: "unknown@example.com", displayName: null, imageUrl: null },
  ] });
  assert.deepEqual(clerkQueries[0].emailAddress, ["known@example.com", "unknown@example.com"]);
});

test("collaborators can list but cannot invite or remove, even with a forged owner flag", async () => {
  userId = "collaborator";
  userEmail = "KNOWN@example.com";
  const response = await GET(request("GET"), context());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).isOwner, false);
  assert.equal((await POST(request("POST", { email: "new@example.com", isOwner: true }), context())).status, 403);
  assert.equal((await DELETE(request("DELETE"), context())).status, 403);
  assert.deepEqual(writes, []);
});

test("Clerk lookup failures preserve the email list", async () => {
  clerkFailure = true;
  const response = await GET(request("GET"), context());
  assert.equal(response.status, 200);
  for (const row of (await response.json()).collaborators) {
    assert.equal(row.displayName, null);
    assert.equal(row.imageUrl, null);
  }
});

test("owners invite normalized emails scoped to the route's project", async () => {
  const response = await POST(request("POST", { email: " New@Example.COM ", projectId: "other-project" }), context());
  assert.equal(response.status, 201);
  assert.deepEqual(writes, [{ projectId: "project", email: "new@example.com" }]);
});

for (const body of ["{", "null", {}, { email: 42 }, { email: "invalid" }, { email: "a b@example.com" }]) {
  test(`invite rejects invalid email input: ${JSON.stringify(body)}`, async () => {
    assert.equal((await POST(request("POST", body), context())).status, 400);
    assert.deepEqual(writes, []);
  });
}

test("case-insensitive duplicate invitations return 409", async () => {
  const response = await POST(request("POST", { email: "KNOWN@example.com" }), context());
  assert.equal(response.status, 409);
  assert.deepEqual(writes, []);
});

test("concurrent duplicate invitations return 409", async () => {
  createError = new Prisma.PrismaClientKnownRequestError("Duplicate", { code: "P2002", clientVersion: "7.10.0" });
  assert.equal((await POST(request("POST", { email: "new@example.com" }), context())).status, 409);
});

test("owners remove a collaborator and access is immediately revoked", async () => {
  assert.equal((await DELETE(request("DELETE"), context())).status, 204);
  assert.ok(!rows.some((row) => row.id === "known"));
  userId = "collaborator";
  userEmail = "known@example.com";
  assert.equal((await GET(request("GET"), context())).status, 403);
});

test("removal cannot target a collaborator in another project", async () => {
  assert.equal((await DELETE(request("DELETE"), context("project", "foreign"))).status, 404);
  assert.ok(rows.some((row) => row.id === "foreign"));
  assert.deepEqual(writes, []);
});
