"use client";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/timeAgo";
import { Badge } from "@/components/ui/badge";
import { Clock, Eye, Bookmark, BookmarkCheck, Layers, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePublicStore, type BlogPost } from "@/stores/public-store";

interface BlogCardProps {
  blog: BlogPost;
  onClick: () => void;
  className?: string;
}

export function BlogCard({ blog, onClick, className }: BlogCardProps) {
  const { readingList, addToReadingList, removeFromReadingList, readPosts } = usePublicStore();
  const isBookmarked = readingList.some((b) => b.id === blog.id);
  const isRead = readPosts.has(blog.id);

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isBookmarked) {
      removeFromReadingList(blog.id);
    } else {
      addToReadingList(blog);
    }
  };

  return (
    <motion.article
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className={cn(
        "group cursor-pointer rounded-xl border border-border/40 bg-card overflow-hidden transition-all duration-300 ease-out relative",
        "hover:shadow-xl hover:shadow-black/[0.08] dark:hover:shadow-black/[0.3] hover:border-border/70 hover:bg-accent/[0.03]",
        "hover:border-l-[3px] hover:border-l-[var(--site-accent)]",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
        className
      )}
    >
      {/* Bookmark button */}
      <div className="absolute top-2.5 right-2.5 z-10">
        <motion.button
          onClick={handleBookmark}
          whileTap={{ scale: 0.8 }}
          className={cn(
            "size-8 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm",
            isBookmarked
              ? "bg-background/90 shadow-sm text-foreground ring-1 ring-border/50"
              : "bg-background/60 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
          )}
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
        >
          <AnimatePresence mode="wait">
            {isBookmarked ? (
              <motion.div
                key="filled"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 30 }}
                transition={{ type: "spring", bounce: 0.6, duration: 0.4 }}
              >
                <BookmarkCheck className="size-[16px]" />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Bookmark className="size-[16px]" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Cover Image */}
      {blog.coverImage && (
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          <img
            src={blog.coverImage}
            alt={blog.title}
            className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
            loading="lazy"
          />
          {/* Static subtle gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
          {/* Hover gradient overlay that fades in */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Series badge */}
        {blog.series && (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/15 transition-colors duration-200">
              <Layers className="size-3" />
              {blog.series.name}
            </span>
          </div>
        )}

        {/* Tags */}
        {blog.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {blog.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[11px] font-normal px-2 py-0 h-5 rounded-md transition-all duration-200 group-hover:bg-muted-foreground/10 group-hover:text-foreground"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className="font-serif text-base font-semibold leading-snug line-clamp-2 group-hover:text-[var(--site-accent)] transition-colors duration-300">
          {blog.title}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {blog.publishedAt && (
            <time dateTime={blog.publishedAt}>{formatDate(blog.publishedAt)}</time>
          )}
          {blog.readingTime > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/70 text-foreground/80 font-medium tabular-nums">
              <Clock className="size-3" />
              {blog.readingTime} min read
            </span>
          )}
          {blog.viewCount > 0 && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Eye className="size-3" />
              {blog.viewCount}
            </span>
          )}
          {isRead && (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3" />
              <span className="text-[11px]">Read</span>
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );
}
