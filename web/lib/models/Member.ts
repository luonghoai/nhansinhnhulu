import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const MemberSchema = new Schema(
  {
    discordId: { type: String, required: true, unique: true },
    discordName: { type: String, required: true },
    discordAvatar: { type: String, required: true },
    class: { type: String, default: null },
    classIcon: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    syncedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

export type MemberDoc = InferSchemaType<typeof MemberSchema>;

export const Member: Model<MemberDoc> =
  (models.Member as Model<MemberDoc>) ?? model<MemberDoc>("Member", MemberSchema);
