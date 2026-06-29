import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** A 3v3 battle team always fields exactly three members. */
export const BATTLE_TEAM_SIZE = 3;

/** Best-of-5 final: most round-wins; first to this clinches. */
export const FINAL_ROUND_COUNT = 5;
export const FINAL_CLINCH_WINS = 3;

/** Competition formats — round-robin + Bo5 final, or a Bo3 double-elimination bracket. */
export const BATTLE_FORMATS = ["round_robin", "double_elim"] as const;

/** Series length: every bracket match is Bo3 except the Grand Final (Bo5). */
export const BRACKET_BEST_OF = 3;
export const GRAND_FINAL_BEST_OF = 5;

/** Round-wins needed to clinch a best-of-N series (2 in Bo3, 3 in Bo5). */
export function clinchWins(bestOf: number): number {
  return Math.ceil(bestOf / 2);
}

/** Lifecycle stages, in order. `bracket_stage` is the double-elim analogue of group/final. */
export const BATTLE_STATUSES = [
  "draft",
  "open",
  "teams_generated",
  "group_stage",
  "final_stage",
  "bracket_stage",
  "completed",
] as const;

/** Group matchup result, relative to team A. */
export const MATCHUP_RESULTS = ["a_win", "draw", "b_win"] as const;

/** Which half of a double-elimination bracket a match belongs to. */
export const BRACKET_SIDES = ["WB", "LB", "GF"] as const;

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

// A single best-of-N series within the double-elimination bracket. `aSource`/`bSource`
// describe where each participant comes from (a seed team or the winner/loser of another
// match); `aTeamId`/`bTeamId` are the resolved participants, recomputed by `deriveBracket`.
const BracketMatchSchema = new Schema(
  {
    matchId: { type: String, required: true },
    bracket: { type: String, enum: BRACKET_SIDES, required: true },
    label: { type: String, required: true },
    order: { type: Number, required: true },
    round: { type: Number, default: 0 },
    slot: { type: Number, default: 0 },
    bestOf: { type: Number, required: true },
    aSource: { type: Schema.Types.Mixed, required: true },
    bSource: { type: Schema.Types.Mixed, required: true },
    aTeamId: { type: String, default: null },
    bTeamId: { type: String, default: null },
    // Per-game winning teamId or null (unplayed); Mixed to allow null entries.
    rounds: { type: [Schema.Types.Mixed], default: () => [] },
    winnerTeamId: { type: String, default: null },
  },
  { _id: false }
);

const BracketSchema = new Schema(
  {
    matches: { type: [BracketMatchSchema], default: [] },
  },
  { _id: false }
);

const BattleEventSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: null },
    startAt: { type: Date, required: true },
    format: { type: String, enum: BATTLE_FORMATS, default: "round_robin" },
    status: { type: String, enum: BATTLE_STATUSES, default: "draft" },
    participants: { type: [Schema.Types.ObjectId], ref: "Member", default: [] },
    teams: { type: [BattleTeamSchema], default: [] },
    groupMatchups: { type: [MatchupSchema], default: [] },
    final: { type: FinalSchema, default: null },
    bracket: { type: BracketSchema, default: null },
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
export type BracketDoc = InferSchemaType<typeof BracketSchema>;
export type BracketMatchDoc = InferSchemaType<typeof BracketMatchSchema>;

export const BattleEvent: Model<BattleEventDoc> =
  (models.BattleEvent as Model<BattleEventDoc>) ??
  model<BattleEventDoc>("BattleEvent", BattleEventSchema);
