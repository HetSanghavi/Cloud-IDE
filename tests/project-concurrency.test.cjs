const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const { NextRequest, NextResponse } = require("next/server");

const root = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;
const originalLoad = Module._load;
let apiUserId = null;

Module._resolveFilename = function(request, parent, isMain, options) {
  if (request.startsWith("@/")) return originalResolveFilename.call(this, path.join(root, request.slice(2)), parent, isMain, options);
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

Module._load = function(request, parent, isMain) {
  if (request === "@/lib/http") return { currentUserId: async () => apiUserId, error: (message, status) => NextResponse.json({ error: message }, { status }) };
  return originalLoad.call(this, request, parent, isMain);
};

require.extensions[".ts"] = function(module, filename) {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  module._compile(output, filename);
};

const { prisma } = require(path.join(root, "lib", "prisma.ts"));
const { cloneProject, ownedProject, ProjectSaveConflictError, saveProjectWorkspace, writeProjectFiles } = require(path.join(root, "lib", "projects.ts"));
const { PUT } = require(path.join(root, "app", "api", "projects", "[id]", "route.ts"));
const { GET: publicProject } = require(path.join(root, "app", "api", "public", "[shareId]", "route.ts"));
const createdUsers = [];
const createdProjects = [];
let sequence = 0;

function workspace(revision, content, fileId, visibility = "private") {
  return {
    name: "Concurrency test project",
    template: "blank",
    color: "violet",
    visibility,
    revision,
    files: [{ id: fileId, name: "index.html", kind: "file", content }],
  };
}

async function fixture() {
  sequence += 1;
  const user = await prisma.user.create({ data: { name: `Concurrency Test ${sequence}`, email: `concurrency-${Date.now()}-${sequence}@example.test`, passwordHash: "test" } });
  createdUsers.push(user.id);
  const project = await prisma.project.create({ data: { ownerId: user.id, name: "Concurrency test project", template: "blank", color: "violet" } });
  createdProjects.push(project.id);
  const fileId = `test-index-${sequence}`;
  await writeProjectFiles(project.id, workspace(1, "initial", fileId).files);
  return { user, project, fileId };
}

async function fileContent(userId, projectId) {
  const project = await ownedProject(userId, projectId);
  return project?.files.find(file => file.name === "index.html")?.content;
}

test.after(async () => {
  if (createdProjects.length) await prisma.project.deleteMany({ where: { id: { in: createdProjects } } });
  if (createdUsers.length) await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
  await prisma.$disconnect();
});

test("normal saves accept the current revision and increment it", async () => {
  const { user, project, fileId } = await fixture();
  const saved = await saveProjectWorkspace(user.id, project.id, workspace(project.revision, "first save", fileId));
  assert.equal(saved.revision, project.revision + 1);
  assert.equal(await fileContent(user.id, project.id), "first save");
});

test("a stale save is rejected without changing files", async () => {
  const { user, project, fileId } = await fixture();
  await saveProjectWorkspace(user.id, project.id, workspace(project.revision, "newer save", fileId));
  await assert.rejects(() => saveProjectWorkspace(user.id, project.id, workspace(project.revision, "stale overwrite", fileId)), ProjectSaveConflictError);
  assert.equal(await fileContent(user.id, project.id), "newer save");
});

test("sequential saves using returned revisions both succeed", async () => {
  const { user, project, fileId } = await fixture();
  const first = await saveProjectWorkspace(user.id, project.id, workspace(project.revision, "first", fileId));
  const second = await saveProjectWorkspace(user.id, project.id, workspace(first.revision, "second", fileId));
  assert.equal(second.revision, project.revision + 2);
  assert.equal(await fileContent(user.id, project.id), "second");
});

test("two concurrent saves using one revision allow exactly one winner", async () => {
  const { user, project, fileId } = await fixture();
  const results = await Promise.allSettled([
    saveProjectWorkspace(user.id, project.id, workspace(project.revision, "session-a", fileId)),
    saveProjectWorkspace(user.id, project.id, workspace(project.revision, "session-b", fileId)),
  ]);
  const successful = results.filter(result => result.status === "fulfilled");
  const rejected = results.filter(result => result.status === "rejected");
  assert.equal(successful.length, 1);
  assert.equal(rejected.length, 1);
  assert.ok(rejected[0].reason instanceof ProjectSaveConflictError);
  assert.ok(["session-a", "session-b"].includes(await fileContent(user.id, project.id)));
  const latest = await ownedProject(user.id, project.id);
  assert.equal(latest?.revision, project.revision + 1);
});

test("an autosave-style follow-up uses the accepted revision", async () => {
  const { user, project, fileId } = await fixture();
  const first = await saveProjectWorkspace(user.id, project.id, workspace(project.revision, "typed once", fileId));
  const autosaved = await saveProjectWorkspace(user.id, project.id, workspace(first.revision, "typed twice", fileId));
  assert.equal(autosaved.revision, first.revision + 1);
  assert.equal(await fileContent(user.id, project.id), "typed twice");
});

test("visibility is persisted before the accepted project reports public", async () => {
  const { user, project, fileId } = await fixture();
  const saved = await saveProjectWorkspace(user.id, project.id, workspace(project.revision, "public content", fileId, "public"));
  const latest = await ownedProject(user.id, project.id);
  assert.equal(saved.visibility, "PUBLIC");
  assert.equal(latest?.visibility, "PUBLIC");
  assert.equal(latest?.revision, project.revision + 1);
  const publicResponse = await publicProject(new NextRequest(`http://localhost/api/public/${project.shareId}`), { params: Promise.resolve({ shareId: project.shareId }) });
  assert.equal(publicResponse.status, 200);
  const privateSaved = await saveProjectWorkspace(user.id, project.id, workspace(saved.revision, "private content", fileId, "private"));
  assert.equal(privateSaved.visibility, "PRIVATE");
  const privateResponse = await publicProject(new NextRequest(`http://localhost/api/public/${project.shareId}`), { params: Promise.resolve({ shareId: project.shareId }) });
  assert.equal(privateResponse.status, 404);
});

test("project duplication creates an independent complete copy", async () => {
  const { user, project } = await fixture();
  const source = await ownedProject(user.id, project.id);
  const duplicate = await cloneProject(source, user.id);
  createdProjects.push(duplicate.id);
  assert.notEqual(duplicate.id, project.id);
  assert.equal(duplicate.files.length, source.files.length);
  assert.equal(duplicate.ownerId, user.id);
  assert.equal(duplicate.visibility, "PRIVATE");
  const original = await ownedProject(user.id, project.id);
  assert.equal(original?.files.find(file => file.name === "index.html")?.content, "initial");
});

test("the API returns a distinct conflict response without overwriting the newer tree", async () => {
  const { user, project, fileId } = await fixture();
  apiUserId = user.id;
  const first = new NextRequest(`http://localhost/api/projects/${project.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(workspace(project.revision, "accepted", fileId)) });
  const stale = new NextRequest(`http://localhost/api/projects/${project.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(workspace(project.revision, "rejected", fileId)) });
  assert.equal((await PUT(first, { params: Promise.resolve({ id: project.id }) })).status, 200);
  const response = await PUT(stale, { params: Promise.resolve({ id: project.id }) });
  const body = await response.json();
  assert.equal(response.status, 409);
  assert.equal(body.code, "PROJECT_CONFLICT");
  assert.equal(body.project.revision, project.revision + 1);
  assert.equal(await fileContent(user.id, project.id), "accepted");
  apiUserId = null;
});

test("ownership remains part of the atomic revision check", async () => {
  const { user, project, fileId } = await fixture();
  sequence += 1;
  const otherUser = await prisma.user.create({ data: { name: "Other User", email: `concurrency-other-${Date.now()}-${sequence}@example.test`, passwordHash: "test" } });
  createdUsers.push(otherUser.id);
  await assert.rejects(() => saveProjectWorkspace(otherUser.id, project.id, workspace(project.revision, "unauthorized", fileId)), ProjectSaveConflictError);
  assert.equal(await fileContent(user.id, project.id), "initial");
});

test("the save route keeps authentication and ownership responses unchanged", async () => {
  const { user, project, fileId } = await fixture();
  sequence += 1;
  const otherUser = await prisma.user.create({ data: { name: "Route Other User", email: `concurrency-route-${Date.now()}-${sequence}@example.test`, passwordHash: "test" } });
  createdUsers.push(otherUser.id);
  const request = () => new NextRequest(`http://localhost/api/projects/${project.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(workspace(project.revision, "unauthorized", fileId)) });
  apiUserId = null;
  assert.equal((await PUT(request(), { params: Promise.resolve({ id: project.id }) })).status, 401);
  apiUserId = otherUser.id;
  assert.equal((await PUT(request(), { params: Promise.resolve({ id: project.id }) })).status, 404);
  apiUserId = null;
  assert.equal(await fileContent(user.id, project.id), "initial");
});

test("the client save flow sends revisions, preserves dirty tabs on conflicts, and previews open-tab edits", () => {
  const source = fs.readFileSync(path.join(root, "components", "cloud-ide.tsx"), "utf8");
  assert.match(source, /revision: latest\.revision/);
  assert.match(source, /PROJECT_CONFLICT/);
  assert.match(source, /Your local changes are still here but were not saved/);
  assert.doesNotMatch(source, /const saveAll = \(\) => \{[^}]*dirty: false/);
  assert.match(source, /previewDocument\(active, tabs, previewChannel\.current\)/);
});
