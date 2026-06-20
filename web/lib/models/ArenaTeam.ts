import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** A 3v3 arena squad always fields exactly three fighters. */
export const ARENA_TEAM_SIZE = 3;

const ArenaSlotSchema = new Schema(
  {
    index: { type: Number, required: true },
    roleLabel: { type: String, default: null },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", default: null },
  },
  { _id: false }
);

const ArenaTeamSchema = new Schema(
  {
    name: { type: String, required: true },
    tagline: { type: String, default: null },
    rankLabel: { type: String, default: null },
    wins: { type: Number, default: 0, min: 0 },
    losses: { type: Number, default: 0, min: 0 },
    slots: { type: [ArenaSlotSchema], default: [] },
    notes: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ArenaTeamSchema.index({ isActive: 1, sortOrder: 1 });

export type ArenaTeamDoc = InferSchemaType<typeof ArenaTeamSchema>;
export type ArenaSlotDoc = InferSchemaType<typeof ArenaSlotSchema>;

export const ArenaTeam: Model<ArenaTeamDoc> =
  (models.ArenaTeam as Model<ArenaTeamDoc>) ??
  model<ArenaTeamDoc>("ArenaTeam", ArenaTeamSchema);
