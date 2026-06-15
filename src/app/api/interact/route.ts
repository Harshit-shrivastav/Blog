import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateFingerprint } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetType, targetId, action, fingerprint: bodyFingerprint } = body;

    // Validate fields
    if (!targetType || !targetId || !action) {
      return NextResponse.json(
        { error: "Missing required fields: targetType, targetId, action" },
        { status: 400 }
      );
    }

    if (!["blog", "note"].includes(targetType)) {
      return NextResponse.json(
        { error: "Invalid targetType. Must be 'blog' or 'note'" },
        { status: 400 }
      );
    }

    if (!["like", "save"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'like' or 'save'" },
        { status: 400 }
      );
    }

    // Use provided fingerprint or generate from request
    const fingerprint = bodyFingerprint || request.headers.get("x-fingerprint") || generateFingerprint(request);

    // Verify the target exists
    if (targetType === "blog") {
      const blog = await db.blogPost.findUnique({ where: { id: targetId } });
      if (!blog) {
        return NextResponse.json({ error: "Blog not found" }, { status: 404 });
      }
    } else {
      const note = await db.note.findUnique({ where: { id: targetId } });
      if (!note) {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
      }
    }

    // Check if interaction already exists
    const existing = await db.interaction.findUnique({
      where: {
        targetType_targetId_action_fingerprint: {
          targetType,
          targetId,
          action,
          fingerprint,
        },
      },
    });

    const countField = action === "like" ? "likeCount" : "saveCount";

    if (existing) {
      // Toggle off: delete interaction and decrement count
      await db.interaction.delete({ where: { id: existing.id } });

      const updateData: Record<string, { decrement: number }> = { [countField]: { decrement: 1 } };

      if (targetType === "blog") {
        await db.blogPost.update({ where: { id: targetId }, data: updateData });
      } else {
        await db.note.update({ where: { id: targetId }, data: updateData });
      }

      // Fetch updated count
      let newCount: number;
      if (targetType === "blog") {
        const blog = await db.blogPost.findUnique({ where: { id: targetId }, select: { likeCount: true, saveCount: true } });
        newCount = action === "like" ? (blog?.likeCount ?? 0) : (blog?.saveCount ?? 0);
      } else {
        const note = await db.note.findUnique({ where: { id: targetId }, select: { likeCount: true, saveCount: true } });
        newCount = action === "like" ? (note?.likeCount ?? 0) : (note?.saveCount ?? 0);
      }

      return NextResponse.json({
        success: true,
        [action === "like" ? "isLiked" : "isSaved"]: false,
        newCount: Math.max(0, newCount),
      });
    } else {
      // Toggle on: create interaction and increment count
      await db.interaction.create({
        data: { targetType, targetId, action, fingerprint },
      });

      const updateData: Record<string, { increment: number }> = { [countField]: { increment: 1 } };

      if (targetType === "blog") {
        await db.blogPost.update({ where: { id: targetId }, data: updateData });
      } else {
        await db.note.update({ where: { id: targetId }, data: updateData });
      }

      // Fetch updated count
      let newCount: number;
      if (targetType === "blog") {
        const blog = await db.blogPost.findUnique({ where: { id: targetId }, select: { likeCount: true, saveCount: true } });
        newCount = action === "like" ? (blog?.likeCount ?? 0) : (blog?.saveCount ?? 0);
      } else {
        const note = await db.note.findUnique({ where: { id: targetId }, select: { likeCount: true, saveCount: true } });
        newCount = action === "like" ? (note?.likeCount ?? 0) : (note?.saveCount ?? 0);
      }

      return NextResponse.json({
        success: true,
        [action === "like" ? "isLiked" : "isSaved"]: true,
        newCount,
      });
    }
  } catch (error) {
    console.error("Interaction failed:", error);
    return NextResponse.json(
      { error: "Interaction failed" },
      { status: 500 }
    );
  }
}
