/* eslint-disable @typescript-eslint/no-require-imports -- Exercise imports with isolated room/browser boundaries. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Module } = require('node:module');
const React = require('react');
const xyflow = require('@xyflow/react');
let refs = [], cursor = 0, effects = [], state, operations = [], batches = 0;
const context = { isOpen: true, onClose() {} };
function stub(name, exports) {
  const path = require.resolve(name); const mod = new Module(path);
  mod.exports = exports; mod.loaded = true; require.cache[path] = mod;
}
stub('react', { ...React, useContext: () => context,
  useRef: (value) => refs[cursor++] ?? (refs[cursor - 1] = { current: value }),
  useEffect: (effect) => effects.push(effect),
});
stub('@liveblocks/react/suspense', {
  useRoom: () => ({ batch: (callback) => { batches++; callback(); } }),
  useUndo: () => () => {}, useRedo: () => () => {}, useCanUndo: () => false, useCanRedo: () => false,
  useUpdateMyPresence: () => () => {},
});
stub('@liveblocks/react-flow', { useLiveblocksFlow: () => ({ ...state,
  // Liveblocks handles deletion exclusively through onDelete; remove changes are ignored.
  onNodesChange: (changes) => { operations.push(['nodes', changes]); state.nodes = xyflow.applyNodeChanges(changes.filter((change) => change.type !== 'remove'), state.nodes); },
  onEdgesChange: (changes) => { operations.push(['edges', changes]); state.edges = xyflow.applyEdgeChanges(changes.filter((change) => change.type !== 'remove'), state.edges); },
  onConnect() {}, onDelete: ({ nodes, edges }) => {
    operations.push(['delete', { nodes, edges }]);
    state.edges = state.edges.filter((edge) => !edges.some((removed) => removed.id === edge.id));
    state.nodes = state.nodes.filter((node) => !nodes.some((removed) => removed.id === node.id));
  },
}) });
const { CANVAS_TEMPLATES, instantiateTemplate } = require('../components/editor/starter-templates.ts');
const { StarterTemplatesModal, TemplatePreview, templatePreviewLayout } = require('../components/editor/starter-templates-modal.tsx');
const { Canvas } = require('../components/editor/canvas.tsx');
const { NODE_COLORS } = require('../types/canvas.ts');

test('predefined diagrams use valid shared shapes, palette colors, and connected handle IDs', () => {
  assert.ok(CANVAS_TEMPLATES.length >= 3);
  assert.equal(new Set(CANVAS_TEMPLATES.map((template) => template.id)).size, CANVAS_TEMPLATES.length);
  for (const template of CANVAS_TEMPLATES) {
    assert.ok(template.name && template.description && template.nodes.length && template.edges.length);
    const ids = new Set(template.nodes.map((node) => node.id));
    assert.equal(ids.size, template.nodes.length);
    assert.equal(new Set(template.edges.map((edge) => edge.id)).size, template.edges.length);
    for (const node of template.nodes) {
      assert.equal(node.type, 'canvasNode');
      assert.ok(node.width > 0 && node.height > 0);
      assert.ok(NODE_COLORS.some((color) => color.color === node.data.color && color.textColor === node.data.textColor));
    }
    for (const edge of template.edges) {
      assert.equal(edge.type, 'canvasEdge'); assert.ok(ids.has(edge.source) && ids.has(edge.target));
      assert.equal(edge.sourceHandle, 'right'); assert.equal(edge.targetHandle, 'left');
      assert.ok(edge.markerEnd);
    }
  }
});

test('each import gets independent IDs and data while preserving edge endpoints', () => {
  const template = CANVAS_TEMPLATES[0];
  const first = instantiateTemplate(template), second = instantiateTemplate(template);
  assert.notEqual(first.nodes[0].id, second.nodes[0].id);
  assert.notEqual(first.nodes[0].id, template.nodes[0].id);
  assert.notEqual(first.nodes[0].data, template.nodes[0].data);
  assert.notEqual(first.nodes[0].position, template.nodes[0].position);
  for (const edge of first.edges) assert.ok(first.nodes.some((node) => node.id === edge.source) && first.nodes.some((node) => node.id === edge.target));
});

test('preview bounds fit all nodes including negative or positive origins, with lines joining centers', () => {
  for (const shift of [-600, 700]) {
    const template = { ...CANVAS_TEMPLATES[0], nodes: CANVAS_TEMPLATES[0].nodes.map((node) => ({ ...node, position: { x: node.position.x + shift, y: node.position.y + shift } })) };
    const layout = templatePreviewLayout(template);
    for (const node of layout.nodes) {
      assert.ok(node.position.x * layout.scale + layout.x >= 15.99);
      assert.ok(node.position.y * layout.scale + layout.y >= 15.99);
      assert.ok((node.position.x + node.width) * layout.scale + layout.x <= 304.01);
      assert.ok((node.position.y + node.height) * layout.scale + layout.y <= 160.01);
    }
    const preview = TemplatePreview({ template });
    assert.equal(preview.props.viewBox, '0 0 320 176');
    const [lines, shapes] = preview.props.children.props.children;
    assert.equal(lines.length, template.edges.length); assert.equal(shapes.length, template.nodes.length);
    const source = template.nodes.find((node) => node.id === template.edges[0].source);
    assert.equal(lines[0].props.x1, source.position.x + source.width / 2);
    assert.equal(shapes[0].props.children.props.shape, template.nodes[0].data.shape);
    assert.equal(shapes[0].props.children.props.color, template.nodes[0].data.color);
  }
});

test('modal exposes a scrollable preview grid and imports the selected template before closing', () => {
  const calls = [];
  const modal = StarterTemplatesModal({ onImport: (template) => calls.push(template), onClose: () => calls.push('close') });
  assert.equal(modal.props.open, true);
  const grid = modal.props.children.props.children[1];
  assert.match(grid.props.className, /overflow-y-auto/);
  assert.equal(grid.props.children.length, CANVAS_TEMPLATES.length);
  for (const [index, card] of grid.props.children.entries()) {
    const [preview, body] = card.props.children;
    const [name, description, button] = body.props.children;
    assert.equal(preview.props.template, CANVAS_TEMPLATES[index]);
    assert.equal(name.props.children, CANVAS_TEMPLATES[index].name);
    assert.equal(description.props.children, CANVAS_TEMPLATES[index].description);
    button.props.onClick();
    assert.equal(calls.at(-2), CANVAS_TEMPLATES[index]); assert.equal(calls.at(-1), 'close');
  }
});

function renderCanvas() {
  cursor = 0; effects = [];
  const result = Canvas();
  for (const effect of effects) effect();
  return result;
}

test('import clears existing diagram before adding a template in one room batch, then fits after synced nodes arrive', () => {
  refs = []; operations = []; batches = 0;
  state = { nodes: [{ id: 'old', type: 'canvasNode', position: { x: 0, y: 0 }, data: { label: 'Old', shape: 'rectangle', color: '#fff' } }],
    edges: [{ id: 'old-edge', source: 'old', target: 'old' }] };
  const fitted = [];
  const wrapper = renderCanvas();
  wrapper.props.children[0].props.onInit({ fitView: (options) => fitted.push(options) });
  const modal = wrapper.props.children[2];
  modal.props.onImport(CANVAS_TEMPLATES[0]);
  assert.equal(batches, 1);
  assert.equal(operations[0][0], 'delete');
  assert.deepEqual(operations[0][1].nodes.map((node) => node.id), ['old']);
  assert.deepEqual(operations[0][1].edges.map((edge) => edge.id), ['old-edge']);
  assert.deepEqual(operations.slice(1).map(([kind, changes]) => [kind, changes[0].type]), [['nodes', 'add'], ['edges', 'add']]);
  assert.equal(state.nodes.length, CANVAS_TEMPLATES[0].nodes.length);
  assert.equal(state.edges.length, CANVAS_TEMPLATES[0].edges.length);
  assert.ok(!state.nodes.some((node) => node.id === 'old'));
  assert.ok(!state.edges.some((edge) => edge.id === 'old-edge'));
  assert.equal(fitted.length, 0);
  renderCanvas();
  assert.equal(fitted.length, 1); assert.equal(fitted[0].duration, 200);
  assert.deepEqual(fitted[0].nodes.map((node) => node.id), state.nodes.map((node) => node.id));
  renderCanvas(); assert.equal(fitted.length, 1);
});

test('each actual Import button replaces earlier templates, including repeated selections', () => {
  refs = []; operations = []; batches = 0; state = { nodes: [], edges: [] };
  const fitted = [];
  renderCanvas().props.children[0].props.onInit({ fitView: (options) => fitted.push(options) });
  for (const index of [0, 1, 2, 1, 0, 2]) {
    const modalElement = renderCanvas().props.children[2];
    const modal = StarterTemplatesModal(modalElement.props);
    const card = modal.props.children.props.children[1].props.children[index];
    const button = card.props.children[1].props.children[2];
    const oldIds = new Set(state.nodes.map((node) => node.id));
    button.props.onClick();
    const selected = CANVAS_TEMPLATES[index];
    assert.deepEqual(state.nodes.map((node) => node.data.label), selected.nodes.map((node) => node.data.label));
    assert.equal(state.edges.length, selected.edges.length);
    assert.ok(state.nodes.every((node) => !oldIds.has(node.id)));
    assert.ok(state.edges.every((edge) => state.nodes.some((node) => node.id === edge.source) && state.nodes.some((node) => node.id === edge.target)));
    renderCanvas();
    assert.deepEqual(fitted.at(-1).nodes.map((node) => node.id), state.nodes.map((node) => node.id));
  }
  assert.equal(batches, 6);
});
