/* eslint-disable @typescript-eslint/no-require-imports -- Isolate server-only dependencies through the CommonJS module cache. */
const assert = require("node:assert/strict");
const { beforeEach, test } = require("node:test");
const { Module } = require("node:module");

let userId;
let emails;
let queries;

function replaceModule(name, exports) {
  const path = require.resolve(name);
  const stubModule = new Module(path);
  stubModule.exports = exports;
  stubModule.loaded = true;
  require.cache[path] = stubModule;
}

replaceModule("server-only", {});
replaceModule("@clerk/nextjs/server", {
  auth: async () => ({ userId }),
  currentUser: async () => ({ primaryEmailAddressId: "primary", emailAddresses: emails }),
});
replaceModule("next/navigation", {
  redirect: (path) => { throw new Error(`redirect:${path}`); },
});
replaceModule("../lib/prisma.ts", {
  prisma: { project: {
    findMany: async (query) => {
      queries.push(query);
      return [{ id: query.where.ownerId === userId ? "owned" : "shared", name: "Project" }];
    },
    findFirst: async (query) => { queries.push(query); return null; },
  } },
});

const { getProjectLists } = require("../lib/projects.ts");
const { getProjectAccess } = require("../lib/project-access.ts");

beforeEach(() => {
  userId = "user-owner";
  queries = [];
  emails = [
    { id: "primary", emailAddress: "Primary@example.com", verification: { status: "verified" } },
    { id: "secondary", emailAddress: "secondary@example.com", verification: { status: "verified" } },
  ];
});

test("server helper loads separate owned/shared lists using the primary email", async () => {
  const result = await getProjectLists();
  assert.deepEqual(result.ownedProjects, [{ id: "owned", name: "Project", owned: true }]);
  assert.deepEqual(result.sharedProjects, [{ id: "shared", name: "Project", owned: false }]);
  assert.deepEqual(queries[0].where, { ownerId: userId });
  assert.deepEqual(queries[1].where, {
    ownerId: { not: userId },
    collaborators: { some: { email: { equals: "Primary@example.com", mode: "insensitive" } } },
  });
  for (const query of queries) {
    assert.deepEqual(query.select, { id: true, name: true });
    assert.deepEqual(query.orderBy, { createdAt: "desc" });
  }
});

test("workspace queries require ownership or the primary collaborator email", async () => {
  assert.equal(await getProjectAccess("target"), null);
  assert.deepEqual(queries[0].where, {
    id: "target",
    OR: [
      { ownerId: userId },
      { collaborators: { some: { email: { equals: "Primary@example.com", mode: "insensitive" } } } },
    ],
  });
});

test("signed-out server requests redirect before querying project data", async () => {
  userId = null;
  await assert.rejects(getProjectLists(), /redirect:\/sign-in/);
  await assert.rejects(getProjectAccess("target"), /redirect:\/sign-in/);
  assert.deepEqual(queries, []);
});

test("users without a primary email still load owned projects but no shared list", async () => {
  emails = [];
  const result = await getProjectLists();
  assert.deepEqual(result.sharedProjects, []);
  assert.equal(queries.length, 1);
  await getProjectAccess("target");
  assert.deepEqual(queries[1].where.OR, [{ ownerId: userId }]);
});
