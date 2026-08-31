import { NextRequest, NextResponse } from "next/server";
import { currentUserId, error } from "@/lib/http";
import { ownedProject } from "@/lib/projects";
import { exportProjectZip } from "@/lib/zip-export";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const userId = await currentUserId();
  if (!userId) return error("Authentication required.", 401);
  const project = await ownedProject(userId, params.id);
  if (!project) return error("Project not found.", 404);
  const payload = await exportProjectZip(project.files);
  const body = new Uint8Array(payload).buffer;
  const name = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "project"}.zip`;
  return new NextResponse(body, { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" } });
}
