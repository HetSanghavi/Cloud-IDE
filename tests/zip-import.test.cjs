const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const JSZip = require("jszip");

const root = path.resolve(__dirname, "..");
const buildDirectory = path.join(__dirname, ".zip-import-build");

fs.rmSync(buildDirectory, { recursive: true, force: true });
fs.mkdirSync(buildDirectory, { recursive: true });
execFileSync(process.execPath, [path.join(root, "node_modules", "typescript", "bin", "tsc"), path.join(root, "lib", "zip-import.ts"), path.join(root, "lib", "zip-export.ts"), "--outDir", buildDirectory, "--module", "commonjs", "--target", "es2020", "--moduleResolution", "node", "--esModuleInterop", "--skipLibCheck"], { cwd: root, stdio: "inherit" });
const { extractZipProject, ZIP_IMPORT_LIMITS } = require(path.join(buildDirectory, "zip-import.js"));
const { exportProjectZip } = require(path.join(buildDirectory, "zip-export.js"));

test.after(() => fs.rmSync(buildDirectory, { recursive: true, force: true }));

async function archive(files, options = {}) {
  const zip = new JSZip();
  for (const [name, value] of Object.entries(files)) zip.file(name, value, options);
  return zip.generateAsync({ type: "nodebuffer", compression: options.compression || "STORE" });
}

function setCentralDirectoryUncompressedSize(buffer, fileName, uncompressedSize) {
  let offset = 0;
  while (offset < buffer.length) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      offset += 1;
      continue;
    }
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    if (buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8") === fileName) {
      buffer.writeUInt32LE(uncompressedSize, offset + 24);
      return;
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`Central directory entry not found: ${fileName}`);
}

function fileAt(files, names) {
  let level = files;
  let current;
  for (const name of names) {
    current = level.find(item => item.name === name);
    level = current?.children || [];
  }
  return current;
}

test("rejects a small archive whose central-directory metadata declares an oversized entry", async () => {
  const bytes = await archive({ "index.html": "x".repeat(32 * 1024) });
  setCentralDirectoryUncompressedSize(bytes, "index.html", ZIP_IMPORT_LIMITS.maxFileUncompressedBytes + 1);
  await assert.rejects(() => extractZipProject(bytes), /2 MB per-file limit/);
});

test("rejects a genuinely oversized single entry before extraction", async () => {
  const bytes = await archive({ "large.txt": "x".repeat(ZIP_IMPORT_LIMITS.maxFileUncompressedBytes + 1) });
  await assert.rejects(() => extractZipProject(bytes), /2 MB per-file limit/);
});

test("rejects suspicious compression ratios before extraction", async () => {
  const bytes = await archive({ "repeated.txt": "a".repeat(256 * 1024) }, { compression: "DEFLATE" });
  await assert.rejects(() => extractZipProject(bytes), /suspicious compression ratio/);
});

test("rejects excessive total uncompressed metadata before extraction", async () => {
  const bytes = await archive({ "one.txt": "a".repeat(32 * 1024), "two.txt": "b".repeat(32 * 1024), "three.txt": "c".repeat(32 * 1024), "four.txt": "d".repeat(32 * 1024), "five.txt": "e".repeat(32 * 1024) });
  for (const name of ["one.txt", "two.txt", "three.txt", "four.txt", "five.txt"]) setCentralDirectoryUncompressedSize(bytes, name, 2 * 1024 * 1024);
  await assert.rejects(() => extractZipProject(bytes), /8 MB uncompressed project limit/);
});

test("rejects excessive archive entry counts", async () => {
  const files = Object.fromEntries(Array.from({ length: ZIP_IMPORT_LIMITS.maxEntries + 1 }, (_, index) => [`file-${index}.txt`, ""]));
  const bytes = await archive(files);
  await assert.rejects(() => extractZipProject(bytes), /between 1 and 250 entries/);
});

test("rejects excessive directory nesting", async () => {
  const pathName = `${Array.from({ length: ZIP_IMPORT_LIMITS.maxDepth + 1 }, (_, index) => `level-${index}`).join("/")}/index.html`;
  const bytes = await archive({ [pathName]: "<h1>nested</h1>" });
  await assert.rejects(() => extractZipProject(bytes), /nested too deeply/);
});

test("rejects excessive nesting represented by directory entries", async () => {
  const zip = new JSZip();
  zip.folder(Array.from({ length: ZIP_IMPORT_LIMITS.maxDepth + 1 }, (_, index) => `level-${index}`).join("/"));
  const bytes = await zip.generateAsync({ type: "nodebuffer", compression: "STORE" });
  await assert.rejects(() => extractZipProject(bytes), /nested too deeply/);
});

test("rejects traversal paths using JSZip's original entry name", async () => {
  const bytes = await archive({ "../../outside.txt": "no" });
  await assert.rejects(() => extractZipProject(bytes), /unsafe file path/);
});

test("rejects absolute paths", async () => {
  const bytes = await archive({ "/outside.txt": "no" });
  await assert.rejects(() => extractZipProject(bytes), /unsafe file path/);
});

test("imports normal HTML, CSS, and JavaScript files", async () => {
  const files = await extractZipProject(await archive({ "index.html": "<main>Hello</main>", "assets/style.css": "body { color: teal; }", "assets/app.js": "console.log('ready');" }));
  assert.equal(fileAt(files, ["index.html"]).content, "<main>Hello</main>");
  assert.equal(fileAt(files, ["assets", "style.css"]).content, "body { color: teal; }");
  assert.equal(fileAt(files, ["assets", "app.js"]).content, "console.log('ready');");
});

test("preserves small binary assets as base64 data URLs", async () => {
  const asset = new Uint8Array([0, 255, 17, 34, 128]);
  const files = await extractZipProject(await archive({ "assets/icon.png": asset }));
  const content = fileAt(files, ["assets", "icon.png"]).content;
  assert.equal(content, `data:image/png;base64,${Buffer.from(asset).toString("base64")}`);
});

test("preserves unknown binary assets across import and export", async () => {
  const asset = new Uint8Array([0, 255, 17, 34, 128, 64, 7]);
  const imported = await extractZipProject(await archive({ "assets/custom.bin": asset }));
  const folder = fileAt(imported, ["assets"]);
  const binary = fileAt(imported, ["assets", "custom.bin"]);
  const exported = await exportProjectZip([{ id: folder.id, parentId: null, name: folder.name, kind: "FOLDER", content: null }, { id: binary.id, parentId: folder.id, name: binary.name, kind: "FILE", content: binary.content }]);
  const reimported = await extractZipProject(exported);
  assert.equal(fileAt(reimported, ["assets", "custom.bin"]).content, binary.content);
});
