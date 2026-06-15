import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [blogs, settings] = await Promise.all([
      db.blogPost.findMany({
        where: { status: "published" },
        orderBy: { publishedAt: "desc" },
        take: 20,
      }),
      db.siteSettings.findFirst(),
    ]);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://yourdomain.com";
    const siteName = settings?.siteName || "My Blog";
    const siteDesc = settings?.tagline || "A minimalist blog";
    const siteColor = settings?.accentColor || "#0a0a0a";

    const items = blogs
      .map((blog) => {
        const tags = JSON.parse(blog.tags || "[]");
        const pubDate = blog.publishedAt
          ? new Date(blog.publishedAt).toUTCString()
          : new Date(blog.createdAt).toUTCString();
        const link = `${siteUrl}/#blog-${blog.slug}`;
        const categories = tags
          .map((t: string) => `    <category>${escapeXml(t)}</category>`)
          .join("\n");

        return `    <item>
      <title>${escapeXml(blog.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(blog.excerpt || "")}</description>
      <pubDate>${pubDate}</pubDate>
${categories}
    </item>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(siteDesc)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(siteUrl)}/feed.xml" rel="self" type="application/rss+xml"/>
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
    console.error("Failed to generate RSS feed:", error);
    return NextResponse.json(
      { error: "Failed to generate RSS feed" },
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
