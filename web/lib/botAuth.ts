import { NextResponse } from "next/server";

/**
 * Verifies the `X-Bot-Secret` header against `BOT_API_SECRET`. Returns a 401
 * response to short-circuit the handler if missing/invalid, or `null` if ok.
 */
export function requireBotSecret(request: Request): NextResponse | null {
  const expected = process.env.BOT_API_SECRET;
  const provided = request.headers.get("x-bot-secret");

  if (!expected || !provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
