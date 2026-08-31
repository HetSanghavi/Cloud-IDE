import { NextRequest, NextResponse } from "next/server";
import { currentUserId, error } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import {
  findUserIdentityConflicts,
  identityConflictMessage,
  isUniqueConstraintError,
} from "@/lib/user-uniqueness";
import { accountValidationMessage, profileSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return error("Authentication required.", 401);
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error(accountValidationMessage(parsed.error), 400);
  const conflicts = await findUserIdentityConflicts(parsed.data.email, parsed.data.name, userId);
  if (conflicts.emailTaken || conflicts.usernameTaken) return error(identityConflictMessage(conflicts, "profile"), 409);
  let user;
  try {
    user = await prisma.user.update({ where: { id: userId }, data: parsed.data });
  } catch (cause) {
    if (!isUniqueConstraintError(cause)) throw cause;
    const raceConflicts = await findUserIdentityConflicts(parsed.data.email, parsed.data.name, userId);
    return error(identityConflictMessage(raceConflicts, "profile"), 409);
  }
  return NextResponse.json({ id: user.id, name: user.name, email: user.email });
}
