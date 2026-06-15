import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Public stats for the about page
export async function GET() {
  try {
    const [blogs, notes, subscribers] = await Promise.all([
      db.blogPost.count({ where: { status: "published" } }),
      db.note.count({ where: { isPublic: true } }),
      db.newsletterSubscriber.count({ where: { status: "active" } }),
    ]);

    return NextResponse.json({ blogs, notes, subscribers });
  } catch (error) {
    console.error("Failed to fetch about stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
