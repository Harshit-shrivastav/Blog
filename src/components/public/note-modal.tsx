"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePublicStore, type Note, getNoteUrl } from "@/stores/public-store";
import { useSite } from "@/components/site-provider";
import { MarkdownRenderer } from "./markdown-renderer";
import { AudioPlayer } from "./audio-player";
import { ImageLightbox } from "./image-lightbox";
import { LikeButton } from "./like-button";
import { SaveButton } from "./save-button";
import { timeAgo } from "@/lib/timeAgo";
import { getFingerprint } from "@/lib/fingerprint";
import { adminFetch } from "@/lib/admin-utils";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { X, MessageSquare, ChevronLeft, ChevronRight, Send, Reply, Loader2, Pencil, Trash2, Share2, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip as TooltipUI,
  TooltipTrigger as TooltipTriggerUI,
  TooltipContent as TooltipContentUI,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface NoteModalProps {
  note: Note;
  onClose: () => void;
}

interface NoteComment {
  id: string;
  authorName: string;
  content: string;
  fingerprint: string;
  isApproved: boolean;
  createdAt: string;
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

export function NoteModal({ note, onClose }: NoteModalProps) {
  const { siteSettings } = useSite();
  const { likes, saves, toggleLike, toggleSave } = usePublicStore();
  const [lightboxImage, setLightboxImage] = useState<{
    src: string;
    alt: string;
    allImages: { src: string; alt: string }[];
    currentIndex: number;
  } | null>(null);

  // Admin check
  const [isAdmin, setIsAdmin] = useState(false);
  const [myFingerprint, setMyFingerprint] = useState("");
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token) setIsAdmin(true);
    setMyFingerprint(getFingerprint());
  }, []);

  // Comments state
  const [comments, setComments] = useState<NoteComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsSubmitting, setCommentsSubmitting] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [newCommentId, setNewCommentId] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const commentsSectionRef = useRef<HTMLDivElement>(null);

  const likeKey = `note:${note.id}`;
  const saveKey = `note:${note.id}`;

  const openLightbox = useCallback(
    (src: string, alt: string, index: number) => {
      setLightboxImage({
        src,
        alt,
        allImages: note.images.map(
          (img) => ({ src: img, alt: note.imageCaptions[img] || "" })
        ),
        currentIndex: index,
      });
    },
    [note.images, note.imageCaptions]
  );

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/notes/${note.id}/comments`, {
        headers: { "x-fingerprint": getFingerprint() },
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch {
      // silent
    } finally {
      setCommentsLoading(false);
    }
  }, [note.id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Restore saved author name
  useEffect(() => {
    const saved = localStorage.getItem("comment-author");
    if (saved) setAuthorName(saved);
  }, []);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !commentContent.trim()) return;

    setCommentsSubmitting(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticComment: NoteComment = {
      id: tempId,
      authorName: authorName.trim(),
      content: commentContent.trim(),
      fingerprint: getFingerprint(),
      isApproved: false,
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [optimisticComment, ...prev]);
    setCommentContent("");
    setNewCommentId(tempId);
    setTimeout(() => setNewCommentId(null), 600);

    try {
      const res = await fetch(`/api/notes/${note.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fingerprint": getFingerprint(),
        },
        body: JSON.stringify({
          authorName: authorName.trim(),
          content: commentContent.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to post comment");
        setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id));
        setCommentContent(optimisticComment.content);
      } else {
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
      setCommentContent(optimisticComment.content);
    } finally {
      setCommentsSubmitting(false);
    }
  };

  const scrollToComments = () => {
    setShowComments(true);
    setTimeout(() => {
      commentsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // Filter comments: approved + own unapproved
  const visibleComments = comments.filter(
    (c) => c.isApproved || c.fingerprint === myFingerprint
  );

  // Admin delete note
  const adminDeleteNote = async () => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      const res = await adminFetch(`/api/admin/notes/${note.id}`, {
        method: "DELETE",
      });
      if (res && res.ok) {
        toast.success("Note deleted");
        onClose();
      } else {
        toast.error("Failed to delete note");
      }
    } catch {
      toast.error("Failed to delete note");
    }
  };

  // Admin edit note - navigate to admin panel with note context
  const adminEditNote = () => {
    localStorage.setItem("blog-editing-note-id", note.id);
    localStorage.setItem("blog-admin-section", "note-editor");
    const adminSlug = siteSettings?.adminSlug || "admin-dashboard";
    window.open(`/${adminSlug}`, "_blank");
  };

  // Native share
  const nativeShare = async () => {
    const shareUrl = getNoteUrl(note.id);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Note by ${siteSettings?.siteName || "Author"}`,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as DOMException).name !== "AbortError") {
          navigator.clipboard.writeText(shareUrl);
          toast.success("Link copied!");
        }
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied!");
    }
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <>
      <AnimatePresence>
        {/* Backdrop with enhanced blur */}
        <motion.div
          key="note-backdrop"
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 bg-black/60"
          onClick={onClose}
        />

        {/* Modal with scale+blur entrance */}
        <motion.div
          key="note-modal"
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={{ top: 0.3, bottom: 0.5 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 120) onClose();
          }}
          initial={{ opacity: 0, y: 80, scale: 0.92, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 80, scale: 0.92, filter: "blur(4px)" }}
          transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
          className="fixed inset-x-0 bottom-0 z-50 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-lg sm:w-full sm:rounded-2xl bg-background shadow-2xl shadow-black/[0.15] dark:shadow-black/[0.4] sm:max-h-[85vh] max-h-[95vh] flex flex-col rounded-t-2xl sm:rounded-b-2xl border border-border/30 sm:border-border/50"
        >
          {/* Drag handle (mobile) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>

          {/* Close + Admin actions */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-4 sm:right-4 size-9 flex items-center justify-center rounded-full bg-muted/80 hover:bg-muted hover:scale-110 active:scale-95 transition-all duration-200 z-10 ring-1 ring-border/40 hover:ring-border/60 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
          {isAdmin && (
            <>
              <button
                onClick={adminEditNote}
                className="absolute top-4 right-[4.5rem] sm:top-4 sm:right-[4.5rem] size-9 flex items-center justify-center rounded-full bg-amber-500/10 hover:bg-amber-500/20 hover:scale-110 active:scale-95 transition-all duration-200 z-10 ring-1 ring-amber-500/20 hover:ring-amber-500/40 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Edit in Admin"
                title="Edit in Admin"
              >
                <Pencil className="size-3.5 text-amber-600 dark:text-amber-400" />
              </button>
              <button
                onClick={adminDeleteNote}
                className="absolute top-4 right-16 sm:top-4 sm:right-16 size-9 flex items-center justify-center rounded-full bg-destructive/10 hover:bg-destructive/20 hover:scale-110 active:scale-95 transition-all duration-200 z-10 ring-1 ring-destructive/20 hover:ring-destructive/40 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Delete note"
                title="Delete note"
              >
                <Trash2 className="size-3.5 text-destructive" />
              </button>
            </>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-7 pt-4 sm:pt-7">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="flex items-center gap-3 mb-5"
            >
              <div className="size-10 rounded-full bg-gradient-to-br from-foreground/15 to-foreground/5 flex items-center justify-center text-sm font-bold flex-shrink-0 ring-1 ring-border/50 hover:scale-105 hover:ring-border transition-all duration-200">
                {(siteSettings?.siteName || "A").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-[15px]">
                  {siteSettings?.siteName || "Author"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                  {timeAgo(note.createdAt)}
                </p>
              </div>
            </motion.div>

            {/* Note content */}
            <div className="prose-note-content mb-6 text-[15px] leading-[1.75] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              {note.content.trim().startsWith("<") ? (
                <div
                  className="prose dark:prose-invert max-w-none tiptap"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />
              ) : (
                <MarkdownRenderer content={note.content} className="max-w-none" />
              )}
            </div>

            {/* Image gallery */}
            {note.images.length > 0 && (
              <div className="mb-6">
                {note.images.length === 1 ? (
                  /* Single image */
                  <div
                    className="relative rounded-xl overflow-hidden bg-muted ring-1 ring-border/30 cursor-pointer group"
                    onClick={() => openLightbox(note.images[0], note.imageCaptions[note.images[0]] || "", 0)}
                  >
                    <img
                      src={note.images[0]}
                      alt={note.imageCaptions[note.images[0]] || ""}
                      className="w-full object-cover rounded-xl transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                    {/* Lightbox hint overlay with gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4 rounded-xl">
                      <div className="opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white/90 text-xs font-medium">
                        Click to view
                      </div>
                    </div>
                    {note.imageCaptions[note.images[0]] && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-4 py-3">
                        <p className="text-xs text-white/90">
                          {note.imageCaptions[note.images[0]]}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Multiple images - gallery with navigation */
                  <div className="space-y-3">
                    {note.images.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-xl overflow-hidden bg-muted ring-1 ring-border/30 cursor-pointer group"
                        onClick={() => openLightbox(img, note.imageCaptions[img] || "", idx)}
                      >
                        <img
                          src={img}
                          alt={note.imageCaptions[img] || ""}
                          className="w-full object-cover rounded-xl transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                        {/* Lightbox hint overlay with gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4 rounded-xl">
                          <div className="opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white/90 text-xs font-medium">
                            {idx > 0 && <ChevronLeft className="size-3" />}
                            <span>{idx + 1} / {note.images.length}</span>
                            {idx < note.images.length - 1 && <ChevronRight className="size-3" />}
                          </div>
                        </div>
                        {note.imageCaptions[img] && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-4 py-3">
                            <p className="text-xs text-white/90">
                              {note.imageCaptions[img]}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Audio files */}
            {note.audioFiles.length > 0 && (
              <div className="space-y-4 mb-6">
                {note.audioFiles.map((audio, idx) => (
                  <AudioPlayer
                    key={idx}
                    src={audio}
                    caption={note.audioCaptions[audio]}
                  />
                ))}
              </div>
            )}

            {/* Comments section */}
            {note.commentsEnabled !== false && siteSettings?.globalCommentsEnabled !== false && (
            <div ref={commentsSectionRef} className="border-t border-border/40 pt-5 mt-2">
              {/* Section heading */}
              <button
                onClick={() => setShowComments(!showComments)}
                className="flex items-center gap-3 mb-4 w-full text-left cursor-pointer group"
              >
                <div className="h-px w-8 bg-foreground/20" />
                <h3 className="font-serif text-base font-semibold flex items-center gap-2 group-hover:text-foreground/80 transition-colors">
                  <MessageSquare className="size-4" />
                  Comments
                  {!commentsLoading && visibleComments.length > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">
                      ({visibleComments.length})
                    </span>
                  )}
                </h3>
              </button>

              {/* Show comments form and list */}
              <AnimatePresence>
                {showComments && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    {/* Comment form */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="mb-5"
                    >
                      <form onSubmit={handleCommentSubmit} className="space-y-2.5">
                        <Input
                          placeholder="Your name"
                          value={authorName}
                          onChange={(e) => setAuthorName(e.target.value)}
                          maxLength={100}
                          required
                          className="bg-muted/50 border-border/60 focus:border-foreground/30 transition-colors rounded-lg h-9 text-sm"
                        />
                        <div className="relative">
                          <textarea
                            placeholder="Share your thoughts..."
                            value={commentContent}
                            onChange={(e) => setCommentContent(e.target.value)}
                            maxLength={2000}
                            required
                            rows={2}
                            className="flex w-full rounded-lg border border-border/60 bg-muted/50 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-foreground/30 focus-visible:ring-1 focus-visible:ring-ring/20 resize-none transition-colors"
                          />
                          <span className="absolute bottom-1.5 left-3 text-[10px] text-muted-foreground/60 tabular-nums">
                            {commentContent.length}/2000
                          </span>
                          <div className="absolute bottom-1.5 right-1.5">
                            <Button
                              type="submit"
                              size="sm"
                              disabled={commentsSubmitting || !authorName.trim() || !commentContent.trim()}
                              className="h-6 px-2.5 rounded-md gap-1 text-[11px] transition-all duration-200"
                            >
                              {commentsSubmitting ? (
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
                    {commentsLoading ? (
                      <div className="space-y-3">
                        {[1, 2].map((i) => (
                          <div key={i} className="flex gap-2.5">
                            <Skeleton className="size-7 rounded-full shrink-0" />
                            <div className="flex-1 space-y-1.5">
                              <Skeleton className="h-3.5 w-24" />
                              <Skeleton className="h-3.5 w-full" />
                              <Skeleton className="h-3.5 w-2/3" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : visibleComments.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="py-8 text-center"
                      >
                        <div className="size-10 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-3">
                          <MessageSquare className="size-4 text-muted-foreground/40" />
                        </div>
                        <p className="text-xs font-medium text-muted-foreground/70 mb-0.5">
                          No comments yet
                        </p>
                        <p className="text-[11px] text-muted-foreground/50">
                          Be the first to share your thoughts.
                        </p>
                      </motion.div>
                    ) : (
                      <div className="space-y-1 max-h-60 overflow-y-auto">
                        <AnimatePresence mode="popLayout">
                          {visibleComments.map((comment) => {
                            const colorIdx = getAvatarColor(comment.authorName);
                            const isNew = comment.id === newCommentId;
                            const isOwn = comment.fingerprint === myFingerprint && !comment.isApproved;

                            return (
                              <motion.div
                                key={comment.id}
                                initial={isNew ? { opacity: 0, y: 16, scale: 0.98 } : { opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                transition={{
                                  duration: isNew ? 0.35 : 0.2,
                                  ease: isNew ? [0.22, 1, 0.36, 1] : "easeOut",
                                }}
                                className="flex gap-2.5 p-2.5 rounded-lg border-l-2 border-transparent hover:border-muted-foreground/15 hover:bg-muted/30 transition-colors duration-200 group"
                              >
                                {/* Avatar */}
                                <div className="relative shrink-0">
                                  <div
                                    className={cn(
                                      "size-7 rounded-full flex items-center justify-center text-[11px] font-bold ring-2 ring-background",
                                      AVATAR_BGS[colorIdx]
                                    )}
                                  >
                                    {comment.authorName.charAt(0).toUpperCase()}
                                  </div>
                                  <div
                                    className={cn(
                                      "absolute inset-0 rounded-full bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 scale-125",
                                      AVATAR_RINGS[colorIdx]
                                    )}
                                  />
                                </div>

                                {/* Comment body */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-xs font-medium">
                                      {comment.authorName}
                                    </span>
                                      <span className="text-[11px] text-muted-foreground/70 tabular-nums">
                                        {relativeTime(comment.createdAt)}
                                      </span>
                                      {isOwn && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                          Pending
                                        </span>
                                      )}
                                  </div>
                                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                                    {renderCommentContent(comment.content)}
                                  </p>

                                  {/* Reply button */}
                                  <button
                                    className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                    onClick={() => {
                                      const textarea = document.querySelector(
                                        ".note-comment-textarea"
                                      ) as HTMLTextAreaElement | null;
                                      if (textarea) {
                                        textarea.focus();
                                        textarea.scrollIntoView({ behavior: "smooth", block: "center" });
                                      }
                                    }}
                                  >
                                    <Reply className="size-2.5" />
                                    Reply
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            )}
          </div>

          {/* Bottom action bar with enhanced hover states */}
          <div className="sticky bottom-0 border-t border-border/40 bg-background/90 backdrop-blur-sm px-6 sm:px-7 py-4 flex items-center gap-5 text-muted-foreground">
            <div className="inline-flex items-center gap-1 rounded-full px-1 py-1 bg-muted/20 transition-all duration-200 hover:bg-muted/40">
              <LikeButton
                targetId={note.id}
                targetType="note"
                initialCount={note.likeCount}
                isLiked={likes.has(likeKey)}
                onToggle={toggleLike}
                className="px-2 py-1 rounded-full"
              />
            </div>
            <div className="inline-flex items-center gap-1 rounded-full px-1 py-1 bg-muted/20 transition-all duration-200 hover:bg-muted/40">
              <SaveButton
                targetId={note.id}
                targetType="note"
                initialCount={note.saveCount}
                isSaved={saves.has(saveKey)}
                onToggle={toggleSave}
                className="px-2 py-1 rounded-full"
              />
            </div>
            {/* Comment button */}
            {note.commentsEnabled !== false && siteSettings?.globalCommentsEnabled !== false && (
            <button
              onClick={scrollToComments}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MessageSquare className="size-4" />
              {!commentsLoading && visibleComments.length > 0 && (
                <span className="text-xs tabular-nums">{visibleComments.length}</span>
              )}
            </button>
            )}
            {/* Admin actions */}
            {isAdmin && (
              <>
                <TooltipUI>
                  <TooltipTriggerUI asChild>
                    <button
                      onClick={adminEditNote}
                      className="inline-flex items-center justify-center size-8 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Edit in Admin"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </TooltipTriggerUI>
                  <TooltipContentUI side="top" sideOffset={4}>Edit in Admin</TooltipContentUI>
                </TooltipUI>
                <TooltipUI>
                  <TooltipTriggerUI asChild>
                    <button
                      onClick={adminDeleteNote}
                      className="inline-flex items-center justify-center size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Delete note"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </TooltipTriggerUI>
                  <TooltipContentUI side="top" sideOffset={4}>Delete Note</TooltipContentUI>
                </TooltipUI>
              </>
            )}
            {/* Share button */}
            <button
              onClick={nativeShare}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Share2 className="size-4" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Image lightbox for gallery */}
      <ImageLightbox
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </>
  );
}
