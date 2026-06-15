import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

async function requireAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  let token: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }
  if (!token) {
    const cookie = request.cookies.get("admin-token");
    token = cookie?.value || null;
  }
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || !payload.adminId) return null;
  return payload.adminId as string;
}

// GET: All notes with pagination
export async function GET(request: NextRequest) {
  try {
    const adminId = await requireAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const [notes, total] = await Promise.all([
      db.note.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.note.count(),
    ]);

    return NextResponse.json({
      notes: notes.map((n) => ({
        ...n,
        images: JSON.parse(n.images || "[]"),
        audioFiles: JSON.parse(n.audioFiles || "[]"),
        audioCaptions: JSON.parse(n.audioCaptions || "{}"),
        imageCaptions: JSON.parse(n.imageCaptions || "{}"),
      })),
      hasMore: skip + limit < total,
    });
  } catch (error) {
    console.error("Failed to fetch admin notes:", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

// POST: Create note
export async function POST(request: NextRequest) {
  try {
    const adminId = await requireAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content, images, audioFiles, audioCaptions, imageCaptions, isPublic, commentsEnabled } = body;

    const note = await db.note.create({
      data: {
        content: content || "",
        images: JSON.stringify(images || []),
        audioFiles: JSON.stringify(audioFiles || []),
        audioCaptions: JSON.stringify(audioCaptions || {}),
        imageCaptions: JSON.stringify(imageCaptions || {}),
        isPublic: isPublic !== false,
        commentsEnabled: commentsEnabled !== false,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        action: "note_created",
        details: JSON.stringify({ noteId: note.id, adminId }),
      },
    });

    return NextResponse.json(
      {
        ...note,
        images: JSON.parse(note.images || "[]"),
        audioFiles: JSON.parse(note.audioFiles || "[]"),
        audioCaptions: JSON.parse(note.audioCaptions || "{}"),
        imageCaptions: JSON.parse(note.imageCaptions || "{}"),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create note:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
