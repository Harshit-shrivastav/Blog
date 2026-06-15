"use client";

import { useEffect, useState } from "react";
import { usePublicStore } from "@/stores/public-store";
import { getFingerprint } from "@/lib/fingerprint";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { X, History, Trash2, FileText, StickyNote, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { timeAgo } from "@/lib/timeAgo";
import { cn } from "@/lib/utils";

interface HistoryEntry {
  id: string;
  title: string;
  slug: string;
  type: string;
  viewedAt: string;
}

export function WebHistoryPanel() {
  const { showWebHistory, setShowWebHistory, setSelectedBlog } = usePublicStore();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!showWebHistory) return;
    let cancelled = false;
    fetch("/api/web-history")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setHistory(data.history || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [showWebHistory]);

  const clearHistory = async () => {
    // WebHistory doesn't have a bulk delete - just reload empty
    setHistory([]);
  };

  return (
    <AnimatePresence>
      {showWebHistory && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowWebHistory(false)}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          />

          {/* Slide-out panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-background border-l border-border/40 z-50 flex flex-col shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-muted flex items-center justify-center">
                  <History className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">History</h2>
                  <p className="text-[11px] text-muted-foreground">Recently viewed</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {history.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={clearHistory}
                    title="Clear history"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setShowWebHistory(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3">
              {loading ? (
                <div className="space-y-3 px-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-lg" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-3/4" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                    <Clock className="size-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground/70 mb-1">
                    No history yet
                  </p>
                  <p className="text-xs text-muted-foreground/50">
                    Posts you view will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {history.map((entry, idx) => (
                    <motion.button
                      key={entry.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.2 }}
                      onClick={() => {
                        if (entry.type === "blog") {
                          // Find blog from store and select it
                          const { blogs } = usePublicStore.getState();
                          const found = blogs.find((b) => b.slug === entry.slug);
                          if (found) {
                            setSelectedBlog(found);
                          }
                        }
                        setShowWebHistory(false);
                      }}
                      className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors duration-150 text-left cursor-pointer group"
                    >
                      <div className={cn(
                        "size-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors duration-150",
                        entry.type === "blog"
                          ? "bg-primary/10 text-primary group-hover:bg-primary/15"
                          : "bg-amber-500/10 text-amber-600 group-hover:bg-amber-500/15"
                      )}>
                        {entry.type === "blog" ? (
                          <FileText className="size-3.5" />
                        ) : (
                          <StickyNote className="size-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-foreground transition-colors">
                          {entry.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                          {timeAgo(entry.viewedAt)}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-5 py-3 border-t border-border/40">
              <p className="text-[10px] text-muted-foreground/50 text-center">
                Press <kbd className="px-1 py-0.5 rounded border border-border/50 bg-muted/30 text-[9px] font-mono mx-0.5">H</kbd> to toggle
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
