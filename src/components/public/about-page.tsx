"use client";

import { useState, useEffect } from "react";
import { useSite } from "@/components/site-provider";
import { usePublicStore } from "@/stores/public-store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Github,
  Twitter,
  Linkedin,
  Mail,
  BookOpen,
  StickyNote,
  Users,
  ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";

interface AboutPageProps {
  onClose: () => void;
}

interface Stats {
  blogs: number;
  notes: number;
  subscribers: number;
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  github: Github,
  twitter: Twitter,
  x: Twitter,
  linkedin: Linkedin,
  email: Mail,
};

export function AboutPage({ onClose }: AboutPageProps) {
  const { siteSettings } = useSite();
  const { setShowContact } = usePublicStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const socialLinks = (siteSettings?.socialLinks || {}) as Record<string, string>;
  const socialEntries = Object.entries(socialLinks) as [string, string][];

  useEffect(() => {
    fetch("/api/site/about-stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleGetInTouch = () => {
    onClose();
    setTimeout(() => setShowContact(true), 200);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-background"
    >
      <div className="h-full overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 sm:px-6 bg-background/80 backdrop-blur-xl border-b border-border/40">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              &larr; Back
            </button>
          </div>
          <h2 className="text-sm font-medium">About</h2>
          <div className="w-12" />
        </div>

        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-16 relative">
          {/* Decorative gradient shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-32 left-0 w-48 h-48 bg-primary/3 rounded-full blur-3xl pointer-events-none" />

          {/* Hero Section */}
          <div className="relative mb-12">
            <h1
              className="text-3xl sm:text-5xl font-bold tracking-tight mb-4"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
            >
              About{" "}
              <span className="bg-gradient-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text">
                {siteSettings?.siteName || "Blog"}
              </span>
            </h1>
            <div className="w-16 h-1 bg-gradient-to-r from-primary to-primary/20 rounded-full" />
          </div>

          {/* Author Bio */}
          <div className="relative mb-12">
            <div className="flex items-start gap-5 mb-6">
              <div className="size-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 ring-1 ring-border/50">
                <span className="text-lg font-serif font-semibold text-primary">
                  {(siteSettings?.siteName || "B").charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold mb-1">
                  {siteSettings?.siteName || "Blog"}
                </h2>
                {siteSettings?.tagline && (
                  <p className="text-sm text-muted-foreground">
                    {siteSettings.tagline}
                  </p>
                )}
              </div>
            </div>

            {siteSettings?.bio ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-[15px]">
                  {siteSettings.bio}
                </p>
              </motion.div>
            ) : (
              <p className="text-muted-foreground/60 text-sm italic">
                No bio yet.
              </p>
            )}
          </div>

          {/* Social Links */}
          {socialEntries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="mb-12"
            >
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-4">
                Find me elsewhere
              </h3>
              <div className="flex items-center gap-3 flex-wrap">
                {socialEntries.map(([platform, url]) => {
                  const Icon = platformIcons[platform.toLowerCase()];
                  return (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/50 transition-all duration-200"
                    >
                      {Icon ? (
                        <Icon className="size-4" />
                      ) : (
                        <ExternalLink className="size-4" />
                      )}
                      <span className="capitalize">{platform}</span>
                    </a>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Stats Section */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mb-12"
          >
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-5">
              By the numbers
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {loading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="text-center p-4 rounded-xl bg-muted/30 border border-border/30">
                      <Skeleton className="h-8 w-12 mx-auto mb-2 rounded-md" />
                      <Skeleton className="h-3 w-16 mx-auto rounded-md" />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="text-center p-4 sm:p-5 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors duration-200">
                    <div className="flex items-center justify-center mb-2">
                      <BookOpen className="size-4 text-primary mr-1.5" />
                      <span className="text-2xl sm:text-3xl font-bold tracking-tight">
                        {stats?.blogs ?? 0}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Published Posts
                    </p>
                  </div>
                  <div className="text-center p-4 sm:p-5 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors duration-200">
                    <div className="flex items-center justify-center mb-2">
                      <StickyNote className="size-4 text-primary mr-1.5" />
                      <span className="text-2xl sm:text-3xl font-bold tracking-tight">
                        {stats?.notes ?? 0}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Notes
                    </p>
                  </div>
                  <div className="text-center p-4 sm:p-5 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors duration-200">
                    <div className="flex items-center justify-center mb-2">
                      <Users className="size-4 text-primary mr-1.5" />
                      <span className="text-2xl sm:text-3xl font-bold tracking-tight">
                        {stats?.subscribers ?? 0}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Subscribers
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="text-center"
          >
            <div className="p-8 rounded-2xl bg-muted/20 border border-border/30">
              <h3 className="text-lg font-semibold mb-2">Want to connect?</h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                I&apos;d love to hear from you. Whether it&apos;s a question, feedback, or just a friendly hello.
              </p>
              <Button
                onClick={handleGetInTouch}
                className="rounded-full px-6 h-10 font-medium"
              >
                <Mail className="size-4 mr-2" />
                Get in touch
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
