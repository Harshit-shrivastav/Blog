"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Image as ImageIcon,
  Volume2,
  Copy,
  X,
  Download,
  ZoomIn,
  Upload,
  ImageOff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MediaItem {
  id: string;
  type: "image" | "audio";
  data: string;
  source: string;
  sourceId: string;
}

const filterOptions = [
  { value: "all" as const, label: "All" },
  { value: "image" as const, label: "Images" },
  { value: "audio" as const, label: "Audio" },
];

export function MediaLibrary() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "audio">("all");
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    loadMedia();
  }, []);

  async function loadMedia() {
    setLoading(true);
    try {
      // Fetch all blogs and notes, then extract media
      const [blogsRes, notesRes] = await Promise.all([
        adminFetch("/api/admin/blogs?limit=50"),
        adminFetch("/api/admin/notes?limit=50"),
      ]);

      const mediaItems: MediaItem[] = [];

      if (blogsRes && blogsRes.ok) {
        const blogsData = await blogsRes.json();
        for (const blog of blogsData.blogs) {
          if (blog.coverImage) {
            mediaItems.push({
              id: `blog-cover-${blog.id}`,
              type: "image",
              data: blog.coverImage,
              source: blog.title || "Untitled",
              sourceId: blog.id,
            });
          }
        }
      }

      if (notesRes && notesRes.ok) {
        const notesData = await notesRes.json();
        for (const note of notesData.notes) {
          for (let i = 0; i < note.images.length; i++) {
            mediaItems.push({
              id: `note-img-${note.id}-${i}`,
              type: "image",
              data: note.images[i],
              source: note.content.slice(0, 50) || "Note",
              sourceId: note.id,
            });
          }
          for (let i = 0; i < note.audioFiles.length; i++) {
            mediaItems.push({
              id: `note-audio-${note.id}-${i}`,
              type: "audio",
              data: note.audioFiles[i],
              source: note.content.slice(0, 50) || "Note",
              sourceId: note.id,
            });
          }
        }
      }

      setItems(mediaItems);
    } catch {
      // silently
    } finally {
      setLoading(false);
    }
  }

  function copyReference(item: MediaItem) {
    if (item.type === "image") {
      navigator.clipboard.writeText(`![image](${item.data})`);
      toast.success("Image markdown copied");
    } else {
      toast.info("Audio reference copied");
    }
  }

  const filtered = items.filter((item) => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (search && !item.source.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const imageCount = items.filter((i) => i.type === "image").length;
  const audioCount = items.filter((i) => i.type === "audio").length;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Media Library</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All images and audio files from your content
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/60 rounded-full px-3 py-1">
          <ImageIcon className="w-3.5 h-3.5" />
          <span className="font-medium tabular-nums">{imageCount}</span> images
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/60 rounded-full px-3 py-1">
          <Volume2 className="w-3.5 h-3.5" />
          <span className="font-medium tabular-nums">{audioCount}</span> audio files
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
          <Input
            placeholder="Search by source..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-muted/40 border-transparent focus:border-border focus:bg-background focus:ring-1 focus:ring-ring/30 transition-all duration-200"
          />
        </div>
        <div className="flex gap-1.5 bg-muted/50 p-1 rounded-full">
          {filterOptions.map((t) => (
            <Button
              key={t.value}
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-full h-7 px-3.5 text-xs font-medium transition-all duration-200",
                typeFilter === t.value
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTypeFilter(t.value)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/80 mx-auto flex items-center justify-center mb-4">
            <ImageOff className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm font-medium mb-1">No media files match your filter</p>
          <p className="text-muted-foreground/60 text-xs">
            Try adjusting your search or filter criteria
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className="group cursor-pointer overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border-border/50"
              onClick={() => setPreviewItem(item)}
            >
              <CardContent className="p-0">
                {item.type === "image" ? (
                  <div className="aspect-square relative">
                    <img
                      src={item.data}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="absolute bottom-2 right-2 flex gap-1.5">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7 rounded-lg shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyReference(item);
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-6 h-6 rounded-md bg-black/40 backdrop-blur-sm flex items-center justify-center">
                        <ZoomIn className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square flex items-center justify-center bg-muted/60 group-hover:bg-muted/80 transition-colors duration-300">
                    <div className="text-center">
                      <Volume2 className="w-8 h-8 text-muted-foreground mx-auto mb-1" />
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Audio</span>
                    </div>
                  </div>
                )}
                <div className="p-2.5">
                  <p className="text-xs text-muted-foreground truncate">
                    {item.source}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="sm:max-w-2xl">
          {previewItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {previewItem.type === "image" ? (
                    <><ImageIcon className="w-4 h-4 text-primary" /> Image Preview</>
                  ) : (
                    <><Volume2 className="w-4 h-4 text-primary" /> Audio Preview</>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {previewItem.type === "image" ? (
                  <div className="rounded-xl overflow-hidden ring-1 ring-border">
                    <img
                      src={previewItem.data}
                      alt=""
                      className="w-full max-h-[60vh] object-contain bg-muted/20"
                    />
                  </div>
                ) : (
                  <div className="p-6 bg-muted/40 rounded-xl ring-1 ring-border">
                    <audio controls className="w-full" src={previewItem.data} />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Source: <span className="font-medium">{previewItem.source}</span>
                  </p>
                  <Button variant="outline" size="sm" onClick={() => copyReference(previewItem)} className="rounded-lg">
                    <Copy className="w-4 h-4 mr-1" />
                    Copy Reference
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
