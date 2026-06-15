"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import { getFingerprint } from "@/lib/fingerprint";
import { cn } from "@/lib/utils";

const EMOJI_OPTIONS = [
  "❤️", "🔥", "👏", "😍", "💡",
  "🎉", "🚀", "😂", "🤔", "💯",
  "👀", "✨", "🙌", "💪", "🎯",
];

interface ReactionsBarProps {
  blogSlug: string;
}

interface ReactionState {
  counts: Record<string, number>;
  sortedEmojis: string[];
  userEmojis: string[];
}

export function ReactionsBar({ blogSlug }: ReactionsBarProps) {
  const [state, setState] = useState<ReactionState>({
    counts: {},
    sortedEmojis: [],
    userEmojis: [],
  });
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [togglingEmoji, setTogglingEmoji] = useState<string | null>(null);

  const fetchReactions = useCallback(async () => {
    try {
      const res = await fetch(`/api/blogs/${blogSlug}/reactions`, {
        headers: { "x-fingerprint": getFingerprint() },
      });
      if (res.ok) {
        const data = await res.json();
        setState({
          counts: data.reactions || {},
          sortedEmojis: data.sortedEmojis || [],
          userEmojis: data.userEmojis || [],
        });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [blogSlug]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".reactions-bar-container")) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  const toggleReaction = async (emoji: string) => {
    if (togglingEmoji) return;
    setTogglingEmoji(emoji);

    // Optimistic update
    const isRemoving = state.userEmojis.includes(emoji);
    setState((prev) => {
      const newCounts = { ...prev.counts };
      const newUserEmojis = isRemoving
        ? prev.userEmojis.filter((e) => e !== emoji)
        : [...prev.userEmojis, emoji];

      if (isRemoving) {
        newCounts[emoji] = Math.max(0, (newCounts[emoji] || 1) - 1);
        if (newCounts[emoji] === 0) delete newCounts[emoji];
      } else {
        newCounts[emoji] = (newCounts[emoji] || 0) + 1;
      }

      // Re-sort: user emojis first, then by count
      const userFirst = newUserEmojis.filter((e) => newCounts[e]);
      const rest = Object.entries(newCounts)
        .filter(([e]) => !newUserEmojis.includes(e))
        .sort(([, a], [, b]) => b - a)
        .map(([e]) => e);

      return {
        counts: newCounts,
        sortedEmojis: [...userFirst, ...rest],
        userEmojis: newUserEmojis,
      };
    });

    setShowPicker(false);

    try {
      await fetch(`/api/blogs/${blogSlug}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fingerprint": getFingerprint(),
        },
        body: JSON.stringify({ emoji }),
      });
      // Re-fetch to sync
      fetchReactions();
    } catch {
      // Revert on error
      fetchReactions();
    } finally {
      setTogglingEmoji(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 py-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-8 w-14 rounded-full bg-muted/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const hasReactions = state.sortedEmojis.length > 0;

  return (
    <div className="reactions-bar-container relative">
      <div
        className={cn(
          "flex items-center gap-1.5 flex-wrap py-1",
          !hasReactions && "opacity-0 pointer-events-none h-0 py-0 overflow-hidden"
        )}
      >
        {state.sortedEmojis.map((emoji) => {
          const count = state.counts[emoji] || 0;
          const isActive = state.userEmojis.includes(emoji);
          const isToggling = togglingEmoji === emoji;

          return (
            <motion.button
              key={emoji}
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.06 }}
              onClick={() => toggleReaction(emoji)}
              disabled={isToggling}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm border transition-all duration-200 select-none",
                isActive
                  ? "bg-primary/10 border-primary/30 text-foreground shadow-sm"
                  : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50 hover:border-border/50"
              )}
            >
              <motion.span
                key={isActive ? "active" : "inactive"}
                initial={isActive ? { scale: [1, 1.35, 1] } : false}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5, duration: 0.4 }}
                className="text-base leading-none"
              >
                {emoji}
              </motion.span>
              {count > 0 && (
                <span className="text-[11px] font-medium tabular-nums leading-none">
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}

        {/* Add reaction button */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.06 }}
          onClick={() => setShowPicker(!showPicker)}
          className={cn(
            "inline-flex items-center justify-center size-8 rounded-full border transition-all duration-200",
            showPicker
              ? "bg-primary/10 border-primary/30 text-foreground"
              : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50 hover:border-border/50"
          )}
        >
          {showPicker ? (
            <X className="size-3.5" />
          ) : (
            <Plus className="size-3.5" />
          )}
        </motion.button>
      </div>

      {/* Emoji picker */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-20 mt-1 p-2 rounded-xl border border-border/60 bg-popover shadow-lg backdrop-blur-xl"
          >
            <div className="grid grid-cols-5 gap-0.5">
              {EMOJI_OPTIONS.map((emoji) => {
                const isActive = state.userEmojis.includes(emoji);
                return (
                  <button
                    key={emoji}
                    onClick={() => toggleReaction(emoji)}
                    className={cn(
                      "w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-all duration-150 hover:bg-muted/80 active:scale-[0.88]",
                      isActive && "bg-primary/10 ring-1 ring-primary/30"
                    )}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
