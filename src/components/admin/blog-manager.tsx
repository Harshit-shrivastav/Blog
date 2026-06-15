"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  Download,
  Upload,
  Loader2,
  FileQuestion,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { adminFetch } from "@/lib/admin-utils";
import { useAdminStore } from "@/stores/admin-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Blog {
  id: string;
  title: string;
  slug: string;
  status: string;
  viewCount: number;
  likeCount: number;
  coverImage: string | null;
  tags: string[];
  createdAt: string;
  publishedAt: string | null;
  scheduledAt: string | null;
}

const filterOptions = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "scheduled", label: "Scheduled" },
  { value: "draft", label: "Draft" },
];

export function BlogManager() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importDialog, setImportDialog] = useState<{ open: boolean; count: number; data: unknown } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setCurrentSection } = useAdminStore();

  useEffect(() => {
    loadBlogs();
  }, [statusFilter]);

  async function loadBlogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await adminFetch(`/api/admin/blogs?${params}`);
      if (res && res.ok) {
        const data = await res.json();
        setBlogs(data.blogs);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await adminFetch(`/api/admin/blogs/${deleteId}`, {
        method: "DELETE",
      });
      if (res && res.ok) {
        toast.success("Blog deleted");
        setBlogs((prev) => prev.filter((b) => b.id !== deleteId));
      }
    } catch {
      toast.error("Failed to delete blog");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  async function handleDuplicate(blog: Blog) {
    try {
      const res = await adminFetch("/api/admin/blogs", {
        method: "POST",
        body: JSON.stringify({
          title: `${blog.title} (Copy)`,
          content: blog.slug ? "" : "",
          status: "draft",
          tags: blog.tags,
        }),
      });
      if (res && res.ok) {
        toast.success("Blog duplicated");
        loadBlogs();
      }
    } catch {
      toast.error("Failed to duplicate blog");
    }
  }

  const filteredBlogs = blogs.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleExport() {
    setExporting(true);
    try {
      const res = await adminFetch("/api/admin/blogs/export");
      if (res && res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const contentDisposition = res.headers.get("content-disposition");
        const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
        a.download = filenameMatch ? filenameMatch[1] : `blog-blogs-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Blogs exported successfully");
      } else {
        toast.error("Failed to export blogs");
      }
    } catch {
      toast.error("Failed to export blogs");
    } finally {
      setExporting(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const blogList = data.blogs || data;
        if (!Array.isArray(blogList) || blogList.length === 0) {
          toast.error("No blogs found in the file");
          return;
        }
        setImportDialog({ open: true, count: blogList.length, data: blogList });
      } catch {
        toast.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be selected again
    e.target.value = "";
  }

  async function handleImport() {
    if (!importDialog) return;
    setImporting(true);
    try {
      const res = await adminFetch("/api/admin/blogs/import", {
        method: "POST",
        body: JSON.stringify({ blogs: importDialog.data }),
      });
      if (res && res.ok) {
        const result = await res.json();
        toast.success(`Imported ${result.imported} blog post${result.imported !== 1 ? "s" : ""}`);
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach((err: string) => {
            toast.warning(err);
          });
        }
        loadBlogs();
      } else {
        toast.error("Failed to import blogs");
      }
    } catch {
      toast.error("Failed to import blogs");
    } finally {
      setImporting(false);
      setImportDialog(null);
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Blog Posts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create, edit, and manage all your blog posts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
            className="rounded-lg hover:bg-accent/80 active:scale-[0.97] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-1.5" />
            )}
            {exporting ? "Exporting..." : "Export"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg hover:bg-accent/80 active:scale-[0.97] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Upload className="w-4 h-4 mr-1.5" />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            onClick={() => setCurrentSection("blog-editor")}
            className="rounded-lg shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Blog
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary group-focus-within:scale-110 transition-all duration-200" />
          <Input
            placeholder="Search by title or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-muted/40 border-transparent focus:border-border focus:bg-background focus:ring-1 focus:ring-ring/30 focus:shadow-sm transition-all duration-200"
          />
        </div>
        <div className="flex gap-1.5 bg-muted/50 p-1 rounded-full">
          {filterOptions.map((s) => (
            <Button
              key={s.value}
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-full h-7 px-3.5 text-xs font-medium transition-all duration-200",
                statusFilter === s.value
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setStatusFilter(s.value)}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Blog list */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredBlogs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="py-20 text-center"
            >
              <div className="relative mx-auto w-16 h-16 mb-4">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-muted/60 to-muted/20 blur-sm animate-subtle-pulse" />
                <div className="relative w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center">
                  <FileQuestion className="w-7 h-7 text-muted-foreground" />
                </div>
              </div>
              <p className="text-muted-foreground text-sm font-medium mb-1">No blogs found</p>
              <p className="text-muted-foreground/60 text-xs mb-4">
                {search ? "Try adjusting your search query" : "Get started by writing your first post"}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg hover:bg-accent/80 active:scale-[0.97] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setCurrentSection("blog-editor")}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Create your first blog
              </Button>
            </motion.div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-[240px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</TableHead>
                    <TableHead className="w-28 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                    <TableHead className="w-32 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</TableHead>
                    <TableHead className="w-20 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Views</TableHead>
                    <TableHead className="w-20 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Likes</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBlogs.map((blog, idx) => (
                    <TableRow
                      key={blog.id}
                      className={cn(
                        "group cursor-pointer transition-all duration-200",
                        idx % 2 === 0 ? "bg-transparent" : "bg-muted/20",
                        "hover:bg-muted/60 hover:-translate-x-0.5 hover:shadow-sm"
                      )}
                      onClick={() => useAdminStore.getState().setCurrentSection("blog-editor", blog.id)}
                    >
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-3">
                          {blog.coverImage ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0 ring-1 ring-border">
                              <img
                                src={blog.coverImage}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted/60 shrink-0 flex items-center justify-center ring-1 ring-border">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate max-w-[300px]">
                              {blog.title || "Untitled"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[300px] mt-0.5">
                              {blog.tags.length > 0
                                ? blog.tags.slice(0, 3).join(", ")
                                : blog.slug}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        {blog.status === "published" ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2.5 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] animate-subtle-pulse" />
                            Published
                          </span>
                        ) : blog.status === "scheduled" ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-full px-2.5 py-0.5">
                            <Clock className="w-3 h-3" />
                            Scheduled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 rounded-full px-2.5 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                            Draft
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5 text-xs text-muted-foreground tabular-nums">
                        {blog.status === "scheduled" && blog.scheduledAt
                          ? <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><Clock className="w-3 h-3" />{formatDate(blog.scheduledAt)}</span>
                          : blog.status === "published" && blog.publishedAt
                            ? formatDate(blog.publishedAt)
                            : formatDate(blog.createdAt)
                        }
                      </TableCell>
                      <TableCell className="py-3.5 text-right">
                        <span className="text-sm text-muted-foreground tabular-nums inline-flex items-center gap-1">
                          <Eye className="w-3 h-3 text-muted-foreground/60" />
                          {blog.viewCount}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5 text-right">
                        <span className="text-sm text-muted-foreground tabular-nums inline-flex items-center gap-1">
                          <span className="w-2.5 h-2.5 text-rose-400 flex items-center justify-center">
                            <svg viewBox="0 0 16 16" className="w-full h-full fill-current" style={{ fontSize: "10px" }}>♥</svg>
                          </span>
                          {blog.likeCount}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-200 hover:bg-accent"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {blog.status === "published" && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`/?blog=${blog.slug}`, "_blank");
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                useAdminStore.getState().setCurrentSection("blog-editor", blog.id);
                              }}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(blog); }}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => { e.stopPropagation(); setDeleteId(blog.id); }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blog Post</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the blog post
              and all associated interactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Confirmation */}
      <AlertDialog open={importDialog !== null} onOpenChange={() => setImportDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Blog Posts</AlertDialogTitle>
            <AlertDialogDescription>
              This will import {importDialog?.count || 0} blog post{(importDialog?.count || 0) !== 1 ? "s" : ""} as drafts. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importing} className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleImport}
              disabled={importing}
              className="rounded-lg"
            >
              {importing ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Importing...
                </span>
              ) : (
                `Import ${importDialog?.count || 0} post${(importDialog?.count || 0) !== 1 ? "s" : ""}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
