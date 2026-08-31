import bcrypt from "bcryptjs";
import { CredentialsSignin } from "@auth/core/errors";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { clearRateLimit, getClientKey, isRateLimited } from "@/lib/security";

const credentialsSchema = z.object({ email: z.string().trim().email().transform(value => value.toLowerCase()), password: z.string().min(1).max(72) });

export class LoginRateLimitError extends CredentialsSignin {
  code = "rate_limited";
}

export class InvalidLoginInputError extends CredentialsSignin {
  code = "invalid_input";
}

export async function authorizeCredentials(credentials: unknown, request: Pick<NextRequest, "headers">) {
  const parsed = credentialsSchema.safeParse(credentials);
  if (!parsed.success) throw new InvalidLoginInputError();
  const key = `login:${getClientKey(request)}:${parsed.data.email}`;
  if (isRateLimited(key, 10, 15 * 60 * 1000)) throw new LoginRateLimitError();
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !await bcrypt.compare(parsed.data.password, user.passwordHash)) return null;
  clearRateLimit(key);
  return { id: user.id, name: user.name, email: user.email, image: user.image };
}
