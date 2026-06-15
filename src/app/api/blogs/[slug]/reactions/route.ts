import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const DEFAULT_EMOJIS = ["❤️", "🔥", "👏", "😍", "💡", "🎉", "🚀", "😂", "🤔", "💯"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const fingerprint = request.headers.get("x-fingerprint") || "";

    const blog = await db.blogPost.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!blog) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Get all reactions for this blog
    const reactions = await db.blogReaction.findMany({
      where: { blogId: blog.id },
      select: { emoji: true, fingerprint: true },
    });

    // Count by emoji
    const counts: Record<string, number> = {};
    for (const r of reactions) {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    }

    // Get user's reactions
    const userEmojis = fingerprint
      ? reactions
          .filter((r) => r.fingerprint === fingerprint)
          .map((r) => r.emoji)
      : [];

    // Sort: user's first, then by count desc, then default order
    const sorted = DEFAULT_EMOJIS.filter((e) => counts[e])
      .sort((a, b) => {
        const aUser = userEmojis.includes(a) ? 1 : 0;
        const bUser = userEmojis.includes(b) ? 1 : 0;
        if (aUser !== bUser) return bUser - aUser;
        return (counts[b] || 0) - (counts[a] || 0);
      });

    // Also include any custom emojis not in default list
    const customEmojis = Object.keys(counts)
      .filter((e) => !DEFAULT_EMOJIS.includes(e))
      .sort((a, b) => counts[b] - counts[a]);

    return NextResponse.json({
      reactions: counts,
      sortedEmojis: [...sorted, ...customEmojis],
      userEmojis,
      total: reactions.length,
    });
  } catch (error) {
    console.error("Failed to fetch reactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch reactions" },
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
    const fingerprint = request.headers.get("x-fingerprint") || "";
    const body = await request.json();
    const { emoji } = body;

    if (!emoji || typeof emoji !== "string") {
      return NextResponse.json(
        { error: "Emoji is required" },
        { status: 400 }
      );
    }

    if (!fingerprint) {
      return NextResponse.json(
        { error: "Fingerprint required" },
        { status: 400 }
      );
    }

    const blog = await db.blogPost.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!blog) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check if already reacted - toggle
    const existing = await db.blogReaction.findUnique({
      where: {
        blogId_emoji_fingerprint: {
          blogId: blog.id,
          emoji,
          fingerprint,
        },
      },
    });

    if (existing) {
      // Remove reaction (toggle off)
      await db.blogReaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ action: "removed", emoji });
    } else {
      // Add reaction (toggle on)
      await db.blogReaction.create({
        data: {
          blogId: blog.id,
          emoji,
          fingerprint,
        },
      });
      return NextResponse.json({ action: "added", emoji });
    }
  } catch (error) {
    console.error("Failed to toggle reaction:", error);
    return NextResponse.json(
      { error: "Failed to toggle reaction" },
      { status: 500 }
    );
  }
}
