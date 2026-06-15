"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogIn,
  FileText,
  Pencil,
  Trash2,
  StickyNote,
  Settings,
  Mail,
  Users,
  Clock,
  ChevronDown,
  Loader2,
  ScrollText,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { adminFetch } from "@/lib/admin-utils";
import { timeAgo } from "@/lib/timeAgo";
import { cn } from "@/lib/utils";

interface ActivityLog {
  id: string;
  action: string;
  details: string;
  createdAt: string;
}

const ACTION_FILTERS = [
  { value: "", label: "All Actions" },
  { value: "login", label: "Login" },
  { value: "blog_created", label: "Blog Publish" },
  { value: "blog_updated", label: "Blog Edit" },
  { value: "blog_deleted", label: "Blog Delete" },
  { value: "note_updated", label: "Note Edit" },
  { value: "settings_updated", label: "Settings Update" },
  { value: "newsletter", label: "Newsletter" },
];

const ACTION_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  login: { icon: LogIn, color: "text-blue-500 bg-blue-500/10 border-blue-500/20", label: "Logged in" },
  blog_created: { icon: FileText, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", label: "Published blog" },
  blog_updated: { icon: Pencil, color: "text-amber-500 bg-amber-500/10 border-amber-500/20", label: "Edited blog" },
  blog_deleted: { icon: Trash2, color: "text-red-500 bg-red-500/10 border-red-500/20", label: "Deleted blog" },
  note_updated: { icon: StickyNote, color: "text-violet-500 bg-violet-500/10 border-violet-500/20", label: "Edited note" },
  settings_updated: { icon: Settings, color: "text-slate-500 bg-slate-500/10 border-slate-500/20", label: "Updated settings" },
  newsletter: { icon: Mail, color: "text-pink-500 bg-pink-500/10 border-pink-500/20", label: "Newsletter activity" },
  subscribe: { icon: Users, color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20", label: "New subscriber" },
};

const PAGE_SIZE = 20;

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  if (date >= sevenDaysAgo) return "Last 7 days";
  return "Older";
}

function parseActionDescription(action: string, details: string): string {
  try {
    const parsed = JSON.parse(details);
    const config = ACTION_CONFIG[action];
    const defaultLabel = config?.label || action.replace(/_/g, " ");

    if (action === "blog_created" && parsed.title) {
      return `Published "${parsed.title}"`;
    }
    if (action === "blog_updated" && parsed.title) {
      return `Edited "${parsed.title}"`;
    }
    if (action === "blog_deleted" && parsed.title) {
      return `Deleted "${parsed.title}"`;
    }
    if (action === "login") {
      return `Logged in`;
    }
    if (action === "settings_updated") {
      return `Updated site settings`;
    }
    if (action === "note_updated" && parsed.noteId) {
      return `Edited a note`;
    }
    if (action.includes("newsletter")) {
      return `Newsletter: ${parsed.subject || parsed.action || "activity"}`;
    }
    if (action === "subscribe") {
      return `New subscriber: ${parsed.email || "unknown"}`;
    }
    return defaultLabel;
  } catch {
    return action.replace(/_/g, " ");
  }
}

export function ActivityLog() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterAction, setFilterAction] = useState("");
  const [showFilter, setShowFilter] = useState(false);

  const fetchLogs = useCallback(async (offset = 0, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));
      if (filterAction) params.set("action", filterAction);

      const res = await adminFetch(`/api/admin/activity?${params}`);
      if (res && res.ok) {
        const data = await res.json();
        if (append) {
          setLogs((prev) => [...prev, ...data.logs]);
        } else {
          setLogs(data.logs);
        }
        setTotal(data.total);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filterAction]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (action: string) => {
    setFilterAction(action);
    setShowFilter(false);
  };

  const handleLoadMore = () => {
    fetchLogs(logs.length, true);
  };

  // Group logs by date
  const groupedLogs: { group: string; items: ActivityLog[] }[] = [];
  let currentGroup = "";
  for (const log of logs) {
    const group = getDateGroup(log.createdAt);
    if (group !== currentGroup) {
      currentGroup = group;
      groupedLogs.push({ group, items: [] });
    }
    groupedLogs[groupedLogs.length - 1].items.push(log);
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activity Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? (
              "Loading..."
            ) : (
              <>
                {total} {total === 1 ? "entry" : "entries"} recorded
              </>
            )}
          </p>
        </div>

        {/* Filter dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilter(!showFilter)}
            className="rounded-lg gap-2"
          >
            <Filter className="size-3.5" />
            {ACTION_FILTERS.find((f) => f.value === filterAction)?.label || "All Actions"}
            <ChevronDown className={cn("size-3.5 transition-transform", showFilter && "rotate-180")} />
          </Button>
          <AnimatePresence>
            {showFilter && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg"
              >
                {ACTION_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => handleFilterChange(f.value)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                      filterAction === f.value
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/80 mx-auto flex items-center justify-center mb-4">
              <ScrollText className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm font-medium mb-1">No activity yet</p>
            <p className="text-muted-foreground/60 text-xs">
              Activity will appear here as you use the admin panel
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {groupedLogs.map((group) => (
                <div key={group.group}>
                  {/* Group header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                      {group.group}
                    </span>
                    <div className="flex-1 h-px bg-border/40" />
                  </div>

                  {/* Group items */}
                  <div className="space-y-1">
                    {group.items.map((log, idx) => {
                      const config = ACTION_CONFIG[log.action] || {
                        icon: Clock,
                        color: "text-muted-foreground bg-muted/50 border-border/50",
                        label: log.action,
                      };
                      const Icon = config.icon;
                      const description = parseActionDescription(log.action, log.details);

                      return (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.03 }}
                          className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors duration-150 group"
                        >
                          {/* Timeline dot / icon */}
                          <div
                            className={cn(
                              "size-8 rounded-full flex items-center justify-center shrink-0 border transition-colors duration-200",
                              config.color
                            )}
                          >
                            <Icon className="size-3.5" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className="text-sm font-medium leading-snug truncate">
                              {description}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {timeAgo(log.createdAt)}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Load more */}
            {logs.length < total && (
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-lg"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="size-3.5 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Load more
                      <Badge variant="secondary" className="ml-2 text-[10px] h-4 px-1.5">
                        {total - logs.length}
                      </Badge>
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
