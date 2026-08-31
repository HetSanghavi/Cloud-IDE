import { OpenFile, ProjectFile } from "@/lib/types";

export function collectNodeIds(node: ProjectFile): string[] {
  return [node.id, ...(node.children || []).flatMap(collectNodeIds)];
}

export function deletionConfirmationMessage(node: ProjectFile, tabs: OpenFile[]): string {
  const descendants = collectNodeIds(node).length - 1;
  const affectedTabs = tabs.filter(tab => collectNodeIds(node).includes(tab.id));
  const unsaved = affectedTabs.some(tab => tab.dirty);

  if (node.kind === "folder" && descendants > 0) {
    const itemLabel = descendants === 1 ? "item" : "items";
    const openLabel = affectedTabs.length === 1 ? "open file" : "open files";
    return `Delete folder “${node.name}” and its ${descendants} descendant ${itemLabel}? All files and subfolders inside it will be deleted.${affectedTabs.length ? ` ${affectedTabs.length} ${openLabel} will be closed.` : ""}${unsaved ? " Unsaved edits in those files will be discarded." : ""}`;
  }

  if (node.kind === "folder") {
    return `Delete empty folder “${node.name}”?`;
  }

  return `Delete “${node.name}”?${unsaved ? " Unsaved edits in this file will be discarded." : ""}`;
}
