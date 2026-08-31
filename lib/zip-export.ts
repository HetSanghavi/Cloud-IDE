import JSZip from "jszip";

export type ExportedProjectFile = { id: string; parentId: string | null; name: string; kind: "FILE" | "FOLDER"; content: string | null };

export async function exportProjectZip(files: ExportedProjectFile[]) {
  const zip = new JSZip();
  const nodes = new Map(files.map(file => [file.id, file]));
  const pathFor = (id: string): string => {
    const file = nodes.get(id);
    if (!file) return "";
    return file.parentId ? `${pathFor(file.parentId)}${file.name}/` : `${file.name}/`;
  };
  files.filter(file => file.kind === "FILE").forEach(file => {
    const prefix = file.parentId ? pathFor(file.parentId) : "";
    const match = file.content?.match(/^data:[^;]+;base64,(.+)$/s);
    zip.file(`${prefix}${file.name}`, match ? match[1] : file.content || "", match ? { base64: true } : undefined);
  });
  return zip.generateAsync({ type: "uint8array" });
}
