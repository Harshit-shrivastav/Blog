"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  ImageIcon,
  Volume2,
  Eye,
  EyeOff,
  Heart,
  Bookmark,
  StickyNote,
  FileQuestion,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

interface Note {
  id: string;
  content: string;
  images: string[];
  audioFiles: string[];
  isPublic: boolean;
  likeCount: number;
  saveCount: number;
  createdAt: string;
}

export function NoteManager() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { setCurrentSection } = useAdminStore();

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/notes?limit=50");
      if (res && res.ok) {
        const data = await res.json();
        setNotes(data.notes);
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
      const res = await adminFetch(`/api/admin/notes/${deleteId}`, {
        method: "DELETE",
      });
      if (res && res.ok) {
        toast.success("Note deleted");
        setNotes((prev) => prev.filter((n) => n.id !== deleteId));
      }
    } catch {
      toast.error("Failed to delete note");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  const filteredNotes = notes.filter((n) =>
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function truncateContent(content: string, len: number = 120) {
    const stripped = content.replace(/[#*_`\[\]]/g, "").replace(/\n/g, " ").trim();
    return stripped.length > len ? stripped.slice(0, len) + "..." : stripped;
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Share quick thoughts, images, and audio clips
          </p>
        </div>
        <Button
          onClick={() => setCurrentSection("note-editor")}
          className="rounded-lg shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Note
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary group-focus-within:scale-110 transition-all duration-200" />
        <Input
          placeholder="Search notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 bg-muted/40 border-transparent focus:border-border focus:bg-background focus:ring-1 focus:ring-ring/30 focus:shadow-sm transition-all duration-200"
        />
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
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
          <p className="text-muted-foreground text-sm font-medium mb-1">No notes found</p>
          <p className="text-muted-foreground/60 text-xs mb-4">
            {search ? "Try adjusting your search query" : "Share a quick thought with your audience"}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg hover:bg-accent/80 active:scale-[0.97] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setCurrentSection("note-editor")}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create your first note
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note, idx) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <Card className={cn(
                "group relative hover:shadow-lg hover:-translate-y-1 dark:hover:shadow-black/[0.2] transition-all duration-300 border-l-[3px]",
                note.isPublic ? "border-l-primary/60" : "border-l-muted-foreground/20"
              )}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {note.isPublic ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] animate-subtle-pulse" />
                          Public
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                          Hidden
                        </span>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-accent"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        {note.isPublic && (
                          <DropdownMenuItem onClick={() => window.open(`/?note=${note.id}`, "_blank")}>
                            <Eye className="w-4 h-4 mr-2" />
                            View on Site
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setCurrentSection("note-editor", undefined, note.id); }}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(note.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3 min-h-[3.75rem] leading-relaxed group-hover:text-foreground/80 transition-colors duration-300">
                    {truncateContent(note.content)}
                  </p>

                  {/* Attachments */}
                  {(note.images.length > 0 || note.audioFiles.length > 0) && (
                    <div className="flex items-center gap-3 mb-3">
                      {note.images.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 hover:bg-muted/80 rounded-full px-2 py-0.5 transition-colors duration-200">
                          <ImageIcon className="w-3 h-3" />
                          {note.images.length}
                        </span>
                      )}
                      {note.audioFiles.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 hover:bg-muted/80 rounded-full px-2 py-0.5 transition-colors duration-200">
                          <Volume2 className="w-3 h-3" />
                          {note.audioFiles.length}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <span className="text-[11px] text-muted-foreground/60 tabular-nums">
                      {formatDate(note.createdAt)}
                    </span>
                    <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-rose-400/70" />
                        <span className="tabular-nums">{note.likeCount}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Bookmark className="w-3 h-3 text-amber-400/70" />
                        <span className="tabular-nums">{note.saveCount}</span>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the note
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
    </div>
  );
}
