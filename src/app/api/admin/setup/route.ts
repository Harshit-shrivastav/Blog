import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { displayName, email, password, siteName, tagline, accentColor, adminSlug } = body;

    // Validate required fields
    if (!displayName || !email || !password) {
      return NextResponse.json(
        { error: "displayName, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if any admin already exists
    const adminCount = await db.admin.count();
    if (adminCount > 0) {
      return NextResponse.json(
        { error: "Setup has already been completed" },
        { status: 409 }
      );
    }

    // Create SiteSettings
    await db.siteSettings.create({
      data: {
        siteName: siteName || "My Blog",
        tagline: tagline || "",
        accentColor: accentColor || "#0a0a0a",
        adminSlug: adminSlug || "admin-dashboard",
      },
    });

    // Create Admin
    const hashedPassword = hashPassword(password);
    const admin = await db.admin.create({
      data: {
        displayName,
        email: email.toLowerCase().trim(),
        passwordHash: hashedPassword,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        action: "admin_setup",
        details: JSON.stringify({ adminId: admin.id, email: admin.email }),
      },
    });

    // Generate JWT token
    const token = await createToken({
      adminId: admin.id,
      email: admin.email,
    });

    const response = NextResponse.json({ success: true, token });
    response.cookies.set("admin-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Setup failed:", error);
    return NextResponse.json(
      { error: "Setup failed" },
      { status: 500 }
    );
  }
}
