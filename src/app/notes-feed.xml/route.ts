import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [notes, settings] = await Promise.all([
      db.note.findMany({
        where: { isPublic: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.siteSettings.findFirst(),
    ]);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://yourdomain.com";
    const siteName = settings?.siteName || "My Blog";
    const siteDesc = settings?.tagline || "A minimalist blog";

    const items = notes
      .map((note) => {
        const description =
          note.content.length > 200
            ? note.content.slice(0, 200) + "..."
            : note.content;
        const pubDate = new Date(note.createdAt).toUTCString();
        const link = `${siteUrl}/#notes`;
        const guid = `${siteUrl}/notes/${note.id}`;

        return `    <item>
      <title>${escapeXml(description.slice(0, 80))}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(guid)}</guid>
      <description>${escapeXml(description)}</description>
      <pubDate>${pubDate}</pubDate>
    </item>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)} — Notes</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(siteDesc)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(siteUrl)}/notes-feed.xml" rel="self" type="application/rss+xml"/>
    <generator>Blog</generator>
${items}
  </channel>
</rss>`;

    return new NextResponse(xml.trim(), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Failed to generate notes RSS feed:", error);
    return NextResponse.json(
      { error: "Failed to generate notes RSS feed" },
      { status: 500 }
    );
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
