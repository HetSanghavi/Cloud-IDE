const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request.startsWith("@/")) return originalResolveFilename.call(this, path.join(root, request.slice(2)), parent, isMain, options);
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
require.extensions[".ts"] = function(module, filename) {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  module._compile(output, filename);
};

const { applySessionUpdate, applyTokenToSession } = require(path.join(root, "lib", "session.ts"));
const { clearRateLimit, isRateLimited } = require(path.join(root, "lib", "security.ts"));
const { collectNodeIds, deletionConfirmationMessage } = require(path.join(root, "lib", "project-deletion.ts"));

test("profile email updates propagate through the JWT and session", () => {
  const token = applySessionUpdate({ sub: "user-1", name: "Before", email: "before@example.test" }, { name: "After", email: "after@example.test" });
  const session = applyTokenToSession({ user: { name: "Before", email: "before@example.test" } }, token);
  assert.equal(session.user.name, "After");
  assert.equal(session.user.email, "after@example.test");
});

test("login-rate-limit buckets reject repeated attempts and reset after a successful login", () => {
  const key = `login-test-${Date.now()}`;
  assert.equal(isRateLimited(key, 2, 60_000), false);
  assert.equal(isRateLimited(key, 2, 60_000), false);
  assert.equal(isRateLimited(key, 2, 60_000), true);
  clearRateLimit(key);
  assert.equal(isRateLimited(key, 2, 60_000), false);
});

test("folder deletion confirmation describes descendants and preserves cancel-before-mutation safeguards", () => {
  const empty = { id: "empty", name: "empty", kind: "folder", children: [] };
  const nested = { id: "folder", name: "assets", kind: "folder", children: [{ id: "image", name: "image.png", kind: "file", content: "" }, { id: "nested", name: "nested", kind: "folder", children: [{ id: "script", name: "script.js", kind: "file", content: "" }] }] };
  const tabs = [{ id: "image", name: "image.png", content: "", dirty: false }, { id: "script", name: "script.js", content: "edited", dirty: true }, { id: "outside", name: "index.html", content: "", dirty: false }];
  assert.deepEqual(collectNodeIds(empty), ["empty"]);
  assert.deepEqual(collectNodeIds(nested), ["folder", "image", "nested", "script"]);
  assert.match(deletionConfirmationMessage(empty, tabs), /Delete empty folder/);
  const message = deletionConfirmationMessage(nested, tabs);
  assert.match(message, /3 descendant items/);
  assert.match(message, /2 open files will be closed/);
  assert.match(message, /Unsaved edits in those files will be discarded/);
  const source = fs.readFileSync(path.join(root, "components", "cloud-ide.tsx"), "utf8");
  assert.match(source, /collectNodeIds/);
  assert.match(source, /deletionConfirmationMessage\(node, tabs\)/);
  assert.match(source, /setNodePendingDeletion\(node\)/);
  assert.match(source, /const confirmNodeDeletion/);
  assert.match(source, /<DeleteNodeModal/);
  assert.match(source, /list\.filter\(tab => !removed\.has\(tab\.id\)\)/);
  assert.match(source, /Save failed/);
  assert.match(source, /Retry save/);
  assert.match(source, /Your local edits are still available/);
  assert.doesNotMatch(source, /const saveAll = \(\) => \{[^}]*dirty: false/);
});

test("visibility changes wait for server confirmation before updating the displayed project", () => {
  const source = fs.readFileSync(path.join(root, "components", "cloud-ide.tsx"), "utf8");
  assert.match(source, /visibilityRequests\.current\[source\.id\] = visibility/);
  assert.match(source, /saved\.visibility === visibility/);
  assert.match(source, /Project is now public/);
});

test("dashboard project menus close outside their active card and expose sharing", () => {
  const source = fs.readFileSync(path.join(root, "components", "cloud-ide.tsx"), "utf8");
  assert.match(source, /const menuRef = useRef<HTMLDivElement>\(null\)/);
  assert.match(source, /document\.addEventListener\("pointerdown", closeMenu\)/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /onShare\(project\)/);
  assert.match(source, /<Icon name="share" \/>Share/);
});
