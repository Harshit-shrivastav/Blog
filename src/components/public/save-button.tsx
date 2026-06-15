"use client";

import { useState, useCallback } from "react";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFingerprint } from "@/lib/fingerprint";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface SaveButtonProps {
  targetId: string;
  targetType: "note";
  initialCount: number;
  isSaved: boolean;
  onToggle: (targetType: string, targetId: string) => void;
  size?: "sm" | "md";
  className?: string;
}

export function SaveButton({
  targetId,
  targetType,
  initialCount,
  isSaved,
  onToggle,
  size = "md",
  className,
}: SaveButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [saved, setSaved] = useState(isSaved);
  const [animating, setAnimating] = useState(false);

  const handleSave = useCallback(async () => {
    const nextSaved = !saved;
    setSaved(nextSaved);
    setCount((c) => (nextSaved ? c + 1 : c - 1));
    onToggle(targetType, targetId);

    if (nextSaved) {
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
          action: "save",
          fingerprint: getFingerprint(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCount(data.newCount);
      }
    } catch {
      toast.error("Something went wrong");
      setSaved(!nextSaved);
      setCount((c) => (nextSaved ? c - 1 : c + 1));
      onToggle(targetType, targetId);
    }
  }, [saved, onToggle, targetId, targetType]);

  const btn = (
    <button
      onClick={handleSave}
      className={cn(
        "relative inline-flex items-center gap-1.5 transition-colors duration-200",
        saved ? "text-amber-500" : "text-muted-foreground hover:text-amber-400",
        size === "sm" ? "text-sm gap-1" : "text-sm",
        className
      )}
      aria-label={saved ? "Unsave" : "Save"}
    >
      {/* Glow effect when saved */}
      <AnimatePresence>
        {saved && animating && (
          <motion.span
            initial={{ scale: 0.5, opacity: 0.6 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute size-6 rounded-full bg-amber-500/30 -left-1 top-1/2 -translate-y-1/2 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <motion.span
        animate={animating ? {
          scale: [1, 1.25, 0.9, 1.1, 1],
        } : {}}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="relative flex"
      >
        <Bookmark
          className={cn(
            size === "sm" ? "size-3.5" : "size-4",
            saved && "fill-current",
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
        {saved ? `${count} saved` : "Save this"}
      </TooltipContent>
    </Tooltip>
  );
}
