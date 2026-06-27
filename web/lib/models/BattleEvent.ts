import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** A 3v3 battle team always fields exactly three members. */
export const BATTLE_TEAM_SIZE = 3;

/** Best-of-5 final: most round-wins; first to this clinches. */
export const FINAL_ROUND_COUNT = 5;
export const FINAL_CLINCH_WINS = 3;

/** Lifecycle stages, in order. */
export const BATTLE_STATUSES = [
  "draft",
  "open",
  "teams_generated",
  "group_stage",
  "final_stage",
  "completed",
] as const;

/** Group matchup result, relative to team A. */
export const MATCHUP_RESULTS = ["a_win", "draw", "b_win"] as const;

const BattleTeamSchema = new Schema(
  {
    teamId: { type: String, required: true },
    name: { type: String, required: true },
    memberIds: { type: [Schema.Types.ObjectId], ref: "Member", default: [] },
    groupPoints: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const MatchupSchema = new Schema(
  {
    matchupId: { type: String, required: true },
    teamAId: { type: String, required: true },
    teamBId: { type: String, required: true },
    result: { type: String, enum: [...MATCHUP_RESULTS, null], default: null },
  },
  { _id: false }
);

const FinalSchema = new Schema(
  {
    teamIds: { type: [String], default: [] },
    // Each round holds the winning teamId or null (unplayed); Mixed to allow null.
    rounds: { type: [Schema.Types.Mixed], default: () => Array(FINAL_ROUND_COUNT).fill(null) },
    roundWins: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  { _id: false }
);

const BattleEventSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: null },
    startAt: { type: Date, required: true },
    status: { type: String, enum: BATTLE_STATUSES, default: "draft" },
    participants: { type: [Schema.Types.ObjectId], ref: "Member", default: [] },
    teams: { type: [BattleTeamSchema], default: [] },
    groupMatchups: { type: [MatchupSchema], default: [] },
    final: { type: FinalSchema, default: null },
    championTeamId: { type: String, default: null },
    announceMessageId: { type: String, default: null },
  },
  { timestamps: true }
);

BattleEventSchema.index({ startAt: 1 });
BattleEventSchema.index({ status: 1, startAt: 1 });

export type BattleEventDoc = InferSchemaType<typeof BattleEventSchema>;
export type BattleTeamDoc = InferSchemaType<typeof BattleTeamSchema>;
export type MatchupDoc = InferSchemaType<typeof MatchupSchema>;
export type FinalDoc = InferSchemaType<typeof FinalSchema>;

export const BattleEvent: Model<BattleEventDoc> =
  (models.BattleEvent as Model<BattleEventDoc>) ??
  model<BattleEventDoc>("BattleEvent", BattleEventSchema);
