/* eslint-disable @typescript-eslint/no-require-imports -- Isolate storage and authorization boundaries. */
const assert = require("node:assert/strict");
const { test, beforeEach } = require("node:test");
const { Module } = require("node:module");
function replace(name, exports) {
  const path = require.resolve(name), stub = new Module(path);
  Object.assign(stub, { exports, loaded: true }); require.cache[path] = stub;
}
let denied, url, updates, reads, uploads, deletes, failUpload, failUpdate, stored;
replace("../lib/project-collaborators.ts", { authorizeProjectSharing: async () => denied || { userId: "owner" } });
replace("../lib/prisma.ts", { prisma: { project: {
  findUnique: async () => ({ canvasJsonPath: url }),
  update: async (query) => { if (failUpdate) throw new Error("database"); updates.push(query); },
} } });
replace("@vercel/blob", {
  get: async (path, options) => { reads.push({ path, options }); return { statusCode: 200, stream: new Response(JSON.stringify(stored)).body }; },
  put: async (path, body, options) => { if (failUpload) throw new Error(typeof failUpload === "string" ? failUpload : "upload"); uploads.push({ path, body, options }); return { url: "https://blob/new" }; },
  del: async (path) => { deletes.push(path); },
});
const { GET, PUT } = require("../app/api/projects/[projectId]/canvas/route.ts");
const context = { params: Promise.resolve({ projectId: "project" }) };
const request = (body = { nodes: [], edges: [] }) => new Request("http://localhost/api/projects/project/canvas", { method: "PUT", body: typeof body === "string" ? body : JSON.stringify(body) });
beforeEach(() => { denied = null; url = null; updates = []; reads = []; uploads = []; deletes = []; failUpload = false; failUpdate = false; stored = { nodes: [], edges: [] }; });
for (const status of [401, 403, 404]) test(`save/load respect project authorization ${status}`, async () => {
  denied = Response.json({ error: "denied" }, { status });
  assert.equal((await GET(request(), context)).status, status);
  assert.equal((await PUT(request(), context)).status, status);
  assert.equal(reads.length + uploads.length + updates.length, 0);
});
test("unsaved project returns null without reading Blob", async () => {
  const response = await GET(request(), context);
  assert.equal(response.status, 200); assert.equal(await response.json(), null); assert.equal(reads.length, 0);
});
test("load reads private uncached Blob JSON", async () => {
  url = "https://blob/old";
  const response = await GET(request(), context);
  assert.deepEqual(await response.json(), stored);
  assert.deepEqual(reads, [{ path: url, options: { access: "private", useCache: false } }]);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});
test("save uploads JSON and stores only the returned URL in Prisma", async () => {
  url = "https://blob/old";
  assert.equal((await PUT(request(), context)).status, 200);
  assert.deepEqual(JSON.parse(uploads[0].body), stored);
  assert.equal(uploads[0].options.access, "private");
  assert.deepEqual(updates[0].data, { canvasJsonPath: "https://blob/new" });
  assert.deepEqual(deletes, [url]);
});
test("invalid input never reaches storage", async () => {
  for (const value of ["{", {}, { nodes: [], edges: [{ id: "dangling", source: "a", target: "b" }] }]) {
    assert.equal((await PUT(request(value), context)).status, 400);
  }
  assert.equal(uploads.length + updates.length, 0);
});
test("upload failure preserves existing metadata and blob", async () => {
  url = "https://blob/old"; failUpload = true;
  assert.equal((await PUT(request(), context)).status, 500);
  assert.equal(updates.length + deletes.length, 0);
});
test("database failure cleans up new blob and preserves old blob", async () => {
  url = "https://blob/old"; failUpdate = true;
  assert.equal((await PUT(request(), context)).status, 500);
  assert.deepEqual(deletes, ["https://blob/new"]);
});
test("corrupt stored snapshots are rejected", async () => {
  url = "https://blob/old"; stored = { nodes: "invalid", edges: [] };
  assert.equal((await GET(request(), context)).status, 502);
});
test("missing credentials explain how to configure storage without returning raw SDK details", async () => {
  failUpload = "No blob credentials found. Pass a token option, set BLOB_READ_WRITE_TOKEN";
  const response = await PUT(request(), context);
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /Set BLOB_READ_WRITE_TOKEN/);
});
test("public store mismatch explains private storage requirement", async () => {
  failUpload = "access must be public for a public store";
  const response = await PUT(request(), context);
  assert.match((await response.json()).error, /private Vercel Blob store/);
});
