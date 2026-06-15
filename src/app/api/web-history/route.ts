import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, slug, type } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Upsert: create or update the viewedAt timestamp
    await db.webHistory.upsert({
      where: {
        id: `${type}-${slug}`,
      },
      update: {
        title,
        viewedAt: new Date(),
      },
      create: {
        id: `${type}-${slug}`,
        title,
        slug,
        type: type || "blog",
        viewedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to record web history:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const history = await db.webHistory.findMany({
      orderBy: { viewedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      history: history.map((h) => ({
        id: h.id,
        title: h.title,
        slug: h.slug,
        type: h.type,
        viewedAt: h.viewedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch web history:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
