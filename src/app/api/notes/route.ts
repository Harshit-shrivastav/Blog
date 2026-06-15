import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const where = { isPublic: true };

    const [notes, total] = await Promise.all([
      db.note.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.note.count({ where }),
    ]);

    const parsed = notes.map((note) => ({
      ...note,
      images: JSON.parse(note.images || "[]"),
      audioFiles: JSON.parse(note.audioFiles || "[]"),
      audioCaptions: JSON.parse(note.audioCaptions || "{}"),
      imageCaptions: JSON.parse(note.imageCaptions || "{}"),
    }));

    return NextResponse.json({
      notes: parsed,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    console.error("Failed to fetch notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}
