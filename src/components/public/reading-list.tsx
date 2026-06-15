"use client";

import { usePublicStore, type BlogPost } from "@/stores/public-store";
import { formatDate } from "@/lib/timeAgo";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  X,
  Bookmark,
  BookmarkCheck,
  Trash2,
  BookOpen,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function ReadingList() {
  const {
    readingList,
    showReadingList,
    setShowReadingList,
    removeFromReadingList,
    setReadingList,
    setSelectedBlog,
    readPosts,
    markAsRead,
  } = usePublicStore();

  const readCount = readingList.filter((b) => readPosts.has(b.id)).length;
  const totalCount = readingList.length;
  const progressPercent = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0;

  const handleItemClick = (blog: BlogPost) => {
    markAsRead(blog.id);
    setSelectedBlog(blog);
    setShowReadingList(false);
  };

  const handleClearAll = () => {
    setReadingList([]);
  };

  return (
    <AnimatePresence>
      {showReadingList && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowReadingList(false)}
          />

          {/* Slide-out panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-background border-l border-border/40 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-muted/80 flex items-center justify-center">
                  <Bookmark className="size-4 text-foreground" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Reading List</h2>
                  <p className="text-xs text-muted-foreground">
                    {totalCount} {totalCount === 1 ? "article" : "articles"} saved
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full hover:bg-muted"
                onClick={() => setShowReadingList(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Progress bar */}
            {totalCount > 0 && (
              <div className="px-5 py-3 border-b border-border/30">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Reading progress</span>
                  <span className="font-medium text-muted-foreground">
                    {readCount}/{totalCount} read
                  </span>
                </div>
                <Progress value={progressPercent} className="h-1.5" />
              </div>
            )}

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-4">
                {totalCount === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="relative mb-4">
                      <div className="size-16 rounded-2xl bg-muted/60 rotate-6 absolute -top-1 -left-1" />
                      <div className="size-16 rounded-2xl bg-muted/80 relative flex items-center justify-center">
                        <BookOpen className="size-7 text-muted-foreground/50" />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Your reading list is empty
                    </p>
                    <p className="text-xs text-muted-foreground/60 max-w-[200px]">
                      Bookmark articles to save them for later reading.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {readingList.map((blog, i) => {
                        const isRead = readPosts.has(blog.id);
                        return (
                          <motion.div
                            key={blog.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20, height: 0 }}
                            transition={{
                              duration: 0.2,
                              delay: i * 0.03,
                            }}
                            className="group rounded-xl border border-border/40 bg-card hover:border-border/70 transition-all duration-200 overflow-hidden"
                          >
                            <button
                              onClick={() => handleItemClick(blog)}
                              className="w-full text-left p-3.5 space-y-2"
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="mt-0.5 size-5 rounded flex-shrink-0 flex items-center justify-center">
                                  {isRead ? (
                                    <BookmarkCheck className="size-3.5 text-muted-foreground/60" />
                                  ) : (
                                    <Bookmark className="size-3.5 text-foreground/70" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3
                                    className={cn(
                                      "text-sm font-medium leading-snug line-clamp-2",
                                      isRead && "text-muted-foreground"
                                    )}
                                  >
                                    {blog.title}
                                  </h3>
                                  {blog.excerpt && (
                                    <p className="text-xs text-muted-foreground/70 line-clamp-1 mt-1">
                                      {blog.excerpt}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground/60">
                                    {blog.publishedAt && (
                                      <time dateTime={blog.publishedAt}>
                                        {formatDate(blog.publishedAt)}
                                      </time>
                                    )}
                                    {blog.readingTime > 0 && (
                                      <span className="inline-flex items-center gap-0.5">
                                        <Clock className="size-2.5" />
                                        {blog.readingTime}m
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>
                            <div className="flex justify-end px-3 pb-2.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 rounded-full opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFromReadingList(blog.id);
                                }}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer with clear all */}
            {totalCount > 0 && (
              <div className="px-5 py-3 border-t border-border/40">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 h-9"
                  onClick={handleClearAll}
                >
                  <Trash2 className="size-3.5" />
                  Clear all
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
