/* eslint-disable @typescript-eslint/no-require-imports -- Isolate edge editing state and the React Flow boundary. */
const assert = require('node:assert/strict');
const { test, beforeEach } = require('node:test');
const { Module } = require('node:module');
const React = require('react');
const actualFlow = require('@xyflow/react');
let values, refs, cursor, refCursor, writes, pathOptions;
function stub(name, exports) {
  const path = require.resolve(name), mod = new Module(path);
  mod.exports = exports; mod.loaded = true; require.cache[path] = mod;
}
stub('react', { ...React,
  useState(initial) { const index = cursor++; if (!(index in values)) values[index] = initial; return [values[index], (value) => { values[index] = value; }]; },
  useRef(initial) { const index = refCursor++; return refs[index] ??= { current: initial }; },
});
stub('@xyflow/react', {
  BaseEdge: () => null, EdgeLabelRenderer: () => null,
  getSmoothStepPath: (options) => { pathOptions = options; return actualFlow.getSmoothStepPath(options); },
  useReactFlow: () => ({ updateEdgeData: (...args) => writes.push(args) }),
});
const { CanvasEdgeRenderer } = require('../components/editor/canvas-edge.tsx');
const props = { id: 'edge-ab', data: {}, sourceX: 100, sourceY: 50, targetX: 400, targetY: 200,
  sourcePosition: actualFlow.Position.Right, targetPosition: actualFlow.Position.Left, selected: false,
  markerEnd: 'url(#arrow)' };
function render(overrides = {}) {
  cursor = refCursor = 0;
  const result = CanvasEdgeRenderer({ ...props, ...overrides });
  const [group, portal] = result.props.children;
  return { group, base: group.props.children, portal, label: portal && portal.props.children,
    editor: portal && portal.props.children.props.children };
}
beforeEach(() => { values = []; refs = []; writes = []; pathOptions = undefined; });
test('right-angle route uses library path and midpoint with a thin dimmed line and wider hit area', () => {
  const edge = render({ data: { label: 'Saved' } });
  const [path, x, y] = actualFlow.getSmoothStepPath(pathOptions);
  assert.equal(edge.base.props.path, path);
  assert.equal(edge.base.props.interactionWidth, 24);
  assert.equal(edge.base.props.style.strokeWidth, 1.5);
  assert.equal(edge.base.props.style.strokeLinecap, 'round');
  assert.equal(edge.base.props.style.opacity, 0.55);
  assert.equal(edge.base.props.markerEnd, 'url(#arrow)');
  assert.equal(edge.label.props.style.transform, `translate(-50%, -50%) translate(${x}px, ${y}px)`);
  assert.equal(edge.editor.type, 'span');
  assert.equal(edge.editor.props.children, 'Saved');
  assert.match(edge.editor.props.className, /rounded-full/);
});
test('hover and selection brighten the edge and reveal a faint hint only for an active unlabeled edge', () => {
  let edge = render();
  assert.equal(edge.portal, false);
  edge.group.props.onMouseEnter();
  edge = render();
  assert.equal(edge.base.props.style.opacity, 1);
  assert.match(edge.editor.props.children, /Double-click/);
  assert.match(edge.editor.props.className, /text-copy-faint/);
  edge.group.props.onMouseLeave();
  assert.equal(render().portal, false);
  assert.equal(render({ selected: true }).base.props.style.opacity, 1);
});
test('double-click opens an autofocus input that grows with draft text without saving on each key', () => {
  let stopped = false;
  render().group.props.onDoubleClick({ stopPropagation: () => { stopped = true; } });
  assert.equal(stopped, true);
  let edge = render();
  assert.equal(edge.editor.type, 'input');
  assert.equal(edge.editor.props.autoFocus, true);
  const firstWidth = edge.editor.props.style.width;
  edge.editor.props.onChange({ target: { value: 'A considerably longer label' } });
  edge = render();
  assert.equal(edge.editor.props.value, 'A considerably longer label');
  assert.ok(parseInt(edge.editor.props.style.width) > parseInt(firstWidth));
  assert.deepEqual(writes, []);
});
for (const exit of ['blur', 'Enter', 'Escape']) test(`${exit} saves the draft once through edge data and closes editing`, () => {
  render({ data: { label: 'Original' } }).group.props.onDoubleClick({ stopPropagation() {} });
  render().editor.props.onChange({ target: { value: 'Updated label' } });
  const input = render().editor;
  if (exit === 'blur') input.props.onBlur();
  else {
    let prevented = false;
    input.props.onKeyDown({ key: exit, preventDefault: () => { prevented = true; }, stopPropagation() {} });
    assert.equal(prevented, true);
    input.props.onBlur();
  }
  assert.deepEqual(writes, [['edge-ab', { label: 'Updated label' }]]);
  assert.equal(render({ data: { label: 'Updated label' } }).editor.type, 'span');
});
test('saved label clicks and input keys do not propagate to canvas gestures or shortcuts', () => {
  let edge = render({ data: { label: 'Saved' } });
  assert.match(edge.label.props.className, /nodrag nopan nowheel/);
  assert.match(edge.label.props.className, /pointer-events-auto/);
  for (const name of ['onPointerDown', 'onClick', 'onWheel']) {
    let stopped = false;
    edge.label.props[name]({ stopPropagation: () => { stopped = true; } });
    assert.equal(stopped, true);
  }
  edge.label.props.onDoubleClick({ stopPropagation() {} });
  edge = render();
  let doubleClickStopped = false;
  edge.editor.props.onDoubleClick({ stopPropagation: () => { doubleClickStopped = true; } });
  assert.equal(doubleClickStopped, true);
  let stopped = false;
  edge.editor.props.onKeyDown({ key: 'Delete', stopPropagation: () => { stopped = true; } });
  assert.equal(stopped, true);
  assert.deepEqual(writes, []);
  assert.equal(render().editor.type, 'input');
});
test('editing can clear a label and remote saved labels render from current edge data', () => {
  render({ data: { label: 'Original' } }).group.props.onDoubleClick({ stopPropagation() {} });
  render().editor.props.onChange({ target: { value: '' } });
  render().editor.props.onBlur();
  assert.deepEqual(writes, [['edge-ab', { label: '' }]]);
  assert.equal(render({ data: { label: 'Remote update' } }).editor.props.children, 'Remote update');
});
