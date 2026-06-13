import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const JoinRequestSchema = new Schema(
  {
    raidId: { type: Schema.Types.ObjectId, ref: "Raid", required: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    discordId: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    requestedSlotIndex: { type: Number, default: null },
    decidedBy: { type: String, default: null },
    decidedAt: { type: Date, default: null },
    notifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

JoinRequestSchema.index({ status: 1, createdAt: 1 });
JoinRequestSchema.index({ raidId: 1, memberId: 1 });
// Prevent duplicate pending requests for the same member/raid.
JoinRequestSchema.index(
  { raidId: 1, memberId: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export type JoinRequestDoc = InferSchemaType<typeof JoinRequestSchema>;

export const JoinRequest: Model<JoinRequestDoc> =
  (models.JoinRequest as Model<JoinRequestDoc>) ??
  model<JoinRequestDoc>("JoinRequest", JoinRequestSchema);
