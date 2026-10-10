/* eslint-disable @typescript-eslint/no-require-imports -- Exercise TypeScript modules with the project's tsx loader. */
const assert = require("node:assert/strict");
const { beforeEach, afterEach, test } = require("node:test");
const { mutateProject } = require("../lib/project-actions.ts");
const { projectRoomId, isProjectRoomId } = require("../lib/project-room.ts");

const originalFetch = global.fetch;
let requests;
let navigation;
let response;
const project = { id: "workspace-012345abcd", name: "Original", owned: true };
const router = {
  push: (path) => navigation.push(["push", path]),
  replace: (path) => navigation.push(["replace", path]),
  refresh: () => navigation.push(["refresh"]),
};

beforeEach(() => {
  requests = [];
  navigation = [];
  response = Response.json({ id: project.id });
  global.fetch = async (url, options) => {
    requests.push({ url, ...options });
    return response;
  };
});
afterEach(() => { global.fetch = originalFetch; });

test("room IDs slugify names, retain the suffix, and support non-Latin names", () => {
  assert.equal(projectRoomId("  Café: My System!  ", "012345abcd"), "cafe-my-system-012345abcd");
  assert.equal(projectRoomId("系统", "012345abcd"), "untitled-project-012345abcd");
  assert.ok(isProjectRoomId(projectRoomId("a".repeat(300), "012345abcd")));
});

test("create sends the previewed room ID and navigates to that workspace", async () => {
  await mutateProject({ type: "create" }, " New workspace ", project.id, "/editor", router);
  assert.equal(requests[0].url, "/api/projects");
  assert.equal(requests[0].method, "POST");
  assert.deepEqual(JSON.parse(requests[0].body), { name: "New workspace", roomId: project.id });
  assert.deepEqual(navigation, [["push", `/editor/${project.id}`], ["refresh"]]);
});

test("rename changes only the name and refreshes without changing the workspace ID", async () => {
  await mutateProject({ type: "rename", project }, " Renamed ", "", `/editor/${project.id}`, router);
  assert.equal(requests[0].url, `/api/projects/${project.id}`);
  assert.equal(requests[0].method, "PATCH");
  assert.deepEqual(JSON.parse(requests[0].body), { name: "Renamed" });
  assert.deepEqual(navigation, [["refresh"]]);
});

test("deleting the active workspace redirects home and refreshes", async () => {
  response = new Response(null, { status: 204 });
  await mutateProject({ type: "delete", project }, "", "", `/editor/${project.id}`, router);
  assert.equal(requests[0].method, "DELETE");
  assert.equal(requests[0].body, undefined);
  assert.deepEqual(navigation, [["replace", "/editor"], ["refresh"]]);
});

test("deleting another workspace refreshes without redirecting", async () => {
  response = new Response(null, { status: 204 });
  await mutateProject({ type: "delete", project }, "", "", "/editor/another-project", router);
  assert.deepEqual(navigation, [["refresh"]]);
});

for (const status of [401, 403, 409, 500]) {
  test(`API failure ${status} surfaces the error without navigating`, async () => {
    response = Response.json({ error: "Operation failed" }, { status });
    await assert.rejects(mutateProject({ type: "create" }, "New", project.id, "/editor", router), /Operation failed/);
    assert.deepEqual(navigation, []);
  });
}

test("network failures leave navigation unchanged", async () => {
  global.fetch = async () => { throw new Error("Network unavailable"); };
  await assert.rejects(mutateProject({ type: "rename", project }, "New", "", "/editor", router), /Network unavailable/);
  assert.deepEqual(navigation, []);
});

test("create refuses navigation when the returned ID differs from the preview", async () => {
  response = Response.json({ id: "different" });
  await assert.rejects(mutateProject({ type: "create" }, "New", project.id, "/editor", router), /did not match/);
  assert.deepEqual(navigation, []);
});
