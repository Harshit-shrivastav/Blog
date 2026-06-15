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

// POST: Schedule a blog post
export async function POST(request: NextRequest) {
  try {
    const adminId = await requireAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, scheduledAt } = body;

    if (!id || !scheduledAt) {
      return NextResponse.json(
        { error: "Missing required fields: id, scheduledAt" },
        { status: 400 }
      );
    }

    const existing = await db.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    const blog = await db.blogPost.update({
      where: { id },
      data: {
        status: "scheduled",
        scheduledAt: new Date(scheduledAt),
        publishedAt: null,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        action: "blog_scheduled",
        details: JSON.stringify({
          blogId: blog.id,
          title: blog.title,
          scheduledAt,
          adminId,
        }),
      },
    });

    return NextResponse.json({
      ...blog,
      tags: JSON.parse(blog.tags || "[]"),
    });
  } catch (error) {
    console.error("Failed to schedule blog:", error);
    return NextResponse.json(
      { error: "Failed to schedule blog" },
      { status: 500 }
    );
  }
}
