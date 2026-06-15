"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Inbox,
  Mail,
  MailOpen,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Filter,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/admin-utils";
import { formatDate } from "@/lib/timeAgo";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface ContactManagerProps {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

export function ContactManager({ unreadCount, setUnreadCount }: ContactManagerProps) {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const fetchSubmissions = useCallback(
    async (p: number = 1, f: string = "all", append: boolean = false) => {
      try {
        const res = await fetch(
          `/api/admin/contact?page=${p}&limit=20&filter=${f}`,
          { headers: getAuthHeaders() }
        );
        if (res.ok) {
          const data = await res.json();
          if (append) {
            setSubmissions((prev) => [...prev, ...data.submissions]);
          } else {
            setSubmissions(data.submissions);
          }
          setHasMore(data.hasMore);
          setUnreadCount(data.unreadCount);
        }
      } catch {
        toast.error("Failed to load submissions");
      } finally {
        setLoading(false);
      }
    },
    [setUnreadCount]
  );

  useEffect(() => {
    fetchSubmissions(1, filter);
  }, [filter, fetchSubmissions]);

  const handleMarkAsRead = async (id: string, markRead: boolean) => {
    try {
      const res = await fetch("/api/admin/contact", {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ id, isRead: markRead }),
      });
      if (res.ok) {
        setSubmissions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, isRead: markRead } : s))
        );
        if (markRead) {
          setUnreadCount(Math.max(0, unreadCount - 1));
        } else {
          setUnreadCount(unreadCount + 1);
        }
        toast.success(markRead ? "Marked as read" : "Marked as unread");
      }
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this submission?")) return;
    try {
      const res = await fetch(`/api/admin/contact?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const deleted = submissions.find((s) => s.id === id);
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
        if (deleted && !deleted.isRead) {
          setUnreadCount(Math.max(0, unreadCount - 1));
        }
        if (expandedId === id) setExpandedId(null);
        toast.success("Submission deleted");
      }
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchSubmissions(nextPage, filter, true);
  };

  const filters = [
    { id: "all" as const, label: "All" },
    { id: "unread" as const, label: "Unread" },
    { id: "read" as const, label: "Read" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-muted/80 flex items-center justify-center">
            <Inbox className="size-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Inbox</h2>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} unread message${unreadCount > 1 ? "s" : ""}`
                : "No unread messages"}
            </p>
          </div>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2">
        <Filter className="size-3.5 text-muted-foreground" />
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setFilter(f.id);
              setPage(1);
              setLoading(true);
            }}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border",
              filter === f.id
                ? "bg-foreground text-background border-foreground"
                : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Submissions list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="relative mb-4">
            <div className="size-16 rounded-2xl bg-muted/60 rotate-6 absolute -top-1 -left-1" />
            <div className="size-16 rounded-2xl bg-muted/80 relative flex items-center justify-center">
              <Mail className="size-7 text-muted-foreground/50" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1">No messages</p>
          <p className="text-xs text-muted-foreground/60">
            Contact submissions will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {submissions.map((sub, i) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
              >
                <Card
                  className={cn(
                    "border-border/40 overflow-hidden transition-all duration-200",
                    !sub.isRead && "border-l-2 border-l-primary/60 bg-card"
                  )}
                >
                  <CardContent className="p-0">
                    {/* Row header */}
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === sub.id ? null : sub.id)
                      }
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <div className="size-8 rounded-full bg-muted/80 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {sub.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-sm truncate",
                              !sub.isRead ? "font-semibold" : "font-medium"
                            )}
                          >
                            {sub.name}
                          </span>
                          {!sub.isRead && (
                            <span className="size-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {sub.subject}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] text-muted-foreground hidden sm:block">
                          {formatDate(sub.createdAt)}
                        </span>
                        {expandedId === sub.id ? (
                          <ChevronUp className="size-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="size-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {expandedId === sub.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-1 border-t border-border/30">
                            <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Mail className="size-3" />
                                {sub.email}
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-[10px] h-5 font-normal"
                              >
                                {sub.subject}
                              </Badge>
                            </div>
                            <div className="bg-muted/30 rounded-lg p-4 mb-3">
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                {sub.message}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1.5"
                                onClick={() => handleMarkAsRead(sub.id, !sub.isRead)}
                              >
                                {sub.isRead ? (
                                  <>
                                    <EyeOff className="size-3" />
                                    Mark unread
                                  </>
                                ) : (
                                  <>
                                    <Eye className="size-3" />
                                    Mark read
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(sub.id)}
                              >
                                <Trash2 className="size-3" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center py-4">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handleLoadMore}
              >
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
