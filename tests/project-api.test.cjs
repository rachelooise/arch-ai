/* eslint-disable @typescript-eslint/no-require-imports -- Isolate route dependencies through the CommonJS module cache. */
const assert = require("node:assert/strict");
const { beforeEach, test } = require("node:test");
const { Module } = require("node:module");

let userId;
let mutationError;
let nextId;
const projects = new Map();
const writes = [];

function replaceModule(name, exports) {
  const path = require.resolve(name);
  const stubModule = new Module(path);
  stubModule.exports = exports;
  stubModule.loaded = true;
  require.cache[path] = stubModule;
}

replaceModule("@clerk/nextjs/server", {
  auth: async () => ({ userId }),
});
replaceModule("../lib/prisma.ts", {
  prisma: {
    project: {
      async findMany({ where, orderBy }) {
        assert.deepEqual(where, { ownerId: userId });
        assert.deepEqual(orderBy, { createdAt: "desc" });
        return [...projects.values()].filter((p) => p.ownerId === where.ownerId);
      },
      async findUnique({ where }) {
        return projects.get(where.id) ?? null;
      },
      async create({ data }) {
        writes.push({ operation: "create", data });
        if (mutationError) throw mutationError;
        const project = { id: `generated-${nextId++}`, ...data };
        projects.set(project.id, project);
        return project;
      },
      async update({ where, data }) {
        writes.push({ operation: "update", where, data });
        if (mutationError) throw mutationError;
        const project = projects.get(where.id);
        assert.equal(project.ownerId, where.ownerId);
        Object.assign(project, data);
        return project;
      },
      async delete({ where }) {
        writes.push({ operation: "delete", where });
        if (mutationError) throw mutationError;
        assert.equal(projects.get(where.id).ownerId, where.ownerId);
        projects.delete(where.id);
      },
    },
  },
});

const { GET, POST } = require("../app/api/projects/route.ts");
const { PATCH, DELETE } = require("../app/api/projects/[projectId]/route.ts");
const { Prisma } = require("../generated/prisma/client.ts");

function request(method, body) {
  return new Request("http://localhost/api/projects/owned", {
    method,
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
}

const context = (projectId = "owned") => ({ params: Promise.resolve({ projectId }) });

beforeEach(() => {
  userId = "user-owner";
  mutationError = undefined;
  nextId = 1;
  writes.length = 0;
  projects.clear();
  projects.set("owned", { id: "owned", ownerId: userId, name: "Original" });
  projects.set("other", { id: "other", ownerId: "user-other", name: "Private" });
});

for (const [method, invoke] of [
  ["GET", () => GET()],
  ["POST", () => POST(request("POST", {}))],
  ["PATCH", () => PATCH(request("PATCH", { name: "Changed" }), context())],
  ["DELETE", () => DELETE(request("DELETE"), context())],
]) {
  test(`${method} rejects unauthenticated requests with 401`, async () => {
    userId = null;
    const response = await invoke();
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized" });
    assert.equal(writes.length, 0);
  });
}

test("GET lists only projects owned by the authenticated user", async () => {
  const response = await GET();
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).map((p) => p.id), ["owned"]);
});

for (const body of [undefined, {}]) {
  test(`POST defaults a missing name (${body === undefined ? "empty body" : "empty object"})`, async () => {
    const response = await POST(request("POST", body));
    assert.equal(response.status, 201);
    const project = await response.json();
    assert.equal(project.name, "Untitled Project");
    assert.equal(project.ownerId, userId);
    assert.equal(project.id, "generated-1");
    assert.ok(!("id" in writes[0].data));
  });
}

test("POST uses Clerk ownership and ignores client-supplied IDs and extra fields", async () => {
  const response = await POST(request("POST", {
    id: "spoofed", ownerId: "user-other", name: "  New project  ", status: "ARCHIVED",
  }));
  assert.equal(response.status, 201);
  assert.deepEqual(writes[0].data, { ownerId: userId, name: "New project" });
});

for (const body of ["{", "null", "[]", { name: 123 }, { name: "   " }]) {
  test(`POST rejects invalid input: ${JSON.stringify(body)}`, async () => {
    assert.equal((await POST(request("POST", body))).status, 400);
    assert.equal(writes.length, 0);
  });
}

for (const [method, handler] of [["PATCH", PATCH], ["DELETE", DELETE]]) {
  test(`${method} rejects non-owners with 403 without mutating`, async () => {
    const response = await handler(request(method, { name: "Changed" }), context("other"));
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "Forbidden" });
    assert.equal(writes.length, 0);
    assert.equal(projects.get("other").name, "Private");
  });

  test(`${method} returns 404 for a missing project`, async () => {
    assert.equal((await handler(request(method, { name: "Changed" }), context("missing"))).status, 404);
    assert.equal(writes.length, 0);
  });

  test(`${method} returns 404 if the project disappears before mutation`, async () => {
    mutationError = new Prisma.PrismaClientKnownRequestError("Missing", {
      code: "P2025", clientVersion: "7.10.0",
    });
    assert.equal((await handler(request(method, { name: "Changed" }), context())).status, 404);
  });
}

test("PATCH renames an owned project without changing ownership or other fields", async () => {
  const response = await PATCH(request("PATCH", {
    name: "  Renamed  ", ownerId: "user-other", status: "ARCHIVED",
  }), context());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).name, "Renamed");
  assert.deepEqual(writes[0], {
    operation: "update", where: { id: "owned", ownerId: userId }, data: { name: "Renamed" },
  });
});

for (const body of [undefined, {}, "{", { name: null }, { name: "" }]) {
  test(`PATCH rejects a missing or invalid name: ${JSON.stringify(body)}`, async () => {
    assert.equal((await PATCH(request("PATCH", body), context())).status, 400);
    assert.equal(writes.length, 0);
    assert.equal(projects.get("owned").name, "Original");
  });
}

test("DELETE removes an owned project and returns an empty 204 response", async () => {
  const response = await DELETE(request("DELETE"), context());
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  assert.ok(!projects.has("owned"));
  assert.ok(projects.has("other"));
  assert.deepEqual(writes[0].where, { id: "owned", ownerId: userId });
});

test("POST stores the requested room ID as the project ID", async () => {
  const roomId = "new-workspace-012345abcd";
  const response = await POST(request("POST", { name: "New workspace", roomId }));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).id, roomId);
  assert.deepEqual(writes[0].data, { id: roomId, ownerId: userId, name: "New workspace" });
});

for (const roomId of ["../escape", "", "no-suffix", "bad-ABCDEF0123", null, 42]) {
  test(`POST rejects an invalid room ID: ${JSON.stringify(roomId)}`, async () => {
    assert.equal((await POST(request("POST", { name: "Workspace", roomId }))).status, 400);
    assert.equal(writes.length, 0);
  });
}

test("POST returns 409 on an ID collision instead of overwriting another project", async () => {
  mutationError = new Prisma.PrismaClientKnownRequestError("Duplicate", {
    code: "P2002", clientVersion: "7.10.0",
  });
  const response = await POST(request("POST", { name: "Workspace", roomId: "workspace-012345abcd" }));
  assert.equal(response.status, 409);
  assert.equal(projects.get("other").name, "Private");
});
