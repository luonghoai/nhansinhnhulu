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

// ---- Admin: join requests ----
export const approveRequestSchema = z.object({
  slotIndex: z.number().int().min(0).optional(),
});

export const rejectRequestSchema = z.object({
  reason: z.string().optional(),
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
