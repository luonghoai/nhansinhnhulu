import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const DungeonSchema = new Schema(
  {
    name: { type: String, required: true },
    size: { type: Number, required: true, enum: [6, 12] },
    description: { type: String, default: "" },
    imageKey: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DungeonSchema.index({ name: 1 });

export type DungeonDoc = InferSchemaType<typeof DungeonSchema>;

export const Dungeon: Model<DungeonDoc> =
  (models.Dungeon as Model<DungeonDoc>) ?? model<DungeonDoc>("Dungeon", DungeonSchema);
