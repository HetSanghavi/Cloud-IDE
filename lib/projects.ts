import { FileKind, Prisma, Project, ProjectFile, Visibility } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export type ClientFile = { id?: string; name: string; kind: "file" | "folder"; content?: string; children?: ClientFile[] };

type StoredProject = Project & { files: ProjectFile[] };
type TreeNode = { id: string; name: string; kind: "file" | "folder"; content?: string; children: TreeNode[] };

export function serializeProject(project: StoredProject) {
  const map = new Map<string, TreeNode>(project.files.map(file => [file.id, { id: file.id, name: file.name, kind: file.kind === FileKind.FILE ? "file" : "folder", content: file.content || undefined, children: [] }]));
  const roots: TreeNode[] = [];
  project.files.forEach(file => {
    const node = map.get(file.id);
    if (!node) return;
    if (file.parentId) map.get(file.parentId)?.children.push(node);
    else roots.push(node);
  });
  const normalize = (nodes: TreeNode[]): unknown[] => nodes.map(node => node.kind === "folder" ? { id: node.id, name: node.name, kind: node.kind, children: normalize(node.children) } : { id: node.id, name: node.name, kind: node.kind, content: node.content || "" });
  return { id: project.id, shareId: project.shareId, name: project.name, template: project.template, visibility: project.visibility === Visibility.PUBLIC ? "public" : "private", color: project.color, revision: project.revision, createdAt: project.createdAt.toISOString(), updatedAt: project.updatedAt.toISOString(), files: normalize(roots) };
}

export function validateTree(files: ClientFile[]) {
  const ids = new Set<string>();
  let count = 0;
  let bytes = 0;
  const walk = (items: ClientFile[], depth: number) => {
    if (depth > 8) throw new Error("Folder nesting is limited to 8 levels.");
    const names = new Set<string>();
    items.forEach(file => {
      count += 1;
      if (count > 250) throw new Error("Projects are limited to 250 files and folders.");
      if (!file.name || file.name.length > 100 || /[\\/:*?"<>|\u0000]/.test(file.name) || file.name === "." || file.name === "..") throw new Error("A file name is invalid.");
      if (names.has(file.name)) throw new Error("Folder entries must have unique names.");
      names.add(file.name);
      if (file.id) {
        if (ids.has(file.id)) throw new Error("File identifiers must be unique.");
        ids.add(file.id);
      }
      if (file.kind === "file") {
        bytes += Buffer.byteLength(file.content || "", "utf8");
        if (bytes > 8 * 1024 * 1024) throw new Error("Projects are limited to 8 MB.");
      } else walk(file.children || [], depth + 1);
    });
  };
  walk(files, 0);
}

export async function replaceProjectFiles(tx: Prisma.TransactionClient, projectId: string, files: ClientFile[]) {
  await tx.projectFile.deleteMany({ where: { projectId } });
  const write = async (items: ClientFile[], parentId: string | null) => {
    for (const file of items) {
      const id = file.id || randomUUID();
      await tx.projectFile.create({ data: { id, projectId, parentId, name: file.name, kind: file.kind === "file" ? FileKind.FILE : FileKind.FOLDER, content: file.kind === "file" ? file.content || "" : null } });
      if (file.kind === "folder") await write(file.children || [], id);
    }
  };
  await write(files, null);
}

export async function writeProjectFiles(projectId: string, files: ClientFile[]) {
  validateTree(files);
  await prisma.$transaction(tx => replaceProjectFiles(tx, projectId, files));
}

export class ProjectSaveConflictError extends Error {
  constructor() {
    super("This project changed in another session.");
  }
}

export async function saveProjectWorkspace(userId: string, projectId: string, workspace: { name: string; template: string; color: string; visibility: "private" | "public"; revision: number; files: ClientFile[] }) {
  validateTree(workspace.files);
  return prisma.$transaction(async tx => {
    const updated = await tx.project.updateMany({
      where: { id: projectId, ownerId: userId, revision: workspace.revision },
      data: { name: workspace.name, template: workspace.template, color: workspace.color, visibility: workspace.visibility === "public" ? Visibility.PUBLIC : Visibility.PRIVATE, revision: { increment: 1 } },
    });
    if (updated.count !== 1) throw new ProjectSaveConflictError();
    await replaceProjectFiles(tx, projectId, workspace.files);
    return tx.project.findUniqueOrThrow({ where: { id: projectId }, include: { files: { orderBy: { createdAt: "asc" } } } });
  });
}

export async function ownedProject(userId: string, projectId: string) {
  return prisma.project.findFirst({ where: { id: projectId, ownerId: userId }, include: { files: { orderBy: { createdAt: "asc" } } } });
}

export async function cloneProject(source: StoredProject, ownerId: string) {
  return prisma.$transaction(async tx => {
    const clone = await tx.project.create({ data: { ownerId, name: `${source.name} — Copy`, template: source.template, color: source.color, visibility: Visibility.PRIVATE } });
    const cloneNode = async (file: ProjectFile, parentId: string | null) => {
      const created = await tx.projectFile.create({ data: { projectId: clone.id, parentId, name: file.name, kind: file.kind, content: file.content } });
      for (const child of source.files.filter(candidate => candidate.parentId === file.id)) await cloneNode(child, created.id);
    };
    for (const root of source.files.filter(file => !file.parentId)) await cloneNode(root, null);
    return tx.project.findUniqueOrThrow({ where: { id: clone.id }, include: { files: { orderBy: { createdAt: "asc" } } } });
  });
}
