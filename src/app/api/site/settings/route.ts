import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const settings = await db.siteSettings.findFirst();

    if (!settings) {
      return NextResponse.json({
        siteName: "My Blog",
        tagline: "",
        bio: "",
        accentColor: "#0a0a0a",
        socialLinks: {},
        theme: "system",
        globalCommentsEnabled: true,
      });
    }

    return NextResponse.json({
      siteName: settings.siteName,
      tagline: settings.tagline,
      bio: settings.bio,
      accentColor: settings.accentColor,
      socialLinks: JSON.parse(settings.socialLinks || "{}"),
      theme: settings.theme,
      customCss: settings.customCss || "",
      globalCommentsEnabled: settings.globalCommentsEnabled !== false,
    });
  } catch (error) {
    console.error("Failed to fetch site settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch site settings" },
      { status: 500 }
    );
  }
}
