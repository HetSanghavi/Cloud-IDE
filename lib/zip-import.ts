import { randomUUID } from "crypto";
import JSZip from "jszip";

export type ImportedFile = { id: string; name: string; kind: "file" | "folder"; content?: string; children?: ImportedFile[] };

export const ZIP_IMPORT_LIMITS = {
  maxUploadBytes: 8 * 1024 * 1024,
  maxEntries: 250,
  maxDepth: 8,
  maxTotalUncompressedBytes: 8 * 1024 * 1024,
  maxFileUncompressedBytes: 2 * 1024 * 1024,
  maxCompressionRatio: 100,
  maxStoredBytes: 8 * 1024 * 1024,
} as const;

const binaryMimes: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
};

const textExtensions = new Set(["html", "htm", "css", "js", "mjs", "cjs", "jsx", "ts", "tsx", "json", "txt", "md", "xml", "yml", "yaml", "webmanifest", "csv"]);

type ZipMetadata = { compressedSize?: number; uncompressedSize?: number };
type InspectableZipEntry = JSZip.JSZipObject & { _data?: ZipMetadata; internalStream(type: "uint8array"): JSZip.JSZipStreamHelper<Uint8Array> };
type EntryPlan = { entry: InspectableZipEntry; parts: string[]; extension: string; mime?: string; text: boolean; expectedSize: number };

function invalid(message: string): never {
  throw new Error(message);
}

function isSafePath(path: string) {
  return !path.startsWith("/") && !path.includes("\\") && !path.split("/").some(segment => !segment || segment === "." || segment === "..");
}

function safeSegment(segment: string) {
  const name = segment.trim();
  return Boolean(name) && name.length <= 100 && name !== "." && name !== ".." && !/[\\/:*?"<>|\u0000]/.test(name);
}

function dataUrlSize(byteLength: number, mime: string) {
  return `data:${mime};base64,`.length + 4 * Math.ceil(byteLength / 3);
}

function entryMetadata(entry: InspectableZipEntry) {
  const metadata = entry._data;
  const compressedSize = metadata?.compressedSize;
  const uncompressedSize = metadata?.uncompressedSize;
  if (typeof compressedSize !== "number" || typeof uncompressedSize !== "number" || !Number.isSafeInteger(compressedSize) || !Number.isSafeInteger(uncompressedSize) || compressedSize < 0 || uncompressedSize < 0) invalid("The ZIP contains invalid entry size metadata.");
  return { compressedSize, uncompressedSize };
}

function collectPlans(zip: JSZip) {
  const entries = Object.entries(zip.files);
  if (!entries.length || entries.length > ZIP_IMPORT_LIMITS.maxEntries) invalid("The ZIP must contain between 1 and 250 entries.");

  let totalUncompressed = 0;
  let estimatedStored = 0;
  const plans: EntryPlan[] = [];
  for (const [path, rawEntry] of entries) {
    const entry = rawEntry as InspectableZipEntry;
    const normalizedPath = rawEntry.dir && path.endsWith("/") ? path.slice(0, -1) : path;
    const unsafeOriginalName = entry.unsafeOriginalName || path;
    const originalPath = rawEntry.dir && unsafeOriginalName.endsWith("/") ? unsafeOriginalName.slice(0, -1) : unsafeOriginalName;
    if (!isSafePath(originalPath) || !isSafePath(normalizedPath)) invalid("The ZIP contains an unsafe file path.");
    const parts = normalizedPath.split("/");
    const folderDepth = rawEntry.dir ? parts.length : parts.length - 1;
    if (folderDepth > ZIP_IMPORT_LIMITS.maxDepth) invalid("The ZIP contains folders nested too deeply.");
    if (parts.some(segment => !safeSegment(segment))) invalid("The ZIP contains an invalid file name.");
    if (rawEntry.dir) continue;
    const { compressedSize, uncompressedSize } = entryMetadata(entry);
    if (uncompressedSize > ZIP_IMPORT_LIMITS.maxFileUncompressedBytes) invalid("A ZIP file exceeds the 2 MB per-file limit.");
    if (uncompressedSize > 0 && compressedSize === 0) invalid("The ZIP contains invalid compressed size metadata.");
    if (compressedSize > 0 && uncompressedSize / compressedSize > ZIP_IMPORT_LIMITS.maxCompressionRatio) invalid("The ZIP contains a suspicious compression ratio.");
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > ZIP_IMPORT_LIMITS.maxTotalUncompressedBytes) invalid("The ZIP exceeds the 8 MB uncompressed project limit.");
    const extension = parts.at(-1)?.split(".").pop()?.toLowerCase() || "";
    const mime = binaryMimes[extension];
    const text = !mime && textExtensions.has(extension);
    estimatedStored += text ? uncompressedSize : dataUrlSize(uncompressedSize, mime || "application/octet-stream");
    if (estimatedStored > ZIP_IMPORT_LIMITS.maxStoredBytes) invalid("The ZIP exceeds the 8 MB project storage limit.");
    plans.push({ entry, parts, extension, mime, text, expectedSize: uncompressedSize });
  }
  return plans;
}

async function readBoundedEntry(entry: InspectableZipEntry, expectedSize: number, totals: { uncompressed: number }) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let size = 0;
    let finished = false;
    const stream = entry.internalStream("uint8array");
    const fail = (message: string) => {
      if (finished) return;
      finished = true;
      stream.pause();
      reject(new Error(message));
    };
    stream
      .on("data", chunk => {
        const nextSize = size + chunk.length;
        const nextTotal = totals.uncompressed + chunk.length;
        if (nextSize > ZIP_IMPORT_LIMITS.maxFileUncompressedBytes) return fail("A ZIP file exceeds the 2 MB per-file limit.");
        if (nextTotal > ZIP_IMPORT_LIMITS.maxTotalUncompressedBytes) return fail("The ZIP exceeds the 8 MB uncompressed project limit.");
        size = nextSize;
        totals.uncompressed = nextTotal;
        chunks.push(chunk);
      })
      .on("error", cause => fail(cause.message || "Unable to read a ZIP entry."))
      .on("end", () => {
        if (finished) return;
        if (size !== expectedSize) return fail("The ZIP entry size does not match its metadata.");
        finished = true;
        const output = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          output.set(chunk, offset);
          offset += chunk.length;
        }
        resolve(output);
      })
      .resume();
  });
}

function addFile(root: ImportedFile[], plan: EntryPlan, content: string) {
  let level = root;
  for (let index = 0; index < plan.parts.length; index += 1) {
    const name = plan.parts[index];
    const final = index === plan.parts.length - 1;
    let current = level.find(item => item.name === name);
    if (!current) {
      current = { id: randomUUID(), name, kind: final ? "file" : "folder", content: final ? content : undefined, children: final ? undefined : [] };
      level.push(current);
    } else if ((final && current.kind !== "file") || (!final && current.kind !== "folder")) {
      invalid("The ZIP contains conflicting file and folder paths.");
    } else if (final) {
      invalid("The ZIP contains duplicate file paths.");
    }
    if (!final) level = current.children || [];
  }
}

export async function extractZipProject(data: ArrayBuffer | Uint8Array) {
  const zip = await JSZip.loadAsync(data, { checkCRC32: false });
  const plans = collectPlans(zip);
  const root: ImportedFile[] = [];
  const totals = { uncompressed: 0 };
  for (const plan of plans) {
    const bytes = await readBoundedEntry(plan.entry, plan.expectedSize, totals);
    const content = plan.text
      ? new TextDecoder("utf-8", { fatal: true }).decode(bytes)
      : `data:${plan.mime || "application/octet-stream"};base64,${Buffer.from(bytes).toString("base64")}`;
    addFile(root, plan, content);
  }
  return root;
}
