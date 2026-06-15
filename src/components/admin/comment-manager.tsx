"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { adminFetch } from "@/lib/admin-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  MessageSquare,
  Check,
  XCircle,
  Trash2,
  FileText,
  StickyNote,
  Clock,
  AlertCircle,
  Loader2,
  ShieldOff,
  ShieldCheck,
  Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AdminComment {
  id: string;
  authorName: string;
  content: string;
  fingerprint: string;
  isApproved: boolean;
  createdAt: string;
  blogTitle?: string;
  blogSlug?: string;
  noteContent?: string;
}

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
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function CommentManager() {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"blog" | "note">("blog");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingCount, setPendingCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const hasMounted = useRef(false);

  // Global comments state
  const [globalCommentsEnabled, setGlobalCommentsEnabled] = useState(true);
  const [globalToggleLoading, setGlobalToggleLoading] = useState(false);

  // Load global comments setting
  useEffect(() => {
    adminFetch("/api/admin/settings")
      .then((res) => res?.json())
      .then((data) => {
        if (data && typeof data.globalCommentsEnabled === "boolean") {
          setGlobalCommentsEnabled(data.globalCommentsEnabled);
        }
      })
      .catch(() => {});
  }, []);

  const toggleGlobalComments = async () => {
    setGlobalToggleLoading(true);
    try {
      const newValue = !globalCommentsEnabled;
      const res = await adminFetch("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ globalCommentsEnabled: newValue }),
      });
      if (res?.ok) {
        setGlobalCommentsEnabled(newValue);
        toast.success(newValue ? "Comments enabled globally" : "Comments disabled globally");
      } else {
        toast.error("Failed to update global comment setting");
      }
    } catch {
      toast.error("Failed to update global comment setting");
    } finally {
      setGlobalToggleLoading(false);
    }
  };

  const fetchComments = useCallback(async (type?: string, status?: string) => {
    const t = type ?? activeTab;
    const s = status ?? statusFilter;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type: t, status: s, limit: "50" });
      const res = await adminFetch(`/api/admin/comments?${params}`);
      if (res?.ok) {
        const data = await res.json();
        setComments(data.comments || []);
        setTotal(data.total || 0);
        setPendingCount(data.pendingCount || 0);
      } else {
        setError("Failed to load comments");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter]);

  // Only fetch on mount, not on every dependency change
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      fetchComments();
    }
  }, [fetchComments]);

  // Fetch when tab or filter changes (after initial mount)
  const handleTabChange = (tab: "blog" | "note") => {
    setActiveTab(tab);
    setStatusFilter("all");
    // Fetch with new values directly
    const params = new URLSearchParams({ type: tab, status: "all", limit: "50" });
    setLoading(true);
    setError(null);
    adminFetch(`/api/admin/comments?${params}`)
      .then((res) => {
        if (res?.ok) return res.json();
        throw new Error("Failed");
      })
      .then((data) => {
        setComments(data.comments || []);
        setTotal(data.total || 0);
        setPendingCount(data.pendingCount || 0);
      })
      .catch(() => setError("Failed to load comments"))
      .finally(() => setLoading(false));
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    const params = new URLSearchParams({ type: activeTab, status, limit: "50" });
    setLoading(true);
    setError(null);
    adminFetch(`/api/admin/comments?${params}`)
      .then((res) => {
        if (res?.ok) return res.json();
        throw new Error("Failed");
      })
      .then((data) => {
        setComments(data.comments || []);
        setTotal(data.total || 0);
        setPendingCount(data.pendingCount || 0);
      })
      .catch(() => setError("Failed to load comments"))
      .finally(() => setLoading(false));
  };

  const approveComment = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await adminFetch("/api/admin/comments", {
        method: "PATCH",
        body: JSON.stringify({ commentId: id, type: activeTab, action: "approve" }),
      });
      if (res?.ok) {
        toast.success("Comment approved");
        handleStatusFilter(statusFilter);
      } else {
        toast.error("Failed to approve");
      }
    } catch {
      toast.error("Failed to approve");
    } finally {
      setActionLoading(null);
    }
  };

  const unapproveComment = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await adminFetch("/api/admin/comments", {
        method: "PATCH",
        body: JSON.stringify({ commentId: id, type: activeTab, action: "unapprove" }),
      });
      if (res?.ok) {
        toast.success("Comment unapproved");
        handleStatusFilter(statusFilter);
      } else {
        toast.error("Failed to unapprove");
      }
    } catch {
      toast.error("Failed to unapprove");
    } finally {
      setActionLoading(null);
    }
  };

  const deleteComment = async (id: string) => {
    if (!confirm("Delete this comment permanently?")) return;
    setActionLoading(id);
    try {
      const res = await adminFetch(`/api/admin/comments?id=${id}&type=${activeTab}`, {
        method: "DELETE",
      });
      if (res?.ok) {
        toast.success("Comment deleted");
        handleStatusFilter(statusFilter);
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Failed to delete");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="size-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
            <MessageSquare className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Comments</h1>
            <p className="text-sm text-muted-foreground">
              Moderate and manage {activeTab} comments
            </p>
          </div>
        </div>
      </div>

      {/* Global Comments Control */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "rounded-xl border p-4 sm:p-5 transition-all duration-300",
          globalCommentsEnabled
            ? "border-border/50 bg-card"
            : "border-red-500/30 bg-red-500/[0.03]"
        )}
      >
        <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
          <div className="flex items-start gap-3">
            <div className={cn(
              "size-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-300",
              globalCommentsEnabled
                ? "bg-emerald-500/10"
                : "bg-red-500/10"
            )}>
              {globalCommentsEnabled ? (
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ShieldOff className="size-4 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="global-comments-toggle" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                  <Globe className="size-3.5 text-muted-foreground" />
                  Global Comments
                </Label>
                {globalCommentsEnabled ? (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/5">
                    Disabled
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {globalCommentsEnabled
                  ? "Comments are allowed site-wide. Individual posts can still disable comments."
                  : "All comments are hidden across the entire site, overriding per-post settings."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {globalToggleLoading && (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            )}
            <Switch
              id="global-comments-toggle"
              checked={globalCommentsEnabled}
              onCheckedChange={toggleGlobalComments}
              disabled={globalToggleLoading}
            />
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <p className="text-2xl font-bold tabular-nums">{total}</p>
          <p className="text-xs text-muted-foreground mt-1">Total comments</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{pendingCount}</p>
            {pendingCount > 0 && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Pending approval</p>
        </div>
        <div className="hidden sm:block rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{Math.max(0, total - pendingCount)}</p>
          <p className="text-xs text-muted-foreground mt-1">Approved</p>
        </div>
      </div>

      {/* Tab buttons + Status filter */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Blog/Note toggle - simple buttons, no Tabs component */}
        <div className="flex items-center bg-muted/30 rounded-lg p-0.5">
          <button
            onClick={() => handleTabChange("blog")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1.5",
              activeTab === "blog"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="size-3" />
            Blog Comments
          </button>
          <button
            onClick={() => handleTabChange("note")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1.5",
              activeTab === "note"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <StickyNote className="size-3" />
            Note Comments
          </button>
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg p-0.5">
          {["all", "pending", "approved"].map((s) => (
            <button
              key={s}
              onClick={() => handleStatusFilter(s)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 capitalize",
                statusFilter === s
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Comment list */}
      {error ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-16 text-center"
        >
          <div className="size-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="size-6 text-destructive/60" />
          </div>
          <p className="text-sm font-medium text-muted-foreground/70 mb-1">
            {error}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchComments()}
            className="mt-3 rounded-lg"
          >
            Try again
          </Button>
        </motion.div>
      ) : loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border/50 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-16 text-center"
        >
          <div className="size-14 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-4">
            {statusFilter === "pending" ? (
              <Check className="size-6 text-muted-foreground/40" />
            ) : (
              <MessageSquare className="size-6 text-muted-foreground/40" />
            )}
          </div>
          <p className="text-sm font-medium text-muted-foreground/70 mb-1">
            {statusFilter === "pending" ? "All caught up!" : "No comments yet"}
          </p>
          <p className="text-xs text-muted-foreground/50">
            {statusFilter === "pending" ? "No comments pending approval." : `No ${activeTab} comments found.`}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {comments.map((comment, idx) => {
              const colorIdx = getAvatarColor(comment.authorName);
              return (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ delay: idx * 0.03, duration: 0.2 }}
                  className={cn(
                    "rounded-xl border p-4 group transition-all duration-200",
                    !comment.isApproved
                      ? "border-amber-500/20 bg-amber-500/[0.02] hover:border-amber-500/30"
                      : "border-border/50 hover:border-border"
                  )}
                >
                  <div className="flex gap-3">
                    {/* Avatar */}
                    <div className={cn(
                      "size-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                      AVATAR_BGS[colorIdx]
                    )}>
                      {comment.authorName.charAt(0).toUpperCase()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-medium">{comment.authorName}</span>
                        <span className="text-[11px] text-muted-foreground tabular-nums flex items-center gap-1">
                          <Clock className="size-2.5" />
                          {relativeTime(comment.createdAt)}
                        </span>
                        {!comment.isApproved ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5">
                            <AlertCircle className="size-2.5 mr-0.5" />
                            Pending
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                            <Check className="size-2.5 mr-0.5" />
                            Approved
                          </Badge>
                        )}
                      </div>

                      {/* Post context */}
                      {(comment.blogTitle || comment.noteContent) && (
                        <p className="text-[11px] text-muted-foreground/60 mb-1.5 truncate">
                          on <span className="font-medium text-muted-foreground/80">
                            {activeTab === "blog" ? comment.blogTitle : (comment.noteContent?.slice(0, 60) || "a note") + "..."}
                          </span>
                        </p>
                      )}

                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {!comment.isApproved ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                            onClick={() => approveComment(comment.id)}
                            disabled={actionLoading === comment.id}
                          >
                            {actionLoading === comment.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Check className="size-3" />
                            )}
                            Approve
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                            onClick={() => unapproveComment(comment.id)}
                            disabled={actionLoading === comment.id}
                          >
                            <XCircle className="size-3" />
                            Unapprove
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1 text-destructive hover:bg-destructive/10"
                          onClick={() => deleteComment(comment.id)}
                          disabled={actionLoading === comment.id}
                        >
                          <Trash2 className="size-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
