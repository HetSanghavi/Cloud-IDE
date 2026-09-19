"use client";

import Editor, { loader } from "@monaco-editor/react";
import { ComponentProps, useEffect, useState } from "react";

type Props = ComponentProps<typeof Editor>;

export default function MonacoEditor(props: Props) {
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => { let mounted = true; import("monaco-editor").then(monaco => { loader.config({ monaco }); if (mounted) setReady(true); }).catch(() => { if (mounted) setError(true); }); return () => { mounted = false; }; }, []);
  if (error) return <div className="editor-loading" role="alert">Unable to load the editor. Refresh the page and try again.</div>;
  if (!ready) return <div className="editor-loading">Loading editor…</div>;
  return <Editor {...props} />;
}
