/**
 * Phase 1 seed script — populates MongoDB with realistic dev data so the landing
 * page, admin dashboard, and bot-facing API can be exercised end-to-end.
 *
 * Inserts: 2 dungeons (6p + 12p, matching the shipped banners), 14 members
 * (cycling the canonical NSNL classes), 3 scheduled raids this week (mixed sizes,
 * partially rostered), and 2 pending join requests.
 *
 * Run from `web/`:  npm run seed
 * (`.mts` so tsx loads it as ESM — needed for the top-level `await import`s below.)
 *
 * Destructive: clears `members`, `dungeons`, `raids`, and `joinRequests` first.
 * Reads `MONGODB_URI` (+ `TEAM_TIMEZONE`) from `.env.local` then `.env`.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Type-only import (erased at runtime — does not load mongoose before env is set).
import type { Types } from "mongoose";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(HERE, "..");

/** Minimal .env loader: real values into process.env without overriding existing ones. */
function loadEnvFile(file: string): void {
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(path.join(WEB_ROOT, ".env.local"));
loadEnvFile(path.join(WEB_ROOT, ".env"));

if (!process.env.MONGODB_URI) {
  console.error(
    "✗ MONGODB_URI is not set. Add it to web/.env.local (see web/.env.example) and retry."
  );
  process.exit(1);
}

// Imported after env is loaded — db.ts reads MONGODB_URI at module top level.
const { default: mongoose } = await import("mongoose");
const { connectToDatabase } = await import("../lib/db");
const { Member } = await import("../lib/models/Member");
const { Dungeon } = await import("../lib/models/Dungeon");
const { Raid } = await import("../lib/models/Raid");
const { JoinRequest } = await import("../lib/models/JoinRequest");
const { NSNL_CLASSES } = await import("../lib/classes");

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const MEMBER_NAMES = [
  "LangTuVoDanh",
  "TieuLyPhi",
  "HoaVoKhuyet",
  "DocCoCauBai",
  "MaiHoaTan",
  "ThietHuyetLang",
  "VanCotKy",
  "DaKhachHanh",
  "PhongLuuTuc",
  "AmHuongCac",
  "BachVanThanh",
  "CuuUTieuYeu",
  "LongTuyetNhi",
  "HanGiang",
];

/** Build a raid's slot array: first `filled` slots take members[0..filled), rest open. */
function buildSlots(size: number, memberIds: Types.ObjectId[], filled: number) {
  return Array.from({ length: size }, (_, index) => ({
    index,
    roleLabel: null,
    memberId: index < filled ? memberIds[index] : null,
  }));
}

async function seed() {
  await connectToDatabase();
  console.log("→ Connected to MongoDB");

  // Clean slate so the seed is idempotent.
  await Promise.all([
    Member.deleteMany({}),
    Dungeon.deleteMany({}),
    Raid.deleteMany({}),
    JoinRequest.deleteMany({}),
  ]);
  console.log("→ Cleared members, dungeons, raids, joinRequests");

  // Ensure schema indexes (unique discordId, pending-request guard, etc.) exist.
  await Promise.all([
    Member.syncIndexes(),
    Dungeon.syncIndexes(),
    Raid.syncIndexes(),
    JoinRequest.syncIndexes(),
  ]);

  // --- Dungeons (banners shipped under web/public/assets/dungeons/) ---
  const [dungeon6, dungeon12] = await Dungeon.create([
    {
      name: "Trích Tiên Kinh Đào",
      size: 6,
      description: "Phụ bản 6 người — vượt Kinh Đào, phối hợp ăn ý để chinh phục.",
      imageKey: "TrichTienKinhDao.png",
      isActive: true,
    },
    {
      name: "Kính Thiên Các - Cấm Các",
      size: 12,
      description: "Phụ bản 12 người — đột phá Cấm Các, phối hợp toàn đội để hạ Boss cuối.",
      imageKey: "KTC-CamCac.png",
      isActive: true,
    },
  ]);
  console.log(`→ Inserted 2 dungeons`);

  // --- Members (class/classIcon from the canonical NSNL list) ---
  const members = await Member.create(
    MEMBER_NAMES.map((name, i) => {
      const cls = NSNL_CLASSES[i % NSNL_CLASSES.length];
      return {
        // Snowflake-shaped string ids (canonical key — never a number).
        discordId: `20000000000000${String(i).padStart(4, "0")}`,
        discordName: name,
        discordAvatar: `https://cdn.discordapp.com/embed/avatars/${i % 6}.png`,
        class: cls.name,
        classIcon: cls.iconKey,
        isActive: true,
        syncedAt: new Date(),
      };
    })
  );
  const memberIds = members.map((m) => m._id);
  console.log(`→ Inserted ${members.length} members`);

  // --- Raids this week (mixed sizes, future-dated so they read as "nearest") ---
  const now = Date.now();
  // Third raid (raid6b) is created for "many raids per week" coverage but not
  // referenced again, so it is intentionally left unbound.
  const [raid6a, raid12] = await Raid.create([
    {
      dungeonId: dungeon6._id,
      size: 6,
      startAt: new Date(now + DAY + 19 * HOUR),
      title: null,
      notes: null,
      slots: buildSlots(6, memberIds.slice(0, 5), 5), // 5/6
      status: "scheduled",
    },
    {
      dungeonId: dungeon12._id,
      size: 12,
      startAt: new Date(now + 3 * DAY + 4 * HOUR),
      title: "Đại chiến Cấm Các — Tối thứ 7",
      notes: null,
      slots: buildSlots(12, memberIds.slice(0, 9), 9), // 9/12
      status: "scheduled",
    },
    {
      dungeonId: dungeon6._id,
      size: 6,
      startAt: new Date(now + 5 * DAY + 20 * HOUR),
      title: null,
      notes: null,
      slots: buildSlots(6, memberIds.slice(9, 12), 3), // 3/6
      status: "scheduled",
    },
  ]);
  console.log(`→ Inserted 3 raids (nearest 6p: raid6a, nearest 12p: raid12)`);

  // --- Pending join requests (members not yet rostered → exercise admin Requests) ---
  const requester6 = members[12]; // LongTuyetNhi
  const requester12 = members[13]; // HanGiang
  await JoinRequest.create([
    {
      raidId: raid6a._id,
      memberId: requester6._id,
      discordId: requester6.discordId,
      status: "pending",
      requestedSlotIndex: 5,
    },
    {
      raidId: raid12._id,
      memberId: requester12._id,
      discordId: requester12.discordId,
      status: "pending",
      requestedSlotIndex: 9,
    },
  ]);
  console.log(`→ Inserted 2 pending join requests`);

  console.log("\n✓ Seed complete.");
  console.log(`  dungeons: 2  members: ${members.length}  raids: 3  joinRequests: 2`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error("\n✗ Seed failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
