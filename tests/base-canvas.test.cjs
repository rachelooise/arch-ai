/* eslint-disable @typescript-eslint/no-require-imports -- Isolate Liveblocks and React Flow integration boundaries. */
const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');
const { Module } = require('node:module');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
let provider, room, options, flow, listener, failed, loading;
const handlers = {
  onNodesChange() {}, onEdgesChange() {}, onConnect() {}, onDelete() {},
};
const syncedNodes = [{ id: 'remote-node', position: { x: 1, y: 2 }, data: { label: 'Remote', color: '#fff', shape: 'rectangle' } }];
const syncedEdges = [{ id: 'remote-edge', source: 'a', target: 'b' }];
function stub(name, exports) {
  const path = require.resolve(name);
  const mod = new Module(path);
  mod.exports = exports;
  mod.loaded = true;
  require.cache[path] = mod;
}
stub('react', { ...React, useState: () => [failed, (value) => { failed = value; }], useRef: (value) => ({ current: value }) });
stub('@liveblocks/react/suspense', {
  LiveblocksProvider: (props) => { provider = props; return props.children; },
  RoomProvider: (props) => { room = props; return props.children; },
  ClientSideSuspense: (props) => loading ? props.fallback : props.children,
  useErrorListener: (callback) => { listener = callback; },
});
stub('@liveblocks/react-flow', {
  useLiveblocksFlow: (value) => { options = value; return { nodes: syncedNodes, edges: syncedEdges, ...handlers }; },
});
stub('@xyflow/react', {
  ConnectionMode: { Loose: 'loose' }, BackgroundVariant: { Dots: 'dots' },
  ReactFlow: (props) => { flow = props; return React.createElement('div', { 'data-flow': true }, props.children); },
  MiniMap: () => React.createElement('div', { 'data-minimap': true }),
  Background: (props) => React.createElement('div', { 'data-background': props.variant }),
});
const { CanvasRoom } = require('../components/editor/canvas-room.tsx');
function markup(roomId = 'project') { return renderToStaticMarkup(React.createElement(CanvasRoom, { roomId })); }
beforeEach(() => { failed = false; loading = false; provider = room = options = flow = listener = undefined; });
test('room setup scopes authentication and initializes the full typed presence', () => {
  markup('shared-project');
  assert.equal(provider.authEndpoint, '/api/liveblocks-auth');
  assert.equal(room.id, 'shared-project');
  assert.deepEqual(room.initialPresence, { cursor: null, isThinking: false });
});
test('synced data and all mutation handlers reach React Flow with empty initial data', () => {
  const html = markup();
  assert.deepEqual(options, { suspense: true, nodes: { initial: [] }, edges: { initial: [] } });
  assert.equal(flow.nodes, syncedNodes);
  assert.equal(flow.edges, syncedEdges);
  for (const key of Object.keys(handlers)) assert.equal(flow[key], handlers[key]);
  assert.equal(flow.connectionMode, 'loose');
  assert.equal(flow.fitView, true);
  assert.match(html, /data-minimap/);
  assert.match(html, /data-background="dots"/);
  assert.equal(typeof flow.nodeTypes.canvasNode, 'function');
  assert.equal(flow.edgeTypes, undefined);
});
test('loading renders before the collaborative canvas is ready', () => {
  loading = true;
  assert.match(markup(), /role="status".*Loading canvas/);
  assert.equal(options, undefined);
  assert.equal(typeof listener, 'function');
});
test('connection failure during loading replaces the spinner with an accessible fallback', () => {
  loading = true;
  markup();
  listener({ context: { type: 'ROOM_CONNECTION_ERROR', code: -1 } });
  const html = markup();
  assert.match(html, /role="alert"/);
  assert.match(html, /Unable to connect to the canvas/);
  assert.doesNotMatch(html, /Loading canvas|data-flow/);
});
test('unrelated errors do not replace the canvas', () => {
  markup();
  listener({ context: { type: 'CREATE_THREAD_ERROR' } });
  assert.match(markup(), /data-flow/);
});
test('room changes remount the error boundary and room contents', () => {
  const first = CanvasRoom({ roomId: 'first' });
  const second = CanvasRoom({ roomId: 'second' });
  assert.equal(first.key, 'first');
  assert.equal(second.key, 'second');
  const boundary = new first.type(first.props);
  boundary.state = first.type.getDerivedStateFromError(new Error('Render failed'));
  assert.match(renderToStaticMarkup(boundary.render()), /Unable to connect to the canvas/);
});

const { Canvas } = require('../components/editor/canvas.tsx');
const { ShapePanel } = require('../components/editor/shape-panel.tsx');
const { CanvasNodeRenderer } = require('../components/editor/canvas-node.tsx');
const { SHAPE_DRAG_TYPE, SHAPE_SIZES, DEFAULT_NODE_COLOR, parseShapeDragPayload, createShapeNode } = require('../lib/canvas-shapes.ts');
test('all six shape buttons are draggable and provide matching default size payloads', () => {
  const panel = ShapePanel();
  assert.equal(panel.props.role, 'toolbar');
  assert.match(panel.props.className, /bottom-6.*left-1\/2.*rounded-full/);
  const buttons = panel.props.children;
  assert.equal(buttons.length, 6);
  const payloads = [];
  for (const button of buttons) {
    assert.equal(button.props.draggable, true);
    const transfer = { setData: (type, data) => { assert.equal(type, SHAPE_DRAG_TYPE); payloads.push(JSON.parse(data)); } };
    button.props.onDragStart({ dataTransfer: transfer });
    assert.equal(transfer.effectAllowed, 'copy');
    const value = payloads.at(-1);
    assert.deepEqual(value, { shape: button.key, ...SHAPE_SIZES[button.key] });
  }
  assert.deepEqual(payloads.map((value) => value.shape), ['rectangle', 'diamond', 'circle', 'pill', 'cylinder', 'hexagon']);
  assert.ok(SHAPE_SIZES.rectangle.width > SHAPE_SIZES.rectangle.height);
  assert.equal(SHAPE_SIZES.circle.width, SHAPE_SIZES.circle.height);
  assert.ok(SHAPE_SIZES.diamond.width > SHAPE_SIZES.circle.width);
});
test('drops convert screen coordinates and create custom nodes through the synced handler', () => {
  const changes = [];
  const original = handlers.onNodesChange;
  handlers.onNodesChange = (value) => changes.push(...value);
  try {
    const wrapper = Canvas();
    const reactFlow = wrapper.props.children[0];
    reactFlow.props.onInit({ screenToFlowPosition: (point) => {
      assert.deepEqual(point, { x: 350, y: 240 });
      return { x: 125, y: 80 };
    } });
    for (const shape of Object.keys(SHAPE_SIZES)) {
      let prevented = false;
      wrapper.props.onDrop({ preventDefault: () => { prevented = true; }, clientX: 350, clientY: 240,
        dataTransfer: { getData: (type) => { assert.equal(type, SHAPE_DRAG_TYPE); return JSON.stringify({ shape, ...SHAPE_SIZES[shape] }); } } });
      assert.equal(prevented, true);
      const { type, item } = changes.at(-1);
      assert.equal(type, 'add');
      assert.equal(item.type, 'canvasNode');
      assert.deepEqual(item.position, { x: 125, y: 80 });
      assert.deepEqual(item.data, { shape, label: '', color: DEFAULT_NODE_COLOR });
      assert.equal(item.width, SHAPE_SIZES[shape].width);
      assert.equal(item.height, SHAPE_SIZES[shape].height);
      assert.match(item.id, new RegExp(`^${shape}-[0-9]+-[0-9]+$`));
    }
    wrapper.props.onDrop({ preventDefault() {}, dataTransfer: { getData: () => '{' } });
    assert.equal(changes.length, 6);
    const transfer = { types: [SHAPE_DRAG_TYPE] };
    let prevented = false;
    wrapper.props.onDragOver({ dataTransfer: transfer, preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(transfer.dropEffect, 'copy');
  } finally { handlers.onNodesChange = original; }
});
test('external and invalid drag payloads are ignored', () => {
  for (const value of ['', '{', 'null', '[]', '{"shape":"triangle","width":10,"height":10}',
    '{"shape":"rectangle","width":0,"height":100}', '{"shape":"circle","width":"120","height":120}',
    '{"shape":"circle","width":120,"height":1e999}', '{"shape":"__proto__","width":120,"height":120}']) {
    assert.equal(parseShapeDragPayload(value), null);
  }
  let prevented = false;
  Canvas().props.onDragOver({ dataTransfer: { types: ['text/plain'] }, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false);
});
test('same-millisecond creations get distinct IDs and all shapes render as rectangles', () => {
  const original = Date.now;
  Date.now = () => 1234;
  try {
    const payload = { shape: 'circle', ...SHAPE_SIZES.circle };
    const first = createShapeNode(payload, { x: 0, y: 0 });
    const second = createShapeNode(payload, { x: 0, y: 0 });
    assert.notEqual(first.id, second.id);
    assert.match(first.id, /^circle-1234-[0-9]+$/);
  } finally { Date.now = original; }
  for (const shape of Object.keys(SHAPE_SIZES)) {
    const html = renderToStaticMarkup(React.createElement(CanvasNodeRenderer, {
      data: { label: 'Example label', color: DEFAULT_NODE_COLOR, shape }, selected: false,
    }));
    assert.match(html, /items-center justify-center/);
    assert.match(html, /border/);
    assert.match(html, /Example label/);
    assert.match(html, /background-color:#1F1F1F/);
    assert.doesNotMatch(html, /<svg|clip-path|rounded-full/);
  }
});
