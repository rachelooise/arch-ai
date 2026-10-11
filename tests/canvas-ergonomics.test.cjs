/* eslint-disable @typescript-eslint/no-require-imports -- Isolate browser and collaboration boundaries. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Module } = require('node:module');
const React = require('react');
let listener, cleanup;
const calls = [];
const flow = Object.fromEntries(['zoomIn', 'zoomOut', 'fitView'].map((name) => [name, (options) => calls.push([name, options])]));
let canUndo = true, canRedo = true;
const undo = () => calls.push('undo'), redo = () => calls.push('redo');
function stub(name, exports) {
  const path = require.resolve(name);
  const mod = new Module(path);
  mod.exports = exports; mod.loaded = true; require.cache[path] = mod;
}
stub('react', { ...React, useEffect: (effect) => { cleanup?.(); cleanup = effect(); } });
stub('@xyflow/react', { useReactFlow: () => flow });
stub('@liveblocks/react/suspense', { useUndo: () => undo, useRedo: () => redo, useCanUndo: () => canUndo, useCanRedo: () => canRedo });
global.window = {
  addEventListener: (name, fn) => { assert.equal(name, 'keydown'); listener = fn; },
  removeEventListener: (name, fn) => { assert.equal(name, 'keydown'); assert.equal(fn, listener); listener = undefined; },
};
global.Element = class { closest() { return this.field; } };
global.HTMLElement = class extends Element {};
const { useKeyboardShortcuts } = require('../hooks/useKeyboardShortcuts.ts');
const { CanvasControls } = require('../components/editor/canvas-controls.tsx');
function key(key, options = {}) {
  let prevented = false;
  listener({ key, target: null, preventDefault: () => { prevented = true; }, ...options });
  return prevented;
}

test('all documented keyboard shortcuts use animated zoom and the correct history action', () => {
  useKeyboardShortcuts(flow, undo, redo);
  calls.length = 0;
  for (const value of ['+', '=', '-']) assert.equal(key(value), true);
  assert.deepEqual(calls.splice(0), [['zoomIn', { duration: 200 }], ['zoomIn', { duration: 200 }], ['zoomOut', { duration: 200 }]]);
  for (const modifier of ['ctrlKey', 'metaKey']) {
    key('z', { [modifier]: true }); key('Z', { [modifier]: true, shiftKey: true }); key('y', { [modifier]: true });
  }
  assert.deepEqual(calls.splice(0), ['undo', 'redo', 'redo', 'undo', 'redo', 'redo']);
  assert.equal(key('a'), false);
  assert.equal(key('+', { ctrlKey: true }), false);
  cleanup(); cleanup = undefined;
  assert.equal(listener, undefined);
});

test('editable fields and handled or composing events keep their native keyboard behavior', () => {
  useKeyboardShortcuts(flow, undo, redo);
  calls.length = 0;
  for (const field of ['input', 'textarea', 'textbox']) {
    const target = new HTMLElement(); target.field = field;
    assert.equal(key('z', { ctrlKey: true, target }), false);
    assert.equal(key('=', { target }), false);
  }
  const nestedEditable = new HTMLElement(); nestedEditable.isContentEditable = true;
  assert.equal(key('-', { target: nestedEditable }), false);
  for (const options of [{ defaultPrevented: true }, { isComposing: true }, { altKey: true }]) assert.equal(key('+', options), false);
  assert.deepEqual(calls, []);
});

test('five controls invoke React Flow and Liveblocks, with unavailable history dimmed and disabled', () => {
  calls.length = 0;
  const bar = CanvasControls();
  assert.match(bar.props.className, /bottom-24 left-6.*rounded-full/);
  const buttons = bar.props.children.filter((child) => child.type === 'button');
  assert.deepEqual(buttons.map((button) => button.props['aria-label']), ['Zoom out', 'Fit view', 'Zoom in', 'Undo', 'Redo']);
  for (const button of buttons) button.props.onClick();
  assert.deepEqual(calls.splice(0), [['zoomOut', { duration: 200 }], ['fitView', { duration: 200 }], ['zoomIn', { duration: 200 }], 'undo', 'redo']);
  canUndo = canRedo = false;
  const unavailable = CanvasControls().props.children.filter((child) => child.type === 'button').slice(3);
  assert.ok(unavailable.every((button) => button.props.disabled && button.props.className.includes('disabled:opacity-30')));
  key('z', { ctrlKey: true }); key('y', { metaKey: true });
  assert.deepEqual(calls, []);
});
