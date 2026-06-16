import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import { getIronSession, unsealData, type SessionOptions } from "iron-session";

export interface AdminSessionData {
  isAdmin?: boolean;
}

export const ADMIN_SESSION_COOKIE = "nsnl_admin_session";

export const sessionOptions: SessionOptions = {
  password: requireSessionSecret(),
  cookieName: ADMIN_SESSION_COOKIE,
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
};

function requireSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    // iron-session requires a password of at least 32 characters.
    return "dev-only-session-secret-change-me-please-32chars";
  }
  return secret;
}

/** Reads the admin session for the current request (Server Components / Route Handlers). */
export async function getAdminSession() {
  return getIronSession<AdminSessionData>(await cookies(), sessionOptions);
}

/**
 * Verifies a sealed session cookie value (used in `proxy.ts`, which doesn't have
 * access to `next/headers`).
 */
export async function isAdminSessionCookieValid(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  try {
    const data = await unsealData<AdminSessionData>(cookieValue, sessionOptions);
    return data.isAdmin === true;
  } catch {
    return false;
  }
}

/**
 * Verifies the admin password against the plaintext `ADMIN_PASSWORD` env var,
 * using a constant-time comparison.
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const plain = process.env.ADMIN_PASSWORD;
  if (!plain) return false;
  return constantTimeEquals(password, plain);
}

/**
 * Length-independent constant-time string comparison. Both inputs are hashed to
 * a fixed-size digest first so `timingSafeEqual` never leaks length via a
 * thrown error or early return.
 */
function constantTimeEquals(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}
