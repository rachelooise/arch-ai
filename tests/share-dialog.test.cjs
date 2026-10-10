/* eslint-disable @typescript-eslint/no-require-imports -- Render dialog content with isolated hook state and portal boundaries. */
const assert = require("node:assert/strict");
const { beforeEach, test } = require("node:test");
const { Module } = require("node:module");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
let sharing;

function replaceModule(name, exports) {
  const path = require.resolve(name);
  const stubModule = new Module(path);
  stubModule.exports = exports;
  stubModule.loaded = true;
  require.cache[path] = stubModule;
}
replaceModule("../hooks/use-project-sharing.ts", { useProjectSharing: () => sharing });
replaceModule("../components/ui/dialog.tsx", Object.fromEntries([
  "Dialog", "DialogContent", "DialogHeader", "DialogTitle", "DialogDescription",
].map((name) => [name, ({ children }) => React.createElement("div", null, children)])));
const { ShareDialog } = require("../components/editor/share-dialog.tsx");
function markup() {
  return renderToStaticMarkup(React.createElement(ShareDialog, {
    project: { id: "room", name: "Architecture", owned: true }, onClose() {},
  }));
}
beforeEach(() => {
  sharing = {
    data: { isOwner: true, collaborators: [
      { id: "known", email: "known@example.com", displayName: "Known Person", imageUrl: "https://img.clerk.com/person.png" },
      { id: "unknown", email: "unknown@example.com", displayName: null, imageUrl: null },
    ] },
    email: "", isLoading: false, isSaving: false, error: null, copied: false,
    setEmail() {}, mutate() {}, reload() {}, copyLink() {},
  };
});

test("owners see invite, remove, profile enrichment, and copy-link controls", () => {
  const html = markup();
  assert.match(html, /Share Architecture/);
  assert.match(html, /Invite by email/);
  assert.match(html, /Remove known@example.com/);
  assert.match(html, /Known Person/);
  assert.match(html, /img.clerk.com\/person.png/);
  assert.match(html, /unknown@example.com/);
  assert.match(html, /Copy project link/);
});

test("collaborators see only the list even if stale local props claim ownership", () => {
  sharing.data.isOwner = false;
  const html = markup();
  assert.match(html, /Known Person/);
  assert.match(html, /unknown@example.com/);
  assert.doesNotMatch(html, /Invite by email|<form|Remove known|Copy project link/);
});

test("copy feedback renders Copied! only after success", () => {
  assert.doesNotMatch(markup(), /Copied!/);
  sharing.copied = true;
  assert.match(markup(), /Copied!/);
  sharing.copied = false;
  assert.match(markup(), /Copy project link/);
});

test("loading state hides management controls until server permissions arrive", () => {
  sharing.data = null;
  sharing.isLoading = true;
  const html = markup();
  assert.match(html, /Loading collaborators/);
  assert.doesNotMatch(html, /Invite by email|<form|Copy project link/);
});

test("failed loads show an error and reload action", () => {
  sharing.data = null;
  sharing.error = "Forbidden";
  assert.match(markup(), /Forbidden/);
  assert.match(markup(), /Reload collaborators/);
});
