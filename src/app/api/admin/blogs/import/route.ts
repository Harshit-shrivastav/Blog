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

export async function POST(request: NextRequest) {
  try {
    const adminId = await requireAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const blogs = body.blogs;

    if (!Array.isArray(blogs) || blogs.length === 0) {
      return NextResponse.json(
        { error: "No blogs provided for import" },
        { status: 400 }
      );
    }

    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < blogs.length; i++) {
      const blog = blogs[i];

      if (!blog.title || typeof blog.title !== "string") {
        errors.push(`Blog #${i + 1}: Missing or invalid title`);
        continue;
      }

      const slug = blog.slug || slugify(blog.title);

      // Check for existing slug
      const existing = await db.blogPost.findUnique({ where: { slug } });
      if (existing) {
        errors.push(`Blog #${i + 1} ("${blog.title}"): Slug "${slug}" already exists, skipping`);
        continue;
      }

      // Parse tags
      let tags: string[] = [];
      if (Array.isArray(blog.tags)) {
        tags = blog.tags.map((t: unknown) => String(t));
      } else if (typeof blog.tags === "string") {
        try {
          const parsed = JSON.parse(blog.tags);
          if (Array.isArray(parsed)) tags = parsed.map(String);
        } catch {
          // ignore invalid tags
        }
      }

      await db.blogPost.create({
        data: {
          title: blog.title.trim(),
          slug,
          content: blog.content || "",
          coverImage: blog.coverImage || null,
          excerpt: blog.excerpt || "",
          tags: JSON.stringify(tags),
          seoTitle: blog.seoTitle || null,
          seoDescription: blog.seoDescription || null,
          ogImage: blog.ogImage || null,
          status: blog.status || "draft",
          publishedAt: blog.status === "published" ? new Date() : null,
          scheduledAt: blog.scheduledAt ? new Date(blog.scheduledAt) : null,
        },
      });

      imported++;
    }

    // Log activity
    if (imported > 0) {
      await db.activityLog.create({
        data: {
          action: "blogs_imported",
          details: JSON.stringify({ count: imported, adminId }),
        },
      });
    }

    return NextResponse.json({ imported, errors });
  } catch (error) {
    console.error("Failed to import blogs:", error);
    return NextResponse.json(
      { error: "Failed to import blogs" },
      { status: 500 }
    );
  }
}
