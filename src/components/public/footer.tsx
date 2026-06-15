"use client";

import { useSite } from "@/components/site-provider";
import { NewsletterWidget } from "./newsletter-widget";
import { Github, Twitter, Linkedin, ArrowUp } from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

// Map platform names to icons and display names
const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  github: Github,
  twitter: Twitter,
  x: Twitter,
  linkedin: Linkedin,
};
const platformNames: Record<string, string> = {
  github: "GitHub",
  twitter: "Twitter",
  x: "X",
  linkedin: "LinkedIn",
};

export function Footer() {
  const { siteSettings } = useSite();
  const socialLinks = siteSettings?.socialLinks || {};

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const socialEntries = Object.entries(socialLinks) as [string, string][];

  return (
    <footer id="newsletter-section" className="mt-auto relative">

      {/* Animated gradient divider line */}
      <div className="animated-divider" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
        {/* Mobile: centered layout */}
        <div className="flex flex-col items-center text-center sm:items-start sm:text-left sm:flex-row sm:justify-between gap-8">
          {/* Left: Brand */}
          <div className="space-y-2.5">
            <h3 className="font-serif text-lg font-semibold">
              {siteSettings?.siteName || "Blog"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              {siteSettings?.tagline || "Thoughts, notes, and ideas."}
            </p>
          </div>

          {/* Right: Newsletter */}
          <div className="w-full sm:w-auto sm:max-w-xs space-y-2.5">
            <p className="text-sm font-medium">Subscribe to updates</p>
            <NewsletterWidget variant="footer" />
          </div>
        </div>

        {/* Social links & copyright */}
        <div className="mt-8 pt-6 border-t border-border/40 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {"\u00A9"} {new Date().getFullYear()}{" "}{siteSettings?.siteName || "Blog"}. All rights reserved.
          </p>
          <p className="text-[10px] text-muted-foreground/40">
            Powered by Blog
          </p>

          <div className="flex items-center gap-2.5">
            {/* Social icon links with enhanced scale + color transitions */}
            {socialEntries.map(([platform, url]) => {
              const Icon = platformIcons[platform.toLowerCase()];
              const displayName = platformNames[platform.toLowerCase()] || platform;
              return (
                <Tooltip key={platform}>
                  <TooltipTrigger asChild>
                    <motion.a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.15, y: -2 }}
                      whileTap={{ scale: 0.92 }}
                      className="size-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-[var(--site-accent)] hover:bg-[var(--site-accent)]/10 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={displayName}
                    >
                      {Icon ? (
                        <Icon className="size-[15px]" />
                      ) : (
                        <span className="text-xs font-medium capitalize">{platform}</span>
                      )}
                    </motion.a>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="tooltip-appear">
                    {displayName}
                  </TooltipContent>
                </Tooltip>
              );
            })}

            {/* Divider */}
            {socialEntries.length > 0 && (
              <div className="size-px h-4 bg-border mx-0.5" />
            )}

            {/* Back to top button with ring animation */}
            <motion.button
              onClick={scrollToTop}
              className="relative size-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Back to top"
              whileHover={{ y: -2, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {/* Ring animation on hover */}
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-foreground/20"
                initial={{ scale: 0.8, opacity: 0 }}
                whileHover={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.4 }}
              />
              <ArrowUp className="size-4 relative" />
            </motion.button>
          </div>
        </div>
      </div>
    </footer>
  );
}
