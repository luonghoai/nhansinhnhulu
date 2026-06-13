import { cookies } from "next/headers";
import { getIronSession, unsealData, type SessionOptions } from "iron-session";
import bcrypt from "bcryptjs";

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

/** Constant-time-ish compare against ADMIN_PASSWORD_HASH (bcrypt). */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}
