"use client";

import Editor from "@monaco-editor/react";
import { ChangeEvent, CSSProperties, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { loginFormMessage } from "@/lib/auth-messages";
import { collectNodeIds, deletionConfirmationMessage } from "@/lib/project-deletion";
import { templateMeta } from "@/lib/templates";
import { OpenFile, Project, ProjectFile, TemplateKey } from "@/lib/types";

type IconName = "grid" | "folder" | "plus" | "search" | "more" | "sun" | "moon" | "chevron" | "file" | "play" | "refresh" | "external" | "save" | "share" | "download" | "upload" | "copy" | "trash" | "settings" | "x" | "monitor" | "tablet" | "mobile" | "arrow" | "check" | "code" | "user" | "logout" | "sort";

const shapes: Record<IconName, string> = {
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z", folder: "M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", plus: "M12 5v14M5 12h14", search: "m21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0", more: "M5 12h.01M12 12h.01M19 12h.01", sun: "M12 3v2m0 14v2M3 12h2m14 0h2m-3.64-5.64 1.42-1.42M5.22 18.78l1.42-1.42m0-10.72L5.22 5.22m13.56 13.56-1.42-1.42M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0", moon: "M20.8 15.3A8.8 8.8 0 0 1 8.7 3.2 8.8 8.8 0 1 0 20.8 15.3z", chevron: "m9 18 6-6-6-6", file: "M6 2h8l4 4v16H6zM14 2v5h5", play: "m8 5 11 7-11 7z", refresh: "M20 11a8 8 0 1 0 2 5.2M20 4v7h-7", external: "M14 4h6v6M20 4l-9 9M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6", save: "M5 3h12l3 3v15H4V4a1 1 0 0 1 1-1zm2 0v6h8V3m-7 18v-7h8v7", share: "M15 8l-6 4 6 4M3 12h12M18 4l3 4-3 4", download: "M12 3v12m0 0 4-4m-4 4-4-4M4 18v2h16v-2", upload: "M12 21V9m0 0 4 4m-4-4-4 4M4 4v2h16V4", copy: "M8 8h11v12H8zM5 16H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v1", trash: "M4 7h16M10 11v6m4-6v6M9 7l1-3h4l1 3m-9 0 1 14h10l1-14", settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm0-12.5v2m0 14v2m9-9h-2M5 12H3m15.36 6.36-1.42-1.42M6.06 6.06 4.64 4.64m13.72 0-1.42 1.42M6.06 17.94l-1.42 1.42", x: "M6 6l12 12M18 6 6 18", monitor: "M3 4h18v12H3zM8 20h8m-4-4v4", tablet: "M6 3h12v18H6zM11 18h2", mobile: "M8 2h8v20H8zM11 19h2", arrow: "M5 12h14m-6-6 6 6-6 6", check: "m5 12 4 4L19 6", code: "m8 9-3 3 3 3m8-6 3 3-3 3", user: "M20 21a8 8 0 0 0-16 0m12-12a4 4 0 1 1-8 0 4 4 0 0 1 8 0", logout: "M10 17l5-5-5-5m5 5H3m11-8h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4", sort: "M4 7h16M7 12h10m-7 5h4"
};

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={shapes[name]} /></svg>;
}

const colors = ["violet", "orange", "blue", "pink"];
const initialUser = { name: "Creator", email: "" };
const uid = () => typeof crypto !== "undefined" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const stamp = () => new Date().toISOString();
const flatFiles = (items: ProjectFile[]): ProjectFile[] => items.flatMap(item => item.kind === "file" ? [item] : flatFiles(item.children || []));
const filePaths = (items: ProjectFile[], prefix = ""): [string, ProjectFile][] => items.flatMap(item => item.kind === "file" ? [[`${prefix}${item.name}`, item] as [string, ProjectFile]] : filePaths(item.children || [], `${prefix}${item.name}/`));
const findFile = (items: ProjectFile[], id: string): ProjectFile | undefined => {
  for (const item of items) {
    if (item.id === id) return item;
    const found = item.children && findFile(item.children, id);
    if (found) return found;
  }
};
const updateFile = (items: ProjectFile[], id: string, changes: Partial<ProjectFile>): ProjectFile[] => items.map(item => item.id === id ? { ...item, ...changes } : item.children ? { ...item, children: updateFile(item.children, id, changes) } : item);
const removeFile = (items: ProjectFile[], id: string): ProjectFile[] => items.filter(item => item.id !== id).map(item => item.children ? { ...item, children: removeFile(item.children, id) } : item);
const addToFolder = (items: ProjectFile[], parent: string | null, item: ProjectFile): ProjectFile[] => parent === null ? [...items, item] : items.map(node => node.id === parent && node.kind === "folder" ? { ...node, children: [...(node.children || []), item] } : node.children ? { ...node, children: addToFolder(node.children, parent, item) } : node);
const folderDestinations = (items: ProjectFile[], prefix = "", output: { id: string | null; label: string }[] = [{ id: null, label: "/" }]) => { items.filter(item => item.kind === "folder").forEach(item => { const label = `${prefix}${item.name}/`; output.push({ id: item.id, label }); folderDestinations(item.children || [], label, output); }); return output; };
const containsNode = (node: ProjectFile, id: string): boolean => node.id === id || Boolean(node.children?.some(child => containsNode(child, id)));
const extLanguage = (name: string) => name.endsWith(".css") ? "css" : name.endsWith(".js") ? "javascript" : name.endsWith(".json") ? "json" : name.endsWith(".md") ? "markdown" : "html";

function previewDocument(project: Project, open: OpenFile[], channel: string) {
  const entries = filePaths(project.files);
  const lookup = new Map(entries.map(([path, file]) => [path, file.content || ""]));
  entries.forEach(([path, file]) => { if (!lookup.has(file.name)) lookup.set(file.name, file.content || ""); });
  open.forEach(tab => lookup.set(tab.name, tab.content));
  let html = lookup.get("index.html") || [...lookup.entries()].find(([path]) => path.endsWith("/index.html"))?.[1] || "<main><h1>Add an index.html file to get started.</h1></main>";
  let css = [...lookup.entries()].filter(([name]) => name.endsWith(".css")).map(([, value]) => value).join("\n");
  const js = [...lookup.entries()].filter(([name]) => name.endsWith(".js")).map(([, value]) => value).join("\n");
  entries.filter(([, file]) => (file.content || "").startsWith("data:")).forEach(([path, file]) => { html = html.split(path).join(file.content || ""); css = css.split(path).join(file.content || ""); });
  const withoutAssets = html.replace(/<link[^>]+href=["'][^"']+\.css[^"']*["'][^>]*>/gi, "").replace(/<script[^>]+src=["'][^"']+\.js[^"']*["'][^>]*><\/script>/gi, "");
  const bridge = `(() => {
    const channel = ${JSON.stringify(channel)};
    const seen = new Map();
    const text = value => String(value || "Unknown preview error").slice(0, 500);
    const emit = (message, line, column) => {
      const safeMessage = text(message);
      if (safeMessage === "Script error.") return;
      const safeLine = Number(line) || 0;
      const safeColumn = Number(column) || 0;
      const identity = safeMessage.replace(/^Uncaught\\s+/, "").replace(/^[A-Za-z]*Error:\\s*/, "");
      const key = [identity, safeLine, safeColumn].join("|");
      const now = Date.now();
      if (now - (seen.get(key) || 0) < 2000) return;
      seen.set(key, now);
      parent.postMessage({ type: "cloudide-preview-error", channel, message: safeMessage, line: safeLine, column: safeColumn }, "*");
    };
    const report = (message, line, column) => { if (typeof message !== "string" || !message || message === "Script error.") return; emit(message, line, column); };
    addEventListener("error", event => report(event.error && typeof event.error.message === "string" ? event.error.message : event.message, event.lineno, event.colno), true);
    const previousOnError = window.onerror;
    window.onerror = (message, source, line, column, error) => { report(error && typeof error.message === "string" ? error.message : message, line, column); return typeof previousOnError === "function" ? previousOnError(message, source, line, column, error) : false; };
    addEventListener("unhandledrejection", event => { const reason = event.reason && (event.reason.message || event.reason); if (!reason || String(reason) === "Script error.") return; emit(reason, 0, 0); });
  })();`;
  const safeCss = css.replace(/<\/style/gi, "<\\/style");
  const safeScript = js.replace(/<\/script/gi, "<\\/script");
  const styleTag = `<style>${safeCss}</style>`;
  const bridgeTag = `<script>${bridge}</script>`;
  const scriptTags = `<script>${safeScript}</script>`;
  const withHead = withoutAssets.includes("</head>") ? withoutAssets.replace("</head>", `${bridgeTag}${styleTag}</head>`) : `${bridgeTag}${styleTag}${withoutAssets}`;
  return withHead.includes("</body>") ? withHead.replace("</body>", `${scriptTags}</body>`) : `${withHead}${scriptTags}`;
}

export function CloudIDE() {
  const { data: session, status, update: updateSession } = useSession();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(initialUser);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tabs, setTabs] = useState<OpenFile[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"updated" | "name" | "created">("updated");
  const [mode, setMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showPreview, setShowPreview] = useState(true);
  const [modal, setModal] = useState<"create" | "share" | "profile" | null>(null);
  const [learnOpen, setLearnOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTemplate, setNewTemplate] = useState<TemplateKey>("blank");
  const [notice, setNotice] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [previewWidth, setPreviewWidth] = useState(500);
  const [previewErrors, setPreviewErrors] = useState<{ id: string; message: string; line: number; column: number; reportedAt: number }[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const saveTimers = useRef<Record<string, number>>({});
  const pendingProjects = useRef<Record<string, Project>>({});
  const saveInFlight = useRef<Record<string, boolean>>({});
  const manualSaveRequests = useRef<Record<string, boolean>>({});
  const conflictedProjects = useRef<Record<string, Project>>({});
  const projectRevisions = useRef<Record<string, number>>({});
  const failedProjects = useRef<Record<string, boolean>>({});
  const visibilityRequests = useRef<Record<string, "private" | "public">>({});
  const [savingProjects, setSavingProjects] = useState<Record<string, boolean>>({});
  const [saveConflicts, setSaveConflicts] = useState<Record<string, Project>>({});
  const [saveFailures, setSaveFailures] = useState<Record<string, boolean>>({});
  const [nodePendingDeletion, setNodePendingDeletion] = useState<ProjectFile | null>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const previewChannel = useRef(uid());
  const active = projects.find(project => project.id === activeId) || null;
  const currentTab = tabs.find(tab => tab.id === activeTab) || null;

  useEffect(() => {
    const savedTheme = localStorage.getItem("cloudide-theme");
    if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem("cloudide-theme", theme);
  }, [theme, ready]);

  useEffect(() => {
    if (status !== "authenticated") { setProjects([]); return; }
    setUser({ name: session.user?.name || "Creator", email: session.user?.email || "" });
    fetch("/api/projects", { cache: "no-store" }).then(async response => response.ok ? response.json() : Promise.reject()).then(data => { const loaded = data as Project[]; loaded.forEach(project => { projectRevisions.current[project.id] = project.revision; }); setProjects(loaded); }).catch(() => setNotice("Unable to load your projects."));
  }, [session, status]);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { if (notice) { const timer = window.setTimeout(() => setNotice(""), 2600); return () => window.clearTimeout(timer); } }, [notice]);
  useEffect(() => {
    const receivePreviewError = (event: MessageEvent) => {
      const payload = event.data;
      if (event.source !== previewFrameRef.current?.contentWindow || !payload || payload.type !== "cloudide-preview-error" || payload.channel !== previewChannel.current || typeof payload.message !== "string") return;
      setPreviewErrors(list => { const message = payload.message.slice(0, 500); const line = Number(payload.line) || 0; const column = Number(payload.column) || 0; const reportedAt = Date.now(); return list.some(error => error.message === message && error.line === line && error.column === column && reportedAt - error.reportedAt < 2000) ? list : [{ id: uid(), message, line, column, reportedAt }, ...list].slice(0, 12); });
    };
    window.addEventListener("message", receivePreviewError);
    return () => window.removeEventListener("message", receivePreviewError);
  }, [active?.id]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); saveAll(); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "p") { event.preventDefault(); setShowPreview(value => !value); }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  });

  const notify = (message: string) => setNotice(message);
  const clearPreviewErrors = () => setPreviewErrors([]);
  const startPreviewResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!workspaceRef.current || window.innerWidth <= 650) return;
    event.preventDefault();
    const rect = workspaceRef.current.getBoundingClientRect();
    const minimumEditor = window.innerWidth <= 900 ? 300 : 340;
    const minimumPreview = window.innerWidth <= 900 ? 290 : 340;
    const maximumPreview = Math.max(minimumPreview, rect.width - (window.innerWidth <= 900 ? 190 : 220) - minimumEditor - 8);
    const move = (pointer: PointerEvent) => setPreviewWidth(Math.max(minimumPreview, Math.min(maximumPreview, rect.right - pointer.clientX)));
    const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };
  const markTabsSaved = (project: Project) => setTabs(list => list.map(tab => {
    const file = findFile(project.files, tab.id);
    return file && file.content === tab.content ? { ...tab, dirty: false } : tab;
  }));
  const sendPendingProject = async (id: string) => {
    if (saveInFlight.current[id] || conflictedProjects.current[id]) return;
    const latest = pendingProjects.current[id];
    if (!latest) return;
    saveInFlight.current[id] = true;
    setSavingProjects(list => ({ ...list, [id]: true }));
    let continueSaving = false;
    try {
      const response = await fetch(`/api/projects/${latest.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: latest.name, template: latest.template, visibility: latest.visibility, color: latest.color, revision: latest.revision, files: latest.files }) });
      if (response.status === 409) {
        const conflict = await response.json().catch(() => null) as { code?: string; project?: Project } | null;
        if (conflict?.code === "PROJECT_CONFLICT" && conflict.project) {
          conflictedProjects.current[id] = conflict.project;
          setSaveConflicts(list => ({ ...list, [id]: conflict.project as Project }));
          delete failedProjects.current[id];
          setSaveFailures(list => { const next = { ...list }; delete next[id]; return next; });
          notify("Project changed in another session. Your local changes were not saved.");
          return;
        }
      }
      if (!response.ok) { failedProjects.current[id] = true; setSaveFailures(list => ({ ...list, [id]: true })); notify("Unable to save changes. Your local edits are still available."); return; }
      const saved = await response.json() as Project;
      projectRevisions.current[id] = saved.revision;
      delete failedProjects.current[id];
      setSaveFailures(list => { const next = { ...list }; delete next[id]; return next; });
      const pending = pendingProjects.current[id];
      if (pending && pending !== latest) {
        const rebased = { ...pending, revision: saved.revision, updatedAt: saved.updatedAt };
        pendingProjects.current[id] = rebased;
        setProjects(list => list.map(item => item.id === id ? rebased : item));
        continueSaving = true;
      } else {
        delete pendingProjects.current[id];
        setProjects(list => list.map(item => item.id === id ? saved : item));
        markTabsSaved(saved);
        const visibility = visibilityRequests.current[id];
        if (visibility && saved.visibility === visibility) { notify(visibility === "public" ? "Project is now public" : "Project is now private"); delete visibilityRequests.current[id]; }
        if (manualSaveRequests.current[id]) notify("All changes saved");
        delete manualSaveRequests.current[id];
      }
    } catch {
      failedProjects.current[id] = true;
      setSaveFailures(list => ({ ...list, [id]: true }));
      notify("Unable to save changes. Your local edits are still available.");
    } finally {
      delete saveInFlight.current[id];
      setSavingProjects(list => { const next = { ...list }; delete next[id]; return next; });
      if (continueSaving) void sendPendingProject(id);
    }
  };
  const persistProject = (project: Project, immediate = false, manual = false) => {
    pendingProjects.current[project.id] = project;
    if (manual) manualSaveRequests.current[project.id] = true;
    window.clearTimeout(saveTimers.current[project.id]);
    if (conflictedProjects.current[project.id]) return;
    if (immediate) void sendPendingProject(project.id);
    else saveTimers.current[project.id] = window.setTimeout(() => void sendPendingProject(project.id), 450);
  };
  const mutateProject = (id: string, mutate: (project: Project) => Project) => setProjects(list => list.map(project => {
    if (project.id !== id) return project;
    const updated = { ...mutate(project), revision: projectRevisions.current[id] || project.revision, updatedAt: stamp() };
    persistProject(updated);
    return updated;
  }));
  const openProject = (project: Project) => { setActiveId(project.id); setTabs([]); setActiveTab(null); setExpanded(project.files.filter(f => f.kind === "folder").map(f => f.id)); clearPreviewErrors(); };
  const saveAll = () => { if (active) persistProject(pendingProjects.current[active.id] || active, true, true); };
  const openFile = (node: ProjectFile) => {
    if (node.kind === "folder") { setExpanded(list => list.includes(node.id) ? list.filter(id => id !== node.id) : [...list, node.id]); return; }
    if (!tabs.some(tab => tab.id === node.id)) setTabs(list => [...list, { id: node.id, name: node.name, content: node.content || "", dirty: false }]);
    setActiveTab(node.id);
  };
  const changeFile = (value: string | undefined) => {
    if (!active || !currentTab) return;
    const content = value || "";
    const source = { ...(pendingProjects.current[active.id] || active), revision: projectRevisions.current[active.id] || active.revision };
    const updated = { ...source, files: updateFile(source.files, currentTab.id, { content, updatedAt: stamp() }), updatedAt: stamp() };
    pendingProjects.current[active.id] = updated;
    setTabs(list => list.map(tab => tab.id === currentTab.id ? { ...tab, content, dirty: true } : tab));
    setProjects(list => list.map(project => project.id === updated.id ? visibilityRequests.current[updated.id] ? { ...updated, visibility: project.visibility } : updated : project));
    persistProject(updated);
  };
  const createProject = async () => {
    const name = newName.trim() || templateMeta[newTemplate].title;
    const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, template: newTemplate, color: colors[Math.floor(Math.random() * colors.length)] }) });
    if (!response.ok) { notify("Unable to create project."); return; }
    const project = await response.json() as Project;
    projectRevisions.current[project.id] = project.revision;
    setProjects(list => [project, ...list]); setModal(null); setNewName(""); openProject(project); notify("Project created");
  };
  const duplicateProject = async (project: Project) => {
    const response = await fetch(`/api/projects/${project.id}/duplicate`, { method: "POST" });
    if (!response.ok) { notify("Unable to duplicate project."); return; }
    const duplicate = await response.json() as Project;
    projectRevisions.current[duplicate.id] = duplicate.revision;
    setProjects(list => [duplicate, ...list]); notify("Project duplicated");
  };
  const deleteProject = async (project: Project) => { if (!window.confirm(`Delete “${project.name}”? This cannot be undone.`)) return; const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" }); if (!response.ok) { notify("Unable to delete project."); return; } setProjects(list => list.filter(item => item.id !== project.id)); if (activeId === project.id) setActiveId(null); notify("Project deleted"); };
  const renameProject = (project: Project) => { const name = window.prompt("Project name", project.name)?.trim(); if (name) { mutateProject(project.id, item => ({ ...item, name })); notify("Project renamed"); } };
  const addNode = (parent: string | null, kind: "file" | "folder") => {
    if (!active) return;
    const name = window.prompt(kind === "file" ? "File name" : "Folder name", kind === "file" ? "untitled.html" : "new-folder")?.trim();
    if (!name) return;
    const safe = name.replace(/[\\/:*?"<>|]/g, "-");
    const node: ProjectFile = { id: uid(), name: safe, kind, content: kind === "file" ? "" : undefined, children: kind === "folder" ? [] : undefined, updatedAt: stamp() };
    mutateProject(active.id, project => ({ ...project, files: addToFolder(project.files, parent, node) }));
    if (parent) setExpanded(list => [...new Set([...list, parent])]);
    if (kind === "file") setTimeout(() => openFile(node), 0);
    notify(`${kind === "file" ? "File" : "Folder"} created`);
  };
  const renameNode = (node: ProjectFile) => { if (!active) return; const name = window.prompt("Rename", node.name)?.trim(); if (name) { mutateProject(active.id, project => ({ ...project, files: updateFile(project.files, node.id, { name }) })); setTabs(list => list.map(tab => tab.id === node.id ? { ...tab, name } : tab)); } };
  const moveNode = (node: ProjectFile) => { if (!active) return; const destinations = folderDestinations(active.files).filter(destination => !destination.id || !containsNode(node, destination.id)); const options = destinations.map((destination, index) => `${index}: ${destination.label}`).join("\n"); const choice = Number(window.prompt(`Move “${node.name}” to:\n${options}`, "0")); if (!Number.isInteger(choice) || !destinations[choice]) return; mutateProject(active.id, project => ({ ...project, files: addToFolder(removeFile(project.files, node.id), destinations[choice].id, node) })); notify("Item moved"); };
  const deleteNode = (node: ProjectFile) => { if (active) setNodePendingDeletion(node); };
  const confirmNodeDeletion = () => { if (!active || !nodePendingDeletion) return; const removed = new Set(collectNodeIds(nodePendingDeletion)); mutateProject(active.id, project => ({ ...project, files: removeFile(project.files, nodePendingDeletion.id) })); setTabs(list => list.filter(tab => !removed.has(tab.id))); if (activeTab && removed.has(activeTab)) setActiveTab(tabs.find(tab => !removed.has(tab.id))?.id || null); setNodePendingDeletion(null); notify("Item deleted"); };
  const exportZip = async (project: Project) => {
    const response = await fetch(`/api/projects/${project.id}/export`);
    if (!response.ok) { notify("Unable to export this project."); return; }
    const blob = await response.blob(); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "project"}.zip`; link.click(); URL.revokeObjectURL(link.href); notify("ZIP export ready");
  };
  const importZip = async (event: ChangeEvent<HTMLInputElement>) => {
    const upload = event.target.files?.[0]; event.target.value = ""; if (!upload) return;
    if (!upload.name.toLowerCase().endsWith(".zip") || upload.size > 8 * 1024 * 1024) { notify("Choose a ZIP file smaller than 8 MB"); return; }
    try {
      const form = new FormData(); form.set("file", upload); form.set("name", upload.name.replace(/\.zip$/i, ""));
      const response = await fetch("/api/projects/import", { method: "POST", body: form });
      if (!response.ok) throw new Error();
      const project = await response.json() as Project; projectRevisions.current[project.id] = project.revision; setProjects(list => [project, ...list]); openProject(project); notify("Project imported safely");
    } catch { notify("We couldn’t import that ZIP file"); }
  };
  const toggleVisibility = () => { if (!active) return; const source = pendingProjects.current[active.id] || active; const visibility: Project["visibility"] = source.visibility === "private" ? "public" : "private"; const updated = { ...source, revision: projectRevisions.current[source.id] || source.revision, visibility }; visibilityRequests.current[source.id] = visibility; persistProject(updated, true); };
  const share = async () => { if (!active) return; const link = `${window.location.origin}/project/${active.shareId || active.id}`; try { await navigator.clipboard.writeText(link); notify("Share link copied"); } catch { notify("Share link is ready to copy"); } };
  const refreshPreview = () => { clearPreviewErrors(); setPreviewKey(value => value + 1); };
  const reloadLatestProject = async () => {
    if (!active) return;
    if (!window.confirm("Reload the latest project version? Your unsaved local changes will be discarded.")) return;
    const response = await fetch(`/api/projects/${active.id}`, { cache: "no-store" });
    if (!response.ok) { notify("Unable to reload the latest project."); return; }
    const latest = await response.json() as Project;
    projectRevisions.current[latest.id] = latest.revision;
    window.clearTimeout(saveTimers.current[latest.id]);
    delete pendingProjects.current[latest.id];
    delete manualSaveRequests.current[latest.id];
    delete conflictedProjects.current[latest.id];
    delete failedProjects.current[latest.id];
    delete visibilityRequests.current[latest.id];
    setSaveConflicts(list => { const next = { ...list }; delete next[latest.id]; return next; });
    setSaveFailures(list => { const next = { ...list }; delete next[latest.id]; return next; });
    setProjects(list => list.map(item => item.id === latest.id ? latest : item));
    setTabs(list => list.flatMap(tab => {
      const file = findFile(latest.files, tab.id);
      return file ? [{ ...tab, name: file.name, content: file.content || "", dirty: false }] : [];
    }));
    setActiveTab(tab => findFile(latest.files, tab || "") ? tab : null);
    refreshPreview();
    notify("Latest project version reloaded.");
  };
  const openExternalPreview = () => { if (!active) return; window.open(`/preview/${active.id}`, "_blank", "noopener,noreferrer"); };
  const dashboardProjects = useMemo(() => projects.filter(project => project.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : new Date(sort === "created" ? b.createdAt : b.updatedAt).getTime() - new Date(sort === "created" ? a.createdAt : a.updatedAt).getTime()), [projects, query, sort]);

  const authenticate = async (name: string, email: string, password: string, signup: boolean) => {
    if (signup) {
      try {
        const registration = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
        if (!registration.ok) {
          const body = await registration.json().catch(() => null) as { error?: string } | null;
          return body?.error || "Unable to create this account. Please try again.";
        }
      } catch {
        return "Unable to create this account. Please try again.";
      }
    }

    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      return result?.error ? loginFormMessage(result.code) : null;
    } catch {
      return "Unable to log in. Please try again.";
    }
  };
  if (!ready || status === "loading") return <div className="loading"><div className="brand-mark">⌘</div></div>;
  if (status !== "authenticated") return <AuthScreen onEnter={authenticate} theme={theme} setTheme={setTheme} />;
  if (!active) return <><input ref={importRef} onChange={importZip} type="file" accept=".zip,application/zip,application/x-zip-compressed" hidden /><Dashboard user={user} projects={dashboardProjects} query={query} setQuery={setQuery} sort={sort} setSort={setSort} theme={theme} setTheme={setTheme} onCreate={() => setModal("create")} onTemplates={() => { setNewTemplate("blank"); setModal("create"); }} onLearn={() => setLearnOpen(true)} onOpen={openProject} onShare={project => { openProject(project); setModal("share"); }} onRename={renameProject} onDuplicate={duplicateProject} onDelete={deleteProject} onExport={exportZip} onImport={() => importRef.current?.click()} onLogout={() => void signOut({ callbackUrl: "/" })} />{modal === "create" && <CreateModal name={newName} setName={setNewName} template={newTemplate} setTemplate={setNewTemplate} onClose={() => setModal(null)} onCreate={createProject} />}{learnOpen && <LearnModal onClose={() => setLearnOpen(false)} onCreate={() => { setLearnOpen(false); setModal("create"); }} />}</>;

  const viewport = mode === "desktop" ? "100%" : mode === "tablet" ? "768px" : "390px";
  const activeConflict = saveConflicts[active.id];
  const activeSaving = Boolean(savingProjects[active.id]);
  const activeUnsaved = Boolean(pendingProjects.current[active.id]);
  const activeFailure = Boolean(saveFailures[active.id]);
  return <div className="ide-shell">
    <input ref={importRef} onChange={importZip} type="file" accept=".zip,application/zip,application/x-zip-compressed" hidden />
    <header className="ide-topbar">
      <button className="logo-button" onClick={() => setActiveId(null)}><span className="brand-mark">⌘</span><span>cloud<span>ide</span></span></button>
      <div className="crumb"><button onClick={() => setActiveId(null)}>Projects</button><Icon name="chevron" size={14} /><b>{active.name}</b><span className={`saved-dot ${activeConflict ? "conflict" : activeFailure ? "conflict" : activeSaving ? "saving" : activeUnsaved ? "unsaved" : ""}`}>{activeConflict ? "Save conflict" : activeFailure ? "Save failed" : activeSaving ? "Saving" : activeUnsaved ? "Unsaved" : "Saved"}</span></div>
      <div className="top-actions"><button className="icon-btn hide-mobile" title="Toggle theme" onClick={() => setTheme(value => value === "dark" ? "light" : "dark")}><Icon name={theme === "dark" ? "sun" : "moon"} /></button><button className="button ghost hide-mobile" onClick={() => setModal("share")}><Icon name="share" size={16} /> Share</button><button className="button run" onClick={() => { saveAll(); setShowPreview(true); refreshPreview(); }}><Icon name="play" size={15} /> Run</button><div className="avatar" onClick={() => setProfileOpen(value => !value)}>{user.name.split(" ").map(n => n[0]).slice(0, 2).join("")}</div></div>
      {profileOpen && <div className="profile-menu"><div className="profile-info"><div className="avatar large">{user.name.split(" ").map(n => n[0]).slice(0, 2).join("")}</div><div><b>{user.name}</b><small>{user.email}</small></div></div><button onClick={() => setModal("profile")}><Icon name="user" /> Profile settings</button><button onClick={() => setActiveId(null)}><Icon name="grid" /> All projects</button><button className="danger-text" onClick={() => void signOut({ callbackUrl: "/" })}><Icon name="logout" /> Log out</button></div>}
    </header>
    <main ref={workspaceRef} className={`workspace ${showPreview ? "" : "preview-hidden"}`} style={{ "--preview-width": `${previewWidth}px` } as CSSProperties}>
      <aside className="explorer"><div className="explorer-title"><span>EXPLORER</span><div><button className="plain-icon" title="New file" onClick={() => addNode(null, "file")}><Icon name="plus" size={16} /></button><button className="plain-icon" title="New folder" onClick={() => addNode(null, "folder")}><Icon name="folder" size={16} /></button></div></div><div className="project-root"><Icon name="chevron" size={14} /><span className="project-color-dot" data-color={active.color}></span><b>{active.name}</b></div><div className="tree">{active.files.map(node => <TreeItem key={node.id} node={node} depth={0} expanded={expanded} activeId={activeTab} onOpen={openFile} onAdd={addNode} onRename={renameNode} onMove={moveNode} onDelete={deleteNode} />)}</div><div className="explorer-bottom"><button onClick={() => setModal("share")}><Icon name="share" /> {active.visibility === "public" ? "Public project" : "Make project public"}</button><button onClick={() => exportZip(active)}><Icon name="download" /> Export as ZIP</button></div></aside>
      <section className="editor-section"><div className="tabs">{tabs.length ? tabs.map(tab => <button key={tab.id} className={`tab ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}><span className={`file-symbol ${extLanguage(tab.name)}`}></span>{tab.name}{tab.dirty && <i></i>}<span className="tab-close" onClick={event => { event.stopPropagation(); setTabs(list => list.filter(item => item.id !== tab.id)); if (activeTab === tab.id) setActiveTab(tabs.find(item => item.id !== tab.id)?.id || null); }}><Icon name="x" size={13} /></span></button>) : <div className="empty-tab">Open a file from the explorer to start editing</div>}</div>{activeConflict && <div className="save-conflict" role="alert"><span>This project changed in another session. Your local changes are still here but were not saved.</span><button onClick={reloadLatestProject}>Reload latest</button></div>}{activeFailure && !activeConflict && <div className="save-conflict" role="alert"><span>Changes could not be saved. Your local edits are still available.</span><button onClick={() => active && persistProject(pendingProjects.current[active.id] || active, true, true)}>Retry save</button></div>}<div className="editor-area">{currentTab ? <Editor height="100%" language={extLanguage(currentTab.name)} path={`file:///cloudide/${active.id}/${currentTab.id}`} saveViewState value={currentTab.content} onChange={changeFile} theme={theme === "dark" ? "vs-dark" : "light"} options={{ fontSize: 13, fontFamily: "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace", minimap: { enabled: false }, padding: { top: 18 }, smoothScrolling: true, wordWrap: "on", automaticLayout: true }} /> : <EmptyEditor onNew={() => addNode(null, "file")} />}</div>{previewErrors.length > 0 && <PreviewErrors errors={previewErrors} onClear={clearPreviewErrors} />}<footer className="status-bar"><span><span className="status-live"></span>{activeConflict ? "Auto-save paused" : activeFailure ? "Auto-save retry available" : "Auto-save on"}</span><span className="status-right">{currentTab ? extLanguage(currentTab.name).toUpperCase() : "Ready"} <span className="hide-mobile"> · UTF-8 · Spaces: 2</span></span></footer></section>
      <div className="panel-resizer" role="separator" aria-orientation="vertical" aria-label="Resize editor and preview" tabIndex={0} onPointerDown={startPreviewResize} onKeyDown={event => { if (event.key === "ArrowLeft") setPreviewWidth(value => Math.min(value + 24, window.innerWidth - 420)); if (event.key === "ArrowRight") setPreviewWidth(value => Math.max(value - 24, 290)); }}></div>
      <section className="preview-section"><header className="preview-toolbar"><div className="device-buttons"><button className={mode === "desktop" ? "active" : ""} onClick={() => setMode("desktop")} title="Desktop"><Icon name="monitor" size={17} /></button><button className={mode === "tablet" ? "active" : ""} onClick={() => setMode("tablet")} title="Tablet"><Icon name="tablet" size={17} /></button><button className={mode === "mobile" ? "active" : ""} onClick={() => setMode("mobile")} title="Mobile"><Icon name="mobile" size={17} /></button></div><div className="preview-title"><span className="preview-led"></span>Live preview</div><div className="preview-actions"><button className="plain-icon" onClick={refreshPreview} title="Refresh"><Icon name="refresh" size={16} /></button><button className="plain-icon" onClick={openExternalPreview} title="Open in new tab"><Icon name="external" size={16} /></button><button className="plain-icon" onClick={() => setShowPreview(false)} title="Hide preview"><Icon name="x" size={16} /></button></div></header><div className="preview-canvas"><div className={`device-frame ${mode}`} style={{ width: viewport }}><iframe ref={previewFrameRef} key={previewKey} title="Project preview" sandbox="allow-scripts allow-forms allow-modals" srcDoc={previewDocument(active, tabs, previewChannel.current)} /></div></div></section>
    </main>
    {notice && <div className="toast"><Icon name="check" size={16} />{notice}</div>}
    {modal === "create" && <CreateModal name={newName} setName={setNewName} template={newTemplate} setTemplate={setNewTemplate} onClose={() => setModal(null)} onCreate={createProject} />}
    {modal === "share" && <ShareModal project={active} onClose={() => setModal(null)} onVisibility={toggleVisibility} onCopy={share} />}
    {modal === "profile" && <ProfileModal user={user} onClose={() => setModal(null)} onSave={async updated => { try { const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) }); if (!response.ok) { const body = await response.json().catch(() => null) as { error?: string } | null; return body?.error || "Unable to update profile. Please try again."; } const saved = await response.json() as { name: string; email: string }; await updateSession({ name: saved.name, email: saved.email }); setUser(saved); setModal(null); notify("Profile updated"); return null; } catch { return "Unable to update profile. Please try again."; } }} />}
    {nodePendingDeletion && <DeleteNodeModal node={nodePendingDeletion} tabs={tabs} onClose={() => setNodePendingDeletion(null)} onConfirm={confirmNodeDeletion} />}
  </div>;
}

export function PublicProject({ id }: { id: string }) {
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const [mode, setMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);
  useEffect(() => { fetch(`/api/public/${id}`, { cache: "no-store" }).then(async response => response.ok ? response.json() : null).then(data => setProject(data as Project | null)).catch(() => setProject(null)); }, [id]);
  const duplicate = async () => {
    if (!project) return;
    const response = await fetch(`/api/public/${id}/duplicate`, { method: "POST" });
    if (response.status === 401) { window.location.href = "/"; return; }
    if (!response.ok) return;
    window.location.href = "/";
  };
  if (project === undefined) return <div className="loading"><div className="brand-mark">⌘</div></div>;
  if (!project) return <main className="share-missing"><button className="logo-button" onClick={() => window.location.href = "/"}><span className="brand-mark">⌘</span><span>cloud<span>ide</span></span></button><div><span className="brand-mark">⌘</span><h1>This project isn’t available.</h1><p>It may be private, moved, or the link may be incomplete.</p><button className="button primary" onClick={() => window.location.href = "/"}>Go to Cloud IDE</button></div></main>;
  const width = mode === "desktop" ? "100%" : mode === "tablet" ? "768px" : "390px";
  return <main className="public-project"><header className="public-nav"><button className="logo-button" onClick={() => window.location.href = "/"}><span className="brand-mark">⌘</span><span>cloud<span>ide</span></span></button><div className="public-actions"><span className="public-badge"><i></i> Public project</span><button className="button ghost" onClick={async () => { await navigator.clipboard.writeText(window.location.href); setCopied(true); }}>{copied ? <><Icon name="check" size={16} /> Copied</> : <><Icon name="share" size={16} /> Share</>}</button><button className="button primary" onClick={duplicate}><Icon name="copy" size={16} /> Copy to my workspace</button></div></header><section className="public-heading"><div><p className="eyebrow">A CLOUD IDE PROJECT</p><h1>{project.name}</h1><p>Explore this web project, preview it live, and make a copy to continue building.</p></div><div className="public-meta"><span>{templateMeta[project.template].glyph} {templateMeta[project.template].title}</span><span>Updated {new Date(project.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div></section><section className="public-workspace"><aside><p>PROJECT FILES</p>{flatFiles(project.files).map(file => <div key={file.id}><span className={`file-symbol ${extLanguage(file.name)}`}></span>{file.name}</div>)}</aside><div className="public-preview"><header><div className="device-buttons"><button className={mode === "desktop" ? "active" : ""} onClick={() => setMode("desktop")}><Icon name="monitor" size={16} /></button><button className={mode === "tablet" ? "active" : ""} onClick={() => setMode("tablet")}><Icon name="tablet" size={16} /></button><button className={mode === "mobile" ? "active" : ""} onClick={() => setMode("mobile")}><Icon name="mobile" size={16} /></button></div><span><span className="preview-led"></span> Live preview</span></header><div className="preview-canvas"><div className={`device-frame ${mode}`} style={{ width }}><iframe title={`${project.name} preview`} sandbox="allow-scripts allow-forms allow-modals" srcDoc={previewDocument(project, [], "public-preview")} /></div></div></div></section></main>;
}

function AuthScreen({ onEnter, theme, setTheme }: { onEnter: (name: string, email: string, password: string, signup: boolean) => Promise<string | null>; theme: "dark" | "light"; setTheme: (value: "dark" | "light") => void }) {
  const [signup, setSignup] = useState(true); const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [message, setMessage] = useState(""); const [submitting, setSubmitting] = useState(false);
  return <main className="auth-page"><button className="auth-theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><Icon name={theme === "dark" ? "sun" : "moon"} /></button><section className="auth-copy"><button className="logo-button"><span className="brand-mark">⌘</span><span>cloud<span>ide</span></span></button><div><span className="auth-pill">The modern web workspace</span><h1>Ideas deserve<br/><em>momentum.</em></h1><p>Design, build and share beautiful web projects in one focused browser workspace.</p></div><div className="auth-code"><div><i></i><i></i><i></i></div><code>&lt;make something brilliant /&gt;</code></div></section><section className="auth-form-wrap"><form className="auth-form" onSubmit={async event => { event.preventDefault(); setSubmitting(true); setMessage(""); try { const result = await onEnter(name, email, password, signup); if (result) setMessage(result); } finally { setSubmitting(false); } }}><div className="form-heading"><p>{signup ? "GET STARTED FOR FREE" : "WELCOME BACK"}</p><h2>{signup ? "Create your space." : "Pick up where you left off."}</h2></div>{signup && <label>Username<input value={name} onChange={event => setName(event.target.value)} placeholder="alexmorgan" required minLength={2} maxLength={60} /></label>}<label>Email address<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" required /></label><label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••" required minLength={8} maxLength={72} /></label>{message && <p className="form-error" role="alert" aria-live="polite">{message}</p>}<button className="auth-submit" type="submit" disabled={submitting}>{submitting ? "Please wait" : signup ? "Create account" : "Log in"}<Icon name="arrow" size={17} /></button><p className="form-switch">{signup ? "Already have an account?" : "New to Cloud IDE?"} <button type="button" onClick={() => { setSignup(value => !value); setMessage(""); }}>{signup ? "Log in" : "Create account"}</button></p></form></section></main>;
}

function Dashboard({ user, projects, query, setQuery, sort, setSort, theme, setTheme, onCreate, onTemplates, onLearn, onOpen, onShare, onRename, onDuplicate, onDelete, onExport, onImport, onLogout }: { user: { name: string; email: string }; projects: Project[]; query: string; setQuery: (value: string) => void; sort: "updated" | "name" | "created"; setSort: (value: "updated" | "name" | "created") => void; theme: "dark" | "light"; setTheme: (value: "dark" | "light") => void; onCreate: () => void; onTemplates: () => void; onLearn: () => void; onOpen: (project: Project) => void; onShare: (project: Project) => void; onRename: (project: Project) => void; onDuplicate: (project: Project) => void; onDelete: (project: Project) => void; onExport: (project: Project) => void; onImport: () => void; onLogout: () => void }) {
  const [menu, setMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const closeMenu = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setMenu(null); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenu(null); };
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeMenu); document.removeEventListener("keydown", closeOnEscape); };
  }, [menu]);
  return <main className="dashboard"><header className="dashboard-nav"><button className="logo-button"><span className="brand-mark">⌘</span><span>cloud<span>ide</span></span></button><nav><button className="active" type="button">Projects</button><button type="button" onClick={onTemplates}>Templates</button><button type="button" onClick={onLearn}>Learn</button></nav><div className="nav-end"><button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><Icon name={theme === "dark" ? "sun" : "moon"} /></button><button className="user-chip"><span className="avatar">{user.name.split(" ").map(n => n[0]).slice(0, 2).join("")}</span><span className="hide-mobile">{user.name.split(" ")[0]}</span></button><button className="logout-btn" onClick={onLogout} title="Log out"><Icon name="logout" /></button></div></header><section className="dashboard-main"><div className="dashboard-hero"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Good to see you, {user.name.split(" ")[0]}.</h1><p>Pick up where you left off, or start with a fresh idea.</p></div><div className="hero-buttons"><button className="button ghost" onClick={onImport}><Icon name="upload" size={16} /> Import ZIP</button><button className="button primary" onClick={onCreate}><Icon name="plus" size={17} /> New project</button></div></div><div className="dashboard-tools"><label className="search-box"><Icon name="search" size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search projects" /></label><label className="sort-select"><Icon name="sort" size={16} /><select value={sort} onChange={event => setSort(event.target.value as "updated" | "name" | "created")}><option value="updated">Last updated</option><option value="created">Date created</option><option value="name">Name A–Z</option></select></label></div><div className="projects-heading"><h2>Your projects <span>{projects.length}</span></h2><p>Updated recently</p></div>{projects.length ? <div className="project-grid">{projects.map(project => <article className="project-card" key={project.id} onClick={() => onOpen(project)}><div className={`project-art ${project.color}`}><span className="art-code">{project.template === "portfolio" ? "✦" : project.template === "landing" ? "↗" : project.template === "app" ? "◉" : "⌘"}</span><div className="art-lines"><i></i><i></i><i></i></div></div><div className="project-body" ref={menu === project.id ? menuRef : undefined}><div><h3>{project.name}</h3><p>{templateMeta[project.template].title}</p></div><button className="card-menu" onClick={event => { event.stopPropagation(); setMenu(menu === project.id ? null : project.id); }}><Icon name="more" /></button>{menu === project.id && <div className="card-popover" onClick={event => event.stopPropagation()}><button onClick={() => onOpen(project)}><Icon name="folder" />Open project</button><button onClick={() => { onShare(project); setMenu(null); }}><Icon name="share" />Share</button><button onClick={() => { onRename(project); setMenu(null); }}><Icon name="settings" />Rename</button><button onClick={() => { onDuplicate(project); setMenu(null); }}><Icon name="copy" />Duplicate</button><button onClick={() => { onExport(project); setMenu(null); }}><Icon name="download" />Export ZIP</button><button className="danger-text" onClick={() => { onDelete(project); setMenu(null); }}><Icon name="trash" />Delete project</button></div>}</div><footer><span>{new Date(project.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span><span className={`visibility ${project.visibility}`}><i></i>{project.visibility}</span></footer></article>)}</div> : <div className="no-projects"><span className="brand-mark">⌘</span><h2>No projects found</h2><p>Try a different search or begin something new.</p><button className="button primary" onClick={onCreate}>Create project</button></div>}</section></main>;
}

function TreeItem({ node, depth, expanded, activeId, onOpen, onAdd, onRename, onMove, onDelete }: { node: ProjectFile; depth: number; expanded: string[]; activeId: string | null; onOpen: (node: ProjectFile) => void; onAdd: (id: string | null, kind: "file" | "folder") => void; onRename: (node: ProjectFile) => void; onMove: (node: ProjectFile) => void; onDelete: (node: ProjectFile) => void }) {
  const isFolder = node.kind === "folder"; const open = expanded.includes(node.id); const [hover, setHover] = useState(false);
  return <div className="tree-node"><div className={`tree-row ${activeId === node.id ? "selected" : ""}`} style={{ paddingLeft: `${12 + depth * 15}px` }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={() => onOpen(node)}>{isFolder ? <button className={`tree-toggle ${open ? "open" : ""}`}><Icon name="chevron" size={13} /></button> : <span className="tree-spacer" />}<span className={`file-symbol ${isFolder ? "folder-symbol" : extLanguage(node.name)}`}></span><span className="tree-name">{node.name}</span>{hover && <span className="tree-controls" onClick={event => event.stopPropagation()}>{isFolder && <button title="Add file" onClick={() => onAdd(node.id, "file")}><Icon name="plus" size={13} /></button>}<button title="Move" onClick={() => onMove(node)}><Icon name="arrow" size={13} /></button><button title="Rename" onClick={() => onRename(node)}><Icon name="more" size={13} /></button><button title="Delete" onClick={() => onDelete(node)}><Icon name="x" size={13} /></button></span>}</div>{isFolder && open && (node.children || []).map(item => <TreeItem key={item.id} node={item} depth={depth + 1} expanded={expanded} activeId={activeId} onOpen={onOpen} onAdd={onAdd} onRename={onRename} onMove={onMove} onDelete={onDelete} />)}</div>;
}

function EmptyEditor({ onNew }: { onNew: () => void }) {
  return <div className="editor-empty"><div className="editor-empty-icon"><Icon name="code" size={26} /></div><h2>Your canvas is ready</h2><p>Open a file from the explorer or create a new one.</p><button className="button primary" onClick={onNew}><Icon name="plus" size={16} /> New file</button><small><kbd>⌘</kbd> <kbd>P</kbd> toggle preview · <kbd>⌘</kbd> <kbd>S</kbd> save</small></div>;
}

function PreviewErrors({ errors, onClear }: { errors: { id: string; message: string; line: number; column: number; reportedAt: number }[]; onClear: () => void }) {
  return <section className="preview-errors" aria-live="polite"><header><span><i></i>Preview errors <b>{errors.length}</b></span><button onClick={onClear}>Clear</button></header><div>{errors.map(error => <p key={error.id}><strong>{error.line ? `Ln ${error.line}${error.column ? `:${error.column}` : ""}` : "Runtime"}</strong><span>{error.message}</span></p>)}</div></section>;
}

function CreateModal({ name, setName, template, setTemplate, onClose, onCreate }: { name: string; setName: (value: string) => void; template: TemplateKey; setTemplate: (value: TemplateKey) => void; onClose: () => void; onCreate: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal create-modal" onMouseDown={event => event.stopPropagation()}><header><div><p className="eyebrow">NEW PROJECT</p><h2>Start with a spark.</h2></div><button className="plain-icon" onClick={onClose}><Icon name="x" /></button></header><label className="modal-label">Project name<input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="My awesome project" onKeyDown={event => { if (event.key === "Enter") onCreate(); }} /></label><div className="template-label">CHOOSE A STARTING POINT</div><div className="template-grid">{(Object.keys(templateMeta) as TemplateKey[]).map(key => <button key={key} className={`template-option ${template === key ? "chosen" : ""}`} onClick={() => setTemplate(key)}><span className={`template-glyph ${templateMeta[key].color}`}>{templateMeta[key].glyph}</span><span><b>{templateMeta[key].title}</b><small>{templateMeta[key].subtitle}</small></span>{template === key && <i><Icon name="check" size={13} /></i>}</button>)}</div><footer><button className="button ghost" onClick={onClose}>Cancel</button><button className="button primary" onClick={onCreate}>Create project <Icon name="arrow" size={16} /></button></footer></section></div>;
}

function LearnModal({ onClose, onCreate }: { onClose: () => void; onCreate: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal share-modal" onMouseDown={event => event.stopPropagation()}><header><div><p className="eyebrow">QUICK START</p><h2>Build your first site.</h2></div><button className="plain-icon" onClick={onClose}><Icon name="x" /></button></header><div className="learn-steps"><div className="sharing-card"><div className="sharing-icon">1</div><div><b>Choose a template</b><p>Start blank or use a portfolio, landing page, or JavaScript app.</p></div></div><div className="sharing-card"><div className="sharing-icon">2</div><div><b>Edit your files</b><p>Use the file explorer and editor to shape your HTML, CSS, and JavaScript.</p></div></div><div className="sharing-card"><div className="sharing-icon">3</div><div><b>Run and share</b><p>Preview your site at any device size, then share it when it is ready.</p></div></div></div><footer><button className="button ghost" onClick={onClose}>Close</button><button className="button primary" onClick={onCreate}>Start a project <Icon name="arrow" size={16} /></button></footer></section></div>;
}

function ShareModal({ project, onClose, onVisibility, onCopy }: { project: Project; onClose: () => void; onVisibility: () => void; onCopy: () => void }) {
  const link = typeof window !== "undefined" ? `${window.location.origin}/project/${project.shareId || project.id}` : "";
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal share-modal" onMouseDown={event => event.stopPropagation()}><header><div><p className="eyebrow">SHARE PROJECT</p><h2>Invite the world in.</h2></div><button className="plain-icon" onClick={onClose}><Icon name="x" /></button></header><div className="sharing-card"><div className="sharing-icon"><Icon name="share" size={22} /></div><div><b>{project.visibility === "public" ? "Anyone with the link can view" : "This project is private"}</b><p>{project.visibility === "public" ? "Visitors can view the files and live preview, then duplicate it to their own workspace." : "Only you can access this project until you make it public."}</p></div><label className="toggle"><input type="checkbox" checked={project.visibility === "public"} onChange={onVisibility} /><span></span></label></div>{project.visibility === "public" && <div className="share-link"><input readOnly value={link} /><button onClick={onCopy}><Icon name="copy" size={16} /> Copy link</button></div>}<footer><button className="button primary" onClick={onClose}>Done</button></footer></section></div>;
}

function DeleteNodeModal({ node, tabs, onClose, onConfirm }: { node: ProjectFile; tabs: OpenFile[]; onClose: () => void; onConfirm: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal delete-node-modal" onMouseDown={event => event.stopPropagation()}><header><div><p className="eyebrow">DELETE {node.kind === "folder" ? "FOLDER" : "FILE"}</p><h2>Remove “{node.name}”?</h2></div><button className="plain-icon" onClick={onClose}><Icon name="x" /></button></header><p className="delete-node-message">{deletionConfirmationMessage(node, tabs)}</p><footer><button className="button ghost" onClick={onClose}>Cancel</button><button className="button primary danger-button" onClick={onConfirm}>Delete</button></footer></section></div>;
}

function ProfileModal({ user, onClose, onSave }: { user: { name: string; email: string }; onClose: () => void; onSave: (user: { name: string; email: string }) => Promise<string | null> }) {
  const [name, setName] = useState(user.name); const [email, setEmail] = useState(user.email); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal profile-modal" onMouseDown={event => event.stopPropagation()}><header><div><p className="eyebrow">YOUR PROFILE</p><h2>Personal details</h2></div><button className="plain-icon" onClick={onClose}><Icon name="x" /></button></header><div className="profile-hero"><div className="avatar xl">{name.split(" ").map(n => n[0]).slice(0, 2).join("")}</div><div><b>{name || "Your username"}</b><p>Cloud IDE creator</p></div></div><label className="modal-label">Username<input value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={60} /></label><label className="modal-label">Email address<input type="email" value={email} onChange={event => setEmail(event.target.value)} /></label>{message && <p className="form-error" role="alert" aria-live="polite">{message}</p>}<footer><button className="button ghost" onClick={onClose} disabled={saving}>Cancel</button><button className="button primary" disabled={saving} onClick={async () => { setSaving(true); setMessage(""); try { const result = await onSave({ name: name || user.name, email: email || user.email }); if (result) setMessage(result); } finally { setSaving(false); } }}>{saving ? "Saving" : "Save changes"}</button></footer></section></div>;
}
