"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save,
  Upload,
  X,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
  CloudOff,
  Clock,
  Search,
  Send,
  Settings,
  Layers,
  ImagePlus,
  Sparkles,
  Code2,
  Eye,
  PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { adminFetch, compressImage, slugify } from "@/lib/admin-utils";
import { useAdminStore } from "@/stores/admin-store";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ===== Types ===== */
interface SeriesOption {
  id: string;
  name: string;
  slug: string;
}

interface BlogData {
  id?: string;
  title: string;
  slug: string;
  content: string;
  coverImage: string | null;
  excerpt: string;
  tags: string[];
  seriesId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
  status: string;
  scheduledAt: string | null;
  commentsEnabled: boolean;
}

const emptyBlog: BlogData = {
  title: "",
  slug: "",
  content: "",
  coverImage: null,
  excerpt: "",
  tags: [],
  seriesId: null,
  seoTitle: null,
  seoDescription: null,
  ogImage: null,
  status: "draft",
  scheduledAt: null,
  commentsEnabled: true,
};

type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

function formatDatetimeLocal(date: string | Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/* ===================================================================
   BlogEditor — 2-step flow: Configure → Write
   =================================================================== */
export function BlogEditor() {
  /* ---- State ---- */
  const [blog, setBlog] = useState<BlogData>(emptyBlog);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [availableSeries, setAvailableSeries] = useState<SeriesOption[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [allExistingTags, setAllExistingTags] = useState<string[]>([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const [isDirty, setIsDirty] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<"config" | "write">("config");
  const [htmlMode, setHtmlMode] = useState(false);
  const [htmlContent, setHtmlContent] = useState("");

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef<string>("");
  const isEditingExisting = useRef(false);
  const { setCurrentSection, editingBlogId, setEditingBlogId } = useAdminStore();

  /* ---- Load series ---- */
  useEffect(() => {
    setSeriesLoading(true);
    adminFetch("/api/admin/series")
      .then((res) => res?.json())
      .then((data) => {
        if (data && Array.isArray(data.series)) {
          setAvailableSeries(
            data.series.map((s: { id: string; name: string; slug: string }) => ({
              id: s.id,
              name: s.name,
              slug: s.slug,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setSeriesLoading(false));
  }, []);

  /* ---- Load existing tags ---- */
  useEffect(() => {
    adminFetch("/api/admin/blogs?limit=100")
      .then((res) => res?.json())
      .then((data) => {
        if (data?.blogs) {
          const tagSet = new Set<string>();
          data.blogs.forEach((b: { tags?: string[] }) => {
            b.tags?.forEach((t: string) => tagSet.add(t));
          });
          setAllExistingTags(Array.from(tagSet).sort());
        }
      })
      .catch(() => {});
  }, []);

  /* ---- Load existing blog ---- */
  useEffect(() => {
    if (editingBlogId) {
      isEditingExisting.current = true;
      setLoading(true);
      adminFetch(`/api/admin/blogs/${editingBlogId}`)
        .then((res) => res?.json())
        .then((data) => {
          if (data && data.id) {
            const loaded: BlogData = {
              id: data.id,
              title: data.title || "",
              slug: data.slug || "",
              content: data.content || "",
              coverImage: data.coverImage || null,
              excerpt: data.excerpt || "",
              tags: data.tags || [],
              seriesId: data.seriesId || null,
              seoTitle: data.seoTitle || null,
              seoDescription: data.seoDescription || null,
              ogImage: data.ogImage || null,
              status: data.status || "draft",
              scheduledAt: data.scheduledAt || null,
              commentsEnabled: data.commentsEnabled !== false,
            };
            setBlog(loaded);
            setHtmlContent(data.content || "");
            lastSavedContentRef.current = JSON.stringify(loaded);
            setIsDirty(false);

            // If editing existing with content, go straight to write step
            if (data.content && data.content !== "<p></p>") {
              setStep("write");
            }
          }
        })
        .catch(() => toast.error("Failed to load blog"))
        .finally(() => setLoading(false));
    } else {
      isEditingExisting.current = false;
      setBlog(emptyBlog);
      setHtmlContent("");
      lastSavedContentRef.current = JSON.stringify(emptyBlog);
      setIsDirty(false);
      setStep("config");
    }
  }, [editingBlogId]);

  /* ---- Auto-save ---- */
  useEffect(() => {
    if (!blog.id || !isDirty) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => performAutoSave(), 3000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    blog.title,
    blog.content,
    blog.excerpt,
    blog.tags,
    blog.coverImage,
    blog.seriesId,
    blog.commentsEnabled,
    blog.seoTitle,
    blog.seoDescription,
    blog.ogImage,
    blog.status,
    blog.scheduledAt,
    isDirty,
  ]);

  /* ---- Track dirty + localStorage backup ---- */
  useEffect(() => {
    if (loading) return;
    const current = JSON.stringify(blog);
    setIsDirty(current !== lastSavedContentRef.current);
    if (blog.id) {
      try {
        localStorage.setItem(
          `blog-draft-${blog.id}`,
          JSON.stringify({ data: blog, timestamp: Date.now() })
        );
      } catch {}
    }
  }, [blog, loading]);

  /* ---- Warn before leaving with unsaved changes ---- */
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  /* ---- Helpers ---- */
  function updateBlog(partial: Partial<BlogData>) {
    setBlog((prev) => ({ ...prev, ...partial }));
  }

  function handleTitleChange(title: string) {
    updateBlog({ title, slug: slugify(title) });
  }

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!blog.tags.includes(tagInput.trim())) {
        updateBlog({ tags: [...blog.tags, tagInput.trim()] });
      }
      setTagInput("");
    }
  }

  function removeTag(tag: string) {
    updateBlog({ tags: blog.tags.filter((t) => t !== tag) });
  }

  function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    compressImage(file).then((base64) => {
      updateBlog({ coverImage: base64 });
      toast.success("Cover image uploaded");
    });
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please drop an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    compressImage(file).then((base64) => {
      updateBlog({ coverImage: base64 });
      toast.success("Cover image uploaded");
    });
  }, []);

  const filteredTagSuggestions = allExistingTags.filter(
    (t) =>
      t.toLowerCase().includes(tagInput.toLowerCase()) && !blog.tags.includes(t)
  );

  /* ---- Sync HTML mode ---- */
  function handleHtmlModeToggle(toHtml: boolean) {
    if (toHtml) {
      setHtmlContent(blog.content);
      setHtmlMode(true);
    } else {
      updateBlog({ content: htmlContent });
      setHtmlMode(false);
    }
  }

  /* ---- API Calls ---- */
  async function performAutoSave() {
    if (!blog.id || !isDirty) return;
    setAutoSaveStatus("saving");
    try {
      const res = await adminFetch(`/api/admin/blogs/${blog.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: blog.title,
          slug: blog.slug,
          content: htmlMode ? htmlContent : blog.content,
          coverImage: blog.coverImage,
          excerpt: blog.excerpt,
          tags: blog.tags,
          seriesId: blog.seriesId,
          seoTitle: blog.seoTitle,
          seoDescription: blog.seoDescription,
          ogImage: blog.ogImage,
          status: "draft",
          commentsEnabled: blog.commentsEnabled,
        }),
      });
      if (res && res.ok) {
        const data = await res.json();
        setBlog((prev) => ({ ...prev, id: data.id || prev.id }));
        lastSavedContentRef.current = JSON.stringify(blog);
        setIsDirty(false);
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 2000);
      } else {
        setAutoSaveStatus("error");
        setTimeout(() => setAutoSaveStatus("idle"), 3000);
      }
    } catch {
      setAutoSaveStatus("error");
      setTimeout(() => setAutoSaveStatus("idle"), 3000);
    }
  }

  async function saveDraft() {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    // If in HTML mode, sync content
    const content = htmlMode ? htmlContent : blog.content;
    setSaving(true);
    try {
      if (blog.id) {
        const res = await adminFetch(`/api/admin/blogs/${blog.id}`, {
          method: "PUT",
          body: JSON.stringify({ ...blog, content, status: "draft" }),
        });
        if (res && res.ok) {
          toast.success("Draft saved");
          lastSavedContentRef.current = JSON.stringify({ ...blog, content });
          setIsDirty(false);
          setAutoSaveStatus("saved");
          setTimeout(() => setAutoSaveStatus("idle"), 2000);
        } else {
          const data = await res?.json();
          toast.error(data?.error || "Failed to save");
        }
      } else {
        const payload = { ...blog, content, status: "draft" };
        const res = await adminFetch("/api/admin/blogs", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (res && res.ok) {
          const data = await res.json();
          setBlog((prev) => ({ ...prev, id: data.id }));
          setEditingBlogId(data.id);
          lastSavedContentRef.current = JSON.stringify({ ...blog, content, id: data.id });
          setIsDirty(false);
          toast.success("Draft saved");
        } else {
          const data = await res?.json();
          toast.error(data?.error || "Failed to save");
        }
      }
    } catch {
      toast.error("Failed to save draft");
    } finally {
      setSaving(false);
    }
  }

  async function schedulePost() {
    if (!blog.id || !blog.scheduledAt) {
      toast.error("Please select a date and time to schedule");
      return;
    }
    if (isDirty && blog.id) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      setSaving(true);
      try {
        await adminFetch(`/api/admin/blogs/${blog.id}`, {
          method: "PUT",
          body: JSON.stringify({ ...blog, status: "draft" }),
        });
      } catch { /* continue */ }
      setSaving(false);
    }
    setScheduling(true);
    try {
      let blogId = blog.id;
      if (!blogId) {
        const res = await adminFetch("/api/admin/blogs", {
          method: "POST",
          body: JSON.stringify({ ...blog, status: "draft" }),
        });
        if (res && res.ok) {
          const data = await res.json();
          blogId = data.id;
          setBlog((prev) => ({ ...prev, id: blogId }));
          setEditingBlogId(blogId);
        } else {
          const data = await res?.json();
          toast.error(data?.error || "Failed to save blog");
          setScheduling(false);
          return;
        }
      }
      const res = await adminFetch("/api/admin/blogs/schedule", {
        method: "POST",
        body: JSON.stringify({ id: blogId, scheduledAt: blog.scheduledAt }),
      });
      if (res && res.ok) {
        const updated = { ...blog, id: blogId, status: "scheduled" };
        setBlog(updated);
        lastSavedContentRef.current = JSON.stringify(updated);
        setIsDirty(false);
        toast.success("Post scheduled successfully!");
      } else {
        const data = await res?.json();
        toast.error(data?.error || "Failed to schedule post");
      }
    } catch {
      toast.error("Failed to schedule post");
    } finally {
      setScheduling(false);
    }
  }

  async function publish() {
    const content = htmlMode ? htmlContent : blog.content;
    setPublishing(true);
    try {
      if (blog.id) {
        const res = await adminFetch(`/api/admin/blogs/${blog.id}`, {
          method: "PUT",
          body: JSON.stringify({ ...blog, content, status: "published", scheduledAt: null }),
        });
        if (res && res.ok) {
          lastSavedContentRef.current = JSON.stringify({ ...blog, content });
          setIsDirty(false);
          toast.success("Blog published!");
          setEditingBlogId(null);
          setCurrentSection("blogs");
        } else {
          const data = await res?.json();
          toast.error(data?.error || "Failed to publish");
        }
      } else {
        const res = await adminFetch("/api/admin/blogs", {
          method: "POST",
          body: JSON.stringify({ ...blog, content, status: "published" }),
        });
        if (res && res.ok) {
          toast.success("Blog published!");
          setEditingBlogId(null);
          setCurrentSection("blogs");
        } else {
          const data = await res?.json();
          toast.error(data?.error || "Failed to publish");
        }
      }
    } catch {
      toast.error("Failed to publish");
    } finally {
      setPublishing(false);
    }
  }

  function handleBack() {
    if (step === "write") {
      // Sync HTML mode before going back
      if (htmlMode) {
        updateBlog({ content: htmlContent });
      }
      setStep("config");
      return;
    }
    if (isDirty && blog.id) performAutoSave();
    setEditingBlogId(null);
    setCurrentSection("blogs");
  }

  function handleGoToWrite() {
    if (!blog.title.trim()) {
      toast.error("Please add a title first");
      return;
    }
    // Save draft first to get an ID
    if (!blog.id) {
      const content = htmlMode ? htmlContent : blog.content;
      adminFetch("/api/admin/blogs", {
        method: "POST",
        body: JSON.stringify({ ...blog, content, status: "draft" }),
      })
        .then((res) => res?.json())
        .then((data) => {
          if (data.id) {
            setBlog((prev) => ({ ...prev, id: data.id }));
            setEditingBlogId(data.id);
            lastSavedContentRef.current = JSON.stringify({ ...blog, id: data.id });
            setIsDirty(false);
            setStep("write");
          }
        })
        .catch(() => {
          toast.error("Failed to save draft. Please try again.");
        });
    } else {
      setStep("write");
    }
  }

  /* ---- Auto-save indicator ---- */
  function AutoSaveIndicator() {
    if (!blog.id) return null;
    return (
      <div className="flex items-center gap-1.5">
        <AnimatePresence mode="wait">
          {autoSaveStatus === "saving" && (
            <motion.div
              key="saving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1 text-xs text-muted-foreground"
            >
              <Loader2 className="size-3 animate-spin" />
              <span className="hidden sm:inline">Saving...</span>
            </motion.div>
          )}
          {autoSaveStatus === "saved" && (
            <motion.div
              key="saved"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"
            >
              <Check className="size-3" />
              <span className="hidden sm:inline">Saved</span>
            </motion.div>
          )}
          {autoSaveStatus === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1 text-xs text-destructive"
            >
              <CloudOff className="size-3" />
              <span className="hidden sm:inline">Save failed</span>
            </motion.div>
          )}
          {autoSaveStatus === "idle" && isDirty && (
            <motion.div
              key="dirty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
            >
              <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="hidden sm:inline">Unsaved</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  /* ======== Loading skeleton ======== */
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b shrink-0">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            <Skeleton className="h-56 w-full rounded-xl" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  /* ======== Step indicator ======== */
  function StepIndicator() {
    return (
      <div className="flex items-center gap-1 sm:gap-3">
        <button
          onClick={() => {
            if (step === "write" && htmlMode) {
              updateBlog({ content: htmlContent });
            }
            setStep("config");
          }}
          className={cn(
            "flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
            step === "config"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Configure</span>
          <span className="sm:hidden">Config</span>
        </button>
        <div className={cn(
          "w-4 sm:w-6 h-px",
          step === "write" ? "bg-primary" : "bg-border"
        )} />
        <button
          onClick={() => {
            if (!blog.title.trim()) {
              toast.error("Please add a title first");
              return;
            }
            if (!blog.id) {
              handleGoToWrite();
            } else {
              setStep("write");
            }
          }}
          className={cn(
            "flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
            step === "write"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          <PenLine className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Write</span>
          <span className="sm:hidden">Write</span>
        </button>
      </div>
    );
  }

  /* ================================================================
     STEP 1: CONFIGURE PAGE
     ================================================================ */
  if (step === "config") {
    return (
      <div className="flex flex-col h-full">
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b bg-background shrink-0">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              onClick={handleBack}
            >
              <ArrowLeft className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <StepIndicator />
          </div>
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <AutoSaveIndicator />
          </div>
        </div>

        {/* Config form */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
            {/* Page title */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
                {blog.id ? "Edit Post" : "Create New Post"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                {blog.id
                  ? "Update your post settings and metadata"
                  : "Configure your post details before writing"}
              </p>
            </div>

            {/* ---- Cover Image ---- */}
            <section className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1.5">
                <ImagePlus className="w-3.5 h-3.5" />
                Featured Image
              </Label>
              {!blog.coverImage ? (
                <div
                  className={cn(
                    "relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 group",
                    isDragging
                      ? "border-primary bg-primary/5 scale-[1.01]"
                      : "border-border hover:border-primary/50 hover:bg-primary/[0.02]"
                  )}
                  onClick={() => document.getElementById("cover-upload")?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center mb-3 group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300">
                    <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {isDragging ? "Drop image here" : "Upload cover image"}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    or drag and drop — max 5MB
                  </p>
                  <input
                    id="cover-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverUpload}
                  />
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden group border">
                  <img
                    src={blog.coverImage}
                    alt="Cover"
                    className="w-full h-44 sm:h-64 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-lg shadow-lg min-h-[44px]"
                      onClick={() => document.getElementById("cover-upload-replace")?.click()}
                    >
                      <Upload className="w-4 h-4 mr-1.5" />
                      Replace
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded-lg shadow-lg min-h-[44px]"
                      onClick={() => updateBlog({ coverImage: null })}
                    >
                      <X className="w-4 h-4 mr-1.5" />
                      Remove
                    </Button>
                  </div>
                  <input
                    id="cover-upload-replace"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverUpload}
                  />
                </div>
              )}
            </section>

            {/* ---- Title ---- */}
            <section className="space-y-2">
              <Label htmlFor="blog-title" className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="blog-title"
                type="text"
                placeholder="Your post title..."
                value={blog.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="h-11 text-base sm:text-lg font-medium rounded-lg"
              />
            </section>

            {/* ---- Slug ---- */}
            <section className="space-y-2">
              <Label htmlFor="blog-slug" className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                URL Slug
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">/</span>
                <Input
                  id="blog-slug"
                  type="text"
                  placeholder="post-slug"
                  value={blog.slug}
                  onChange={(e) => updateBlog({ slug: e.target.value })}
                  className="h-10 pl-7 text-sm font-mono rounded-lg"
                />
              </div>
            </section>

            {/* ---- Excerpt ---- */}
            <section className="space-y-2">
              <Label htmlFor="blog-excerpt" className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Excerpt
              </Label>
              <Textarea
                id="blog-excerpt"
                placeholder="A brief summary of your post..."
                value={blog.excerpt}
                onChange={(e) => updateBlog({ excerpt: e.target.value })}
                className="text-sm resize-none rounded-lg"
                rows={3}
              />
            </section>

            {/* ---- Tags ---- */}
            <section className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Tags
              </Label>
              <div className="flex flex-wrap items-center gap-2 p-3 border rounded-lg bg-background min-h-[48px]">
                {blog.tags.map((tag) => (
                  <motion.div
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Badge
                      variant="secondary"
                      className="gap-1 rounded-full px-2.5 py-0.5 text-xs hover:bg-destructive/10 group/tag"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-destructive transition-colors min-w-[24px] min-h-[24px] flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  </motion.div>
                ))}
                <div className="relative flex-1 min-w-[120px]">
                  <input
                    type="text"
                    placeholder="Add tag (press Enter)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={addTag}
                    className="text-sm bg-transparent border-none outline-none w-full placeholder:text-muted-foreground/40 min-h-[32px]"
                  />
                  <AnimatePresence>
                    {tagInput.trim() && filteredTagSuggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full left-0 mt-1 w-52 max-h-36 overflow-y-auto rounded-lg border bg-popover shadow-lg z-20 py-1"
                      >
                        {filteredTagSuggestions.slice(0, 6).map((s) => (
                          <button
                            key={s}
                            onClick={() => {
                              updateBlog({ tags: [...blog.tags, s] });
                              setTagInput("");
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                          >
                            {s}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </section>

            {/* ---- Series ---- */}
            {availableSeries.length > 0 && (
              <section className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Series
                </Label>
                <Select
                  value={blog.seriesId || "none"}
                  onValueChange={(v) =>
                    updateBlog({ seriesId: v === "none" ? null : v })
                  }
                >
                  <SelectTrigger className="h-10 text-sm rounded-lg">
                    <SelectValue placeholder="Assign to series..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">No series</span>
                    </SelectItem>
                    {availableSeries.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </section>
            )}

            {/* ---- Status & Schedule ---- */}
            <section className="space-y-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Status
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  value={blog.status}
                  onValueChange={(v) => updateBlog({ status: v })}
                >
                  <SelectTrigger className="h-10 text-sm rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                        Draft
                      </span>
                    </SelectItem>
                    <SelectItem value="scheduled">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Scheduled
                      </span>
                    </SelectItem>
                    <SelectItem value="published">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Published
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {blog.status === "scheduled" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2"
                  >
                    <Input
                      type="datetime-local"
                      value={blog.scheduledAt ? formatDatetimeLocal(blog.scheduledAt) : ""}
                      onChange={(e) => updateBlog({ scheduledAt: e.target.value || null })}
                      className="h-10 text-sm rounded-lg"
                      min={formatDatetimeLocal(new Date())}
                    />
                    <Button
                      size="sm"
                      onClick={schedulePost}
                      disabled={scheduling || !blog.scheduledAt}
                      className="w-full h-9 text-xs rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {scheduling ? (
                        <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Scheduling...</>
                      ) : (
                        <><Clock className="w-3.5 h-3.5 mr-1.5" />Schedule Post</>
                      )}
                    </Button>
                  </motion.div>
                )}
              </div>

              {/* Scheduled notice */}
              {blog.status === "scheduled" && blog.scheduledAt && (
                <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Will publish on{" "}
                    {new Date(blog.scheduledAt).toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              )}
            </section>

            {/* ---- Comments toggle ---- */}
            <section className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="text-sm font-medium">Enable Comments</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Allow readers to comment on this post
                </p>
              </div>
              <Switch
                checked={blog.commentsEnabled}
                onCheckedChange={(v) => updateBlog({ commentsEnabled: v })}
              />
            </section>

            {/* ---- SEO ---- */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Search className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  SEO
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Meta Title</Label>
                  <Input
                    placeholder="Override page title"
                    value={blog.seoTitle || ""}
                    onChange={(e) => updateBlog({ seoTitle: e.target.value || null })}
                    className="h-10 text-sm rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">OG Image URL</Label>
                  <Input
                    placeholder="Paste image URL..."
                    value={blog.ogImage || ""}
                    onChange={(e) => updateBlog({ ogImage: e.target.value || null })}
                    className="h-10 text-sm rounded-lg"
                  />
                </div>
              </div>
              {blog.ogImage && (
                <div className="relative rounded-lg overflow-hidden w-full max-w-xs">
                  <img src={blog.ogImage} alt="OG Preview" className="w-full h-20 object-cover rounded-lg border" />
                  <button
                    onClick={() => updateBlog({ ogImage: null })}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Meta Description</Label>
                <Textarea
                  placeholder="A brief description for search engines"
                  value={blog.seoDescription || ""}
                  onChange={(e) => updateBlog({ seoDescription: e.target.value || null })}
                  className="text-sm resize-none rounded-lg"
                  rows={3}
                />
              </div>
            </section>

            {/* ---- Write Blog CTA ---- */}
            <div className="pt-4 pb-8">
              <Button
                size="lg"
                onClick={handleGoToWrite}
                disabled={!blog.title.trim()}
                className="w-full h-12 sm:h-14 text-base font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 gap-2"
              >
                {blog.id && blog.content && blog.content !== "<p></p>" ? (
                  <>
                    <ArrowRight className="w-5 h-5" />
                    Continue Writing
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Start Writing
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================
     STEP 2: WRITE PAGE (Full-page Editor)
     ================================================================ */
  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 border-b bg-background shrink-0 gap-1 sm:gap-2">
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            onClick={handleBack}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Config</span>
          </Button>
          <div className="hidden sm:block">
            <StepIndicator />
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 ml-auto shrink-0">
          <AutoSaveIndicator />

          <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
            <button
              onClick={() => handleHtmlModeToggle(false)}
              className={cn(
                "flex items-center justify-center sm:gap-1 w-7 h-7 sm:w-auto sm:px-2.5 sm:py-1.5 rounded-md text-xs font-medium transition-all duration-200 touch-manipulation",
                !htmlMode
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Visual</span>
            </button>
            <button
              onClick={() => handleHtmlModeToggle(true)}
              className={cn(
                "flex items-center justify-center sm:gap-1 w-7 h-7 sm:w-auto sm:px-2.5 sm:py-1.5 rounded-md text-xs font-medium transition-all duration-200 touch-manipulation",
                htmlMode
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Code2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">HTML</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={saveDraft}
            disabled={saving || !blog.title}
            className="rounded-lg h-8 sm:h-9 w-8 sm:w-auto"
          >
            <Save className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">{saving ? "Saving..." : "Draft"}</span>
          </Button>

          <Button
            size="sm"
            onClick={publish}
            disabled={publishing || !blog.title}
            className="rounded-lg h-8 sm:h-9 w-8 sm:w-auto shadow-sm"
          >
            {publishing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Publish</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Title reminder in write mode */}
      <div className="px-4 sm:px-6 pt-4 pb-0 max-w-3xl mx-auto w-full">
        <h2 className="text-lg sm:text-xl font-semibold truncate text-foreground/80">
          {blog.title || "Untitled Post"}
        </h2>
      </div>

      {/* Editor area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {htmlMode ? (
          /* HTML/CSS Source Editor */
          <div className="h-full flex flex-col">
            <div className="px-4 sm:px-6 pt-3 pb-2 max-w-3xl mx-auto w-full">
              <p className="text-xs text-muted-foreground">
                Write raw HTML and CSS. Your code will be rendered as-is on the blog. You can use inline styles or standard HTML tags.
              </p>
            </div>
            <div className="flex-1 min-h-0 px-4 sm:px-6 pb-6 max-w-3xl mx-auto w-full">
              <textarea
                value={htmlContent}
                onChange={(e) => {
                  setHtmlContent(e.target.value);
                  updateBlog({ content: e.target.value });
                }}
                placeholder={`<h2>My Section</h2>\n<p>Write your content here with <strong>HTML</strong> and <em>CSS</em>...</p>\n\n<div style="padding: 1rem; background: #f0f0f0; border-radius: 8px;">\n  <p>Custom styled block</p>\n</div>`}
                className="w-full h-full min-h-[400px] bg-muted/30 border border-border rounded-xl p-4 sm:p-6 font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-ring/50 placeholder:text-muted-foreground/40"
                spellCheck={false}
              />
            </div>
          </div>
        ) : (
          /* Tiptap Visual Editor */
          <TiptapEditor
            content={blog.content}
            onUpdate={(html: string) => updateBlog({ content: html })}
            placeholder="Write your story..."
            editable={true}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
}