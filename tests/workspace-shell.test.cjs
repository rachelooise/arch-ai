/* eslint-disable @typescript-eslint/no-require-imports -- Render the shell with isolated Clerk/router dependencies using tsx. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { Module } = require("node:module");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

let roomId;
function replaceModule(name, exports) {
  const path = require.resolve(name);
  const stubModule = new Module(path);
  stubModule.exports = exports;
  stubModule.loaded = true;
  require.cache[path] = stubModule;
}
replaceModule("next/navigation", {
  useParams: () => roomId ? { roomId } : {},
  usePathname: () => roomId ? `/editor/${roomId}` : "/editor",
  useRouter: () => ({ push() {}, replace() {}, refresh() {} }),
});
replaceModule("@clerk/nextjs", { UserButton: () => null });

const { EditorShell } = require("../components/editor/editor-shell.tsx");
const { AiSidebar } = require("../components/editor/ai-sidebar.tsx");
const ownedProjects = [{ id: "owned", name: "Owned project", owned: true }];
const sharedProjects = [{ id: "shared", name: "Shared project", owned: false }];

function shellMarkup() {
  return renderToStaticMarkup(React.createElement(EditorShell, { ownedProjects, sharedProjects }, "Canvas placeholder"));
}

test("workspace shell shows project context, placeholders, share action, and current room", () => {
  roomId = "owned";
  const markup = shellMarkup();
  assert.match(markup, /<h1[^>]*>Owned project<\/h1>/);
  assert.match(markup, /aria-label="Share project"/);
  assert.match(markup, /aria-label="Open starter templates"/);
  assert.doesNotMatch(markup, /aria-label="Share project"[^>]*disabled/);
  assert.match(markup, /aria-label="Close AI sidebar"/);
  assert.match(markup, /aria-controls="workspace-ai-sidebar"/);
  assert.match(markup, /AI Workspace/);
  assert.match(markup, /Collaborate with Ghost AI/);
  assert.match(markup, /aria-current="page"[^>]*>Owned project<\/a>/);
  assert.match(markup, /Canvas placeholder/);
});

test("shared workspace selects its tab and highlights the current room", () => {
  roomId = "shared";
  const markup = shellMarkup();
  assert.match(markup, /<h1[^>]*>Shared project<\/h1>/);
  assert.match(markup, /aria-current="page"[^>]*>Shared project<\/a>/);
  assert.doesNotMatch(markup, /aria-label="Rename Shared project"|aria-label="Delete Shared project"/);
});

test("editor home retains project chrome without workspace actions or AI panel", () => {
  roomId = undefined;
  const markup = shellMarkup();
  assert.doesNotMatch(markup, /Share project|Open starter templates|AI Workspace|aria-current="page"/);
  assert.match(markup, /New Project/);
});

test("closed AI workspace remains mounted for its slide transition but is inert and hidden from accessibility", () => {
  const markup = renderToStaticMarkup(React.createElement(AiSidebar, { isOpen: false, onClose() {} }));
  assert.match(markup, /aria-hidden="true"/);
  assert.match(markup, /inert=""/);
  assert.match(markup, /invisible translate-x-/);
  assert.match(markup, /transition-\[translate,visibility\]/);
});
test("save failures show a visible accessible explanation and retry action", () => {
  const { EditorNavbar } = require("../components/editor/editor-navbar.tsx");
  const { CanvasSaveContext } = require("../components/editor/canvas-save-context.tsx");
  const props = { projectName: "Project", isSidebarOpen: false, isAiSidebarOpen: false,
    onToggleSidebar() {}, onToggleAiSidebar() {}, onShare() {}, onTemplates() {} };
  const render = (status, error) => renderToStaticMarkup(React.createElement(CanvasSaveContext.Provider,
    { value: { state: { status, error, onSave() {} }, setState() {} } }, React.createElement(EditorNavbar, props)));
  const markup = render("error", "Canvas storage access was denied.");
  assert.match(markup, /role="alert"/);
  assert.match(markup, /Canvas storage access was denied\./);
  assert.match(markup, />Retry<\/button>/);
  assert.doesNotMatch(render("saved", null), /role="alert"|>Retry<\/button>/);
});
