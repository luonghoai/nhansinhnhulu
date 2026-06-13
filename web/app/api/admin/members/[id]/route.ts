import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Member } from "@/lib/models/Member";
import { Raid } from "@/lib/models/Raid";
import { toMemberDTO } from "@/lib/dto";
import { updateMemberSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await connectToDatabase();

  const member = await Member.findByIdAndUpdate(id, parsed.data, { new: true });
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  return NextResponse.json({ member: toMemberDTO(member) });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const hard = new URL(request.url).searchParams.get("hard") === "true";

  await connectToDatabase();

  if (!hard) {
    const member = await Member.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    return NextResponse.json({ member: toMemberDTO(member) });
  }

  const member = await Member.findByIdAndDelete(id);
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Null out any raid slots that referenced this member.
  await Raid.updateMany(
    { "slots.memberId": member._id },
    { $set: { "slots.$[slot].memberId": null } },
    { arrayFilters: [{ "slot.memberId": member._id }] }
  );

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
