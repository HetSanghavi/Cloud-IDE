import { NextRequest, NextResponse } from "next/server";
import { Visibility } from "@prisma/client";
import { currentUserId, error } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { cloneProject, serializeProject } from "@/lib/projects";

export async function POST(_: NextRequest, { params }: { params: { shareId: string } }) {
  const userId = await currentUserId();
  if (!userId) return error("Authentication required to copy this project.", 401);
  const source = await prisma.project.findFirst({ where: { shareId: params.shareId, visibility: Visibility.PUBLIC }, include: { files: { orderBy: { createdAt: "asc" } } } });
  if (!source) return error("Public project not found.", 404);
  const project = await cloneProject(source, userId);
  return NextResponse.json(serializeProject(project), { status: 201 });
}
