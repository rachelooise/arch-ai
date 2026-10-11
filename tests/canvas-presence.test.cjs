/* eslint-disable @typescript-eslint/no-require-imports -- Isolate Clerk and Liveblocks presence for rendering tests. */
const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');
const { Module } = require('node:module');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
let others = [], userId = 'clerk-self', avatarProps, failedImage = null;
let viewport = { x: 100, y: -40, zoom: 2 };
function stub(name, exports) {
  const path = require.resolve(name); const mod = new Module(path);
  mod.exports = exports; mod.loaded = true; require.cache[path] = mod;
}
stub('react', { ...React, useState: () => [failedImage, (value) => { failedImage = value; }] });
stub('@clerk/nextjs', {
  useAuth: () => ({ userId }),
  UserButton: (props) => { avatarProps = props; return React.createElement('button', { 'aria-label': 'Clerk user profile' }); },
});
stub('next/image', { default: (props) => React.createElement('img', { src: props.src, alt: props.alt }) });
stub('@liveblocks/react/suspense', {
  shallow: () => true,
  useOthersMapped: (selector) => others.map((other) => [other.connectionId, selector(other)]),
  useOthersConnectionIds: () => others.map((other) => other.connectionId),
  useOther: (id, selector) => selector(others.find((other) => other.connectionId === id)),
});
stub('@xyflow/react', { useViewport: () => viewport });
const { CanvasParticipants, CollaboratorAvatar, participantInitials } = require('../components/editor/canvas-participants.tsx');
const { CanvasCursors, ParticipantCursor } = require('../components/editor/canvas-cursors.tsx');
const { EditorNavbar } = require('../components/editor/editor-navbar.tsx');
function participant(connectionId, id, name, cursor = null, avatar = '') {
  return { connectionId, id, info: { name, avatar, color: '#52A8FF' }, presence: { cursor, thinking: false } };
}
function markup(Component) { return renderToStaticMarkup(React.createElement(Component)); }
beforeEach(() => { others = []; userId = 'clerk-self'; avatarProps = undefined; failedImage = null; viewport = { x: 100, y: -40, zoom: 2 }; });

test('solo canvas renders only Clerk profile without collaborator divider and uses 32px avatars', () => {
  const html = markup(CanvasParticipants);
  assert.match(html, /Room participants/);
  assert.match(html, /right-6 top-6/);
  assert.match(html, /Clerk user profile/);
  assert.doesNotMatch(html, /data-participant-divider|role="img"/);
  assert.equal(avatarProps.appearance.elements.avatarBox, 'size-8');
  assert.equal(avatarProps.appearance.elements.userButtonTrigger, 'size-8');
});

test('Clerk ID filters every self connection while collaborators remain display-only with one divider', () => {
  others = [participant(1, 'clerk-self', 'Self one'), participant(2, 'friend', 'Ada Lovelace'), participant(3, 'clerk-self', 'Self two')];
  const html = markup(CanvasParticipants);
  assert.doesNotMatch(html, /Self one|Self two/);
  assert.match(html, /aria-label="Ada Lovelace"/);
  assert.match(html, />AL<\/span>/);
  assert.equal((html.match(/data-participant-divider/g) || []).length, 1);
  assert.equal((html.match(/<button/g) || []).length, 1);
  assert.doesNotMatch(html, /tabindex|<a /);
  others = others.filter((other) => other.id === 'clerk-self');
  assert.doesNotMatch(markup(CanvasParticipants), /data-participant-divider/);
});

test('avatar stack caps at five collaborators and counts only remaining collaborators in overflow', () => {
  others = [participant(1, 'clerk-self', 'Self'), ...Array.from({ length: 7 }, (_, index) => participant(index + 2, `friend-${index}`, `Person ${index}`))];
  const html = markup(CanvasParticipants);
  assert.match(html, /-space-x-2/);
  assert.equal((html.match(/role="img"/g) || []).length, 6);
  assert.match(html, /aria-label="2 more collaborators"/);
  assert.match(html, />\+2<\/span>/);
  assert.match(html, /title="Person 5, Person 6"/);
  assert.doesNotMatch(html, /aria-label="Person 5"|aria-label="Person 6"|aria-label="Self"/);
});

test('profile photos fall back to initials on image failure, and missing names are safe', () => {
  const info = participant(1, 'friend', '  Ada   Lovelace ', null, 'https://example.com/avatar.png').info;
  let avatar = CollaboratorAvatar({ info });
  assert.equal(avatar.props.children.props.src, info.avatar);
  assert.match(avatar.props.className, /size-8.*ring-2/);
  avatar.props.children.props.onError();
  avatar = CollaboratorAvatar({ info });
  assert.equal(avatar.props.children, 'AL');
  assert.equal(participantInitials('Prince'), 'P');
  assert.equal(participantInitials(''), '?');
  assert.equal(participantInitials(' Ada Mary Lovelace '), 'AL');
});

test('unresolved Clerk session never displays self as a collaborator or cursor', () => {
  userId = undefined;
  others = [participant(1, 'clerk-self', 'Self', { x: 30, y: 40 })];
  assert.doesNotMatch(markup(CanvasParticipants), /data-participant-divider|aria-label="Self"/);
  assert.doesNotMatch(markup(CanvasCursors), /Self|translate/);
});

test('remote cursors follow viewport zoom/pan, use matching pointer and badge colors, and skip self/null cursors', () => {
  others = [participant(1, 'clerk-self', 'Self', { x: 10, y: 20 }), participant(2, 'friend', 'Ada', { x: 25, y: 50 }), participant(3, 'away', 'Away')];
  let html = markup(CanvasCursors);
  assert.match(html, /pointer-events-none/);
  assert.match(html, /translate\(150px, 60px\)/);
  assert.match(html, /fill="#52A8FF"/);
  assert.match(html, /background-color:#52A8FF/);
  assert.match(html, />Ada<\/span>/);
  assert.doesNotMatch(html, />Self<|>Away</);
  viewport = { x: -10, y: 20, zoom: 0.5 };
  html = markup(CanvasCursors);
  assert.match(html, /translate\(2.5px, 45px\)/);
  others[1].presence.cursor = null;
  assert.doesNotMatch(markup(CanvasCursors), />Ada</);
  others[1].presence.cursor = { x: NaN, y: 20 };
  assert.equal(ParticipantCursor({ connectionId: 2, currentUserId: userId }), null);
});

test('home and workspace navbar keep existing profile and actions without participant UI', () => {
  const props = { isSidebarOpen: false, isAiSidebarOpen: true, onToggleSidebar() {}, onToggleAiSidebar() {}, onShare() {}, onTemplates() {} };
  const home = renderToStaticMarkup(React.createElement(EditorNavbar, props));
  const workspace = renderToStaticMarkup(React.createElement(EditorNavbar, { ...props, projectName: 'Project' }));
  assert.match(home, /Clerk user profile/);
  assert.doesNotMatch(home, /Room participants|Open starter templates|Share project/);
  assert.doesNotMatch(workspace, /Room participants|data-participant-divider/);
  assert.match(workspace, /Open starter templates/);
  assert.match(workspace, /Share project/);
  assert.match(workspace, /Close AI sidebar/);
});
