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

// GET: Full note by id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminId = await requireAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const note = await db.note.findUnique({ where: { id } });
    if (!note) {
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
    return NextResponse.json({ error: "Failed to fetch note" }, { status: 500 });
  }
}

// PUT: Update note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminId = await requireAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.note.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const note = await db.note.update({
      where: { id },
      data: {
        ...(body.content !== undefined && { content: body.content }),
        ...(body.images !== undefined && { images: JSON.stringify(body.images) }),
        ...(body.audioFiles !== undefined && { audioFiles: JSON.stringify(body.audioFiles) }),
        ...(body.audioCaptions !== undefined && { audioCaptions: JSON.stringify(body.audioCaptions) }),
        ...(body.imageCaptions !== undefined && { imageCaptions: JSON.stringify(body.imageCaptions) }),
        ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
        ...(body.commentsEnabled !== undefined && { commentsEnabled: body.commentsEnabled }),
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        action: "note_updated",
        details: JSON.stringify({ noteId: note.id, adminId }),
      },
    });

    return NextResponse.json({
      ...note,
      images: JSON.parse(note.images || "[]"),
      audioFiles: JSON.parse(note.audioFiles || "[]"),
      audioCaptions: JSON.parse(note.audioCaptions || "{}"),
      imageCaptions: JSON.parse(note.imageCaptions || "{}"),
    });
  } catch (error) {
    console.error("Failed to update note:", error);
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

// DELETE: Delete note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminId = await requireAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.note.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    await db.note.delete({ where: { id } });

    // Delete related interactions
    await db.interaction.deleteMany({
      where: { targetType: "note", targetId: id },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        action: "note_deleted",
        details: JSON.stringify({ noteId: id, adminId }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete note:", error);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
