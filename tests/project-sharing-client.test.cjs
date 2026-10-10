/* eslint-disable @typescript-eslint/no-require-imports -- Exercise client request helpers using the project's tsx loader. */
const assert = require("node:assert/strict");
const { beforeEach, afterEach, test } = require("node:test");
const { fetchProjectSharing, inviteProjectCollaborator, removeProjectCollaborator, copyProjectLink } = require("../lib/project-sharing.ts");

const originalFetch = global.fetch;
const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
let requests;
let response;
beforeEach(() => {
  requests = [];
  response = Response.json({ isOwner: false, collaborators: [] });
  global.fetch = async (url, options) => { requests.push({ url, ...options }); return response.clone(); };
});
afterEach(() => {
  global.fetch = originalFetch;
  if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
  else delete globalThis.navigator;
  if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
  else delete globalThis.window;
});

test("share list requests avoid caching and preserve the server's read-only role", async () => {
  assert.deepEqual(await fetchProjectSharing("room"), { isOwner: false, collaborators: [] });
  assert.equal(requests[0].url, "/api/projects/room/collaborators");
  assert.equal(requests[0].cache, "no-store");
});

test("invite and remove call the project's collaborator endpoints", async () => {
  await inviteProjectCollaborator("room", " person@example.com ");
  response = new Response(null, { status: 204 });
  await removeProjectCollaborator("room", "person");
  assert.equal(requests[0].method, "POST");
  assert.deepEqual(JSON.parse(requests[0].body), { email: "person@example.com" });
  assert.equal(requests[1].url, "/api/projects/room/collaborators/person");
  assert.equal(requests[1].method, "DELETE");
});

test("server errors surface without being treated as successful mutations", async () => {
  response = Response.json({ error: "Forbidden" }, { status: 403 });
  await assert.rejects(inviteProjectCollaborator("room", "person@example.com"), /Forbidden/);
  await assert.rejects(removeProjectCollaborator("room", "person"), /Forbidden/);
});

test("copy writes the current origin and canonical room link", async () => {
  let copied;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { origin: "https://arch.example" } } });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { clipboard: { writeText: async (value) => { copied = value; } } } });
  await copyProjectLink("room-012345abcd");
  assert.equal(copied, "https://arch.example/editor/room-012345abcd");
});

test("clipboard failures reject instead of reporting a successful copy", async () => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { origin: "https://arch.example" } } });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { clipboard: { writeText: async () => { throw new Error("Clipboard denied"); } } } });
  await assert.rejects(copyProjectLink("room"), /Clipboard denied/);
});
