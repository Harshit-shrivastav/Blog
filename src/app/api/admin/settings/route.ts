import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

async function requireAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  let token: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }
  if (!token) {
    const cookie = request.cookies.get("admin-token");
    token = cookie?.value || null;
  }
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || !payload.adminId) return null;
  return payload.adminId as string;
}

// GET: Return all site settings
export async function GET(request: NextRequest) {
  try {
    const adminId = await requireAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await db.siteSettings.findFirst();

    if (!settings) {
      return NextResponse.json({
        siteName: "My Blog",
        tagline: "",
        bio: "",
        accentColor: "#0a0a0a",
        adminSlug: "admin-dashboard",
        socialLinks: {},
        theme: "system",
        globalCommentsEnabled: true,
      });
    }

    return NextResponse.json({
      ...settings,
      socialLinks: JSON.parse(settings.socialLinks || "{}"),
      globalCommentsEnabled: settings.globalCommentsEnabled !== false,
    });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// PUT: Update site settings
export async function PUT(request: NextRequest) {
  try {
    const adminId = await requireAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { siteName, tagline, bio, accentColor, socialLinks, theme, adminSlug, customCss, globalCommentsEnabled } = body;

    const settings = await db.siteSettings.findFirst();

    let updated;
    if (settings) {
      updated = await db.siteSettings.update({
        where: { id: settings.id },
        data: {
          ...(siteName !== undefined && { siteName }),
          ...(tagline !== undefined && { tagline }),
          ...(bio !== undefined && { bio }),
          ...(accentColor !== undefined && { accentColor }),
          ...(socialLinks !== undefined && { socialLinks: JSON.stringify(socialLinks) }),
          ...(theme !== undefined && { theme }),
          ...(adminSlug !== undefined && { adminSlug }),
          ...(customCss !== undefined && { customCss }),
          ...(globalCommentsEnabled !== undefined && { globalCommentsEnabled }),
        },
      });
    } else {
      updated = await db.siteSettings.create({
        data: {
          siteName: siteName || "My Blog",
          tagline: tagline || "",
          bio: bio || "",
          accentColor: accentColor || "#0a0a0a",
          socialLinks: JSON.stringify(socialLinks || {}),
          theme: theme || "system",
          adminSlug: adminSlug || "admin-dashboard",
          customCss: customCss || "",
          globalCommentsEnabled: globalCommentsEnabled !== undefined ? globalCommentsEnabled : true,
        },
      });
    }

    // Log activity
    await db.activityLog.create({
      data: {
        action: "settings_updated",
        details: JSON.stringify({ adminId, fields: Object.keys(body) }),
      },
    });

    return NextResponse.json({
      ...updated,
      socialLinks: JSON.parse(updated.socialLinks || "{}"),
      globalCommentsEnabled: updated.globalCommentsEnabled !== false,
    });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
