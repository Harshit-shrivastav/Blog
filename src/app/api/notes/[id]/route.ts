import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const note = await db.note.findUnique({
      where: { id },
    });

    if (!note || !note.isPublic) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...note,
      images: JSON.parse(note.images || "[]"),
      audioFiles: JSON.parse(note.audioFiles || "[]"),
      audioCaptions: JSON.parse(note.audioCaptions || "{}"),
      imageCaptions: JSON.parse(note.imageCaptions || "{}"),
    });
  } catch (error) {
    console.error("Failed to fetch note:", error);
    return NextResponse.json(
      { error: "Failed to fetch note" },
      { status: 500 }
    );
  }
}
