import { NextRequest, NextResponse } from "next/server";
import { currentUserId, error } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { serializeProject, writeProjectFiles } from "@/lib/projects";
import { getClientKey, isRateLimited, safeProjectName } from "@/lib/security";
import { extractZipProject, ZIP_IMPORT_LIMITS } from "@/lib/zip-import";

export async function POST(request: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return error("Authentication required.", 401);
  if (isRateLimited(`import:${userId}:${getClientKey(request)}`, 10, 10 * 60 * 1000)) return error("Too many import requests. Please try again later.", 429);
  const form = await request.formData();
  const archive = form.get("file");
  if (!(archive instanceof File) || !archive.name.toLowerCase().endsWith(".zip") || archive.size > ZIP_IMPORT_LIMITS.maxUploadBytes) return error("Choose a ZIP file smaller than 8 MB.", 400);
  try {
    const root = await extractZipProject(await archive.arrayBuffer());
    const name = safeProjectName(String(form.get("name") || archive.name.replace(/\.zip$/i, ""))) || "Imported project";
    const project = await prisma.project.create({ data: { ownerId: userId, name, template: "blank", color: "blue" } });
    await writeProjectFiles(project.id, root);
    const created = await prisma.project.findUniqueOrThrow({ where: { id: project.id }, include: { files: { orderBy: { createdAt: "asc" } } } });
    return NextResponse.json(serializeProject(created), { status: 201 });
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "Unable to import this ZIP file.", 400);
  }
}
