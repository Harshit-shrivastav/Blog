"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  ImageOff,
  X,
  Loader2,
  ImageIcon,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { adminFetch, fileToBase64, slugify } from "@/lib/admin-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Series {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImage: string | null;
  postCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SeriesFormData {
  name: string;
  slug: string;
  description: string;
  coverImage: string | null;
}

const emptyForm: SeriesFormData = {
  name: "",
  slug: "",
  description: "",
  coverImage: null,
};

export function SeriesManager() {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SeriesFormData>(emptyForm);
  const [coverUploading, setCoverUploading] = useState(false);

  const fetchSeries = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/series");
      if (res && res.ok) {
        const data = await res.json();
        setSeries(data.series || []);
      }
    } catch {
      toast.error("Failed to load series");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      slug: slugify(name),
    }));
  }

  function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    setCoverUploading(true);
    fileToBase64(file).then((base64) => {
      setForm((prev) => ({ ...prev, coverImage: base64 }));
      setCoverUploading(false);
      toast.success("Cover image uploaded");
    });
  }

  async function handleCreate() {
    if (!form.name || !form.slug) {
      toast.error("Name and slug are required");
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/series", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (res && res.ok) {
        toast.success("Series created");
        setShowCreate(false);
        setForm(emptyForm);
        fetchSeries();
      } else {
        const data = await res?.json();
        toast.error(data?.error || "Failed to create series");
      }
    } catch {
      toast.error("Failed to create series");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!editingSeries || !form.name || !form.slug) return;
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/series/${editingSeries.id}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      if (res && res.ok) {
        toast.success("Series updated");
        setEditingSeries(null);
        setForm(emptyForm);
        fetchSeries();
      } else {
        const data = await res?.json();
        toast.error(data?.error || "Failed to update series");
      }
    } catch {
      toast.error("Failed to update series");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this series? Blog posts will not be deleted.")) return;
    try {
      const res = await adminFetch(`/api/admin/series/${id}`, {
        method: "DELETE",
      });
      if (res && res.ok) {
        toast.success("Series deleted");
        setSeries((prev) => prev.filter((s) => s.id !== id));
      } else {
        toast.error("Failed to delete series");
      }
    } catch {
      toast.error("Failed to delete series");
    }
  }

  function openEdit(s: Series) {
    setForm({
      name: s.name,
      slug: s.slug,
      description: s.description,
      coverImage: s.coverImage,
    });
    setEditingSeries(s);
  }

  const totalPosts = series.reduce((sum, s) => sum + s.postCount, 0);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3.5 w-48" />
            </div>
          </div>
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-muted/80 flex items-center justify-center">
            <Layers className="size-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Collections</h2>
            <p className="text-sm text-muted-foreground">
              {series.length} {series.length === 1 ? "collection" : "collections"} · {totalPosts} {totalPosts === 1 ? "post" : "posts"}
            </p>
          </div>
        </div>

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
              <Plus className="size-4 mr-1.5" />
              New Collection
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Collection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input
                  placeholder="e.g., Getting Started with TypeScript"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="h-9 text-sm rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Slug</Label>
                <Input
                  placeholder="getting-started-typescript"
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                  className="h-9 text-sm font-mono rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Textarea
                  placeholder="Brief description of this collection..."
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="text-sm rounded-lg resize-none"
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Cover Image</Label>
                {form.coverImage ? (
                  <div className="relative rounded-lg overflow-hidden group aspect-video bg-muted">
                    <img src={form.coverImage} alt="Cover" className="size-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="rounded-lg shadow-lg"
                        onClick={() => setForm((prev) => ({ ...prev, coverImage: null }))}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/[0.03] transition-all duration-300"
                    onClick={() => document.getElementById("create-cover-upload")?.click()}
                  >
                    <Upload className="size-4 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Click to upload cover image</p>
                    <input
                      id="create-cover-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverUpload}
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" className="rounded-lg" onClick={() => { setShowCreate(false); setForm(emptyForm); }}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="rounded-lg"
                  onClick={handleCreate}
                  disabled={saving || !form.name || !form.slug}
                >
                  {saving && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Series Grid */}
      {series.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="relative mb-4">
            <div className="size-16 rounded-2xl bg-muted/60 rotate-6 absolute -top-1 -left-1" />
            <div className="size-16 rounded-2xl bg-muted/80 relative flex items-center justify-center">
              <Layers className="size-7 text-muted-foreground/50" />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1">No collections yet</p>
          <p className="text-xs text-muted-foreground/60 mb-4">
            Group related blog posts into collections for easy browsing.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="size-3.5 mr-1.5" />
            Create your first collection
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {series.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12, scale: 0.95 }}
                transition={{ duration: 0.25, delay: i * 0.06 }}
              >
                <Card className="border-l-[3px] border-l-primary/40 border-border/40 overflow-hidden group hover:shadow-lg hover:shadow-black/[0.04] hover:-translate-y-0.5 transition-all duration-300">
                  {/* Cover image */}
                  <div className="relative aspect-[16/9] bg-muted overflow-hidden">
                    {s.coverImage ? (
                      <img
                        src={s.coverImage}
                        alt={s.name}
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center bg-gradient-to-br from-muted/60 to-muted/30">
                        <ImageOff className="size-6 text-muted-foreground/30" />
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="rounded-lg shadow-lg h-8 text-xs gap-1.5"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="size-3" />
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="rounded-lg shadow-lg h-8 text-xs gap-1.5 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(s.id)}
                      >
                        <Trash2 className="size-3" />
                        Delete
                      </Button>
                    </div>
                    {/* Post count badge */}
                    <div className="absolute bottom-2 right-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-sm text-[11px] font-medium text-foreground shadow-sm">
                        <ImageIcon className="size-3" />
                        {s.postCount} {s.postCount === 1 ? "post" : "posts"}
                      </span>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-1 line-clamp-1 group-hover:text-[var(--site-accent)] transition-colors duration-300">
                      {s.name}
                    </h3>
                    {s.description ? (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {s.description}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/50 italic mb-2">
                        No description
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground/50 font-mono">
                      /{s.slug}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingSeries} onOpenChange={(open) => { if (!open) { setEditingSeries(null); setForm(emptyForm); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                placeholder="Collection name"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="h-9 text-sm rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Slug</Label>
              <Input
                placeholder="collection-slug"
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                className="h-9 text-sm font-mono rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                placeholder="Brief description..."
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="text-sm rounded-lg resize-none"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cover Image</Label>
              {form.coverImage ? (
                <div className="relative rounded-lg overflow-hidden group aspect-video bg-muted">
                  <img src={form.coverImage} alt="Cover" className="size-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-lg shadow-lg"
                      onClick={() => setForm((prev) => ({ ...prev, coverImage: null }))}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/[0.03] transition-all duration-300"
                  onClick={() => document.getElementById("edit-cover-upload")?.click()}
                >
                  <Upload className="size-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">Click to upload cover image</p>
                  <input
                    id="edit-cover-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverUpload}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="rounded-lg" onClick={() => { setEditingSeries(null); setForm(emptyForm); }}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="rounded-lg"
                onClick={handleUpdate}
                disabled={saving || !form.name || !form.slug}
              >
                {saving && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
