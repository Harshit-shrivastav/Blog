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

// GET: Full blog by id
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

    const blog = await db.blogPost.findUnique({ 
      where: { id },
      include: { series: { select: { id: true, name: true, slug: true } } },
    });
    if (!blog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...blog,
      tags: JSON.parse(blog.tags || "[]"),
    });
  } catch (error) {
    console.error("Failed to fetch blog:", error);
    return NextResponse.json({ error: "Failed to fetch blog" }, { status: 500 });
  }
}

// PUT: Update blog
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

    const existing = await db.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    // If slug is being changed, check uniqueness
    if (body.slug && body.slug !== existing.slug) {
      const slugExists = await db.blogPost.findUnique({ where: { slug: body.slug } });
      if (slugExists) {
        return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
      }
    }

    // Handle publishedAt logic
    let publishedAt = existing.publishedAt;
    let scheduledAt = existing.scheduledAt;

    if (body.status === "published" && existing.status !== "published") {
      publishedAt = new Date();
    } else if (body.scheduledAt !== undefined) {
      scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
      publishedAt = body.status === "published" ? new Date() : publishedAt;
    }

    const blog = await db.blogPost.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.coverImage !== undefined && { coverImage: body.coverImage }),
        ...(body.excerpt !== undefined && { excerpt: body.excerpt }),
        ...(body.tags !== undefined && { tags: JSON.stringify(body.tags) }),
        ...(body.seriesId !== undefined && { seriesId: body.seriesId || null }),
        ...(body.seoTitle !== undefined && { seoTitle: body.seoTitle }),
        ...(body.seoDescription !== undefined && { seoDescription: body.seoDescription }),
        ...(body.ogImage !== undefined && { ogImage: body.ogImage }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.scheduledAt !== undefined && { scheduledAt }),
        ...(body.commentsEnabled !== undefined && { commentsEnabled: body.commentsEnabled }),
        publishedAt,
      },
      include: { series: { select: { id: true, name: true, slug: true } } },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        action: "blog_updated",
        details: JSON.stringify({ blogId: blog.id, title: blog.title, adminId }),
      },
    });

    return NextResponse.json({
      ...blog,
      tags: JSON.parse(blog.tags || "[]"),
    });
  } catch (error) {
    console.error("Failed to update blog:", error);
    return NextResponse.json({ error: "Failed to update blog" }, { status: 500 });
  }
}

// DELETE: Delete blog
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

    const existing = await db.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    await db.blogPost.delete({ where: { id } });

    // Delete related interactions
    await db.interaction.deleteMany({
      where: { targetType: "blog", targetId: id },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        action: "blog_deleted",
        details: JSON.stringify({ blogId: id, title: existing.title, adminId }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete blog:", error);
    return NextResponse.json({ error: "Failed to delete blog" }, { status: 500 });
  }
}
