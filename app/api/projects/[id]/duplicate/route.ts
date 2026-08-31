import { NextRequest, NextResponse } from "next/server";
import { currentUserId, error } from "@/lib/http";
import { cloneProject, ownedProject, serializeProject } from "@/lib/projects";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await currentUserId();
  if (!userId) return error("Authentication required.", 401);
  const source = await ownedProject(userId, id);
  if (!source) return error("Project not found.", 404);
  const project = await cloneProject(source, userId);
  return NextResponse.json(serializeProject(project), { status: 201 });
}
