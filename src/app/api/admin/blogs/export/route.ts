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

    const blogs = await db.blogPost.findMany({
      orderBy: { createdAt: "desc" },
    });

    const exportData = blogs.map((blog) => ({
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      content: blog.content,
      coverImage: blog.coverImage,
      excerpt: blog.excerpt,
      tags: JSON.parse(blog.tags || "[]"),
      seoTitle: blog.seoTitle,
      seoDescription: blog.seoDescription,
      ogImage: blog.ogImage,
      status: blog.status,
      publishedAt: blog.publishedAt,
      scheduledAt: blog.scheduledAt,
      createdAt: blog.createdAt,
      updatedAt: blog.updatedAt,
    }));

    const json = JSON.stringify({ blogs: exportData, exportedAt: new Date().toISOString() }, null, 2);

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="blog-blogs-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Failed to export blogs:", error);
    return NextResponse.json(
      { error: "Failed to export blogs" },
      { status: 500 }
    );
  }
}
