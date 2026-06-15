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

// GET: List all series
export async function GET(request: NextRequest) {
  try {
    const adminId = await requireAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const series = await db.blogSeries.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    return NextResponse.json({
      series: series.map((s) => ({
        ...s,
        postCount: s._count.posts,
        _count: undefined,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch series:", error);
    return NextResponse.json(
      { error: "Failed to fetch series" },
      { status: 500 }
    );
  }
}

// POST: Create new series
export async function POST(request: NextRequest) {
  try {
    const adminId = await requireAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug: bodySlug, description, coverImage } = body;

    if (!name || !bodySlug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    const existing = await db.blogSeries.findUnique({ where: { slug: bodySlug } });
    if (existing) {
      return NextResponse.json(
        { error: "A series with this slug already exists" },
        { status: 409 }
      );
    }

    const series = await db.blogSeries.create({
      data: {
        name,
        slug: bodySlug,
        description: description || "",
        coverImage: coverImage || null,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        action: "series_created",
        details: JSON.stringify({ seriesId: series.id, name: series.name, adminId }),
      },
    });

    return NextResponse.json(series, { status: 201 });
  } catch (error) {
    console.error("Failed to create series:", error);
    return NextResponse.json(
      { error: "Failed to create series" },
      { status: 500 }
    );
  }
}
