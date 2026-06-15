import type { Metadata } from "next";
import { DM_Sans, Lora, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/styles/tiptap.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { SiteProvider } from "@/components/site-provider";
import { CustomCss } from "@/components/public/custom-css";
import { db } from "@/lib/db";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

async function getSiteSettings(): Promise<{ siteName: string; tagline: string }> {
  try {
    const settings = await db.siteSettings.findFirst();
    return {
      siteName: settings?.siteName || "Blog",
      tagline: settings?.tagline || "Minimal Writing Space",
    };
  } catch {
    return { siteName: "Blog", tagline: "Minimal Writing Space" };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, tagline } = await getSiteSettings();
  return {
    title: `${siteName} — ${tagline}`,
    description:
      "A minimalist blog — thoughts, notes, and ideas worth sharing.",
    icons: {
      icon: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
    alternates: {
      types: {
        "application/rss+xml": [
          { title: `${siteName} Blog`, url: "/feed.xml" },
          { title: `${siteName} Notes`, url: "/notes-feed.xml" },
        ],
      },
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <CustomCss />
      </head>
      <body
        className={`${dmSans.variable} ${lora.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SiteProvider>
            {children}
            <Toaster position="bottom-center" richColors closeButton />
          </SiteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
