import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { extractBearerToken, verifyToken } from "@/lib/auth";

async function requireAuth(request: NextRequest) {
  const token = extractBearerToken(request);
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || !payload.adminId) return null;
  return payload.adminId as string;
}

// POST: Approve a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminId = await requireAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const comment = await db.comment.findUnique({ where: { id } });
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    await db.comment.update({
      where: { id },
      data: { isApproved: true },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        action: "comment_approved",
        details: JSON.stringify({ commentId: id, blogId: comment.blogId, adminId }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to approve comment:", error);
    return NextResponse.json(
      { error: "Failed to approve comment" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a comment
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

    const comment = await db.comment.findUnique({ where: { id } });
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    await db.comment.delete({ where: { id } });

    // Log activity
    await db.activityLog.create({
      data: {
        action: "comment_deleted",
        details: JSON.stringify({ commentId: id, blogId: comment.blogId, adminId }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
