"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Upload,
  X,
  Volume2,
  Maximize2,
  Minimize2,
  ImageIcon,
  Trash2,
  Music,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { adminFetch, compressImage } from "@/lib/admin-utils";
import { useAdminStore } from "@/stores/admin-store";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Strip HTML tags to get plain text for word/char count */
function stripHtml(html: string): string {
  if (typeof document === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

export function NoteEditor() {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [imageCaptions, setImageCaptions] = useState<Record<string, string>>({});
  const [audioFiles, setAudioFiles] = useState<string[]>([]);
  const [audioCaptions, setAudioCaptions] = useState<Record<string, string>>({});
  const [isPublic, setIsPublic] = useState(true);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setCurrentSection, editingNoteId, setEditingNoteId } = useAdminStore();

  // Escape key to exit fullscreen, Cmd+Shift+F to toggle
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isFullscreen) {
        e.preventDefault();
        setIsFullscreen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f") {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Load existing note if editing
  useEffect(() => {
    if (editingNoteId) {
      setLoading(true);
      adminFetch(`/api/admin/notes/${editingNoteId}`)
        .then((res) => res?.json())
        .then((data) => {
          if (data && data.id) {
            setContent(data.content || "");
            setImages(data.images || []);
            setAudioFiles(data.audioFiles || []);
            setImageCaptions(data.imageCaptions || {});
            setAudioCaptions(data.audioCaptions || {});
            setIsPublic(data.isPublic !== false);
            setCommentsEnabled(data.commentsEnabled !== false);
          }
        })
        .catch(() => {
          toast.error("Failed to load note");
        })
        .finally(() => setLoading(false));
    } else {
      setContent("");
      setImages([]);
      setAudioFiles([]);
      setImageCaptions({});
      setAudioCaptions({});
      setIsPublic(true);
      setCommentsEnabled(true);
    }
  }, [editingNoteId]);

  const handleContentUpdate = useCallback((html: string) => {
    setContent(html);
  }, []);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        continue;
      }
      const base64 = await compressImage(file);
      setImages((prev) => [...prev, base64]);
      toast.success("Image added (compressed)");
    }
    e.target.value = "";
  }

  async function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setAudioFiles((prev) => [...prev, base64]);
      };
      reader.onerror = () => toast.error(`Failed to read ${file.name}`);
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function removeAudio(index: number) {
    setAudioFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleBack() {
    setEditingNoteId(null);
    setCurrentSection("notes");
  }

  async function saveNote() {
    if (!stripHtml(content).trim()) {
      toast.error("Note content is required");
      return;
    }
    setSaving(true);
    try {
      if (editingNoteId) {
        // Update existing note
        const res = await adminFetch(`/api/admin/notes/${editingNoteId}`, {
          method: "PUT",
          body: JSON.stringify({
            content,
            images,
            audioFiles,
            audioCaptions,
            imageCaptions,
            isPublic,
            commentsEnabled,
          }),
        });
        if (res && res.ok) {
          toast.success("Note updated!");
          setEditingNoteId(null);
          setCurrentSection("notes");
        } else {
          const data = await res?.json();
          toast.error(data?.error || "Failed to update note");
        }
      } else {
        // Create new note
        const res = await adminFetch("/api/admin/notes", {
          method: "POST",
          body: JSON.stringify({
            content,
            images,
            audioFiles,
            audioCaptions,
            imageCaptions,
            isPublic,
            commentsEnabled,
          }),
        });
        if (res && res.ok) {
          toast.success("Note saved!");
          setCurrentSection("notes");
        } else {
          const data = await res?.json();
          toast.error(data?.error || "Failed to save note");
        }
      }
    } catch {
      toast.error("Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  // Zen mode portal container — stable across renders, must be before any early return (rules of hooks)
  const portalContainer = useMemo(() => {
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    el.id = "note-zen-portal-container";
    document.body.appendChild(el);
    return el;
  }, []);

  useEffect(() => {
    return () => {
      if (portalContainer && portalContainer.parentNode) {
        portalContainer.parentNode.removeChild(portalContainer);
      }
    };
  }, [portalContainer]);

  const plainText = stripHtml(content);
  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
  const charCount = plainText.length;

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  // Zen mode portal — renders at document.body to escape all CSS stacking contexts
  const zenMode = portalContainer && createPortal(
    <AnimatePresence>
      {isFullscreen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[9999] bg-background flex flex-col h-full"
        >
          {/* Zen top bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b bg-background/80 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground tabular-nums">
                {wordCount} words
                <span className="mx-2 text-muted-foreground/30">·</span>
                {charCount} chars
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground/60 hidden sm:inline">
                <kbd className="px-1.5 py-0.5 rounded border border-border/50 bg-muted/30 text-[10px] font-mono mr-1">Esc</kbd>
                exit
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(false)}
                className="h-8 rounded-lg text-xs gap-1.5"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                Exit Zen
              </Button>
            </div>
          </div>

          {/* Zen editor area */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <TiptapEditor
              content={content}
              onUpdate={handleContentUpdate}
              placeholder="Write your note..."
              className="flex-1 min-h-0"
            />
          </div>

          {/* Zen bottom toolbar */}
          <div className="flex items-center justify-end px-4 sm:px-6 py-2 border-t bg-background/80 backdrop-blur-sm shrink-0">
            <Button size="sm" onClick={saveNote} disabled={saving} className="rounded-lg min-h-[44px]">
              <Save className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">{saving ? "Saving..." : editingNoteId ? "Update Note" : "Save Note"}</span>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    portalContainer
  );

  return (
    <>
      {zenMode}
      <div className={cn("p-4 sm:p-6 max-w-5xl mx-auto overflow-y-auto", isFullscreen && "hidden")}>
        <div className="flex flex-col gap-6 flex-1 min-h-0">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-2 mb-0 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground transition-colors duration-200 shrink-0 min-h-[44px]"
              onClick={handleBack}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Back</span>
            </Button>

            <div className="flex items-center gap-1.5 flex-wrap ml-auto">
              <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1">
                <Label htmlFor="note-visibility" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                  Public
                </Label>
                <Switch
                  id="note-visibility"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                  className="scale-90"
                />
              </div>
              <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1">
                <Label htmlFor="note-comments" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                  Comments
                </Label>
                <Switch
                  id="note-comments"
                  checked={commentsEnabled}
                  onCheckedChange={setCommentsEnabled}
                  className="scale-90"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 min-w-[44px] min-h-[44px] text-muted-foreground hover:text-foreground"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={saveNote}
                disabled={saving}
                className="rounded-lg shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 sm:mr-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 sm:mr-1" />
                )}
                <span className="hidden sm:inline">{saving ? "Saving..." : editingNoteId ? "Update Note" : "Save Note"}</span>
              </Button>
            </div>
          </div>

          {/* Tiptap Editor */}
          <div className="flex-1 min-h-[300px] border rounded-lg overflow-hidden flex flex-col bg-card">
            <TiptapEditor
              content={content}
              onUpdate={handleContentUpdate}
              placeholder="Write your note..."
              className="flex-1 min-h-0"
            />
          </div>

          {/* Image Attachments */}
          <Card>
            <CardHeader className="pb-3 pt-5 px-4 sm:px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                Images
                {images.length > 0 && (
                  <Badge variant="secondary" className="text-xs rounded-full font-normal">{images.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-5 pb-5">
              {images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-2.5 mb-4">
                  {images.map((img, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden ring-1 ring-border hover:ring-primary/40 transition-all duration-200">
                      <img src={img} alt="" className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center">
                        <button
                          onClick={() => removeImage(i)}
                          className="w-7 h-7 rounded-full bg-red-500/90 text-white flex items-center justify-center hover:bg-red-600 transition-colors duration-200"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <Input
                        placeholder="Caption..."
                        value={imageCaptions[img] || ""}
                        onChange={(e) =>
                          setImageCaptions((prev) => ({ ...prev, [img]: e.target.value }))
                        }
                        className="absolute bottom-0 left-0 right-0 h-7 text-[10px] bg-black/60 text-white/90 border-none rounded-none placeholder:text-white/50 focus:ring-0"
                      />
                    </div>
                  ))}
                </div>
              )}
              <div
                className="w-full rounded-lg border-2 border-dashed border-border p-4 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-300 group"
                onClick={() => document.getElementById("note-image-upload")?.click()}
              >
                <ImageIcon className="w-4 h-4 mx-auto mb-1 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-200">Add Image</span>
              </div>
              <input
                id="note-image-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />
            </CardContent>
          </Card>

          {/* Audio Attachments */}
          <Card>
            <CardHeader className="pb-3 pt-5 px-4 sm:px-5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                Audio
                {audioFiles.length > 0 && (
                  <Badge variant="secondary" className="text-xs rounded-full font-normal">{audioFiles.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-5 pb-5">
              {audioFiles.length > 0 && (
                <div className="space-y-3 mb-4">
                  {audioFiles.map((audio, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border/50 hover:bg-muted/60 transition-colors duration-200">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center flex-shrink-0">
                        <Music className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <audio controls className="h-8 w-full" src={audio} />
                        <div className="flex items-center gap-[2px] mt-1 h-2">
                          {Array.from({ length: 20 }).map((_, j) => (
                            <div key={j} className="w-[2px] bg-primary/20 rounded-full" style={{ height: `${Math.max(4, Math.random() * 100)}%` }} />
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeAudio(i)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  {audioFiles.map((audio, i) => (
                    <Input
                      key={`cap-${i}`}
                      placeholder={`Audio ${i + 1} caption...`}
                      value={audioCaptions[audio] || ""}
                      onChange={(e) =>
                        setAudioCaptions((prev) => ({ ...prev, [audio]: e.target.value }))
                      }
                      className="h-8 text-xs bg-transparent border-dashed"
                    />
                  ))}
                </div>
              )}
              <div
                className="w-full rounded-lg border-2 border-dashed border-border p-4 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all duration-300 group"
                onClick={() => document.getElementById("note-audio-upload")?.click()}
              >
                <Volume2 className="w-4 h-4 mx-auto mb-1 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-200">Add Audio</span>
              </div>
              <input
                id="note-audio-upload"
                type="file"
                accept="audio/*"
                multiple
                className="hidden"
                onChange={handleAudioUpload}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}