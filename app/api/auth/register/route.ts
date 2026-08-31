import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { error } from "@/lib/http";
import { getClientKey, isRateLimited } from "@/lib/security";
import {
  findUserIdentityConflicts,
  identityConflictMessage,
  isUniqueConstraintError,
} from "@/lib/user-uniqueness";
import { accountValidationMessage, registerSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  if (isRateLimited(`register:${getClientKey(request)}`, 8, 15 * 60 * 1000)) return error("Too many registration attempts. Please try again later.", 429);
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error(accountValidationMessage(parsed.error), 400);
  const conflicts = await findUserIdentityConflicts(parsed.data.email, parsed.data.name);
  if (conflicts.emailTaken || conflicts.usernameTaken) return error(identityConflictMessage(conflicts, "registration"), 409);
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  let user;
  try {
    user = await prisma.user.create({ data: { name: parsed.data.name, email: parsed.data.email, passwordHash } });
  } catch (cause) {
    if (!isUniqueConstraintError(cause)) throw cause;
    const raceConflicts = await findUserIdentityConflicts(parsed.data.email, parsed.data.name);
    return error(identityConflictMessage(raceConflicts, "registration"), 409);
  }
  return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 });
}
