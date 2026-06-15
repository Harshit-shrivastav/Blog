"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { usePublicStore, type Note } from "@/stores/public-store";
import { NoteCard } from "./note-card";
import { Search, X, Feather } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getFingerprint } from "@/lib/fingerprint";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

function NoteCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/40 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-24 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
      </div>
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-[90%] rounded" />
        <Skeleton className="h-4 w-[70%] rounded" />
      </div>
      <div className="h-px bg-border/60" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-14 rounded" />
        <Skeleton className="h-4 w-14 rounded" />
      </div>
    </div>
  );
}

export function NoteFeed() {
  const {
    notes,
    setNotes,
    notePage,
    setNotePage,
    hasMoreNotes,
    setHasMoreNotes,
    setSelectedNote,
  } = usePublicStore();

  const loadingRef = useRef(false);
  const observerRef = useRef<HTMLDivElement>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter notes by search query (client-side)
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase().trim();
    return notes.filter((note) => note.content.toLowerCase().includes(q));
  }, [notes, searchQuery]);

  const fetchNotes = useCallback(
    async (page: number) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        const res = await fetch(
          `/api/notes?page=${page}&limit=20`,
          {
            headers: { "x-fingerprint": getFingerprint() },
          }
        );
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (page === 1) {
          setNotes(data.notes);
        } else {
          setNotes([...notes, ...data.notes]);
        }
        setHasMoreNotes(data.hasMore);
      } catch {
        // silent fail
      } finally {
        loadingRef.current = false;
        setInitialLoading(false);
      }
    },
    [notes, setNotes, setHasMoreNotes]
  );

  useEffect(() => {
    fetchNotes(1);
  }, []);

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreNotes && !loadingRef.current) {
          const nextPage = notePage + 1;
          setNotePage(nextPage);
          fetchNotes(nextPage);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMoreNotes, notePage, setNotePage, fetchNotes]);

  if (initialLoading) {
    return (
      <div className="max-w-xl mx-auto space-y-6 pb-20 lg:pb-6">
        {/* Section heading skeleton */}
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-24 rounded" />
          <Skeleton className="h-4 w-48 rounded" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <NoteCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (notes.length === 0 && !hasMoreNotes) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-center">
        {/* Decorative CSS shapes illustration */}
        <div className="relative mb-8">
          {/* Large circle */}
          <div className="size-20 rounded-full border border-border/60 absolute -top-4 -left-6" />
          {/* Small filled circle */}
          <div className="size-6 rounded-full bg-muted/40 absolute -bottom-1 left-2" />
          {/* Rectangle */}
          <div className="w-16 h-10 rounded-xl bg-muted/20 rotate-12 absolute -right-4 top-2" />
          {/* Center card */}
          <div className="size-20 rounded-2xl bg-gradient-to-br from-muted/70 to-muted/40 relative flex items-center justify-center shadow-sm border border-border/30">
            <Feather className="size-8 text-muted-foreground/40" />
          </div>
          {/* Tiny accent dot */}
          <div className="size-2 rounded-full bg-[var(--site-accent)]/20 absolute -top-6 right-0" />
        </div>
        <h3 className="font-serif text-xl font-medium text-muted-foreground mb-2">
          No notes yet
        </h3>
        <p className="text-sm text-muted-foreground/60 max-w-[220px] leading-relaxed">
          Short thoughts and observations coming soon.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20 lg:pb-6">
      {/* Section heading */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-1"
      >
        <h2 className="font-serif text-2xl font-semibold tracking-tight">Notes</h2>
        <p className="text-sm text-muted-foreground">
          Short thoughts and quick updates.
        </p>
      </motion.div>

      {/* Search bar with animated search icon and clear button */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="relative"
      >
        <Search className={cn(
          "absolute left-3.5 top-1/2 -translate-y-1/2 size-4 transition-all duration-200",
          searchQuery ? "text-foreground search-icon-animated" : "text-muted-foreground/60"
        )} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes..."
          className={cn(
            "w-full h-10 pl-10 pr-10 rounded-xl border bg-muted/30 text-sm transition-all duration-200",
            "placeholder:text-muted-foreground/50",
            "focus:outline-none focus:ring-2 focus:ring-foreground/5 focus:border-border focus:bg-background",
            searchQuery
              ? "border-border bg-background"
              : "border-border/50 hover:border-border/80"
          )}
        />
        {/* Clear button with animated appearance */}
        <AnimatePresence>
          {searchQuery && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer size-5 flex items-center justify-center rounded-full hover:bg-muted transition-colors duration-150"
              aria-label="Clear search"
            >
              <X className="size-3.5 text-muted-foreground hover:text-foreground" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Search results count */}
      <AnimatePresence>
        {searchQuery.trim() && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-xs text-muted-foreground">
              {filteredNotes.length === 0
                ? "No notes match your search."
                : `Found ${filteredNotes.length} note${filteredNotes.length !== 1 ? "s" : ""}.`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {filteredNotes.map((note, i) => (
        <motion.div
          key={note.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: Math.min(i * 0.06, 0.3),
            ease: "easeOut",
          }}
          className="relative"
        >
          {/* Gradient border-bottom between notes */}
          {i > 0 && (
            <div className="absolute -top-3 left-6 right-6 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
          )}
          <NoteCard note={note} onClick={() => setSelectedNote(note)} />
        </motion.div>
      ))}

      {/* No search results */}
      {searchQuery.trim() && filteredNotes.length === 0 && notes.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="relative mb-5">
            <div className="size-14 rounded-xl bg-muted/40 rotate-6 absolute -top-1 -left-1" />
            <div className="size-14 rounded-xl bg-gradient-to-br from-muted/70 to-muted/40 relative flex items-center justify-center shadow-sm">
              <Search className="size-6 text-muted-foreground/40" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-medium mb-1">No matching notes</p>
          <p className="text-xs text-muted-foreground/60">Try a different search term.</p>
        </motion.div>
      )}

      {hasMoreNotes && !searchQuery.trim() && (
        <div ref={observerRef} className="flex justify-center py-8 pb-20 lg:pb-6">
          {loadingRef.current ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="size-4 border-2 border-border border-t-foreground rounded-full animate-spin" />
              Loading more...
            </div>
          ) : (
            /* Writing animation dots when notes are loading */
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-muted/30">
              <span className="writing-dot size-1.5 rounded-full bg-muted-foreground" />
              <span className="writing-dot size-1.5 rounded-full bg-muted-foreground" />
              <span className="writing-dot size-1.5 rounded-full bg-muted-foreground" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
