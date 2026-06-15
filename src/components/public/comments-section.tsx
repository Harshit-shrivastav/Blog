"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getFingerprint } from "@/lib/fingerprint";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Send, Reply, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface Comment {
  id: string;
  authorName: string;
  content: string;
  fingerprint: string;
  isApproved: boolean;
  visibleToUser: boolean;
  createdAt: string;
}

interface CommentsSectionProps {
  blogSlug: string;
}

const AVATAR_RINGS = [
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-sky-400 to-blue-500",
  "from-violet-400 to-purple-500",
  "from-teal-400 to-cyan-500",
  "from-orange-400 to-red-500",
  "from-pink-400 to-fuchsia-500",
];

const AVATAR_BGS = [
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  "bg-pink-500/15 text-pink-700 dark:text-pink-400",
];

function getAvatarColor(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % AVATAR_BGS.length;
}

function relativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Simple markdown-like rendering for comment text */
function renderCommentContent(text: string) {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|(https?:\/\/[^\s]+))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++}>{text.slice(lastIndex, match.index)}</span>
      );
    }

    if (match[2]) {
      parts.push(
        <strong key={key++} className="font-semibold text-foreground">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      parts.push(
        <em key={key++} className="italic">{match[3]}</em>
      );
    } else if (match[4]) {
      parts.push(
        <a
          key={key++}
          href={match[4]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground underline underline-offset-2 decoration-foreground/30 hover:decoration-foreground/60 transition-colors"
        >
          {match[4]}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : text;
}

const COMMENT_IDS_KEY = "blog-comment-ids";

function getStoredCommentIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COMMENT_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addCommentId(id: string) {
  const ids = getStoredCommentIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(COMMENT_IDS_KEY, JSON.stringify(ids));
  }
}

export function CommentsSection({ blogSlug }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [newCommentId, setNewCommentId] = useState<string | null>(null);
  const [myFingerprint, setMyFingerprint] = useState<string>("");
  const [myCommentIds, setMyCommentIds] = useState<string[]>([]);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fp = getFingerprint();
    setMyFingerprint(fp);
    setMyCommentIds(getStoredCommentIds());
  }, []);

  const fetchComments = useCallback(async () => {
    try {
      const storedIds = getStoredCommentIds();
      const headers: Record<string, string> = {
        "x-fingerprint": getFingerprint(),
      };
      if (storedIds.length > 0) {
        headers["x-comment-ids"] = storedIds.join(",");
      }
      const res = await fetch(`/api/blogs/${blogSlug}/comments`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [blogSlug]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Filter comments for display using server-provided visibleToUser
  // Also cross-check with localStorage IDs for optimistic rendering
  const visibleComments = comments.filter(
    (c) => c.visibleToUser || myCommentIds.includes(c.id)
  );

  const pendingCount = comments.filter(
    (c) => !c.isApproved && !myCommentIds.includes(c.id)
  ).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !content.trim()) return;

    setSubmitting(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticComment: Comment = {
      id: tempId,
      authorName: authorName.trim(),
      content: content.trim(),
      fingerprint: getFingerprint(),
      isApproved: false,
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [optimisticComment, ...prev]);
    setContent("");
    setNewCommentId(tempId);

    setTimeout(() => setNewCommentId(null), 600);

    try {
      const res = await fetch(`/api/blogs/${blogSlug}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fingerprint": getFingerprint(),
        },
        body: JSON.stringify({
          authorName: authorName.trim(),
          content: content.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to post comment");
        setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id));
        setContent(optimisticComment.content);
      } else {
        const result = await res.json();
        if (result.id) {
          addCommentId(result.id);
          setMyCommentIds(getStoredCommentIds());
        }
        fetchComments();
        localStorage.setItem("comment-author", authorName.trim());
        toast.success("Comment submitted! Awaiting approval.", {
          description: "Your comment will be visible to others once approved.",
          duration: 4000,
        });
      }
    } catch {
      toast.error("Failed to post comment");
      setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id));
      setContent(optimisticComment.content);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("comment-author");
    if (saved) setAuthorName(saved);
  }, []);

  return (
    <section className="mt-10">
      {/* Section heading */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px w-8 bg-foreground/20" />
        <h3 className="font-serif text-xl font-semibold flex items-center gap-2">
          <MessageSquare className="size-5" />
          Comments
          {!loading && visibleComments.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({visibleComments.length})
            </span>
          )}
        </h3>
      </div>

      {/* Pending approval notice */}
      {pendingCount > 0 && (
        <div className="mb-4 flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-amber-700 dark:text-amber-300">
          <ShieldCheck className="size-4 flex-shrink-0" />
          <span className="text-xs">
            {pendingCount} {pendingCount === 1 ? "comment is" : "comments are"} awaiting moderation.
          </span>
        </div>
      )}

      {/* Comment form */}
      <motion.div
        ref={formRef}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mb-8"
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="Your name"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            maxLength={100}
            required
            className="bg-muted/50 border-border/60 focus:border-foreground/30 transition-colors rounded-lg"
          />
          <div className="relative">
            <textarea
              placeholder="Share your thoughts... (bold with **text**, italic with *text*)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              required
              rows={3}
              className="flex w-full rounded-lg border border-border/60 bg-muted/50 px-3 py-2.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-ring/20 resize-none transition-colors"
            />
            <span className="absolute bottom-2 left-3 text-[11px] text-muted-foreground/60 tabular-nums">
              {content.length}/2000
            </span>
            <div className="absolute bottom-2 right-2">
              <Button
                type="submit"
                size="sm"
                disabled={submitting || !authorName.trim() || !content.trim()}
                className="h-7 px-3 rounded-md gap-1.5 text-xs transition-all duration-200"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    Posting
                  </>
                ) : (
                  <>
                    <Send className="size-3" />
                    Post
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </motion.div>

      {/* Comments list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleComments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="py-14 text-center"
        >
          <div className="size-14 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="size-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground/70 mb-1">
            No comments yet
          </p>
          <p className="text-xs text-muted-foreground/50">
            Be the first to share your thoughts on this article.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {visibleComments.map((comment, index) => {
              const colorIdx = getAvatarColor(comment.authorName);
              const isNew = comment.id === newCommentId;
              const isOwn = myCommentIds.includes(comment.id) && !comment.isApproved;

              return (
                <motion.div
                  key={comment.id}
                  initial={isNew ? { opacity: 0, y: 20, scale: 0.98 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{
                    duration: isNew ? 0.4 : 0.25,
                    ease: isNew ? [0.22, 1, 0.36, 1] : "easeOut",
                    delay: !isNew && index < 1 ? 0 : 0.03,
                  }}
                  className="flex gap-3 p-3 rounded-lg border-l-2 border-transparent hover:border-muted-foreground/15 hover:bg-muted/30 transition-colors duration-200 group"
                >
                  {/* Avatar with gradient ring */}
                  <div className="relative shrink-0">
                    <div
                      className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${AVATAR_BGS[colorIdx]} ring-2 ring-background`}
                    >
                      {comment.authorName.charAt(0).toUpperCase()}
                    </div>
                    <div
                      className={`absolute inset-0 rounded-full bg-gradient-to-br ${AVATAR_RINGS[colorIdx]} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 scale-125`}
                    />
                  </div>

                  {/* Comment body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {comment.authorName}
                      </span>
                      <span className="text-xs text-muted-foreground/70 tabular-nums">
                        {relativeTime(comment.createdAt)}
                      </span>
                      {isOwn && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                      {renderCommentContent(comment.content)}
                    </p>

                    {/* Reply button */}
                    <button
                      className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      onClick={() => {
                        const textarea = document.querySelector(
                          `textarea`
                        ) as HTMLTextAreaElement | null;
                        if (textarea) {
                          textarea.focus();
                          textarea.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                      }}
                    >
                      <Reply className="size-3" />
                      Reply
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
