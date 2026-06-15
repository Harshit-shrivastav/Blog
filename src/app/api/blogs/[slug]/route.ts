import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { estimateReadingTime } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const blog = await db.blogPost.findUnique({
      where: { slug },
    });

    if (!blog || blog.status !== "published") {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    // Increment viewCount atomically
    await db.blogPost.update({
      where: { slug },
      data: { viewCount: { increment: 1 } },
    });

    const readingTime = estimateReadingTime(blog.content);

    return NextResponse.json({
      ...blog,
      viewCount: blog.viewCount + 1,
      tags: JSON.parse(blog.tags || "[]"),
      readingTime,
    });
  } catch (error) {
    console.error("Failed to fetch blog:", error);
    return NextResponse.json(
      { error: "Failed to fetch blog" },
      { status: 500 }
    );
  }
}
