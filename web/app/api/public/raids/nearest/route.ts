import { NextResponse } from "next/server";
import { getNearestRaids } from "@/lib/queries";

export async function GET() {
  try {
    const raids = await getNearestRaids();
    return NextResponse.json({ raids });
  } catch {
    return NextResponse.json({ raids: [] });
  }
}

export const revalidate = 60;
