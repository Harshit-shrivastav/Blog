"use client";

import { useState, useCallback } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFingerprint } from "@/lib/fingerprint";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface LikeButtonProps {
  targetId: string;
  targetType: "blog" | "note";
  initialCount: number;
  isLiked: boolean;
  onToggle: (targetType: string, targetId: string) => void;
  size?: "sm" | "md";
  className?: string;
}

export function LikeButton({
  targetId,
  targetType,
  initialCount,
  isLiked,
  onToggle,
  size = "md",
  className,
}: LikeButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(isLiked);
  const [animating, setAnimating] = useState(false);

  const handleLike = useCallback(async () => {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => (nextLiked ? c + 1 : c - 1));
    onToggle(targetType, targetId);

    if (nextLiked) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 400);
    }

    try {
      const res = await fetch("/api/interact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fingerprint": getFingerprint(),
        },
        body: JSON.stringify({
          targetType,
          targetId,
          action: "like",
          fingerprint: getFingerprint(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCount(data.newCount);
      }
    } catch {
      toast.error("Something went wrong");
      setLiked(!nextLiked);
      setCount((c) => (nextLiked ? c - 1 : c + 1));
      onToggle(targetType, targetId);
    }
  }, [liked, onToggle, targetId, targetType]);

  const btn = (
    <button
      onClick={handleLike}
      className={cn(
        "relative inline-flex items-center gap-1.5 transition-colors duration-200",
        liked ? "text-red-500" : "text-muted-foreground hover:text-red-400",
        size === "sm" ? "text-sm gap-1" : "text-sm",
        className
      )}
      aria-label={liked ? "Unlike" : "Like"}
    >
      {/* Glow effect when liked */}
      <AnimatePresence>
        {liked && animating && (
          <motion.span
            initial={{ scale: 0.5, opacity: 0.6 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute size-6 rounded-full bg-red-500/30 -left-1 top-1/2 -translate-y-1/2 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <motion.span
        animate={animating ? {
          scale: [1, 1.35, 0.9, 1.1, 1],
        } : {}}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="relative flex"
      >
        <Heart
          className={cn(
            size === "sm" ? "size-3.5" : "size-4",
            liked && "fill-current",
          )}
        />
      </motion.span>

      <AnimatePresence mode="popLayout">
        {count > 0 && (
          <motion.span
            key={count}
            initial={{ scale: 0.8, opacity: 0, y: 4 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="tabular-nums count-animate"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        {liked ? `${count} like${count !== 1 ? "s" : ""}` : "Like this"}
      </TooltipContent>
    </Tooltip>
  );
}
