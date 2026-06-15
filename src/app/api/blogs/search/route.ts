import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { estimateReadingTime } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const tag = searchParams.get("tag") || "";

    const where: Record<string, unknown> = { status: "published" };

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { excerpt: { contains: q } },
        { content: { contains: q } },
      ];
    }

    if (tag) {
      where.tags = { contains: tag };
    }

    const blogs = await db.blogPost.findMany({
      where,
      orderBy: { publishedAt: "desc" },
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
        createdAt: true,
        content: true,
      },
    });

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
      createdAt: blog.createdAt,
      readingTime: estimateReadingTime(blog.content || blog.excerpt || ""),
    }));

    // If a tag filter is applied, further filter by checking parsed JSON array
    const filtered = tag
      ? parsed.filter((b) =>
          b.tags.some(
            (t: string) => t.toLowerCase() === tag.toLowerCase()
          )
        )
      : parsed;

    return NextResponse.json({
      blogs: filtered,
      query: q,
      tag,
    });
  } catch (error) {
    console.error("Failed to search blogs:", error);
    return NextResponse.json(
      { error: "Failed to search blogs" },
      { status: 500 }
    );
  }
}
