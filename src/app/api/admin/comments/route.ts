import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken, extractBearerToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = extractBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "blog";
    const status = searchParams.get("status") || "all";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {};
    if (status === "pending") where.isApproved = false;
    if (status === "approved") where.isApproved = true;

    if (type === "blog") {
      const comments = await db.comment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: { blog: { select: { title: true, slug: true } } },
      });

      const total = await db.comment.count({ where });
      const pendingCount = await db.comment.count({ where: { isApproved: false } });

      return NextResponse.json({
        comments: comments.map((c) => ({
          id: c.id,
          authorName: c.authorName,
          content: c.content,
          fingerprint: c.fingerprint,
          isApproved: c.isApproved,
          createdAt: c.createdAt.toISOString(),
          blogTitle: c.blog?.title,
          blogSlug: c.blog?.slug,
        })),
        total,
        pendingCount,
      });
    } else {
      const comments = await db.noteComment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: { note: { select: { content: true } } },
      });

      const total = await db.noteComment.count({ where });
      const pendingCount = await db.noteComment.count({ where: { isApproved: false } });

      return NextResponse.json({
        comments: comments.map((c) => ({
          id: c.id,
          authorName: c.authorName,
          content: c.content,
          fingerprint: c.fingerprint,
          isApproved: c.isApproved,
          createdAt: c.createdAt.toISOString(),
          noteContent: c.note?.content?.slice(0, 100),
        })),
        total,
        pendingCount,
      });
    }
  } catch (error) {
    console.error("Failed to fetch admin comments:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = extractBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const { commentId, type, action } = body;

    if (!commentId || !type || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (action === "approve") {
      if (type === "blog") {
        await db.comment.update({ where: { id: commentId }, data: { isApproved: true } });
      } else {
        await db.noteComment.update({ where: { id: commentId }, data: { isApproved: true } });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "unapprove") {
      if (type === "blog") {
        await db.comment.update({ where: { id: commentId }, data: { isApproved: false } });
      } else {
        await db.noteComment.update({ where: { id: commentId }, data: { isApproved: false } });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update comment:", error);
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = extractBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("id");
    const type = searchParams.get("type") || "blog";

    if (!commentId) {
      return NextResponse.json({ error: "Comment ID is required" }, { status: 400 });
    }

    if (type === "blog") {
      await db.comment.delete({ where: { id: commentId } });
    } else {
      await db.noteComment.delete({ where: { id: commentId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete comment:", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
