import { NextRequest, NextResponse } from "next/server";
import { currentUserId, error } from "@/lib/http";
import { ownedProject } from "@/lib/projects";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const userId = await currentUserId();
  if (!userId) return error("Authentication required.", 401);
  const project = await ownedProject(userId, params.id);
  if (!project) return error("Project not found.", 404);
  const source = `/preview/${encodeURIComponent(project.id)}/content`;
  const document = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${project.name.replace(/[<>&"]/g, "")}</title><style>html,body,iframe{width:100%;height:100%;margin:0;border:0}body{background:#1b1c24}iframe{display:block;background:#fff}</style></head><body><iframe title="Project preview" sandbox="allow-scripts allow-forms allow-modals" referrerpolicy="no-referrer" src="${source}"></iframe></body></html>`;
  return new NextResponse(document, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'; script-src 'none'", "X-Content-Type-Options": "nosniff" } });
}
