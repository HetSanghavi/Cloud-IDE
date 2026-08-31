import { OpenFile, Project, ProjectFile } from "@/lib/types";

const filePaths = (items: ProjectFile[], prefix = ""): [string, ProjectFile][] => items.flatMap(item => item.kind === "file" ? [[`${prefix}${item.name}`, item] as [string, ProjectFile]] : filePaths(item.children || [], `${prefix}${item.name}/`));

export function previewDocument(project: Project, open: OpenFile[], channel: string) {
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
