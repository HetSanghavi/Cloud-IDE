import { NextRequest, NextResponse } from "next/server";
import { makeTemplate } from "@/lib/templates";
import { currentUserId, error } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeProject, writeProjectFiles } from "@/lib/projects";
import { projectSchema } from "@/lib/validation";

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return error("Authentication required.", 401);
  const projects = await prisma.project.findMany({ where: { ownerId: userId }, include: { files: { orderBy: { createdAt: "asc" } } }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json(projects.map(serializeProject));
}

export async function POST(request: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return error("Authentication required.", 401);
  const parsed = projectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error("Project details are invalid.", 400);
  const project = await prisma.project.create({ data: { ownerId: userId, name: parsed.data.name, template: parsed.data.template, color: parsed.data.color } });
  await writeProjectFiles(project.id, makeTemplate(parsed.data.template));
  const created = await prisma.project.findUniqueOrThrow({ where: { id: project.id }, include: { files: { orderBy: { createdAt: "asc" } } } });
  return NextResponse.json(serializeProject(created), { status: 201 });
}
