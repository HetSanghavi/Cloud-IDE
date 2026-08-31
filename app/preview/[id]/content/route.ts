import { NextRequest, NextResponse } from "next/server";
import { currentUserId, error } from "@/lib/http";
import { ownedProject, serializeProject } from "@/lib/projects";
import { previewDocument } from "@/lib/preview";
import { Project } from "@/lib/types";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const userId = await currentUserId();
  if (!userId) return error("Authentication required.", 401);
  const project = await ownedProject(userId, params.id);
  if (!project) return error("Project not found.", 404);
  return new NextResponse(previewDocument(serializeProject(project) as Project, [], "external-preview"), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "sandbox allow-scripts allow-forms allow-modals; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https:; img-src data: https: http:; font-src data: https:; media-src data: https: http:; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'", "X-Content-Type-Options": "nosniff" } });
}
