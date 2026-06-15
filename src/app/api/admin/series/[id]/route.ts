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

// GET: Single series
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

    const series = await db.blogSeries.findUnique({
      where: { id },
      include: {
        _count: { select: { posts: true } },
      },
    });

    if (!series) {
      return NextResponse.json({ error: "Series not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...series,
      postCount: series._count.posts,
      _count: undefined,
    });
  } catch (error) {
    console.error("Failed to fetch series:", error);
    return NextResponse.json({ error: "Failed to fetch series" }, { status: 500 });
  }
}

// PUT: Update series
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

    const existing = await db.blogSeries.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Series not found" }, { status: 404 });
    }

    // If slug is being changed, check uniqueness
    if (body.slug && body.slug !== existing.slug) {
      const slugExists = await db.blogSeries.findUnique({ where: { slug: body.slug } });
      if (slugExists) {
        return NextResponse.json({ error: "Slug already in use" }, { status: 409 });
      }
    }

    const series = await db.blogSeries.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.coverImage !== undefined && { coverImage: body.coverImage }),
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        action: "series_updated",
        details: JSON.stringify({ seriesId: series.id, name: series.name, adminId }),
      },
    });

    return NextResponse.json(series);
  } catch (error) {
    console.error("Failed to update series:", error);
    return NextResponse.json({ error: "Failed to update series" }, { status: 500 });
  }
}

// DELETE: Delete series
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

    const existing = await db.blogSeries.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Series not found" }, { status: 404 });
    }

    // Disconnect all blog posts from this series
    await db.blogPost.updateMany({
      where: { seriesId: id },
      data: { seriesId: null },
    });

    await db.blogSeries.delete({ where: { id } });

    // Log activity
    await db.activityLog.create({
      data: {
        action: "series_deleted",
        details: JSON.stringify({ seriesId: id, name: existing.name, adminId }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete series:", error);
    return NextResponse.json({ error: "Failed to delete series" }, { status: 500 });
  }
}
