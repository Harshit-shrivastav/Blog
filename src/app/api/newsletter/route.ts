import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already subscribed
    const existing = await db.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      if (existing.status === "active") {
        return NextResponse.json(
          { error: "You are already subscribed" },
          { status: 409 }
        );
      }

      // Reactivate unsubscribed subscriber
      await db.newsletterSubscriber.update({
        where: { email: normalizedEmail },
        data: {
          status: "active",
          subscribedAt: new Date(),
          unsubscribedAt: null,
        },
      });

      // Attempt to send welcome email if SMTP is configured
      try {
        const smtp = await db.smtpConfig.findFirst();
        if (smtp && smtp.host && smtp.username) {
          await sendEmail(smtp, normalizedEmail, "Welcome back!", "You've re-subscribed to our newsletter.");
        }
      } catch {
        // Email sending is best-effort
      }

      return NextResponse.json({ success: true });
    }

    // Create new subscriber
    await db.newsletterSubscriber.create({
      data: {
        email: normalizedEmail,
        status: "active",
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        action: "newsletter_subscribe",
        details: JSON.stringify({ email: normalizedEmail }),
      },
    });

    // Attempt to send welcome email if SMTP is configured
    try {
      const smtp = await db.smtpConfig.findFirst();
      if (smtp && smtp.host && smtp.username) {
        const siteSettings = await db.siteSettings.findFirst();
        const siteName = siteSettings?.siteName || "My Blog";
        await sendEmail(
          smtp,
          normalizedEmail,
          `Welcome to ${siteName}!`,
          `Thank you for subscribing to our newsletter.`
        );
      }
    } catch {
      // Email sending is best-effort
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Newsletter subscription failed:", error);
    return NextResponse.json(
      { error: "Newsletter subscription failed" },
      { status: 500 }
    );
  }
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
  body: string
) {
  // Dynamic import to avoid bundling nodemailer if not needed
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

  await transporter.sendMail({
    from,
    to,
    subject,
    text: body,
    html: `<p>${body}</p>`,
  });
}

export { sendEmail };
