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

async function sendEmail(
  smtp: {
    host: string;
    port: number;
    username: string;
    password: string;
    fromName: string;
    fromEmail: string;
    useTls: boolean;
  },
  to: string,
  subject: string,
  html: string
) {
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

  await transporter.sendMail({ from, to, subject, html });
}

// GET: Return SMTP config
export async function GET(request: NextRequest) {
  try {
    const adminId = await requireAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await db.smtpConfig.findFirst();

    if (!config) {
      return NextResponse.json({
        host: "",
        port: 587,
        username: "",
        password: "",
        fromName: "",
        fromEmail: "",
        useTls: true,
        isConfigured: false,
      });
    }

    return NextResponse.json({
      ...config,
      password: config.password ? "••••••••" : "",
      isConfigured: !!(config.host && config.username),
    });
  } catch (error) {
    console.error("Failed to fetch SMTP config:", error);
    return NextResponse.json({ error: "Failed to fetch SMTP config" }, { status: 500 });
  }
}

// PUT: Update SMTP config
export async function PUT(request: NextRequest) {
  try {
    const adminId = await requireAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { host, port, username, password, fromName, fromEmail, useTls } = body;

    const existing = await db.smtpConfig.findFirst();

    const data: Record<string, unknown> = {};
    if (host !== undefined) data.host = host;
    if (port !== undefined) data.port = port;
    if (username !== undefined) data.username = username;
    if (password !== undefined) data.password = password;
    if (fromName !== undefined) data.fromName = fromName;
    if (fromEmail !== undefined) data.fromEmail = fromEmail;
    if (useTls !== undefined) data.useTls = useTls;

    let config;
    if (existing) {
      config = await db.smtpConfig.update({
        where: { id: existing.id },
        data,
      });
    } else {
      config = await db.smtpConfig.create({
        data: {
          host: host || "",
          port: port || 587,
          username: username || "",
          password: password || "",
          fromName: fromName || "",
          fromEmail: fromEmail || "",
          useTls: useTls !== false,
        },
      });
    }

    // Log activity
    await db.activityLog.create({
      data: {
        action: "smtp_updated",
        details: JSON.stringify({ adminId }),
      },
    });

    return NextResponse.json({
      ...config,
      password: config.password ? "••••••••" : "",
      isConfigured: !!(config.host && config.username),
    });
  } catch (error) {
    console.error("Failed to update SMTP config:", error);
    return NextResponse.json({ error: "Failed to update SMTP config" }, { status: 500 });
  }
}

// POST: Send test email
export async function POST(request: NextRequest) {
  try {
    const adminId = await requireAuth(request);
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { to } = await request.json();

    if (!to) {
      return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
    }

    const config = await db.smtpConfig.findFirst();
    if (!config || !config.host || !config.username) {
      return NextResponse.json(
        { error: "SMTP is not configured" },
        { status: 400 }
      );
    }

    try {
      await sendEmail(config, to, "SMTP Test - Blog Platform", `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>SMTP Test Email</h2>
          <p>This is a test email from your blog platform. If you received this, your SMTP configuration is working correctly.</p>
          <hr />
          <p style="color: #666; font-size: 12px;">Sent at ${new Date().toISOString()}</p>
        </div>
      `);

      // Log activity
      await db.activityLog.create({
        data: {
          action: "smtp_test",
          details: JSON.stringify({ adminId, to }),
        },
      });

      return NextResponse.json({ success: true, message: "Test email sent" });
    } catch (emailError) {
      console.error("Email send failed:", emailError);
      return NextResponse.json(
        { error: "Failed to send test email. Please check your SMTP configuration." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("SMTP test failed:", error);
    return NextResponse.json({ error: "SMTP test failed" }, { status: 500 });
  }
}
