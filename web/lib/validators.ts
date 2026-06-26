import { z } from "zod";

/** Discord snowflakes are numeric strings; never parse as a JS number (precision loss). */
export const discordIdSchema = z.string().regex(/^\d+$/, "Must be a numeric Discord ID");

export const dungeonSizeSchema = z.union([z.literal(6), z.literal(12)]);

// ---- Admin: members ----
export const createMemberSchema = z.object({
  discordId: discordIdSchema,
});

export const updateMemberSchema = z.object({
  class: z.string().min(1).nullable().optional(),
  classIcon: z.string().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
});

// ---- Admin: dungeons ----
export const createDungeonSchema = z.object({
  name: z.string().min(1),
  size: dungeonSizeSchema,
  description: z.string().optional(),
  imageKey: z.string().nullable().optional(),
});

export const updateDungeonSchema = createDungeonSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ---- Admin: raids ----
export const slotSchema = z.object({
  index: z.number().int().min(0),
  roleLabel: z.string().nullable().optional(),
  memberId: z.string().nullable().optional(),
});

export const createRaidSchema = z.object({
  dungeonId: z.string(),
  startAt: z.string().datetime(),
  title: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  slots: z.array(slotSchema).optional(),
});

export const updateRaidSlotsSchema = z.object({
  slots: z.array(slotSchema),
});

export const updateRaidSchema = z.object({
  startAt: z.string().datetime().optional(),
  title: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
});

// ---- Admin: 3v3 arena teams ----
export const arenaSlotSchema = z.object({
  index: z.number().int().min(0).max(2),
  roleLabel: z.string().nullable().optional(),
  memberId: z.string().nullable().optional(),
});

export const createArenaTeamSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().nullable().optional(),
  rankLabel: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  slots: z.array(arenaSlotSchema).optional(),
});

export const updateArenaTeamSchema = z.object({
  name: z.string().min(1).optional(),
  tagline: z.string().nullable().optional(),
  rankLabel: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  wins: z.number().int().min(0).optional(),
  losses: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  slots: z.array(arenaSlotSchema).optional(),
});

// ---- Admin: tournaments (Cờ 5 Quân) ----
export const createTournamentSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  startAt: z.string().datetime(),
});

export const updateTournamentSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  startAt: z.string().datetime().optional(),
  status: z
    .enum(["draft", "seeded", "r1_done", "r2_done", "final", "completed"])
    .optional(),
});

const tournamentEntrantSchema = z.object({
  name: z.string().trim().min(1),
  memberId: z.string().nullable().optional(),
});

/** Replace the full entrant list — must be exactly 20 non-empty names. */
export const putEntrantsSchema = z.object({
  entrants: z.array(tournamentEntrantSchema).length(20),
});

export const seedTournamentSchema = z.object({
  confirmReset: z.boolean().optional(),
});

export const recordMatchSchema = z.object({
  scoreA: z.number().int().min(0).max(2),
  scoreB: z.number().int().min(0).max(2),
  confirmCascade: z.boolean().optional(),
});

export const finalizeTournamentSchema = z.object({
  manualOrder: z.array(z.string()).optional(),
});

// ---- Admin: join requests ----
export const approveRequestSchema = z.object({
  slotIndex: z.number().int().min(0).optional(),
});

export const rejectRequestSchema = z.object({
  reason: z.string().optional(),
});

// ---- Admin: send channel message ----
/** Discord's hard limit on message content length. */
export const DISCORD_MESSAGE_MAX = 2000;

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(DISCORD_MESSAGE_MAX),
  mentionUserIds: z.array(discordIdSchema).default([]),
});

// ---- Admin: auth ----
export const loginSchema = z.object({
  password: z.string().min(1),
});

// ---- Bot endpoints ----
export const ensureMemberSchema = z.object({
  discordId: discordIdSchema,
  discordName: z.string().min(1),
  discordAvatar: z.string().min(1),
});

export const createJoinRequestSchema = z.object({
  raidId: z.string(),
  discordId: discordIdSchema,
  requestedSlotIndex: z.number().int().min(0).optional(),
});
