import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const adminCount = await db.admin.count();
    return NextResponse.json({ setupComplete: adminCount > 0 });
  } catch {
    return NextResponse.json({ setupComplete: false });
  }
}
