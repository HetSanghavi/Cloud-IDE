import { NextRequest, NextResponse } from "next/server";
import { Visibility } from "@prisma/client";
import { error } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeProject } from "@/lib/projects";

export async function GET(_: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const project = await prisma.project.findFirst({ where: { shareId, visibility: Visibility.PUBLIC }, include: { files: { orderBy: { createdAt: "asc" } } } });
  if (!project) return error("Public project not found.", 404);
  return NextResponse.json(serializeProject(project));
}
