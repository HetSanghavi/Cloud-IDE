import { NextRequest, NextResponse } from "next/server";
import { currentUserId, error } from "@/lib/http";
import { ownedProject, ProjectSaveConflictError, saveProjectWorkspace, serializeProject } from "@/lib/projects";
import { prisma } from "@/lib/prisma";
import { workspaceSchema } from "@/lib/validation";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const userId = await currentUserId();
  if (!userId) return error("Authentication required.", 401);
  const project = await ownedProject(userId, params.id);
  if (!project) return error("Project not found.", 404);
  return NextResponse.json(serializeProject(project));
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = await currentUserId();
  if (!userId) return error("Authentication required.", 401);
  const parsed = workspaceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error("Project workspace is invalid.", 400);
  const project = await ownedProject(userId, params.id);
  if (!project) return error("Project not found.", 404);
  try {
    const saved = await saveProjectWorkspace(userId, project.id, parsed.data);
    return NextResponse.json(serializeProject(saved));
  } catch (cause) {
    if (cause instanceof ProjectSaveConflictError) {
      const latest = await ownedProject(userId, params.id);
      if (!latest) return error("Project not found.", 404);
      return NextResponse.json({ error: "This project changed in another session. Reload the latest version before saving again.", code: "PROJECT_CONFLICT", project: serializeProject(latest) }, { status: 409 });
    }
    return error(cause instanceof Error ? cause.message : "Unable to save project.", 400);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const userId = await currentUserId();
  if (!userId) return error("Authentication required.", 401);
  const project = await ownedProject(userId, params.id);
  if (!project) return error("Project not found.", 404);
  await prisma.project.delete({ where: { id: project.id } });
  return new NextResponse(null, { status: 204 });
}
