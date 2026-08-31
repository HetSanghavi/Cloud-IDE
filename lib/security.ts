import { NextRequest } from "next/server";

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function getClientKey(request: Pick<NextRequest, "headers">) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export function isRateLimited(key: string, limit: number, intervalMs: number) {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + intervalMs });
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}

export function clearRateLimit(key: string) {
  rateBuckets.delete(key);
}

export function safeFileName(value: string) {
  const name = value.trim();
  if (!name || name.length > 100 || name === "." || name === ".." || /[\\/:*?"<>|\u0000]/.test(name)) return null;
  return name;
}

export function safeProjectName(value: string) {
  const name = value.trim();
  return name && name.length <= 80 ? name : null;
}
