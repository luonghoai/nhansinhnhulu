import { Schema, model, models, Types, type InferSchemaType, type Model } from "mongoose";

const SlotSchema = new Schema(
  {
    index: { type: Number, required: true },
    roleLabel: { type: String, default: null },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", default: null },
  },
  { _id: false }
);

const RaidSchema = new Schema(
  {
    dungeonId: { type: Schema.Types.ObjectId, ref: "Dungeon", required: true },
    size: { type: Number, required: true, enum: [6, 12] },
    startAt: { type: Date, required: true },
    title: { type: String, default: null },
    notes: { type: String, default: null },
    slots: { type: [SlotSchema], default: [] },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
    announcedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

RaidSchema.index({ startAt: 1 });
RaidSchema.index({ status: 1, startAt: 1 });

export type RaidDoc = InferSchemaType<typeof RaidSchema>;
export type SlotDoc = InferSchemaType<typeof SlotSchema>;
export { Types };

export const Raid: Model<RaidDoc> =
  (models.Raid as Model<RaidDoc>) ?? model<RaidDoc>("Raid", RaidSchema);
