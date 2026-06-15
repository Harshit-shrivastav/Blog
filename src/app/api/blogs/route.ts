import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { estimateReadingTime } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "12")));
    const skip = (page - 1) * limit;

    const where = { status: "published" };

    const [blogs, total] = await Promise.all([
      db.blogPost.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          tags: true,
          status: true,
          publishedAt: true,
          viewCount: true,
          likeCount: true,
          commentsEnabled: true,
          createdAt: true,
          content: true,
          series: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      db.blogPost.count({ where }),
    ]);

    const parsed = blogs.map((blog) => ({
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt,
      coverImage: blog.coverImage,
      tags: JSON.parse(blog.tags || "[]"),
      status: blog.status,
      publishedAt: blog.publishedAt,
      viewCount: blog.viewCount,
      likeCount: blog.likeCount,
      commentsEnabled: blog.commentsEnabled !== false,
      createdAt: blog.createdAt,
      readingTime: estimateReadingTime(blog.content || blog.excerpt || ""),
      series: blog.series ? { id: blog.series.id, name: blog.series.name, slug: blog.series.slug } : null,
    }));

    return NextResponse.json({
      blogs: parsed,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    console.error("Failed to fetch blogs:", error);
    return NextResponse.json(
      { error: "Failed to fetch blogs" },
      { status: 500 }
    );
  }
}
