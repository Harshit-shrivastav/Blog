"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  Heart,
  Bookmark,
  Users,
  FileText,
  StickyNote,
  Plus,
  TrendingUp,
  Activity,
  TrendingDown,
  Sparkles,
  PenSquare,
  MessageSquare,
  ExternalLink,
  Mail,
  BarChart3,
  Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { adminFetch } from "@/lib/admin-utils";
import { useAdminStore } from "@/stores/admin-store";
import { formatNumber } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface Stats {
  totalViews: number;
  totalLikes: number;
  totalSaves: number;
  totalSubscribers: number;
  totalPublishedBlogs: number;
  totalNotes: number;
  recentActivity: Array<{
    id: string;
    action: string;
    details: Record<string, unknown>;
    createdAt: string;
  }>;
}

const statCards = [
  { key: "totalViews" as const, label: "Total Views", icon: Eye, color: "text-blue-500", bgColor: "bg-blue-500/10", borderColor: "border-l-blue-500", trend: 12, trendUp: true },
  { key: "totalLikes" as const, label: "Total Likes", icon: Heart, color: "text-rose-500", bgColor: "bg-rose-500/10", borderColor: "border-l-rose-500", trend: 8, trendUp: true },
  { key: "totalSaves" as const, label: "Total Saves", icon: Bookmark, color: "text-amber-500", bgColor: "bg-amber-500/10", borderColor: "border-l-amber-500", trend: -3, trendUp: false },
  { key: "totalSubscribers" as const, label: "Subscribers", icon: Users, color: "text-emerald-500", bgColor: "bg-emerald-500/10", borderColor: "border-l-emerald-500", trend: 24, trendUp: true },
  { key: "totalPublishedBlogs" as const, label: "Published Blogs", icon: FileText, color: "text-violet-500", bgColor: "bg-violet-500/10", borderColor: "border-l-violet-500", trend: 0, trendUp: true },
  { key: "totalNotes" as const, label: "Total Notes", icon: StickyNote, color: "text-orange-500", bgColor: "bg-orange-500/10", borderColor: "border-l-orange-500", trend: 5, trendUp: true },
];

const activityColors: Record<string, string> = {
  blog_published: "bg-emerald-500",
  blog_created: "bg-blue-500",
  blog_updated: "bg-amber-500",
  blog_deleted: "bg-red-500",
  note_created: "bg-violet-500",
  note_deleted: "bg-red-500",
  default: "bg-muted-foreground",
};

const activityBgColors: Record<string, string> = {
  blog_published: "bg-emerald-500/10",
  blog_created: "bg-blue-500/10",
  blog_updated: "bg-amber-500/10",
  blog_deleted: "bg-red-500/10",
  note_created: "bg-violet-500/10",
  note_deleted: "bg-red-500/10",
  default: "bg-muted-foreground/10",
};

function formatActivityAction(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function useCountUp(target: number, duration: number = 800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let raf: number;
    const startTime = performance.now();
    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      setCount(current);
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return count;
}

function CountUpNumber({ value }: { value: number }) {
  const count = useCountUp(value);
  return <p className="text-3xl font-bold tracking-tighter tabular-nums letter-spacing-[-0.02em]">{formatNumber(count)}</p>;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const { admin, setCurrentSection } = useAdminStore();

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const res = await adminFetch("/api/admin/stats");
      if (res && res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-8">
      {/* Welcome Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wider">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back{admin?.displayName ? `, ${admin.displayName.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with your blog
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg hover:bg-accent/80 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 active:scale-[0.97] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => setCurrentSection("blog-editor")}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Blog
          </Button>
          <Button
            size="sm"
            className="rounded-lg shadow-sm hover:shadow-md hover:shadow-primary/10 active:scale-[0.97] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => setCurrentSection("note-editor")}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Note
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
            >
              <Card className={cn(
                "border-l-[3px] overflow-hidden hover:-translate-y-1 hover:shadow-lg hover:shadow-black/[0.06] dark:hover:shadow-black/[0.2] transition-all duration-300 group relative",
                card.borderColor
              )}>
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/[0.02] to-transparent pointer-events-none dark:from-transparent" aria-hidden="true" />
                <CardContent className="p-4 relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn("p-1.5 rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-sm", card.bgColor)}>
                      <Icon className={cn("w-3.5 h-3.5", card.color)} />
                    </div>
                    {card.trend !== 0 && (
                      <span className={cn(
                        "flex items-center gap-0.5 text-xs font-medium",
                        card.trendUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {card.trendUp ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {Math.abs(card.trend)}%
                      </span>
                    )}
                  </div>
                  {loading ? (
                    <Skeleton className="h-8 w-16 mb-1" />
                  ) : (
                    <CountUpNumber value={stats ? stats[card.key] : 0} />
                  )}
                  <p className="text-xs text-muted-foreground mt-1.5 tracking-wide uppercase">{card.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="p-1 rounded-md bg-primary/10">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { icon: PenSquare, label: "New Blog Post", section: "blog-editor" as const, variant: "default" as const },
                { icon: MessageSquare, label: "New Note", section: "note-editor" as const, variant: "default" as const },
                { icon: ExternalLink, label: "View Site", section: "view-site" as const, variant: "outline" as const },
                { icon: Mail, label: "Newsletter", section: "newsletter" as const, variant: "outline" as const },
                { icon: BarChart3, label: "Analytics", section: "analytics" as const, variant: "outline" as const },
                { icon: Settings, label: "Site Settings", section: "settings" as const, variant: "outline" as const },
              ].map((action, i) => (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.04 }}
                >
                  <Button
                    variant={action.variant}
                    className={cn(
                      "w-full justify-start gap-2.5 h-10 px-3 rounded-lg text-sm font-normal",
                      "hover:bg-accent/80 hover:border-primary/20 hover:shadow-sm",
                      "active:scale-[0.97] transition-all duration-200",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    )}
                    onClick={() => {
                      if (action.section === "view-site") {
                        window.open("/", "_blank");
                      } else {
                        setCurrentSection(action.section);
                      }
                    }}
                  >
                    <action.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{action.label}</span>
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1 rounded-md bg-primary/10">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : stats && stats.recentActivity.length > 0 ? (
            <div className="space-y-0.5 max-h-80 overflow-y-auto">
              {stats.recentActivity.map((log, idx) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="flex items-center gap-4 py-3 px-3 rounded-lg hover:bg-muted/60 transition-all duration-200 group"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-sm",
                    activityBgColors[log.action] || activityBgColors.default
                  )}>
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      activityColors[log.action] || activityColors.default,
                      log.action === "blog_published" && "animate-subtle-pulse"
                    )} />
                  </div>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Badge variant="secondary" className="text-xs shrink-0 font-normal">
                      {formatActivityAction(log.action)}
                    </Badge>
                    {log.details.title && (
                      <span className="text-sm truncate text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                        {String(log.details.title)}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap tabular-nums">
                    {timeAgo(log.createdAt)}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center mb-3">
                <Activity className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No activity yet. Start creating content!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
