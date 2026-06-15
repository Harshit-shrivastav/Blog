import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken, comparePassword, hashPassword } from "@/lib/auth";

async function requireAuth(request: NextRequest): Promise<string | null> {
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

// GET: Return admin profile
export async function GET(request: NextRequest) {
  try {
    const adminId = await requireAuth(request);

    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await db.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        displayName: true,
        email: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 401 });
    }

    return NextResponse.json({ admin });
  } catch (error) {
    console.error("Get admin failed:", error);
    return NextResponse.json({ error: "Failed to get admin" }, { status: 500 });
  }
}

// PUT: Update admin profile
export async function PUT(request: NextRequest) {
  try {
    const adminId = await requireAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { displayName, email, avatar, currentPassword, newPassword } = body;

    const admin = await db.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 401 });
    }

    // If changing password, require currentPassword
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to change password" },
          { status: 400 }
        );
      }

      const isValid = comparePassword(currentPassword, admin.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 401 }
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters" },
          { status: 400 }
        );
      }
    }

    // If changing email, check uniqueness
    if (email && email.toLowerCase().trim() !== admin.email) {
      const emailExists = await db.admin.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
      if (emailExists) {
        return NextResponse.json(
          { error: "Email is already in use" },
          { status: 409 }
        );
      }
    }

    const updatedAdmin = await db.admin.update({
      where: { id: adminId },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(email !== undefined && { email: email.toLowerCase().trim() }),
        ...(avatar !== undefined && { avatar }),
        ...(newPassword && { passwordHash: hashPassword(newPassword) }),
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        action: "admin_profile_updated",
        details: JSON.stringify({
          adminId,
          fields: Object.keys(body).filter((k) => k !== "currentPassword" && k !== "newPassword"),
          passwordChanged: !!newPassword,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      admin: {
        id: updatedAdmin.id,
        displayName: updatedAdmin.displayName,
        email: updatedAdmin.email,
        avatar: updatedAdmin.avatar,
      },
    });
  } catch (error) {
    console.error("Update admin failed:", error);
    return NextResponse.json({ error: "Failed to update admin" }, { status: 500 });
  }
}
