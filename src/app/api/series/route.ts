import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { estimateReadingTime } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (slug) {
      // Get a single series with its published posts
      const series = await db.blogSeries.findUnique({
        where: { slug },
      });

      if (!series) {
        return NextResponse.json({ error: "Series not found" }, { status: 404 });
      }

      const posts = await db.blogPost.findMany({
        where: { seriesId: series.id, status: "published" },
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

      return NextResponse.json({
        series: {
          id: series.id,
          name: series.name,
          slug: series.slug,
          description: series.description,
          coverImage: series.coverImage,
        },
        posts: posts.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt,
          coverImage: p.coverImage,
          tags: JSON.parse(p.tags || "[]"),
          status: p.status,
          publishedAt: p.publishedAt,
          viewCount: p.viewCount,
          likeCount: p.likeCount,
          createdAt: p.createdAt,
          readingTime: estimateReadingTime(p.content || p.excerpt || ""),
        })),
      });
    }

    // List all series that have at least one published post
    const allSeries = await db.blogSeries.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            posts: {
              where: { status: "published" },
            },
          },
        },
      },
    });

    const publishedSeries = allSeries
      .filter((s) => s._count.posts > 0)
      .map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        description: s.description,
        coverImage: s.coverImage,
        postCount: s._count.posts,
      }));

    return NextResponse.json({
      series: publishedSeries,
    });
  } catch (error) {
    console.error("Failed to fetch series:", error);
    return NextResponse.json(
      { error: "Failed to fetch series" },
      { status: 500 }
    );
  }
}
