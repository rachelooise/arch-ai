/* eslint-disable @typescript-eslint/no-require-imports -- Test the autosave lifecycle with controlled network boundaries. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { CanvasAutosave, AUTOSAVE_DELAY } = require("../lib/canvas-autosave.ts");
const { parseCanvasState, serializeCanvas } = require("../lib/canvas-state.ts");
const empty = () => ({ nodes: [], edges: [] });
const diagram = (label = "A") => ({ nodes: [{ id: "a", type: "canvasNode", position: { x: 1, y: 2 }, data: { label, color: "#fff", shape: "rectangle" } }], edges: [] });
const settle = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
test("native browser fetch keeps its global receiver for both load and save", async (t) => {
  const calls = [], errors = [];
  let state = empty();
  t.mock.method(globalThis, "fetch", async function (_url, options = {}) {
    if (this !== globalThis) throw new TypeError("Illegal invocation");
    calls.push(options.method ?? "GET");
    return Response.json(null);
  });
  const controller = new CanvasAutosave({ projectId: "project", getSnapshot: () => state,
    isRoomEmpty: () => !state.nodes.length, restoreIfEmpty: () => false,
    onStatus: (_status, error) => { if (error) errors.push(error); },
  });
  t.after(() => controller.dispose());
  await controller.start();
  assert.deepEqual(errors, []);
  state = diagram(); controller.update(); controller.saveNow(); await settle();
  assert.deepEqual(calls, ["GET", "PUT"]);
  assert.deepEqual(errors, []);
});
function harness(t, initial, request) {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let state = initial;
  const calls = [], statuses = [], restored = [], errors = [];
  const controller = new CanvasAutosave({ projectId: "project", getSnapshot: () => state,
    isRoomEmpty: () => !state.nodes.length && !state.edges.length,
    restoreIfEmpty: (value) => { restored.push(value); state = value; return true; },
    onStatus: (value, error) => { statuses.push(value); errors.push(error); },
    fetch: async (url, options = {}) => { calls.push({ url, ...options }); return request?.(url, options) ?? Response.json(null); },
  });
  t.after(() => { controller.dispose(); t.mock.timers.reset(); });
  return { controller, calls, statuses, restored, errors, set: (value) => { state = value; controller.update(); } };
}
test("active nodes or edges skip loading and debounce the latest snapshot", async (t) => {
  const h = harness(t, diagram());
  await h.controller.start();
  assert.equal(h.calls.length, 0);
  t.mock.timers.tick(1000);
  h.set(diagram("latest"));
  t.mock.timers.tick(AUTOSAVE_DELAY - 1);
  assert.equal(h.calls.length, 0);
  t.mock.timers.tick(1); await settle();
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].method, "PUT");
  assert.equal(JSON.parse(h.calls[0].body).nodes[0].data.label, "latest");
  assert.equal(h.statuses.at(-1), "saved");
});
test("empty room restores saved state without writing it back", async (t) => {
  const h = harness(t, empty(), () => Response.json(diagram()));
  await h.controller.start(); h.controller.update();
  t.mock.timers.tick(AUTOSAVE_DELAY); await settle();
  assert.equal(h.restored.length, 1);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].cache, "no-store");
  assert.equal(h.statuses.at(-1), "saved");
});
test("a room containing only edges also skips loading", async (t) => {
  const h = harness(t, { nodes: [], edges: [{ id: "existing", source: "a", target: "b" }] });
  await h.controller.start();
  assert.equal(h.calls.length, 0);
});
test("collaboration arriving during a load prevents restoration", async (t) => {
  const load = deferred();
  const h = harness(t, empty(), (_url, options) => options.method ? Response.json({ saved: true }) : load.promise);
  const started = h.controller.start();
  h.set(diagram("collaborator"));
  load.resolve(Response.json(diagram("old"))); await started;
  assert.equal(h.restored.length, 0);
  t.mock.timers.tick(AUTOSAVE_DELAY); await settle();
  assert.equal(JSON.parse(h.calls[1].body).nodes[0].data.label, "collaborator");
});
test("failed load leaves empty room untouched and does not overwrite saved data", async (t) => {
  const h = harness(t, empty(), () => new Response(null, { status: 500 }));
  await h.controller.start(); t.mock.timers.tick(AUTOSAVE_DELAY); await settle();
  assert.equal(h.calls.length, 1);
  assert.equal(h.statuses.at(-1), "error");
  assert.equal(h.restored.length, 0);
});
test("failed save reports error and manual retry saves successfully", async (t) => {
  let fail = true;
  const h = harness(t, diagram(), () => new Response(null, { status: fail ? 500 : 200 }));
  await h.controller.start(); t.mock.timers.tick(AUTOSAVE_DELAY); await settle();
  assert.equal(h.statuses.at(-1), "error");
  t.mock.timers.tick(AUTOSAVE_DELAY * 3); await settle(); assert.equal(h.calls.length, 1);
  fail = false; h.controller.saveNow(); await settle();
  assert.equal(h.statuses.at(-1), "saved");
});
test("writes are serialized and save changes made during an outstanding request", async (t) => {
  const first = deferred();
  const h = harness(t, diagram(), () => h.calls.length === 1 ? first.promise : Response.json({ saved: true }));
  await h.controller.start(); t.mock.timers.tick(AUTOSAVE_DELAY); await settle();
  h.set(diagram("new")); t.mock.timers.tick(AUTOSAVE_DELAY); await settle();
  assert.equal(h.calls.length, 1);
  first.resolve(Response.json({ saved: true })); await settle();
  assert.equal(h.calls.length, 2);
  assert.equal(JSON.parse(h.calls[1].body).nodes[0].data.label, "new");
  assert.equal(h.statuses.at(-1), "saved");
});
test("API error details reach the UI and clear after retry", async (t) => {
  let fail = true;
  const h = harness(t, diagram(), () => fail ? Response.json({ error: "Canvas storage access was denied." }, { status: 500 }) : Response.json({ saved: true }));
  await h.controller.start(); t.mock.timers.tick(AUTOSAVE_DELAY); await settle();
  assert.equal(h.errors.at(-1), "Canvas storage access was denied.");
  fail = false; h.controller.saveNow(); await settle();
  assert.equal(h.errors.at(-1), undefined);
  assert.equal(h.statuses.at(-1), "saved");
});
test("non-JSON failures retain the HTTP status", async (t) => {
  const h = harness(t, empty(), () => new Response("Bad Gateway", { status: 502 }));
  await h.controller.start();
  assert.match(h.errors.at(-1), /HTTP 502/);
});
test("selection and measured bounds do not trigger persistence", async (t) => {
  const h = harness(t, empty()); await h.controller.start();
  h.set(diagram()); t.mock.timers.tick(AUTOSAVE_DELAY); await settle();
  const value = diagram(); Object.assign(value.nodes[0], { selected: true, dragging: false, measured: { width: 150, height: 80 } });
  h.set(value); t.mock.timers.tick(AUTOSAVE_DELAY); await settle();
  assert.equal(h.calls.length, 2);
  assert.equal(JSON.parse(h.calls[1].body).nodes[0].selected, undefined);
});
test("unmount flushes pending changes", async (t) => {
  const h = harness(t, diagram()); await h.controller.start();
  h.controller.dispose(); await settle();
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].keepalive, true);
});
test("snapshot validation rejects dangling edges and preserves shape/edge data", () => {
  const value = diagram(); value.edges = [{ id: "e", source: "a", target: "a", sourceHandle: "right", targetHandle: "left", type: "canvasEdge", data: { label: "event" } }];
  assert.deepEqual(parseCanvasState(value), value);
  assert.equal(parseCanvasState({ ...value, edges: [{ ...value.edges[0], target: "missing" }] }), null);
  assert.equal(parseCanvasState({ nodes: [value.nodes[0], value.nodes[0]], edges: [] }), null);
  assert.equal(serializeCanvas(value), serializeCanvas({ ...value, nodes: value.nodes.map((node) => ({ ...node, selected: true })) }));
});
