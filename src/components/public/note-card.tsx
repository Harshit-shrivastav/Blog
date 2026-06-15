"use client";

import { usePublicStore } from "@/stores/public-store";
import { useSite } from "@/components/site-provider";
import { MarkdownRenderer } from "./markdown-renderer";
import { AudioPlayer } from "./audio-player";
import { LikeButton } from "./like-button";
import { SaveButton } from "./save-button";
import { timeAgo } from "@/lib/timeAgo";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { Note } from "@/stores/public-store";

interface NoteCardProps {
  note: Note;
  onClick: () => void;
  className?: string;
}

function getInitial(name: string) {
  return name.charAt(0).toUpperCase();
}

export function NoteCard({ note, onClick, className }: NoteCardProps) {
  const { siteSettings } = useSite();
  const { likes, saves, toggleLike, toggleSave } = usePublicStore();

  const likeKey = `note:${note.id}`;
  const saveKey = `note:${note.id}`;

  return (
    <motion.article
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={{
        y: -3,
        boxShadow: "0 12px 28px -8px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
      }}
      className={cn(
        "group cursor-pointer rounded-xl border bg-card transition-all duration-300",
        "border-border/40 hover:border-border/60",
        "border-l-[3px] hover:border-l-[var(--site-accent)]",
        "p-5 relative overflow-hidden",
        "dark:hover:shadow-[0_12px_28px_-8px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.04)]",
        className
      )}
    >
      {/* Inner glow effect on hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--site-accent)]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Content container */}
      <div className="relative">
        {/* Header: avatar + name + time */}
        <div className="flex items-center gap-3 mb-4">
          <div className="size-9 rounded-full bg-gradient-to-br from-foreground/15 to-foreground/5 flex items-center justify-center text-xs font-semibold flex-shrink-0 ring-1 ring-border/50 transition-all duration-300 group-hover:scale-105 group-hover:ring-[var(--site-accent)]/30">
            {getInitial(siteSettings?.siteName || "A")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {siteSettings?.siteName || "Author"}
            </p>
            <p className="text-xs text-muted-foreground/70 tabular-nums tracking-tight">{timeAgo(note.createdAt)}</p>
          </div>
        </div>

        {/* Content (truncated) with fade-out gradient */}
        <div className="relative mb-4">
          <div className="line-clamp-5 prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <MarkdownRenderer content={note.content} />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-card via-card/80 to-transparent pointer-events-none" />
        </div>

        {/* Image grid (max 4 images shown) */}
        {note.images.length > 0 && (
          <div className="grid gap-1.5 mb-4 rounded-lg overflow-hidden">
            <div
              className={cn(
                "grid gap-1.5",
                note.images.length === 1
                  ? "grid-cols-1"
                  : "grid-cols-2"
              )}
            >
              {note.images.slice(0, 4).map((img, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "relative aspect-square overflow-hidden rounded-lg bg-muted",
                    note.images.length === 3 && idx === 0 && "row-span-2"
                  )}
                >
                  <img
                    src={img}
                    alt={note.imageCaptions[img] || ""}
                    className="size-full object-cover transition-transform duration-400 ease-out group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audio (first audio only) */}
        {note.audioFiles.length > 0 && (
          <div
            className="mb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <AudioPlayer
              src={note.audioFiles[0]}
              caption={note.audioCaptions[note.audioFiles[0]]}
            />
          </div>
        )}

        {/* Separator line */}
        <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent mb-3 transition-all duration-300 group-hover:via-border" />

        {/* Actions with better spacing */}
        <div
          className="flex items-center gap-5 text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <LikeButton
            targetId={note.id}
            targetType="note"
            initialCount={note.likeCount}
            isLiked={likes.has(likeKey)}
            onToggle={toggleLike}
            size="sm"
          />
          <SaveButton
            targetId={note.id}
            targetType="note"
            initialCount={note.saveCount}
            isSaved={saves.has(saveKey)}
            onToggle={toggleSave}
            size="sm"
          />
        </div>
      </div>
    </motion.article>
  );
}
