"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { usePublicStore, type BlogPost, getBlogUrl } from "@/stores/public-store";
import { useSite } from "@/components/site-provider";
import { MarkdownRenderer } from "./markdown-renderer";
import { LikeButton } from "./like-button";
import { CommentsSection } from "./comments-section";
import { ReactionsBar } from "./reactions-bar";
import { NewsletterWidget } from "./newsletter-widget";
import { BlogCard } from "./blog-card";
import { formatDate } from "@/lib/timeAgo";
import { cn } from "@/lib/utils";
import { getFingerprint } from "@/lib/fingerprint";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Clock,
  Eye,
  Copy,
  Share2,
  Share,
  X,
  ChevronDown,
  ChevronRight,
  Twitter,
  Linkedin,
  Bookmark,
  BookmarkCheck,
  Link2,
  MessageSquare,
  Pencil,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface BlogDetailProps {
  blog: BlogPost;
  onClose: () => void;
}

interface BlogDetailData extends BlogPost {
  content: string;
  readingTime: number;
}

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

function extractTOC(content: string): TOCItem[] {
  const items: TOCItem[] = [];
  // Support both Markdown headings and HTML headings
  if (content.trim().startsWith("<")) {
    // HTML content from Tiptap
    const headingRegex = /<(h[2-4])[^>]*>(.*?)<\/\1>/gi;
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      const level = parseInt(match[1][1]);
      const text = match[2].replace(/<[^>]*>/g, "").trim();
      const id = text.toLowerCase().replace(/[^\w]+/g, "-");
      items.push({ id, text, level });
    }
  } else {
    // Markdown content
    const headingRegex = /^(#{2,4})\s+(.+)$/gm;
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].replace(/[*_`]/g, "").trim();
      const id = text.toLowerCase().replace(/[^\w]+/g, "-");
      items.push({ id, text, level });
    }
  }
  return items;
}

// Fade-in section wrapper for article content
function FadeInSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export function BlogDetailView({ blog, onClose }: BlogDetailProps) {
  const { siteSettings } = useSite();
  const { blogs, likes, toggleLike, setSelectedBlog, setSearchTag, readingList, addToReadingList, removeFromReadingList, markAsRead } = usePublicStore();
  const [detail, setDetail] = useState<BlogDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeHeading, setActiveHeading] = useState<string>("");
  const [mobileTocSlide, setMobileTocSlide] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Check if user is admin
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token) setIsAdmin(true);
  }, []);

  const tocItems = useMemo(() => {
    if (!detail?.content) return [];
    return extractTOC(detail.content);
  }, [detail?.content]);

  const relatedPosts = useMemo(() => {
    return blogs
      .filter((b) => b.id !== blog.id && b.status === "published")
      .slice(0, 3);
  }, [blogs, blog.id]);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/blogs/${blog.slug}`, {
        headers: { "x-fingerprint": getFingerprint() },
      });
      if (res.ok) {
        const data = await res.json();
        setDetail(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [blog.slug]);

  useEffect(() => {
    fetchDetail();
    document.body.style.overflow = "hidden";
    markAsRead(blog.id);
    if (!readingList.some((b) => b.id === blog.id)) {
      addToReadingList(blog);
    }
    // Record web history
    fetch("/api/web-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: blog.title, slug: blog.slug, type: "blog" }),
    }).catch(() => {});
    return () => {
      document.body.style.overflow = "";
    };
  }, [fetchDetail]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Reading progress bar
  useEffect(() => {
    const handleScroll = () => {
      const content = contentRef.current;
      if (!content) return;

      const rect = content.getBoundingClientRect();
      const totalHeight = content.scrollHeight;
      const viewportHeight = window.innerHeight;
      const scrolled = -rect.top;
      const maxScroll = totalHeight - viewportHeight;

      if (maxScroll <= 0) {
        setProgress(0);
      } else {
        const pct = Math.min(100, Math.max(0, (scrolled / maxScroll) * 100));
        setProgress(pct);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [detail]);

  // Active heading tracking for TOC
  useEffect(() => {
    if (!contentRef.current || tocItems.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveHeading(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );

    const timer = setTimeout(() => {
      tocItems.forEach((item) => {
        const el = document.getElementById(item.id);
        if (el) observer.observe(el);
      });
    }, 200);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [tocItems, detail]);

  const copyLink = () => {
    const url = getBlogUrl(blog.slug);
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Native OS share
  const nativeShare = async () => {
    const shareUrl = getBlogUrl(blog.slug);
    if (navigator.share) {
      try {
        await navigator.share({
          title: detail?.title || blog.title,
          text: detail?.excerpt || blog.excerpt,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or not supported
        if ((err as DOMException).name !== "AbortError") {
          copyLink();
        }
      }
    } else {
      copyLink();
    }
  };

  const shareTwitter = () => {
    const text = encodeURIComponent(`${detail?.title || blog.title}`);
    const url = encodeURIComponent(getBlogUrl(blog.slug));
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  const shareLinkedIn = () => {
    const url = encodeURIComponent(getBlogUrl(blog.slug));
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank");
  };

  const handleTagClick = (tag: string) => {
    setSearchTag(tag);
    setSelectedBlog(null);
  };

  // Admin actions
  const adminEditBlog = () => {
    // Store blog ID and target section in localStorage for admin to pick up
    localStorage.setItem("blog-editing-blog-id", blog.id);
    localStorage.setItem("blog-admin-section", "blog-editor");
    const adminSlug = siteSettings?.adminSlug || "admin-dashboard";
    window.open(`/${adminSlug}`, "_blank");
  };

  const adminDeleteBlog = async () => {
    if (!confirm("Are you sure you want to delete this post? This cannot be undone.")) return;
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch(`/api/admin/blogs/${blog.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Post deleted");
        onClose();
      } else {
        toast.error("Failed to delete post");
      }
    } catch {
      toast.error("Failed to delete post");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-background"
      >
        {/* Reading progress bar with gradient and glow */}
        <div className="fixed top-0 left-0 right-0 z-[60] h-[4px] bg-border/20">
          <motion.div
            className="h-full rounded-r-full"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, var(--site-accent), oklch(0.65 0.2 160))",
              boxShadow: progress > 0
                ? "0 0 8px var(--site-accent), 0 0 20px oklch(0.65 0.2 160 / 25%)"
                : "none",
              transition: "box-shadow 0.3s ease",
            }}
            transition={{ duration: 0.15, ease: "linear" }}
          />
        </div>
        {/* Reading progress percentage */}
        {progress > 3 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="fixed top-2 left-1/2 -translate-x-1/2 z-[60] px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/40 text-[10px] font-medium tabular-nums text-muted-foreground pointer-events-none"
          >
            {Math.round(progress)}%
          </motion.div>
        )}

        <div className="h-full overflow-y-auto">
          {/* Top bar */}
          <div className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 sm:px-6 bg-background/80 backdrop-blur-xl border-b border-border/40">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="back-arrow-hover gap-1.5 rounded-full hover:bg-muted transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <ArrowLeft className="size-4 back-arrow-icon transition-transform duration-200" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="flex items-center gap-0.5 sm:gap-1">
              {/* Admin actions */}
              {isAdmin && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={adminEditBlog}
                        className="size-9 rounded-full hover:bg-muted transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        <Pencil className="size-3.5 text-amber-600 dark:text-amber-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={4}>Edit in Admin</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={adminDeleteBlog}
                        className="size-9 rounded-full hover:bg-destructive/10 transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={4}>Delete Post</TooltipContent>
                  </Tooltip>
                  <div className="h-4 w-px bg-border mx-0.5" />
                </>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (readingList.some((b) => b.id === blog.id)) {
                        removeFromReadingList(blog.id);
                      } else {
                        addToReadingList(blog);
                      }
                    }}
                    className="size-9 rounded-full hover:bg-muted transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    {readingList.some((b) => b.id === blog.id) ? (
                      <BookmarkCheck className="size-3.5" />
                    ) : (
                      <Bookmark className="size-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={4}>
                  {readingList.some((b) => b.id === blog.id) ? "Remove from reading list" : "Bookmark"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={copyLink} className="size-9 rounded-full hover:bg-muted transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring">
                    <motion.div animate={copied ? { scale: [1, 1.2, 1] } : {}} transition={{ duration: 0.3 }}>
                      {copied ? (
                        <span className="size-3.5 text-emerald-500 text-xs font-bold">✓</span>
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </motion.div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={4} className="tooltip-appear transition-all duration-200">
                  {copied ? "Copied!" : "Copy link"}
                </TooltipContent>
              </Tooltip>

              {/* Share dropdown menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-9 rounded-full hover:bg-muted transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring">
                    <Share2 className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {/* Native OS Share first if available */}
                  {typeof navigator !== "undefined" && navigator.share && (
                    <DropdownMenuItem onClick={nativeShare} className="gap-2.5 cursor-pointer font-medium">
                      <Share className="size-3.5" />
                      <span>Share...</span>
                      <span className="ml-auto text-[10px] text-muted-foreground font-mono">⌘S</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={copyLink} className="gap-2.5 cursor-pointer">
                    <Copy className="size-3.5" />
                    <span>Copy Link</span>
                    <span className="ml-auto text-[10px] text-muted-foreground font-mono">⌘C</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={shareTwitter} className="gap-2.5 cursor-pointer">
                    <Twitter className="size-3.5" />
                    <span>Share on X</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={shareLinkedIn} className="gap-2.5 cursor-pointer">
                    <Linkedin className="size-3.5" />
                    <span>Share on LinkedIn</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    const url = encodeURIComponent(getBlogUrl(blog.slug));
                    const title = encodeURIComponent(detail?.title || blog.title);
                    window.open(`https://www.reddit.com/submit?url=${url}&title=${title}`, "_blank");
                  }} className="gap-2.5 cursor-pointer">
                    <MessageSquare className="size-3.5" />
                    <span>Share on Reddit</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="icon" onClick={onClose} className="size-9 rounded-full sm:hidden hover:bg-muted transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring">
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 space-y-6">
              <div className="skeleton-shimmer h-8 w-3/4 rounded-lg" />
              <div className="flex gap-4">
                <div className="skeleton-shimmer h-4 w-24 rounded" />
                <div className="skeleton-shimmer h-4 w-20 rounded" />
              </div>
              <div className="skeleton-shimmer h-[400px] w-full rounded-xl" />
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="skeleton-shimmer h-4 w-full rounded" />
                ))}
              </div>
            </div>
          ) : detail ? (
            <article className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12" ref={contentRef}>
              {/* Mobile TOC slide-in from right */}
              {tocItems.length > 0 && (
                <button
                  onClick={() => setMobileTocSlide(true)}
                  className="lg:hidden flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 px-3 py-1.5 rounded-full hover:bg-muted/50 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Open table of contents"
                >
                  <ChevronRight className="size-3.5" />
                  <span className="text-xs font-medium">TOC</span>
                  <span className="text-[10px] tabular-nums bg-muted/60 rounded-full px-1.5 py-0.5">{tocItems.length}</span>
                </button>
              )}

              {/* Mobile TOC slide-in panel */}
              <AnimatePresence>
                {mobileTocSlide && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setMobileTocSlide(false)}
                      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
                    />
                    <motion.nav
                      initial={{ x: "100%" }}
                      animate={{ x: 0 }}
                      exit={{ x: "100%" }}
                      transition={{ type: "spring", damping: 25, stiffness: 200 }}
                      className="fixed top-0 right-0 bottom-0 w-72 bg-background border-l border-border/40 z-50 p-5 overflow-y-auto lg:hidden"
                    >
                      <div className="flex items-center justify-between mb-5">
                        <p className="text-sm font-semibold">Table of Contents</p>
                        <button
                          onClick={() => setMobileTocSlide(false)}
                          className="size-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors cursor-pointer"
                          aria-label="Close"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                      <ul className="space-y-0.5">
                        {tocItems.map((item) => (
                          <li key={item.id}>
                            <a
                              href={`#${item.id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
                                setMobileTocSlide(false);
                              }}
                              className={cn(
                                "text-sm block py-2 px-3 rounded-lg transition-all duration-200",
                                activeHeading === item.id
                                  ? "text-foreground font-medium bg-muted/60 border-l-2 border-[var(--site-accent)]"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                              )}
                              style={{ paddingLeft: `${(item.level - 2) * 12 + 12}px` }}
                            >
                              {item.text}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </motion.nav>
                  </>
                )}
              </AnimatePresence>

              <div className="flex flex-col lg:flex-row gap-8">
                {/* Main content */}
                <div className="flex-1 min-w-0">
                  {/* Hero image */}
                  <FadeInSection>
                    {detail.coverImage && (
                      <div className="aspect-[16/9] sm:aspect-[2/1] rounded-2xl overflow-hidden mb-8 bg-muted shadow-lg shadow-black/[0.06]">
                        <img
                          src={detail.coverImage}
                          alt={detail.title}
                          className="size-full object-cover"
                        />
                      </div>
                    )}
                  </FadeInSection>

                  {/* Title */}
                  <FadeInSection delay={0.05}>
                    <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.5rem] font-bold leading-[1.15] tracking-tight mb-5">
                      {detail.title}
                    </h1>
                  </FadeInSection>

                  {/* Meta with reading time badge */}
                  <FadeInSection delay={0.1}>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-7">
                      {detail.publishedAt && (
                        <time dateTime={detail.publishedAt} className="tabular-nums">
                          {formatDate(detail.publishedAt)}
                        </time>
                      )}
                      <span className="size-1 rounded-full bg-border" />
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 text-xs font-medium tabular-nums transition-all duration-200 hover:bg-muted/80">
                        <Clock className="size-3" />
                        {detail.readingTime || 5} min read
                      </span>
                      <span className="size-1 rounded-full bg-border" />
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Eye className="size-3.5" />
                        {detail.viewCount}
                      </span>
                    </div>
                  </FadeInSection>

                  {/* Tags with hover scale */}
                  <FadeInSection delay={0.15}>
                    {detail.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-8">
                        {detail.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[13px] font-normal rounded-full px-3.5 py-1 cursor-pointer border border-border/50 hover:bg-muted-foreground/10 hover:text-foreground hover:scale-105 active:scale-95 hover:border-border transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => handleTagClick(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </FadeInSection>

                  {/* Content */}
                  <FadeInSection delay={0.2}>
                    <div id="blog-content">
                      {detail.content.trim().startsWith("<") ? (
                        <div
                          className="prose prose-lg dark:prose-invert max-w-none tiptap prose-headings:font-serif prose-a:text-foreground prose-a:underline-offset-4 prose-a:decoration-muted-foreground/40 hover:prose-a:decoration-foreground prose-img:rounded-xl prose-img:shadow-md"
                          dangerouslySetInnerHTML={{ __html: detail.content }}
                        />
                      ) : (
                        <MarkdownRenderer
                          content={detail.content}
                          className="mx-auto"
                        />
                      )}
                    </div>
                  </FadeInSection>

                  <Separator className="my-8" />

                  {/* Emoji Reactions */}
                  <FadeInSection delay={0.05}>
                    <div className="mb-6">
                      <ReactionsBar blogSlug={blog.slug} />
                    </div>
                  </FadeInSection>

                  <Separator className="my-8" />

                  {/* Comments Section */}
                  {detail.commentsEnabled !== false && siteSettings?.globalCommentsEnabled !== false && (
                    <CommentsSection blogSlug={blog.slug} />
                  )}

                  {/* Like & Share */}
                  <div className="mt-12 pt-6 border-t border-border/40 flex items-center gap-3 sm:gap-4">
                    <div className="inline-flex items-center gap-1 rounded-full px-1 py-1 bg-muted/30 transition-all duration-200 hover:bg-muted/50">
                      <LikeButton
                        targetId={detail.id}
                        targetType="blog"
                        initialCount={detail.likeCount}
                        isLiked={likes.has(`blog:${detail.id}`)}
                        onToggle={toggleLike}
                        className="px-2.5 py-1 rounded-full"
                      />
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <button
                      onClick={nativeShare}
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 px-3 py-1.5 rounded-full transition-all duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Share2 className="size-4" />
                      Share
                    </button>
                  </div>

                  {/* Author bio card */}
                  <FadeInSection delay={0.1}>
                    <div className="mt-10 rounded-2xl p-[1px] bg-gradient-to-br from-border/60 via-[var(--site-accent)]/20 to-transparent">
                      <div className="rounded-2xl bg-card p-6 sm:p-7 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
                          backgroundImage: `radial-gradient(circle at 1px 1px, var(--foreground) 1px, transparent 0)`,
                          backgroundSize: "24px 24px",
                        }} />
                        <div className="absolute -top-8 -right-8 size-32 rounded-full bg-[var(--site-accent)]/5 blur-2xl pointer-events-none" />

                        <div className="relative flex items-start gap-4">
                          <div className="size-12 rounded-full bg-gradient-to-br from-[var(--site-accent)]/20 to-foreground/10 flex items-center justify-center text-sm font-bold flex-shrink-0 ring-1 ring-border/50 transition-transform duration-300 hover:scale-105">
                            {(siteSettings?.siteName || "A").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-[15px]">{siteSettings?.siteName || "Author"}</p>
                            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                              {siteSettings?.bio || "Writer and thinker."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </FadeInSection>

                  {/* Newsletter CTA */}
                  <div className="mt-8">
                    <NewsletterWidget variant="inline" />
                  </div>

                  {/* Related posts */}
                  {relatedPosts.length > 0 && (
                    <div className="mt-16">
                      <div className="flex items-center gap-3 mb-7">
                        <div className="h-px w-8 bg-foreground/20" />
                        <h3 className="font-serif text-xl font-semibold">More posts</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {relatedPosts.map((post) => (
                          <BlogCard key={post.id} blog={post} onClick={() => setSelectedBlog(post)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Related tags */}
                  {detail.tags.length > 0 && (
                    <div className="mt-10 pt-6 border-t border-border/40">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">
                        Related tags
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.tags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => handleTagClick(tag)}
                            className="px-3 py-1.5 rounded-full text-xs font-medium border border-border/60 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/50 transition-all duration-200 cursor-pointer"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Desktop sticky TOC sidebar */}
                {tocItems.length > 0 && (
                  <aside className="hidden lg:block w-56 flex-shrink-0">
                    <div className="sticky top-20">
                      <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                        On this page
                      </p>
                      <nav>
                        <ul className="space-y-0.5">
                          {tocItems.map((item) => (
                            <li key={item.id}>
                              <a
                                href={`#${item.id}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className={cn(
                                  "text-[13px] block leading-snug py-1 transition-all duration-300 ease-out border-l-2 -ml-[2px] pl-[14px] rounded-r-md",
                                  activeHeading === item.id
                                    ? "text-foreground font-medium border-[var(--site-accent)] bg-[var(--site-accent)]/5"
                                    : "text-muted-foreground hover:text-foreground border-transparent hover:border-border/60 hover:bg-muted/30"
                                )}
                                style={{ paddingLeft: `${(item.level - 2) * 10 + 14}px` }}
                              >
                                {item.text}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </nav>
                    </div>
                  </aside>
                )}
              </div>
            </article>
          ) : null}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
