"use client";

import { usePublicStore } from "@/stores/public-store";
import { BookOpen, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const tabs = [
  { id: "blogs" as const, label: "Blogs", icon: BookOpen },
  { id: "notes" as const, label: "Notes", icon: MessageSquare },
];

export function BottomNav() {
  const { view, setView, blogs } = usePublicStore();

  // Check if there are "new" posts (more than 0 published blogs)
  const hasNewPosts = blogs.length > 0;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden safe-area-inset-bottom"
      role="tablist"
      aria-label="Main navigation"
    >
      {/* Top gradient border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto flex max-w-sm items-center justify-around px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {/* Enhanced frosted glass pill container with gradient */}
        <div className="relative flex w-full items-center justify-around gap-1 rounded-2xl bg-background/60 backdrop-blur-2xl border border-border/15 shadow-xl shadow-black/[0.06] dark:shadow-black/[0.35] px-2 py-1.5">
          {/* Subtle glass highlight on top edge */}
          <div className="absolute -top-px inset-x-4 h-px bg-gradient-to-r from-transparent via-foreground/[0.07] to-transparent rounded-full pointer-events-none" />
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = view === tab.id;

            return (
              <motion.button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setView(tab.id)}
                whileTap={{ scale: 0.88 }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-1.5 py-2.5 rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-muted-foreground/80"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="absolute inset-0 bg-gradient-to-b from-muted to-muted/60 rounded-xl shadow-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <Icon className={cn(
                  "relative size-[20px] transition-all duration-200",
                  isActive && "text-[var(--site-accent)]"
                )} />
                <span className={cn(
                  "relative text-[11px] font-medium transition-all duration-200",
                  isActive && "text-[var(--site-accent)]"
                )}>
                  {tab.label}
                </span>

                {/* Badge indicator for new posts on blogs tab */}
                {tab.id === "blogs" && hasNewPosts && !isActive && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-1.5 right-2 size-2 rounded-full bg-[var(--site-accent)]"
                  />
                )}

                {/* Active dot indicator with gradient */}
                {isActive && (
                  <motion.span
                    layoutId="bottom-nav-dot"
                    className="absolute -bottom-1 size-1 rounded-full bg-gradient-to-r from-[var(--site-accent)] to-foreground"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
