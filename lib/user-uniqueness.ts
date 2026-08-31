import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type IdentityConflicts = {
  emailTaken: boolean;
  usernameTaken: boolean;
};

export async function findUserIdentityConflicts(
  email: string,
  name: string,
  excludeId?: string,
): Promise<IdentityConflicts> {
  const conflicts = await prisma.user.findMany({
    where: {
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
      OR: [
        { email: { equals: email, mode: "insensitive" } },
        { name: { equals: name, mode: "insensitive" } },
      ],
    },
    select: {
      email: true,
      name: true,
    },
  });

  return {
    emailTaken: conflicts.some(conflict => conflict.email.toLowerCase() === email.toLowerCase()),
    usernameTaken: conflicts.some(conflict => conflict.name.toLowerCase() === name.toLowerCase()),
  };
}

export function identityConflictMessage(
  conflicts: IdentityConflicts,
  context: "registration" | "profile",
): string {
  if (conflicts.emailTaken && conflicts.usernameTaken) {
    return context === "registration"
      ? "This email is already registered and this username is already taken. Try logging in or choose different details."
      : "This email is already in use and this username is already taken. Please choose different details.";
  }

  if (conflicts.emailTaken) {
    return context === "registration"
      ? "This email is already registered. Try logging in or use a different email."
      : "This email is already in use.";
  }

  if (conflicts.usernameTaken) {
    return "This username is already taken. Please choose another.";
  }

  return "This email or username is already in use.";
}

export function isUniqueConstraintError(cause: unknown): boolean {
  return cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === "P2002";
}
