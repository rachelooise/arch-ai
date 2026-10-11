/* eslint-disable @typescript-eslint/no-require-imports -- Isolate Liveblocks and React Flow integration boundaries. */
const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');
const { Module } = require('node:module');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
let provider, room, options, flow, listener, failed, loading;
let labelUpdates = [];
let presenceUpdates = [], effects = [];
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
stub('react', { ...React, useContext: () => null, useEffect: (effect) => effects.push(effect), useState: () => [failed, (value) => { failed = value; }], useRef: (value) => ({ current: value }) });
stub('@clerk/nextjs', { useAuth: () => ({ userId: 'current-user' }), UserButton: () => React.createElement('button', { 'aria-label': 'Clerk profile' }) });
stub('@liveblocks/react/suspense', {
  LiveblocksProvider: (props) => { provider = props; return props.children; },
  RoomProvider: (props) => { room = props; return props.children; },
  ClientSideSuspense: (props) => loading ? props.fallback : props.children,
  useErrorListener: (callback) => { listener = callback; },
  useUndo: () => () => {}, useRedo: () => () => {},
  useCanUndo: () => false, useCanRedo: () => false,
  useRoom: () => ({ batch: (callback) => callback() }),
  useOthersMapped: () => [], useOthersConnectionIds: () => [],
  useUpdateMyPresence: () => (value) => presenceUpdates.push(value),
});
stub('@liveblocks/react-flow', {
  useLiveblocksFlow: (value) => { options = value; return { nodes: syncedNodes, edges: syncedEdges, ...handlers }; },
});
stub('@xyflow/react', {
  useReactFlow: () => ({ updateNodeData: (...args) => labelUpdates.push(args) }),
  useUpdateNodeInternals: () => () => {},
  NodeResizer: () => null,
  NodeToolbar: (props) => React.createElement('div', { role: props.role, 'aria-label': props['aria-label'] }, props.children),
  Position: { Top: 'top', Right: 'right', Bottom: 'bottom', Left: 'left' },
  Handle: (props) => React.createElement('div', { 'data-handle': props.id }),
  ConnectionMode: { Loose: 'loose' }, BackgroundVariant: { Dots: 'dots' },
  MarkerType: { ArrowClosed: 'arrowclosed' },
  ReactFlow: (props) => { flow = props; return React.createElement('div', { 'data-flow': true }, props.children); },
  MiniMap: () => React.createElement('div', { 'data-minimap': true }),
  Background: (props) => React.createElement('div', { 'data-background': props.variant }),
});
const { CanvasRoom } = require('../components/editor/canvas-room.tsx');
function markup(roomId = 'project') { return renderToStaticMarkup(React.createElement(CanvasRoom, { roomId })); }
beforeEach(() => { failed = false; loading = false; labelUpdates = []; presenceUpdates = []; effects = []; provider = room = options = flow = listener = undefined; });
test('room setup scopes authentication and initializes the full typed presence', () => {
  markup('shared-project');
  assert.equal(provider.authEndpoint, '/api/liveblocks-auth');
  assert.equal(room.id, 'shared-project');
  assert.deepEqual(room.initialPresence, { cursor: null, thinking: false });
});
test('synced data and all mutation handlers reach React Flow with empty initial data', () => {
  const html = markup();
  assert.deepEqual(options, { suspense: true, nodes: { initial: [] }, edges: { initial: [] } });
  assert.equal(flow.nodes, syncedNodes);
  assert.equal(flow.edges, syncedEdges);
  for (const key of Object.keys(handlers)) assert.equal(flow[key], handlers[key]);
  assert.equal(flow.connectionMode, 'loose');
  assert.equal(flow.fitView, true);
  assert.doesNotMatch(html, /data-minimap/);
  assert.match(html, /aria-label="Canvas controls"/);
  assert.match(html, /data-background="dots"/);
  assert.equal(typeof flow.nodeTypes.canvasNode, 'function');
  assert.equal(typeof flow.edgeTypes.canvasEdge, 'function');
  assert.equal(flow.defaultEdgeOptions.type, 'canvasEdge');
  assert.equal(flow.defaultEdgeOptions.markerEnd.type, 'arrowclosed');
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
test('React Flow mouse events broadcast flow coordinates and clear cursors on leave and unmount', () => {
  const wrapper = Canvas();
  const props = wrapper.props.children[0].props;
  props.onMouseMove({ clientX: 300, clientY: 200 });
  assert.deepEqual(presenceUpdates, []);
  props.onInit({ screenToFlowPosition: (point) => {
    assert.deepEqual(point, { x: 300, y: 200 });
    return { x: -40, y: 75 };
  } });
  props.onMouseMove({ clientX: 300, clientY: 200 });
  assert.deepEqual(presenceUpdates, [{ cursor: { x: -40, y: 75 } }]);
  props.onMouseLeave();
  assert.deepEqual(presenceUpdates.at(-1), { cursor: null });
  const cleanup = effects[0]();
  cleanup();
  assert.deepEqual(presenceUpdates, [{ cursor: { x: -40, y: 75 } }, { cursor: null }, { cursor: null }]);
});
const { ShapePanel } = require('../components/editor/shape-panel.tsx');
const { CanvasNodeRenderer } = require('../components/editor/canvas-node.tsx');
const { SHAPE_DRAG_TYPE, SHAPE_SIZES, DEFAULT_NODE_COLOR, parseShapeDragPayload, createShapeNode } = require('../lib/canvas-shapes.ts');
test('all six shape buttons are draggable and provide matching default size payloads', () => {
  const panel = ShapePanel().props.children[0];
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

test('clicking each shape adds it centered in the visible viewport through the synced handler', () => {
  const changes = [];
  const original = handlers.onNodesChange;
  handlers.onNodesChange = (value) => changes.push(...value);
  try {
    const wrapper = Canvas();
    wrapper.props.ref.current = { getBoundingClientRect: () => ({ left: 100, top: 80, width: 800, height: 600 }) };
    wrapper.props.children[0].props.onInit({ screenToFlowPosition: (point) => {
      assert.deepEqual(point, { x: 500, y: 380 });
      // Model a panned/zoomed viewport rather than raw screen coordinates.
      return { x: 250, y: -40 };
    } });
    const panel = ShapePanel(wrapper.props.children[1].props).props.children[0];
    for (const button of panel.props.children) {
      button.props.onClick();
      const { item, type } = changes.at(-1);
      const size = SHAPE_SIZES[button.key];
      assert.equal(type, 'add');
      assert.equal(item.data.shape, button.key);
      assert.deepEqual(item.position, { x: 250 - size.width / 2, y: -40 - size.height / 2 });
      assert.equal(item.width, size.width);
      assert.equal(item.height, size.height);
      assert.match(button.props['aria-label'], /^Add /);
    }
    assert.equal(changes.length, 6);
    assert.equal(new Set(changes.map(({ item }) => item.id)).size, 6);
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
test('same-millisecond creations get distinct IDs and labels remain centered in every shape', () => {
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
    assert.match(html, /var\(--border-default\)/);
    assert.match(html, /Example label/);
    assert.match(html, /#1F1F1F/);
  }
});

test('CSS shapes use the required rounding and SVG shapes scale with node dimensions', () => {
  for (const shape of ['rectangle', 'pill', 'circle']) {
    const html = renderToStaticMarkup(React.createElement(CanvasNodeRenderer, {
      data: { shape, color: DEFAULT_NODE_COLOR, label: 'Label' }, selected: false,
    }));
    assert.doesNotMatch(html, /<svg/);
    assert.match(html, /background-color:#1F1F1F/);
    if (shape === 'pill') assert.match(html, /rounded-full/);
    if (shape === 'circle') assert.match(html, /rounded-\[50%\]/);
    if (shape === 'rectangle') assert.doesNotMatch(html, /rounded/);
  }
  for (const shape of ['diamond', 'hexagon', 'cylinder']) {
    const html = renderToStaticMarkup(React.createElement(CanvasNodeRenderer, {
      data: { shape, color: DEFAULT_NODE_COLOR, label: 'Label' }, selected: true,
    }));
    assert.match(html, /<svg/);
    assert.match(html, /width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"/);
    assert.match(html, /vector-effect="non-scaling-stroke"/);
    assert.match(html, /stroke="var\(--accent-primary\)"/);
    if (shape === 'cylinder') { assert.match(html, /<path/); assert.match(html, /<ellipse/); }
    else assert.match(html, /<polygon/);
  }
});
test('native ghost uses the same shape and default size and is hidden after capture or cancellation', () => {
  const originalFrame = globalThis.requestAnimationFrame;
  const frames = [];
  globalThis.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
  try {
    const panel = ShapePanel();
    const buttons = panel.props.children[0].props.children;
    const previews = panel.props.children[1];
    assert.equal(previews.length, 6);
    for (const button of buttons) {
      const preview = previews.find((element) => element.key === button.key);
      assert.equal(preview.props['aria-hidden'], 'true');
      assert.match(preview.props.className, /pointer-events-none.*fixed.*opacity-60/);
      assert.equal(preview.props.style.width, SHAPE_SIZES[button.key].width);
      assert.equal(preview.props.style.height, SHAPE_SIZES[button.key].height);
      assert.equal(preview.props.children.props.shape, button.key);
      assert.equal(preview.props.children.props.color, DEFAULT_NODE_COLOR);
      const element = { style: { left: '-10000px' } };
      preview.props.ref(element);
      let captured = false;
      button.props.onDragStart({ dataTransfer: { setData() {}, setDragImage: (image, x, y) => {
        assert.equal(image, element);
        assert.equal(element.style.left, '0px');
        assert.deepEqual([x, y], [0, 0]);
        captured = true;
      } } });
      assert.equal(captured, true);
      frames.shift()();
      assert.equal(element.style.left, '-10000px');
      element.style.left = '0px';
      button.props.onDragEnd();
      assert.equal(element.style.left, '-10000px');
      preview.props.ref(null);
    }
  } finally {
    if (originalFrame === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = originalFrame;
  }
});

const editableNodeProps = (label = '') => ({ id: 'node-edit', selected: true,
  data: { shape: 'diamond', color: DEFAULT_NODE_COLOR, label } });
function editingParts(props = editableNodeProps()) {
  const result = CanvasNodeRenderer(props);
  const [resizer, shape] = result.props.children;
  const labelArea = shape.props.children;
  return { resizer, shape, labelArea, label: labelArea.props.children[0], textarea: labelArea.props.children[1] };
}
test('only selected nodes expose subtle resize handles with minimum dimensions', () => {
  for (const selected of [true, false]) {
    const { resizer, shape } = editingParts({ ...editableNodeProps(), selected });
    assert.equal(resizer.props.nodeId, 'node-edit');
    assert.equal(resizer.props.isVisible, selected);
    assert.equal(resizer.props.minWidth, 80);
    assert.equal(resizer.props.minHeight, 60);
    assert.equal(resizer.props.handleStyle.background, 'var(--bg-elevated)');
    assert.equal(resizer.props.lineStyle.borderColor, 'var(--border-subtle)');
    assert.equal(shape.props.shape, 'diamond');
  }
});
test('double-click replaces centered placeholder with an autofocus overlay without removing the label layout', () => {
  let parts = editingParts();
  assert.doesNotMatch(parts.labelArea.props.className, /nodrag|nopan/);
  assert.equal(parts.label.props.children, 'Add a label');
  assert.equal(parts.textarea, false);
  let stopped = false;
  parts.labelArea.props.onDoubleClick({ stopPropagation: () => { stopped = true; } });
  assert.equal(stopped, true);
  parts = editingParts();
  assert.equal(parts.textarea.type, 'textarea');
  assert.equal(parts.textarea.props.autoFocus, true);
  assert.equal(parts.textarea.props['aria-label'], 'Node label');
  assert.match(parts.textarea.props.className, /absolute inset-0 h-full w-full/);
  assert.match(parts.textarea.props.className, /text-center/);
  assert.match(parts.label.props.className, /invisible/);
});
test('typing updates only the label on the correct synced node including multiline and empty input', () => {
  editingParts().labelArea.props.onDoubleClick({ stopPropagation() {} });
  for (const value of ['Updated label', 'First line\nSecond line', '']) {
    const { textarea } = editingParts();
    textarea.props.onChange({ target: { value } });
    assert.deepEqual(labelUpdates.at(-1), ['node-edit', { label: value }]);
    assert.equal(editingParts(editableNodeProps(value)).textarea.props.value, value);
  }
  assert.equal(labelUpdates.length, 3);
});
test('blur and Escape exit editing without reverting already synced input', () => {
  for (const method of ['blur', 'Escape']) {
    editingParts().labelArea.props.onDoubleClick({ stopPropagation() {} });
    const { textarea } = editingParts();
    textarea.props.onChange({ target: { value: 'Saved while typing' } });
    if (method === 'blur') textarea.props.onBlur();
    else {
      let prevented = false;
      let stopped = false;
      textarea.props.onKeyDown({ key: 'Escape', preventDefault: () => { prevented = true; }, stopPropagation: () => { stopped = true; } });
      assert.equal(prevented, true);
      assert.equal(stopped, true);
    }
    assert.equal(editingParts().textarea, false);
    assert.doesNotMatch(editingParts().labelArea.props.className, /nodrag|nopan/);
    assert.deepEqual(labelUpdates.at(-1), ['node-edit', { label: 'Saved while typing' }]);
  }
});
test('text events do not propagate into canvas gestures or keyboard shortcuts', () => {
  editingParts().labelArea.props.onDoubleClick({ stopPropagation() {} });
  const { labelArea, textarea } = editingParts();
  assert.match(labelArea.props.className, /nodrag nopan nowheel/);
  assert.match(textarea.props.className, /nodrag nopan nowheel/);
  for (const eventName of ['onPointerDown', 'onDoubleClick', 'onWheel', 'onKeyDown']) {
    let stopped = false;
    textarea.props[eventName]({ key: 'Delete', stopPropagation: () => { stopped = true; } });
    assert.equal(stopped, true);
  }
  assert.notEqual(editingParts().textarea, false);
});

const { NODE_COLORS } = require('../types/canvas.ts');
const { NodeColorToolbar } = require('../components/editor/node-color-toolbar.tsx');
test('color toolbar appears only on selected nodes above the node with eight accessible swatches', () => {
  assert.equal(CanvasNodeRenderer({ ...editableNodeProps(), selected: false }).props.children[2], false);
  const toolbar = CanvasNodeRenderer(editableNodeProps()).props.children[2];
  assert.equal(toolbar.type, NodeColorToolbar);
  const view = toolbar.type(toolbar.props);
  assert.equal(view.props.nodeId, 'node-edit');
  assert.equal(view.props.isVisible, true);
  assert.equal(view.props.position, 'top');
  assert.equal(view.props.offset, 12);
  assert.equal(view.props.role, 'toolbar');
  assert.equal(view.props.children.length, 8);
  assert.equal(view.props.children.filter((button) => button.props['aria-pressed']).length, 1);
  assert.equal(view.props.children[0].props['aria-pressed'], true);
});
test('every swatch patches both colors together without overwriting label or shape', () => {
  for (const pair of NODE_COLORS) {
    const node = CanvasNodeRenderer(editableNodeProps('Keep this label'));
    const toolbar = node.props.children[2];
    const view = toolbar.type(toolbar.props);
    const swatch = view.props.children.find((button) => button.key === pair.name);
    let stopped = false;
    swatch.props.onClick({ stopPropagation: () => { stopped = true; } });
    assert.equal(stopped, true);
    assert.deepEqual(labelUpdates.at(-1), ['node-edit', { color: pair.color, textColor: pair.textColor }]);
    const updated = CanvasNodeRenderer({ ...editableNodeProps('Keep this label'), data: { shape: 'diamond', label: 'Keep this label', color: pair.color, textColor: pair.textColor } });
    const shape = updated.props.children[1];
    assert.equal(shape.props.color, pair.color);
    assert.equal(shape.props.children.props.style.color, pair.textColor);
    assert.equal(shape.props.children.props.children[0].props.children, 'Keep this label');
    const activeToolbar = updated.props.children[2];
    const buttons = activeToolbar.type(activeToolbar.props).props.children;
    assert.equal(buttons.filter((button) => button.props['aria-pressed']).length, 1);
    const active = buttons.find((button) => button.key === pair.name);
    assert.equal(active.props['aria-pressed'], true);
    assert.equal(active.props.style.outlineWidth, 2);
    assert.equal(active.props.style['--swatch-text'], pair.textColor);
    assert.ok(active.props.children);
  }
});
test('existing nodes infer their paired text color and new edits inherit it', () => {
  for (const pair of NODE_COLORS) {
    const props = { ...editableNodeProps('Existing'), data: { shape: 'circle', label: 'Existing', color: pair.color } };
    let node = CanvasNodeRenderer(props);
    let labelArea = node.props.children[1].props.children;
    assert.equal(labelArea.props.style.color, pair.textColor);
    labelArea.props.onDoubleClick({ stopPropagation() {} });
    node = CanvasNodeRenderer(props);
    labelArea = node.props.children[1].props.children;
    assert.match(labelArea.props.children[1].props.className, /text-inherit/);
    assert.doesNotMatch(labelArea.props.children[1].props.className, /text-copy-primary/);
    labelArea.props.children[1].props.onBlur();
  }
});
test('toolbar isolates pointer, wheel, double-click and keyboard events from the canvas', () => {
  const view = NodeColorToolbar({ nodeId: 'node-edit', ...NODE_COLORS[0], onSelect() {} });
  assert.match(view.props.className, /nodrag nopan nowheel/);
  for (const eventName of ['onPointerDown', 'onDoubleClick', 'onWheel', 'onKeyDown']) {
    let stopped = false;
    view.props[eventName]({ stopPropagation: () => { stopped = true; } });
    assert.equal(stopped, true);
  }
});

test('custom nodes expose four distinct bidirectional handles using loose connection mode', () => {
  const handles = CanvasNodeRenderer(editableNodeProps()).props.children[3];
  assert.deepEqual(handles.map((handle) => handle.props.id), ['top', 'right', 'bottom', 'left']);
  for (const handle of handles) {
    assert.equal(handle.props.position, handle.props.id);
    assert.equal(handle.props.type, 'source');
    assert.equal(handle.props.isConnectable, true);
    assert.equal(handle.props.className, 'canvas-connection-handle');
  }
  const disabled = CanvasNodeRenderer({ ...editableNodeProps(), isConnectable: false }).props.children[3];
  assert.ok(disabled.every((handle) => handle.props.isConnectable === false));
  markup();
  assert.equal(flow.connectionMode, 'loose');
  assert.equal(flow.onConnect, handlers.onConnect);
});
