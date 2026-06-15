import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const fingerprint = request.headers.get("x-fingerprint") || "";

    // Parse x-comment-ids header or query param for visibility
    const commentIdsHeader = request.headers.get("x-comment-ids") || "";
    const commentIdsParam = new URL(request.url).searchParams.get("comment_ids") || "";
    const requesterCommentIds = new Set(
      (commentIdsHeader || commentIdsParam)
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    );

    const blog = await db.blogPost.findUnique({
      where: { slug, status: "published" },
    });

    if (!blog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    const allComments = await db.comment.findMany({
      where: { blogId: blog.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Return all comments with visibility info
    const comments = allComments.map((c) => ({
      id: c.id,
      authorName: c.authorName,
      content: c.content,
      fingerprint: c.fingerprint,
      isApproved: c.isApproved,
      visibleToUser: c.isApproved || requesterCommentIds.has(c.id),
      createdAt: c.createdAt.toISOString(),
    }));

    return NextResponse.json({ comments, fingerprint });
  } catch (error) {
    console.error("Failed to fetch comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const blog = await db.blogPost.findUnique({
      where: { slug, status: "published" },
    });

    if (!blog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    // Check per-post comments setting
    if (blog.commentsEnabled === false) {
      return NextResponse.json(
        { error: "Comments are disabled for this post" },
        { status: 403 }
      );
    }

    // Check global comments setting
    const siteSettings = await db.siteSettings.findFirst();
    if (siteSettings?.globalCommentsEnabled === false) {
      return NextResponse.json(
        { error: "Comments are currently disabled site-wide" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { authorName, content } = body;
    const fingerprint = request.headers.get("x-fingerprint") || "";

    if (!authorName || typeof authorName !== "string") {
      return NextResponse.json(
        { error: "Author name is required" },
        { status: 400 }
      );
    }
    const trimmedName = authorName.trim();
    if (trimmedName.length < 1 || trimmedName.length > 100) {
      return NextResponse.json(
        { error: "Author name must be between 1 and 100 characters" },
        { status: 400 }
      );
    }

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }
    const trimmedContent = content.trim();
    if (trimmedContent.length < 1 || trimmedContent.length > 2000) {
      return NextResponse.json(
        { error: "Comment content must be between 1 and 2000 characters" },
        { status: 400 }
      );
    }

    if (!fingerprint) {
      return NextResponse.json(
        { error: "Fingerprint is required" },
        { status: 400 }
      );
    }

    const comment = await db.comment.create({
      data: {
        blogId: blog.id,
        authorName: trimmedName,
        content: trimmedContent,
        fingerprint,
        isApproved: false,
      },
    });

    return NextResponse.json({
      id: comment.id,
      authorName: comment.authorName,
      content: comment.content,
      fingerprint: comment.fingerprint,
      isApproved: comment.isApproved,
      createdAt: comment.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
