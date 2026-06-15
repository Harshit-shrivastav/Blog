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

export async function GET(request: NextRequest) {
  try {
    const adminId = await requireAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      blogStats,
      noteStats,
      subscriberStats,
      interactionStats,
      recentActivity,
    ] = await Promise.all([
      // Blog stats
      db.blogPost.aggregate({
        _sum: { viewCount: true, likeCount: true },
        _count: true,
        where: { status: "published" },
      }),
      // Note stats
      db.note.aggregate({
        _sum: { likeCount: true, saveCount: true },
        _count: true,
      }),
      // Subscriber stats
      db.newsletterSubscriber.aggregate({
        _count: true,
        where: { status: "active" },
      }),
      // Total saves from interactions
      db.interaction.count({
        where: { action: "save" },
      }),
      // Recent activity
      db.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return NextResponse.json({
      totalViews: blogStats._sum.viewCount || 0,
      totalLikes: (blogStats._sum.likeCount || 0) + (noteStats._sum.likeCount || 0),
      totalSaves: (noteStats._sum.saveCount || 0) + interactionStats,
      totalSubscribers: subscriberStats._count,
      totalPublishedBlogs: blogStats._count,
      totalNotes: noteStats._count,
      recentActivity: recentActivity.map((log) => ({
        ...log,
        details: JSON.parse(log.details || "{}"),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
