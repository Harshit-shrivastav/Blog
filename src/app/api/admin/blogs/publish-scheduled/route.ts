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

// POST: Publish all scheduled posts whose time has come
export async function POST(request: NextRequest) {
  try {
    const adminId = await requireAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Find all posts where scheduledAt <= now and status = "scheduled"
    const scheduledPosts = await db.blogPost.findMany({
      where: {
        status: "scheduled",
        scheduledAt: { lte: now },
      },
    });

    if (scheduledPosts.length === 0) {
      return NextResponse.json({ published: 0 });
    }

    // Update all to published
    const updatePromises = scheduledPosts.map((post) =>
      db.blogPost.update({
        where: { id: post.id },
        data: {
          status: "published",
          publishedAt: now,
          scheduledAt: null,
        },
      })
    );

    await Promise.all(updatePromises);

    // Log activity
    await db.activityLog.create({
      data: {
        action: "blog_publish_scheduled",
        details: JSON.stringify({
          count: scheduledPosts.length,
          titles: scheduledPosts.map((p) => p.title),
          adminId,
        }),
      },
    });

    return NextResponse.json({
      published: scheduledPosts.length,
      titles: scheduledPosts.map((p) => p.title),
    });
  } catch (error) {
    console.error("Failed to publish scheduled posts:", error);
    return NextResponse.json(
      { error: "Failed to publish scheduled posts" },
      { status: 500 }
    );
  }
}
