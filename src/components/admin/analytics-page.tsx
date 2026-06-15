"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  Heart,
  TrendingUp,
  Clock,
  FileText,
  StickyNote,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { adminFetch } from "@/lib/admin-utils";
import { formatNumber } from "@/lib/auth";

// ─── Types ──────────────────────────────────────────────
interface Overview {
  totalViews: number;
  totalLikes: number;
  engagementRate: number;
  avgReadingTime: number;
  viewsChange: number;
  likesChange: number;
  engagementChange: number;
  readingTimeChange: number;
}

interface DailyDataPoint {
  date: string;
  views: number;
  likes: number;
}

interface TopBlog {
  id: string;
  title: string;
  slug: string;
  viewCount: number;
  likeCount: number;
  tags: string[];
  publishedAt: string;
}

interface CategoryCount {
  name: string;
  count: number;
}

interface NotePerformance {
  id: string;
  content: string;
  likeCount: number;
  createdAt: string;
}

interface RecentActivityItem {
  id: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

interface AnalyticsData {
  overview: Overview;
  viewsLikesTimeline: DailyDataPoint[];
  topByViews: TopBlog[];
  topByLikes: TopBlog[];
  contentDistribution: CategoryCount[];
  notesStats: {
    totalNotes: number;
    totalNoteLikes: number;
    avgLikesPerNote: number;
  };
  notePerformance: NotePerformance[];
  recentDailyStats: DailyDataPoint[];
  recentActivity: RecentActivityItem[];
}

// ─── Chart configs ─────────────────────────────────────
const areaChartConfig = {
  views: {
    label: "Views",
    color: "hsl(var(--foreground))",
  },
  likes: {
    label: "Likes",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const pieChartConfig = {
  count: {
    label: "Posts",
  },
} satisfies ChartConfig;

const barChartConfig = {
  likes: {
    label: "Likes",
    color: "hsl(var(--foreground))",
  },
} satisfies ChartConfig;

const PIE_COLORS = [
  "hsl(var(--foreground))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "oklch(0.55 0.15 180)",
  "oklch(0.6 0.12 30)",
];

// ─── Helpers ────────────────────────────────────────────
function ChangeIndicator({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
      }`}
    >
      {isPositive ? (
        <ArrowUpRight className="w-3 h-3" />
      ) : (
        <ArrowDownRight className="w-3 h-3" />
      )}
      {Math.abs(value)}%
    </span>
  );
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getActivityIcon(action: string) {
  const a = action.toLowerCase();
  if (a.includes("publish") || a.includes("blog")) return FileText;
  if (a.includes("note")) return StickyNote;
  if (a.includes("like") || a.includes("heart")) return Heart;
  if (a.includes("view") || a.includes("visit")) return Eye;
  return Activity;
}

function formatActivityAction(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Skeleton components ────────────────────────────────
function OverviewCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-7 w-20 mb-1" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[280px] w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────
export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const res = await adminFetch("/api/admin/analytics");
      if (res && res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }

  const overviewCards = [
    {
      label: "Total Views",
      value: data?.overview.totalViews ?? 0,
      change: data?.overview.viewsChange ?? 0,
      icon: Eye,
      format: true,
    },
    {
      label: "Total Likes",
      value: data?.overview.totalLikes ?? 0,
      change: data?.overview.likesChange ?? 0,
      icon: Heart,
      format: true,
    },
    {
      label: "Engagement Rate",
      value: `${data?.overview.engagementRate ?? 0}%`,
      change: data?.overview.engagementChange ?? 0,
      icon: TrendingUp,
      format: false,
    },
    {
      label: "Avg. Reading Time",
      value: `${data?.overview.avgReadingTime ?? 0} min`,
      change: data?.overview.readingTimeChange ?? 0,
      icon: Clock,
      format: false,
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Detailed insights into your content performance
        </p>
      </motion.div>

      {/* Overview Cards */}
      {loading ? (
        <OverviewCardsSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {overviewCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-1.5 rounded-md bg-primary/5">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <ChangeIndicator value={card.change} />
                    </div>
                    <p className="text-2xl font-bold tracking-tight tabular-nums">
                      {card.format
                        ? formatNumber(card.value as number)
                        : card.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {card.label}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Views & Likes Chart + Content Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {loading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            {/* Area Chart: Views & Likes over 30 days */}
            <motion.div
              className="lg:col-span-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Views & Likes</CardTitle>
                  <CardDescription>
                    Daily trends over the last 30 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data && data.viewsLikesTimeline.length > 0 ? (
                    <ChartContainer
                      config={areaChartConfig}
                      className="h-[280px] w-full"
                    >
                      <AreaChart
                        data={data.viewsLikesTimeline}
                        margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="fillViews"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="hsl(var(--foreground))"
                              stopOpacity={0.15}
                            />
                            <stop
                              offset="95%"
                              stopColor="hsl(var(--foreground))"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="fillLikes"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="hsl(var(--chart-1))"
                              stopOpacity={0.15}
                            />
                            <stop
                              offset="95%"
                              stopColor="hsl(var(--chart-1))"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="hsl(var(--muted))"
                          strokeOpacity={0.5}
                        />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(val: string) => {
                            const d = new Date(val);
                            return d.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            });
                          }}
                          className="text-xs"
                        />
                        <YAxis
                          yAxisId="views"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(val: number) => formatNumber(val)}
                          className="text-xs"
                        />
                        <YAxis
                          yAxisId="likes"
                          orientation="right"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(val: number) => formatNumber(val)}
                          className="text-xs"
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              labelFormatter={(value) => {
                                return formatDate(value as string);
                              }}
                            />
                          }
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Area
                          yAxisId="views"
                          type="monotone"
                          dataKey="views"
                          stroke="hsl(var(--foreground))"
                          strokeWidth={2}
                          fill="url(#fillViews)"
                          dot={false}
                          activeDot={{
                            r: 4,
                            strokeWidth: 2,
                            fill: "hsl(var(--background))",
                          }}
                        />
                        <Area
                          yAxisId="likes"
                          type="monotone"
                          dataKey="likes"
                          stroke="hsl(var(--chart-1))"
                          strokeWidth={2}
                          fill="url(#fillLikes)"
                          dot={false}
                          activeDot={{
                            r: 4,
                            strokeWidth: 2,
                            fill: "hsl(var(--background))",
                          }}
                        />
                      </AreaChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                      No data available yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Pie Chart: Content Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="h-full overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Content Distribution
                  </CardTitle>
                  <CardDescription>Blog posts by category</CardDescription>
                </CardHeader>
                <CardContent>
                  {data && data.contentDistribution.length > 0 ? (
                    <ChartContainer
                      config={pieChartConfig}
                      className="mx-auto h-[260px] w-full"
                    >
                      <PieChart>
                        <ChartTooltip
                          content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                          data={data.contentDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="count"
                          nameKey="name"
                          stroke="none"
                        >
                          {data.contentDistribution.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <ChartLegend
                          content={<ChartLegendContent nameKey="name" />}
                        />
                      </PieChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
                      No categories yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </div>

      {/* Top Blog Posts Table + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <>
            <TableSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            {/* Top Blog Posts */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Top Blog Posts
                  </CardTitle>
                  <CardDescription>Ranked by total views</CardDescription>
                </CardHeader>
                <CardContent>
                  {data && data.topByViews.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8">#</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead className="text-right">
                            Views
                          </TableHead>
                          <TableHead className="text-right">
                            Likes
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.topByViews.map((blog, i) => (
                          <TableRow key={blog.id}>
                            <TableCell className="text-muted-foreground font-medium">
                              {i + 1}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium truncate max-w-[200px]">
                                  {blog.title}
                                </span>
                                {blog.tags.length > 0 && (
                                  <div className="flex gap-1 flex-wrap">
                                    {blog.tags.slice(0, 3).map((tag) => (
                                      <Badge
                                        key={tag}
                                        variant="secondary"
                                        className="text-[10px] px-1.5 py-0"
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatNumber(blog.viewCount)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatNumber(blog.likeCount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No published blogs yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Activity Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Latest actions on your blog</CardDescription>
                </CardHeader>
                <CardContent>
                  {data && data.recentActivity.length > 0 ? (
                    <div className="space-y-1 max-h-[320px] overflow-y-auto">
                      {data.recentActivity.map((log) => {
                        const Icon = getActivityIcon(log.action);
                        return (
                          <div
                            key={log.id}
                            className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className="text-xs shrink-0"
                                >
                                  {formatActivityAction(log.action)}
                                </Badge>
                                {log.details.title && (
                                  <span className="text-sm truncate">
                                    {String(log.details.title)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                              {timeAgo(log.createdAt)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No activity yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </div>

      {/* Notes Performance */}
      {loading ? (
        <ChartSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <StickyNote className="w-4 h-4" />
                    Notes Performance
                  </CardTitle>
                  <CardDescription>
                    {data
                      ? `${data.notesStats.totalNotes} notes with ${data.notesStats.totalNoteLikes} total likes (avg. ${data.notesStats.avgLikesPerNote}/note)`
                      : "Notes engagement overview"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {data && data.notePerformance.length > 0 ? (
                <ChartContainer
                  config={barChartConfig}
                  className="h-[240px] w-full"
                >
                  <BarChart
                    data={data.notePerformance}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="hsl(var(--muted))"
                      strokeOpacity={0.5}
                    />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      type="category"
                      dataKey="content"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      width={180}
                      tickFormatter={(val: string) =>
                        val.length > 28 ? val.slice(0, 28) + "..." : val
                      }
                      className="text-xs"
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Bar
                      dataKey="likes"
                      fill="hsl(var(--foreground))"
                      radius={[0, 4, 4, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                  <StickyNote className="w-8 h-8 mr-2 opacity-40" />
                  No notes published yet
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
