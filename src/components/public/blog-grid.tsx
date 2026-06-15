"use client";

import { useEffect, useCallback, useRef, useState, useMemo } from "react";
import { usePublicStore, type BlogPost } from "@/stores/public-store";
import { BlogCard } from "./blog-card";
import { BookOpen, Search, X, Star, Sparkles, Command } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getFingerprint } from "@/lib/fingerprint";
import { motion, AnimatePresence } from "framer-motion";

function BlogCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-border/40 overflow-hidden"
    >
      <div className="relative">
        <Skeleton className="aspect-[16/10] w-full" />
        {/* Faster shimmer overlay on skeleton image */}
        <div className="absolute inset-0 skeleton-shimmer" style={{ animationDuration: "0.8s" }} />
      </div>
      <div className="p-5 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-[22px] w-14 rounded-full" />
          <Skeleton className="h-[22px] w-18 rounded-full" />
        </div>
        <Skeleton className="h-5 w-full rounded" />
        <Skeleton className="h-5 w-3/4 rounded" />
        <div className="flex gap-2.5 items-center">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="size-1 rounded-full" />
          <Skeleton className="h-3 w-12 rounded" />
        </div>
      </div>
    </motion.div>
  );
}

export function BlogGrid() {
  const {
    blogs,
    setBlogs,
    blogPage,
    setBlogPage,
    hasMoreBlogs,
    setHasMoreBlogs,
    setSelectedBlog,
    searchTag,
    setSearchTag,
    setShowSearch,
  } = usePublicStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [searchResults, setSearchResults] = useState<BlogPost[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);

  const loadingRef = useRef(false);
  const observerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Extract unique tags from blogs
  useEffect(() => {
    if (blogs.length > 0) {
      const tagSet = new Set<string>();
      blogs.forEach((b) => b.tags.forEach((t) => tagSet.add(t)));
      setAllTags(Array.from(tagSet).sort());
    }
  }, [blogs]);

  // React to searchTag from store (e.g. clicked from blog detail)
  useEffect(() => {
    if (searchTag) {
      setSearchQuery("");
      setActiveSearch("");
      setSearchResults(null);
      handleTagFilter(searchTag);
    }
  }, [searchTag]);

  const handleTagFilter = useCallback(
    async (tag: string) => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/blogs/search?tag=${encodeURIComponent(tag)}`,
          { headers: { "x-fingerprint": getFingerprint() } }
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.blogs);
        }
      } catch {
        // silent
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  const onTagClick = (tag: string) => {
    if (searchTag === tag) {
      setSearchTag(null);
      setSearchResults(null);
    } else {
      setSearchTag(tag);
    }
  };

  const clearTag = () => {
    setSearchTag(null);
    setSearchResults(null);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setActiveSearch("");
    setSearchResults(null);
  };

  // Debounced search
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!value.trim()) {
        setActiveSearch("");
        setSearchResults(null);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const res = await fetch(
            `/api/blogs/search?q=${encodeURIComponent(value.trim())}`,
            { headers: { "x-fingerprint": getFingerprint() } }
          );
          if (res.ok) {
            const data = await res.json();
            setActiveSearch(value.trim());
            setSearchResults(data.blogs);
          }
        } catch {
          // silent
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    []
  );

  const fetchBlogs = useCallback(
    async (page: number) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        const res = await fetch(`/api/blogs?page=${page}&limit=12`, {
          headers: { "x-fingerprint": getFingerprint() },
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (page === 1) {
          setBlogs(data.blogs);
        } else {
          setBlogs([...blogs, ...data.blogs]);
        }
        setHasMoreBlogs(data.hasMore);
      } catch {
        // silent fail
      } finally {
        loadingRef.current = false;
      }
    },
    [blogs, setBlogs, setHasMoreBlogs]
  );

  // Initial fetch
  useEffect(() => {
    if (blogs.length === 0 && !searchResults) {
      fetchBlogs(1);
    }
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (searchResults || searchTag) return;
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreBlogs && !loadingRef.current) {
          const nextPage = blogPage + 1;
          setBlogPage(nextPage);
          fetchBlogs(nextPage);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMoreBlogs, blogPage, setBlogPage, fetchBlogs, searchResults, searchTag]);

  // Determine displayed blogs
  const displayBlogs: BlogPost[] = useMemo(() => {
    if (searchResults !== null) return searchResults;
    return blogs;
  }, [searchResults, blogs]);

  // Skeleton state
  if (displayBlogs.length === 0 && (loadingRef.current || isSearching)) {
    return (
      <div>
        {/* Section heading skeleton */}
        <div className="space-y-1.5 mb-6">
          <Skeleton className="h-7 w-40 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-full border border-border/50 bg-muted/30 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-border focus:ring-2 focus:ring-foreground/5 transition-all duration-200"
            />
          </div>
        </div>
        {/* Tag pills */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {allTags.map((tag) => (
              <Skeleton key={tag} className="h-7 w-16 rounded-full" />
            ))}
          </div>
        )}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4 pb-20 lg:pb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="break-inside-avoid">
              <BlogCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state with better illustration
  if (displayBlogs.length === 0 && !hasMoreBlogs && !searchResults) {
    return (
      <div>
        {/* Section heading */}
        <div className="space-y-1 mb-6">
          <h2 className="font-serif text-2xl font-semibold tracking-tight">Latest Articles</h2>
          <p className="text-sm text-muted-foreground">Thoughts, ideas, and stories from the blog.</p>
        </div>
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-full border border-border/50 bg-muted/30 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-border focus:ring-2 focus:ring-foreground/5 transition-all duration-200"
            />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-28 text-center">
          {/* Decorative illustration */}
          <div className="relative mb-8">
            <div className="size-24 rounded-3xl bg-muted/30 rotate-12 absolute -top-3 -left-3" />
            <div className="size-24 rounded-3xl bg-muted/20 -rotate-6 absolute -bottom-2 -right-2" />
            <div className="size-24 rounded-3xl bg-gradient-to-br from-muted/80 to-muted/40 relative flex items-center justify-center shadow-sm">
              <BookOpen className="size-11 text-muted-foreground/40" />
            </div>
            {/* Sparkle decorations */}
            <div className="absolute -top-4 -right-4 size-3">
              <Sparkles className="size-3 text-muted-foreground/25" />
            </div>
          </div>
          <h3 className="font-serif text-xl font-medium text-muted-foreground mb-2">
            No posts yet
          </h3>
          <p className="text-sm text-muted-foreground/60 max-w-[260px] leading-relaxed">
            Check back soon for new articles and stories.
          </p>
        </div>
      </div>
    );
  }

  // Get featured post (first with cover image)
  const featuredPost = !searchResults && !searchTag && !activeSearch
    ? displayBlogs.find((b) => b.coverImage && b.status === "published")
    : null;
  const remainingPosts = featuredPost
    ? displayBlogs.filter((b) => b !== featuredPost)
    : displayBlogs;

  return (
    <div className="relative">
      {/* Section heading */}
      <div className="space-y-1 mb-6 relative z-10">
        <h2 className="font-serif text-2xl font-semibold tracking-tight">Latest Articles</h2>
        <p className="text-sm text-muted-foreground">
          Thoughts, ideas, and stories from the blog.
        </p>
      </div>

      {/* Search button - triggers search overlay with animated gradient border */}
      <div className="mb-5 relative z-10">
        <div className="animated-border-focus rounded-full">
          <button
            onClick={() => setShowSearch(true)}
            className="w-full h-11 pl-11 pr-16 rounded-full border border-border/50 bg-muted/30 text-sm text-left text-muted-foreground/50 flex items-center transition-all duration-200 hover:border-border hover:bg-muted/50 hover:shadow-md cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Search className="absolute left-4 size-4 text-muted-foreground/60" />
            <span>Search posts...</span>
            <kbd className="hidden sm:inline-flex ml-auto h-5 items-center gap-1 rounded-md border border-border/60 bg-background/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground shadow-sm">
              <Command className="size-2.5" />K
            </kbd>
          </button>
        </div>
      </div>

      {/* Gradient line separator between heading and tags */}
      {allTags.length > 0 && (
        <div className="gradient-line mb-5 relative z-10" />
      )}

      {/* Tag filter pills with animated active state */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5 relative z-10">
          {allTags.map((tag, idx) => (
            <motion.button
              key={tag}
              onClick={() => onTagClick(tag)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.03 }}
              className={cn(
                "relative px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer overflow-hidden",
                "border",
                searchTag === tag
                  ? "bg-foreground text-background border-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground hover:border-border/50 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              {searchTag === tag && (
                <motion.div
                  layoutId="active-tag-pill"
                  className="absolute inset-0 bg-foreground rounded-full"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}
              <span className="relative">{tag}</span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Active filter indicators */}
      <AnimatePresence>
        {(activeSearch || searchTag) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 flex items-center gap-3 flex-wrap"
          >
            {activeSearch && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm">
                <span className="text-muted-foreground">Showing results for:</span>
                <span className="font-medium">&quot;{activeSearch}&quot;</span>
                <button
                  onClick={clearSearch}
                  className="ml-1 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="size-3 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            )}
            {searchTag && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm">
                <span className="text-muted-foreground">Filtered by:</span>
                <span className="font-medium text-xs bg-foreground/10 px-2 py-0.5 rounded-full">
                  {searchTag}
                </span>
                <button
                  onClick={clearTag}
                  className="ml-1 cursor-pointer"
                  aria-label="Clear tag filter"
                >
                  <X className="size-3 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Featured card for latest blog with cover + Featured badge */}
      {featuredPost && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          onClick={() => setSelectedBlog(featuredPost)}
          className="group cursor-pointer rounded-2xl border border-border/40 bg-card overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:shadow-black/[0.08] dark:hover:shadow-black/[0.25] hover:border-border/70 mb-8 relative"
        >
          {/* Featured badge */}
          <div className="absolute top-4 left-4 z-10">
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: "spring", bounce: 0.3 }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--site-accent)]/10 text-[var(--site-accent)] text-[11px] font-medium backdrop-blur-sm border border-[var(--site-accent)]/20"
            >
              <Star className="size-3 fill-current" />
              Featured
            </motion.span>
          </div>

          <div className="flex flex-col sm:flex-row">
            <div className="relative sm:w-2/5 lg:w-2/5 aspect-[16/10] sm:aspect-auto overflow-hidden bg-muted">
              <img
                src={featuredPost.coverImage}
                alt={featuredPost.title}
                className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/15 via-black/5 to-transparent" />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="flex-1 p-5 sm:p-7 lg:p-8 flex flex-col justify-center">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {featuredPost.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-normal px-2.5 py-0.5 h-[22px] rounded-full bg-muted text-muted-foreground transition-colors duration-200 group-hover:bg-muted-foreground/10"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-semibold leading-[1.3] mb-3 text-foreground group-hover:text-[var(--site-accent)] transition-colors duration-300">
                {featuredPost.title}
              </h3>
              {featuredPost.excerpt && (
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4">
                  {featuredPost.excerpt}
                </p>
              )}
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                {featuredPost.publishedAt && (
                  <time dateTime={featuredPost.publishedAt}>
                    {featuredPost.publishedAt}
                  </time>
                )}
                {featuredPost.viewCount > 0 && (
                  <>
                    <span className="size-1 rounded-full bg-border" />
                    <span>{featuredPost.viewCount} views</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* No results state */}
      {displayBlogs.length === 0 && searchTag && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="relative mb-5">
            <div className="size-14 rounded-xl bg-muted/40 rotate-6 absolute -top-1 -left-1" />
            <div className="size-14 rounded-xl bg-gradient-to-br from-muted/70 to-muted/40 relative flex items-center justify-center shadow-sm">
              <Search className="size-6 text-muted-foreground/40" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-medium mb-1">No posts found.</p>
          <p className="text-xs text-muted-foreground/60">Try a different search or tag.</p>
        </motion.div>
      )}

      {/* Blog grid with staggered animations */}
      <AnimatePresence mode="wait">
        {remainingPosts.length > 0 && (
          <motion.div
            key={`${activeSearch}-${searchTag}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4 pb-20 lg:pb-6 relative z-10"
          >
            {remainingPosts.map((blog, i) => (
              <motion.div
                key={blog.id}
                className="break-inside-avoid"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: Math.min(i * 0.08, 0.4),
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                <BlogCard
                  blog={blog}
                  onClick={() => setSelectedBlog(blog)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Infinite scroll trigger */}
      {hasMoreBlogs && !searchResults && !searchTag && (
        <div ref={observerRef} className="flex justify-center py-8 pb-20 lg:pb-6 relative z-10">
          {loadingRef.current && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <div className="size-4 border-2 border-border border-t-foreground rounded-full animate-spin" />
              Loading more...
            </motion.div>
          )}
        </div>
      )}

      {/* View all button when more posts to load */}
      {hasMoreBlogs && !searchResults && !searchTag && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center pt-2 pb-20 lg:pb-6 relative z-10"
        >
          <button
            onClick={() => {
              const nextPage = blogPage + 1;
              setBlogPage(nextPage);
              fetchBlogs(nextPage);
            }}
            disabled={loadingRef.current}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium border border-border/60 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/50 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <BookOpen className="size-3.5" />
            View all posts
          </button>
        </motion.div>
      )}
    </div>
  );
}
