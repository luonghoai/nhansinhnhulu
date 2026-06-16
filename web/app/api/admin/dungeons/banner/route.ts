import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

// Banners are written into `public/assets/dungeons/` and served statically.
// NOTE: this requires a writable, persistent filesystem (local dev, a VPS, or a
// Docker volume). It does NOT work on Vercel, whose runtime filesystem is read-only
// and ephemeral — host `web/` on a persistent server if banner uploads are needed.
const UPLOAD_DIR = path.join(process.cwd(), "public", "assets", "dungeons");
const MAX_BANNER_BYTES = 8 * 1024 * 1024;
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Guarded by `proxy.ts` (matcher `/api/admin/:path*`) — only authenticated admins reach here.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
  }
  if (file.size > MAX_BANNER_BYTES) {
    return NextResponse.json({ error: "Image too large (max 8MB)" }, { status: 400 });
  }

  const fileName = `${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, fileName), bytes);

  // Store the bare asset key; `dungeonBannerSrc` resolves it to /assets/dungeons/<fileName>.
  return NextResponse.json({ imageKey: fileName }, { status: 201 });
}

export const dynamic = "force-dynamic";
