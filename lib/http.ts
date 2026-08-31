import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function currentUserId() {
  const session = await auth();
  return session?.user?.id || null;
}

export function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
