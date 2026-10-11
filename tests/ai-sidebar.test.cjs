/* eslint-disable @typescript-eslint/no-require-imports -- Exercise local chat UI state without browser or AI services. */
const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');
const { Module } = require('node:module');
const React = require('react');
let states, refs, stateIndex, refIndex, effects;
const reactPath = require.resolve('react');
const reactStub = new Module(reactPath);
reactStub.loaded = true;
reactStub.exports = { ...React,
  useState: (initial) => {
    const index = stateIndex++;
    if (!(index in states)) states[index] = initial;
    return [states[index], (value) => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
  },
  useRef: (initial) => { const index = refIndex++; return refs[index] ?? (refs[index] = { current: initial }); },
  useEffect: (effect) => effects.push(effect),
};
require.cache[reactPath] = reactStub;
const { AiSidebar, AiMessage, STARTER_PROMPTS } = require('../components/editor/ai-sidebar.tsx');
beforeEach(() => { states = []; refs = []; effects = []; stateIndex = refIndex = 0; });
function render(props = { isOpen: true, onClose() {} }) {
  stateIndex = refIndex = 0; effects = [];
  return AiSidebar(props);
}
function architect(sidebar) { return sidebar.props.children[1].props.children[1]; }
function form(sidebar) { return architect(sidebar).props.children[1]; }
function input(sidebar) { return form(sidebar).props.children[1]; }
function key(sidebar, options = {}) {
  let prevented = false, stopped = false;
  input(sidebar).props.onKeyDown({ key: 'Enter', nativeEvent: { isComposing: false }, keyCode: 13,
    preventDefault: () => { prevented = true; }, stopPropagation: () => { stopped = true; }, ...options });
  return { prevented, stopped };
}

test('floating shell stays parent-controlled with accessible slide-out and close action', () => {
  let closed = 0;
  const sidebar = render({ isOpen: true, onClose: () => { closed++; } });
  assert.match(sidebar.props.className, /absolute inset-y-3 right-3/);
  assert.match(sidebar.props.className, /bg-base\/95 shadow-xl/);
  assert.doesNotMatch(sidebar.props.className, /lg:static/);
  assert.equal(sidebar.props['aria-hidden'], false);
  sidebar.props.children[0].props.children[2].props.onClick();
  assert.equal(closed, 1);
  assert.equal(sidebar.props['aria-hidden'], false);
  const hidden = render({ isOpen: false, onClose() {} });
  assert.equal(hidden.props.inert, true);
  assert.equal(hidden.props['aria-hidden'], true);
  assert.match(hidden.props.className, /invisible translate-x-/);
});

test('Architect tab supplies all starter chips that fill and focus the composer without submitting', () => {
  let focused = 0;
  let sidebar = render();
  input(sidebar).props.ref.current = { focus: () => { focused++; }, style: {}, scrollHeight: 72 };
  for (const prompt of STARTER_PROMPTS) {
    sidebar = render();
    const chips = architect(sidebar).props.children[0].props.children[0].props.children[2].props.children;
    chips.find((chip) => chip.props.children === prompt).props.onClick();
    sidebar = render();
    assert.equal(input(sidebar).props.value, prompt);
    assert.equal(states[1].length, 0);
  }
  assert.equal(focused, 3);
});

test('Enter sends a trimmed local message once, clears draft, and empty input cannot submit', () => {
  let sidebar = render();
  assert.equal(form(sidebar).props.children[2].props.children[1].props.disabled, true);
  input(sidebar).props.onChange({ target: { value: '  Design services\nand storage  ' } });
  sidebar = render();
  assert.equal(form(sidebar).props.children[2].props.children[1].props.disabled, false);
  assert.deepEqual(key(sidebar), { prevented: true, stopped: true });
  sidebar = render();
  assert.equal(input(sidebar).props.value, '');
  assert.deepEqual(states[1], [{ id: 1, role: 'user', content: 'Design services\nand storage' }]);
  form(sidebar).props.onSubmit({ preventDefault() {} });
  assert.equal(states[1].length, 1);
  input(sidebar).props.onChange({ target: { value: 'Another question' } });
  form(render()).props.onSubmit({ preventDefault() {} });
  assert.equal(states[1][1].id, 2);
});

test('Shift+Enter and composing Enter preserve input, and chat key events stay isolated', () => {
  let sidebar = render();
  input(sidebar).props.onChange({ target: { value: 'Draft' } });
  sidebar = render();
  for (const options of [{ shiftKey: true }, { nativeEvent: { isComposing: true } }, { keyCode: 229 }, { key: 'z', ctrlKey: true }]) {
    assert.deepEqual(key(sidebar, options), { prevented: false, stopped: true });
  }
  assert.equal(states[1].length, 0);
  assert.equal(input(render()).props.value, 'Draft');
});

test('textarea resizes between 72px and 160px and chat scrolls to its newest message', () => {
  let sidebar = render();
  const textarea = { style: {}, scrollHeight: 25 };
  input(sidebar).props.ref.current = textarea;
  let scrolled = 0;
  architect(sidebar).props.children[0].props.children[1].props.ref.current = { scrollIntoView: () => { scrolled++; } };
  effects.forEach((effect) => effect());
  assert.equal(textarea.style.height, '72px');
  textarea.scrollHeight = 120; sidebar = render(); effects[0]();
  assert.equal(textarea.style.height, '120px');
  textarea.scrollHeight = 500; sidebar = render(); effects[0]();
  assert.equal(textarea.style.height, '160px');
  assert.equal(scrolled, 1);
  assert.match(input(sidebar).props.className, /overflow-y-auto/);
});

test('user and assistant message bubbles use the specified alignment and existing palette tokens', () => {
  const user = AiMessage({ role: 'user', content: 'Question' });
  const assistant = AiMessage({ role: 'assistant', content: 'Answer' });
  assert.match(user.props.className, /justify-end/);
  assert.match(user.props.children.props.className, /border-2 border-brand\/50 bg-accent-dim text-copy-primary/);
  assert.match(assistant.props.className, /justify-start/);
  assert.match(assistant.props.children.props.className, /border border-surface-border bg-elevated text-ai-text/);
});

test('Specs tab includes a static demo and disabled actions without adding generation logic', () => {
  const sidebar = render();
  const tabs = sidebar.props.children[1];
  const triggers = tabs.props.children[0].props.children.props.children;
  assert.deepEqual(triggers.map((trigger) => trigger.props.value), ['architect', 'specs']);
  assert.match(triggers[0].props.className, /data-active:bg-accent-dim data-active:text-brand/);
  assert.match(architect(sidebar).props.className, /data-\[state=inactive\]:hidden/);
  const specs = tabs.props.children[2];
  const [generate, card] = specs.props.children;
  assert.equal(generate.props.disabled, true);
  assert.match(generate.props.className, /bg-ai text-white/);
  assert.match(card.props.className, /border-surface-border bg-elevated/);
  assert.equal(card.props.children[2].props.disabled, true);
  assert.equal(card.props.children[2].props['aria-label'], 'Download demo spec');
});
