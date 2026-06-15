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

// GET: List subscribers with search/filter
export async function GET(request: NextRequest) {
  try {
    const adminId = await requireAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: Record<string, unknown> = {};
    if (search) {
      where.email = { contains: search.toLowerCase() };
    }
    if (status) {
      where.status = status;
    }

    const [subscribers, total] = await Promise.all([
      db.newsletterSubscriber.findMany({
        where,
        orderBy: { subscribedAt: "desc" },
        skip,
        take: limit,
      }),
      db.newsletterSubscriber.count({ where }),
    ]);

    return NextResponse.json({
      subscribers,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    console.error("Failed to fetch subscribers:", error);
    return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 });
  }
}

// POST: Broadcast email
export async function POST(request: NextRequest) {
  try {
    const adminId = await requireAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subject, body: emailBody } = await request.json();

    if (!subject || !emailBody) {
      return NextResponse.json(
        { error: "Subject and body are required" },
        { status: 400 }
      );
    }

    // Check SMTP configuration
    const smtp = await db.smtpConfig.findFirst();
    if (!smtp || !smtp.host || !smtp.username) {
      return NextResponse.json(
        { error: "SMTP is not configured. Please set up SMTP first." },
        { status: 400 }
      );
    }

    // Get active subscribers
    const subscribers = await db.newsletterSubscriber.findMany({
      where: { status: "active" },
      select: { email: true },
    });

    if (subscribers.length === 0) {
      return NextResponse.json(
        { error: "No active subscribers" },
        { status: 400 }
      );
    }

    // Send emails
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: {
        user: smtp.username,
        pass: smtp.password,
      },
      tls: smtp.useTls ? { rejectUnauthorized: false } : undefined,
    });

    const from = smtp.fromEmail
      ? `${smtp.fromName || "Blog"} <${smtp.fromEmail}>`
      : smtp.username;

    let sentCount = 0;
    let failedCount = 0;

    for (const sub of subscribers) {
      try {
        await transporter.sendMail({
          from,
          to: sub.email,
          subject,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              ${emailBody}
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #999; font-size: 12px;">
                You're receiving this because you subscribed to our newsletter.
                If you no longer wish to receive these emails, please contact us.
              </p>
            </div>
          `,
        });
        sentCount++;
      } catch {
        failedCount++;
      }
    }

    // Log activity
    await db.activityLog.create({
      data: {
        action: "newsletter_broadcast",
        details: JSON.stringify({
          adminId,
          subject,
          sentCount,
          failedCount,
          totalRecipients: subscribers.length,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      totalRecipients: subscribers.length,
    });
  } catch (error) {
    console.error("Newsletter broadcast failed:", error);
    return NextResponse.json({ error: "Newsletter broadcast failed" }, { status: 500 });
  }
}
