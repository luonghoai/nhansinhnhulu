import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { JoinRequest } from "@/lib/models/JoinRequest";
import { toJoinRequestDTO } from "@/lib/dto";
import { rejectRequestSchema } from "@/lib/validators";
import { notifyBot } from "@/lib/botClient";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = rejectRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const joinRequest = await JoinRequest.findById(id);
  if (!joinRequest) {
    return NextResponse.json({ error: "Join request not found" }, { status: 404 });
  }
  if (joinRequest.status !== "pending") {
    return NextResponse.json({ error: "Join request already decided" }, { status: 409 });
  }

  joinRequest.status = "rejected";
  joinRequest.decidedBy = "admin";
  joinRequest.decidedAt = new Date();

  const notified = await notifyBot({
    discordId: joinRequest.discordId,
    decision: "rejected",
    raidId: joinRequest.raidId.toString(),
    reason: parsed.data.reason,
  });
  if (notified) {
    joinRequest.notifiedAt = new Date();
  }

  await joinRequest.save();

  return NextResponse.json({ request: toJoinRequestDTO(joinRequest) });
}

export const dynamic = "force-dynamic";
