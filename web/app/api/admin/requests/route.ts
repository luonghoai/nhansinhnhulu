import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { JoinRequest, type JoinRequestDoc } from "@/lib/models/JoinRequest";
import { toJoinRequestDTO } from "@/lib/dto";
import type { QueryFilter } from "mongoose";

const VALID_STATUSES = ["pending", "approved", "rejected"] as const;
type RequestStatus = (typeof VALID_STATUSES)[number];

function isValidStatus(value: string): value is RequestStatus {
  return (VALID_STATUSES as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  const status = new URL(request.url).searchParams.get("status");
  const filter: QueryFilter<JoinRequestDoc> = status && isValidStatus(status) ? { status } : {};

  await connectToDatabase();
  const requests = await JoinRequest.find(filter).sort({ createdAt: 1 });
  return NextResponse.json({ requests: requests.map(toJoinRequestDTO) });
}

export const dynamic = "force-dynamic";
