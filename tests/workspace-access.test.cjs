/* eslint-disable @typescript-eslint/no-require-imports -- Isolate server-side access dependencies with the project's tsx loader. */
const assert = require("node:assert/strict");
const { beforeEach, test } = require("node:test");
const { Module } = require("node:module");
const { renderToStaticMarkup } = require("react-dom/server");

let userId;
let user;
let queryCount;
const records = [
  { id: "owned", name: "Owned project", ownerId: "user-owner", collaborators: [] },
  { id: "shared", name: "Shared project", ownerId: "user-other", collaborators: ["PRIMARY@example.com"] },
  { id: "secondary", name: "Secondary-only project", ownerId: "user-other", collaborators: ["secondary@example.com"] },
  { id: "private", name: "Private project", ownerId: "user-other", collaborators: [] },
];

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
  currentUser: async () => user,
});
replaceModule("next/navigation", {
  redirect: (path) => { throw new Error(`redirect:${path}`); },
});
replaceModule("../lib/prisma.ts", {
  prisma: { project: { findFirst: async ({ where }) => {
    queryCount++;
    const project = records.find((record) => record.id === where.id);
    if (!project) return null;
    const allowed = where.OR.some((rule) => rule.ownerId
      ? project.ownerId === rule.ownerId
      : project.collaborators.some((email) => email.toLowerCase() === rule.collaborators.some.email.equals.toLowerCase()));
    return allowed ? { id: project.id, name: project.name } : null;
  } } },
});

const { getCurrentProjectIdentity, getProjectAccess } = require("../lib/project-access.ts");
const WorkspacePage = require("../app/editor/[roomId]/page.tsx").default;

async function workspaceMarkup(roomId) {
  const page = WorkspacePage({ params: Promise.resolve({ roomId }) });
  const workspace = page.props.children;
  return renderToStaticMarkup(await workspace.type(workspace.props));
}

beforeEach(() => {
  userId = "user-owner";
  queryCount = 0;
  user = {
    primaryEmailAddressId: "primary",
    emailAddresses: [
      { id: "primary", emailAddress: "primary@example.com" },
      { id: "secondary", emailAddress: "secondary@example.com" },
    ],
  };
});

test("identity returns Clerk user ID and primary email, never a secondary email", async () => {
  assert.deepEqual(await getCurrentProjectIdentity(), { userId, primaryEmail: "primary@example.com" });
});

test("identity supports Clerk's primaryEmailAddress property", async () => {
  user = { primaryEmailAddress: { emailAddress: "primary@example.com" } };
  assert.deepEqual(await getCurrentProjectIdentity(), { userId, primaryEmail: "primary@example.com" });
});

test("owners can access their workspace", async () => {
  assert.deepEqual(await getProjectAccess("owned"), { id: "owned", name: "Owned project" });
});

test("collaborators can access a workspace by primary email case-insensitively", async () => {
  assert.deepEqual(await getProjectAccess("shared"), { id: "shared", name: "Shared project" });
});

test("secondary emails do not grant workspace access", async () => {
  assert.equal(await getProjectAccess("secondary"), null);
});

test("owners retain access with no primary email", async () => {
  user = null;
  assert.deepEqual(await getProjectAccess("owned"), { id: "owned", name: "Owned project" });
  assert.equal(await getProjectAccess("shared"), null);
});

test("signed-out workspace requests redirect before querying the database", async () => {
  userId = null;
  await assert.rejects(workspaceMarkup("owned"), /redirect:\/sign-in/);
  assert.equal(queryCount, 0);
});

test("missing and unauthorized workspaces render the same AccessDenied view", async () => {
  const missing = await workspaceMarkup("missing");
  const unauthorized = await workspaceMarkup("private");
  assert.equal(missing, unauthorized);
  assert.match(missing, /Access denied/);
  assert.match(missing, /href="\/editor"/);
  assert.doesNotMatch(missing, /Private project|data-room-id|architecture canvas/);
});

test("authorized workspace renders the canvas placeholder with the aligned room ID", async () => {
  const markup = await workspaceMarkup("shared");
  assert.match(markup, /data-room-id="shared"/);
  assert.match(markup, /aria-label="Shared project canvas"/);
  assert.match(markup, /Canvas tools are coming soon/);
  assert.doesNotMatch(markup, /Access denied/);
});
