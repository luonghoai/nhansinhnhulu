import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** A Cờ 5 Quân tournament always has exactly 20 entrants once seeded. */
export const TOURNAMENT_ENTRANT_COUNT = 20;

/** Lifecycle stages, in order. */
export const TOURNAMENT_STATUSES = [
  "draft",
  "seeded",
  "r1_done",
  "r2_done",
  "final",
  "completed",
] as const;

const EntrantSchema = new Schema(
  {
    entrantId: { type: String, required: true },
    name: { type: String, required: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", default: null },
    seed: { type: Number, default: 0 },
  },
  { _id: false }
);

const MatchSchema = new Schema(
  {
    matchId: { type: String, required: true },
    round: { type: String, enum: ["r1", "r2", "final"], required: true },
    slot: { type: Number, required: true },
    aId: { type: String, default: null },
    bId: { type: String, default: null },
    scoreA: { type: Number, default: null },
    scoreB: { type: Number, default: null },
    winnerId: { type: String, default: null },
  },
  { _id: false }
);

const StandingSchema = new Schema(
  {
    entrantId: { type: String, required: true },
    points: { type: Number, default: 0 },
    gameWins: { type: Number, default: 0 },
    rank: { type: Number, default: null },
  },
  { _id: false }
);

const RoundsSchema = new Schema(
  {
    r1: { type: [MatchSchema], default: [] },
    r2: { type: [MatchSchema], default: [] },
    final: { type: [MatchSchema], default: [] },
  },
  { _id: false }
);

const PlacementsSchema = new Schema(
  {
    first: { type: String, default: null },
    second: { type: String, default: null },
    third: { type: String, default: null },
  },
  { _id: false }
);

const TournamentSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: null },
    startAt: { type: Date, required: true },
    gameType: { type: String, default: "co5quan" },
    status: { type: String, enum: TOURNAMENT_STATUSES, default: "draft" },
    entrants: { type: [EntrantSchema], default: [] },
    rounds: { type: RoundsSchema, default: () => ({ r1: [], r2: [], final: [] }) },
    standings: { type: [StandingSchema], default: null },
    placements: { type: PlacementsSchema, default: () => ({}) },
    announceMessageId: { type: String, default: null },
  },
  { timestamps: true }
);

TournamentSchema.index({ startAt: 1 });
TournamentSchema.index({ status: 1, startAt: 1 });
TournamentSchema.index({ gameType: 1 });

export type TournamentDoc = InferSchemaType<typeof TournamentSchema>;
export type EntrantDoc = InferSchemaType<typeof EntrantSchema>;
export type MatchDoc = InferSchemaType<typeof MatchSchema>;
export type StandingDoc = InferSchemaType<typeof StandingSchema>;

export const Tournament: Model<TournamentDoc> =
  (models.Tournament as Model<TournamentDoc>) ??
  model<TournamentDoc>("Tournament", TournamentSchema);
