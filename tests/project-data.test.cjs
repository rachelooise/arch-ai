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
  currentUser: async () => ({ emailAddresses: emails }),
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

const { getProjectLists, getAccessibleProject } = require("../lib/projects.ts");

beforeEach(() => {
  userId = "user-owner";
  queries = [];
  emails = [
    { emailAddress: "Verified@example.com", verification: { status: "verified" } },
    { emailAddress: "unverified@example.com", verification: { status: "unverified" } },
  ];
});

test("server helper loads separate owned/shared lists using only verified emails", async () => {
  const result = await getProjectLists();
  assert.deepEqual(result.ownedProjects, [{ id: "owned", name: "Project", owned: true }]);
  assert.deepEqual(result.sharedProjects, [{ id: "shared", name: "Project", owned: false }]);
  assert.deepEqual(queries[0].where, { ownerId: userId });
  assert.deepEqual(queries[1].where, {
    ownerId: { not: userId },
    collaborators: { some: { email: { in: ["Verified@example.com"], mode: "insensitive" } } },
  });
  for (const query of queries) {
    assert.deepEqual(query.select, { id: true, name: true });
    assert.deepEqual(query.orderBy, { createdAt: "desc" });
  }
});

test("workspace queries require ownership or a verified collaborator email", async () => {
  assert.equal(await getAccessibleProject("target"), null);
  assert.deepEqual(queries[0].where, {
    id: "target",
    OR: [
      { ownerId: userId },
      { collaborators: { some: { email: { in: ["Verified@example.com"], mode: "insensitive" } } } },
    ],
  });
});

test("signed-out server requests redirect before querying project data", async () => {
  userId = null;
  await assert.rejects(getProjectLists(), /redirect:\/sign-in/);
  await assert.rejects(getAccessibleProject("target"), /redirect:\/sign-in/);
  assert.deepEqual(queries, []);
});
