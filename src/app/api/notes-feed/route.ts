import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const notes = await db.note.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        content: true,
        images: true,
        audioFiles: true,
        isPublic: true,
        likeCount: true,
        saveCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const formatted = notes.map((note) => ({
      id: note.id,
      content: note.content,
      snippet:
        note.content.length > 200
          ? note.content.slice(0, 200) + "..."
          : note.content,
      images: JSON.parse(note.images || "[]"),
      audioFiles: JSON.parse(note.audioFiles || "[]"),
      likeCount: note.likeCount,
      saveCount: note.saveCount,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    }));

    return NextResponse.json({
      notes: formatted,
      total: notes.length,
    });
  } catch (error) {
    console.error("Failed to fetch notes for feed:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}
