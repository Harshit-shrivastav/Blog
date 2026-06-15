import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { slugify } from "@/lib/admin-utils";

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

// GET: List all blogs (including drafts) with pagination
export async function GET(request: NextRequest) {
  try {
    const adminId = await requireAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "12")));
    const skip = (page - 1) * limit;
    const status = searchParams.get("status");

    const where = status ? { status } : {};

    const [blogs, total] = await Promise.all([
      db.blogPost.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.blogPost.count({ where }),
    ]);

    return NextResponse.json({
      blogs: blogs.map((b) => ({
        ...b,
        tags: JSON.parse(b.tags || "[]"),
      })),
      hasMore: skip + limit < total,
    });
  } catch (error) {
    console.error("Failed to fetch admin blogs:", error);
    return NextResponse.json(
      { error: "Failed to fetch blogs" },
      { status: 500 }
    );
  }
}

// POST: Create new blog
export async function POST(request: NextRequest) {
  try {
    const adminId = await requireAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      slug: bodySlug,
      content,
      coverImage,
      excerpt,
      tags,
      seriesId,
      seoTitle,
      seoDescription,
      ogImage,
      status,
      scheduledAt,
      commentsEnabled,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const slug = bodySlug || slugify(title);

    // Check for unique slug
    const existing = await db.blogPost.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "A blog with this slug already exists" },
        { status: 409 }
      );
    }

    const blog = await db.blogPost.create({
      data: {
        title,
        slug,
        content: content || "",
        coverImage: coverImage || null,
        excerpt: excerpt || "",
        tags: JSON.stringify(tags || []),
        seriesId: seriesId || null,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        ogImage: ogImage || null,
        status: status || "draft",
        publishedAt: status === "published" ? new Date() : scheduledAt ? new Date(scheduledAt) : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        commentsEnabled: commentsEnabled !== false,
      },
      include: { series: { select: { id: true, name: true, slug: true } } },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        action: "blog_created",
        details: JSON.stringify({ blogId: blog.id, title: blog.title, slug: blog.slug, adminId }),
      },
    });

    return NextResponse.json(
      {
        ...blog,
        tags: JSON.parse(blog.tags || "[]"),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create blog:", error);
    return NextResponse.json(
      { error: "Failed to create blog" },
      { status: 500 }
    );
  }
}
