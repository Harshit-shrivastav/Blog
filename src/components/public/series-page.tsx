"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Clock, Eye, ArrowLeft, ImageOff, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicStore, type BlogPost } from "@/stores/public-store";
import { formatDate } from "@/lib/timeAgo";
import { cn } from "@/lib/utils";

interface SeriesData {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string | null;
  postCount: number;
}

interface SeriesPageProps {
  onClose: () => void;
}

export function SeriesPage({ onClose }: SeriesPageProps) {
  const [seriesList, setSeriesList] = useState<SeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeries, setSelectedSeries] = useState<SeriesData | null>(null);
  const [seriesPosts, setSeriesPosts] = useState<BlogPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const { setSelectedBlog } = usePublicStore();

  useEffect(() => {
    fetch("/api/series")
      .then((r) => r.json())
      .then((data) => {
        setSeriesList(data.series || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function handleSeriesClick(s: SeriesData) {
    setSelectedSeries(s);
    setPostsLoading(true);
    fetch(`/api/series?slug=${s.slug}`)
      .then((r) => r.json())
      .then((data) => {
        setSeriesPosts(data.posts || []);
        setPostsLoading(false);
      })
      .catch(() => setPostsLoading(false));
  }

  function handlePostClick(post: BlogPost) {
    onClose();
    setTimeout(() => setSelectedBlog(post), 200);
  }

  function handleBack() {
    setSelectedSeries(null);
    setSeriesPosts([]);
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
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
              onClick={selectedSeries ? handleBack : onClose}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              &larr; {selectedSeries ? "Back" : "Back"}
            </button>
          </div>
          <h2 className="text-sm font-medium">
            {selectedSeries ? selectedSeries.name : "Collections"}
          </h2>
          <div className="w-12" />
        </div>

        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-16 relative">
          {/* Decorative gradient */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-32 right-0 w-48 h-48 bg-primary/3 rounded-full blur-3xl pointer-events-none" />

          <AnimatePresence mode="wait">
            {!selectedSeries ? (
              /* Series Grid View */
              <motion.div
                key="grid"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {/* Hero */}
                <div className="relative mb-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                      <Layers className="size-5 text-primary" />
                    </div>
                  </div>
                  <h1
                    className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
                    style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                  >
                    Collections
                  </h1>
                  <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
                    Browse curated collections of related blog posts, organized by topic or series.
                  </p>
                  <div className="w-16 h-1 bg-gradient-to-r from-primary to-primary/20 rounded-full mt-4" />
                </div>

                {/* Loading */}
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-52 rounded-xl" />
                    ))}
                  </div>
                ) : seriesList.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                  >
                    <div className="relative mb-4">
                      <div className="size-16 rounded-2xl bg-muted/60 rotate-6 absolute -top-1 -left-1" />
                      <div className="size-16 rounded-2xl bg-muted/80 relative flex items-center justify-center">
                        <Layers className="size-7 text-muted-foreground/50" />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">No collections yet</p>
                    <p className="text-xs text-muted-foreground/60">
                      Collections will appear here once they&apos;re created.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {seriesList.map((s) => (
                      <motion.div
                        key={s.id}
                        variants={itemVariants}
                        className="group cursor-pointer"
                        onClick={() => handleSeriesClick(s)}
                      >
                        <div className="rounded-xl border border-border/40 bg-card overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/[0.06] hover:border-border/70">
                          {/* Cover */}
                          <div className="relative aspect-[16/9] bg-muted overflow-hidden">
                            {s.coverImage ? (
                              <img
                                src={s.coverImage}
                                alt={s.name}
                                className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                                loading="lazy"
                              />
                            ) : (
                              <div className="size-full flex items-center justify-center bg-gradient-to-br from-muted/60 to-muted/30">
                                <ImageOff className="size-6 text-muted-foreground/30" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute bottom-2 right-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-sm text-[11px] font-medium shadow-sm">
                                {s.postCount} {s.postCount === 1 ? "post" : "posts"}
                              </span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-[var(--site-accent)] transition-colors duration-300">
                                {s.name}
                              </h3>
                              <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200" />
                            </div>
                            {s.description ? (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {s.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            ) : (
              /* Series Detail View */
              <motion.div
                key="detail"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {/* Series Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                      onClick={() => handleBack()}
                    >
                      <Layers className="size-3" />
                      {selectedSeries.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {selectedSeries.postCount} {selectedSeries.postCount === 1 ? "post" : "posts"}
                    </span>
                  </div>
                  {selectedSeries.description && (
                    <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
                      {selectedSeries.description}
                    </p>
                  )}
                </div>

                {/* Posts list */}
                {postsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                  </div>
                ) : seriesPosts.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-sm text-muted-foreground">No posts in this collection yet.</p>
                  </div>
                ) : (
                  <motion.div
                    className="space-y-2"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {seriesPosts.map((post) => (
                      <motion.div
                        key={post.id}
                        variants={itemVariants}
                        className="group cursor-pointer"
                        onClick={() => handlePostClick(post)}
                      >
                        <div className="rounded-xl border border-border/40 bg-card overflow-hidden transition-all duration-200 hover:shadow-md hover:shadow-black/[0.04] hover:border-border/70 hover:-translate-y-0.5">
                          <div className="flex items-start gap-4 p-4">
                            {/* Cover thumbnail */}
                            {post.coverImage ? (
                              <div className="w-16 h-16 sm:w-20 sm:h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                <img
                                  src={post.coverImage}
                                  alt={post.title}
                                  className="size-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                            ) : (
                              <div className="w-16 h-16 sm:w-20 sm:h-16 rounded-lg bg-muted/60 flex-shrink-0 flex items-center justify-center">
                                <Layers className="size-4 text-muted-foreground/30" />
                              </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-serif text-sm font-semibold line-clamp-2 group-hover:text-[var(--site-accent)] transition-colors duration-300 mb-1">
                                {post.title}
                              </h3>
                              {post.excerpt && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">
                                  {post.excerpt}
                                </p>
                              )}
                              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                {post.publishedAt && (
                                  <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                                )}
                                {post.readingTime > 0 && (
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="size-3" />
                                    {post.readingTime} min
                                  </span>
                                )}
                                {post.viewCount > 0 && (
                                  <span className="inline-flex items-center gap-1">
                                    <Eye className="size-3" />
                                    {post.viewCount}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Arrow */}
                            <ChevronRight className="size-4 text-muted-foreground/50 mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
