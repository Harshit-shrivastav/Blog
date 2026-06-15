import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fingerprint = request.headers.get("x-fingerprint") || "";

    const note = await db.note.findUnique({
      where: { id },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const allComments = await db.noteComment.findMany({
      where: { noteId: note.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const comments = allComments.map((c) => ({
      id: c.id,
      authorName: c.authorName,
      content: c.content,
      fingerprint: c.fingerprint,
      isApproved: c.isApproved,
      createdAt: c.createdAt.toISOString(),
    }));

    return NextResponse.json({ comments, fingerprint });
  } catch (error) {
    console.error("Failed to fetch note comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const note = await db.note.findUnique({
      where: { id },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Check per-note comments setting
    if (note.commentsEnabled === false) {
      return NextResponse.json(
        { error: "Comments are disabled for this note" },
        { status: 403 }
      );
    }

    // Check global comments setting
    const siteSettings = await db.siteSettings.findFirst();
    if (siteSettings?.globalCommentsEnabled === false) {
      return NextResponse.json(
        { error: "Comments are currently disabled site-wide" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { authorName, content } = body;
    const fingerprint = request.headers.get("x-fingerprint") || "";

    if (!authorName || typeof authorName !== "string") {
      return NextResponse.json(
        { error: "Author name is required" },
        { status: 400 }
      );
    }
    const trimmedName = authorName.trim();
    if (trimmedName.length < 1 || trimmedName.length > 100) {
      return NextResponse.json(
        { error: "Author name must be between 1 and 100 characters" },
        { status: 400 }
      );
    }

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }
    const trimmedContent = content.trim();
    if (trimmedContent.length < 1 || trimmedContent.length > 2000) {
      return NextResponse.json(
        { error: "Comment content must be between 1 and 2000 characters" },
        { status: 400 }
      );
    }

    if (!fingerprint) {
      return NextResponse.json(
        { error: "Fingerprint is required" },
        { status: 400 }
      );
    }

    const comment = await db.noteComment.create({
      data: {
        noteId: note.id,
        authorName: trimmedName,
        content: trimmedContent,
        fingerprint,
        isApproved: false,
      },
    });

    return NextResponse.json({
      id: comment.id,
      authorName: comment.authorName,
      content: comment.content,
      fingerprint: comment.fingerprint,
      isApproved: comment.isApproved,
      createdAt: comment.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create note comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
