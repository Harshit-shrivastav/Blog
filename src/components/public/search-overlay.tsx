"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { usePublicStore, type BlogPost, type Note } from "@/stores/public-store";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  X,
  FileText,
  FileSearch,
  StickyNote,
  Clock,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getFingerprint } from "@/lib/fingerprint";
import { cn } from "@/lib/utils";

interface SearchResult {
  type: "blog" | "note";
  blog?: BlogPost;
  note?: Note;
}

interface RecentSearch {
  query: string;
  timestamp: number;
}

export function SearchOverlay() {
  const {
    showSearch,
    setShowSearch,
    setSelectedBlog,
    setSelectedNote,
    setView,
  } = usePublicStore();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const flatResultsRef = useRef<SearchResult[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("blog-recent-searches");
      if (stored) {
        const parsed = JSON.parse(stored) as RecentSearch[];
        setRecentSearches(parsed.slice(0, 5));
      }
    } catch {}
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => {
        inputRef.current?.focus();
        setInputFocused(true);
      }, 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQuery("");
      setResults([]);
      setActiveIndex(-1);
      setInputFocused(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showSearch]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(!showSearch);
      }
      if (e.key === "Escape" && showSearch) {
        setShowSearch(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showSearch, setShowSearch]);

  const addRecentSearch = useCallback((q: string) => {
    if (!q.trim()) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.query !== q.trim());
      const updated = [{ query: q.trim(), timestamp: Date.now() }, ...filtered].slice(0, 5);
      try {
        localStorage.setItem("blog-recent-searches", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const doSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        flatResultsRef.current = [];
        return;
      }

      setIsSearching(true);
      try {
        const [blogRes, noteRes] = await Promise.all([
          fetch(`/api/blogs/search?q=${encodeURIComponent(searchQuery.trim())}`, {
            headers: { "x-fingerprint": getFingerprint() },
          }),
          fetch("/api/notes"),
        ]);

        const searchResults: SearchResult[] = [];

        if (blogRes.ok) {
          const data = await blogRes.json();
          data.blogs?.forEach((blog: BlogPost) => {
            searchResults.push({ type: "blog", blog });
          });
        }

        if (noteRes.ok) {
          const data = await noteRes.json();
          data.notes
            ?.filter(
              (note: Note) =>
                note.content.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .forEach((note: Note) => {
              searchResults.push({ type: "note", note });
            });
        }

        setResults(searchResults);
        flatResultsRef.current = searchResults;
      } catch {
        // silent
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      setActiveIndex(-1);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!value.trim()) {
        setResults([]);
        flatResultsRef.current = [];
        return;
      }
      debounceRef.current = setTimeout(() => {
        doSearch(value);
      }, 250);
    },
    [doSearch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const flat = flatResultsRef.current;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, flat.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < flat.length) {
          selectResult(flat[activeIndex]);
        } else if (query.trim()) {
          addRecentSearch(query);
          doSearch(query);
        }
      }
    },
    [activeIndex, query, addRecentSearch, doSearch]
  );

  const selectResult = useCallback(
    (result: SearchResult) => {
      if (result.type === "blog" && result.blog) {
        addRecentSearch(result.blog.title);
        setSelectedBlog(result.blog);
      } else if (result.type === "note" && result.note) {
        addRecentSearch(result.note.content.slice(0, 30));
        setSelectedNote(result.note);
      }
      setShowSearch(false);
    },
    [setSelectedBlog, setSelectedNote, setShowSearch, addRecentSearch]
  );

  const blogResults = useMemo(
    () => results.filter((r) => r.type === "blog"),
    [results]
  );
  const noteResults = useMemo(
    () => results.filter((r) => r.type === "note"),
    [results]
  );
  const hasResults = blogResults.length > 0 || noteResults.length > 0;

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem("blog-recent-searches");
    } catch {}
  };

  return (
    <AnimatePresence>
      {showSearch && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-background/85 backdrop-blur-2xl"
        >
          {/* Top search bar */}
          <div className="mx-auto max-w-2xl px-4 pt-[15vh] sm:pt-[20vh]">
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="relative">
                <Search className={cn(
                  "absolute left-4 top-1/2 -translate-y-1/2 size-5 transition-colors duration-200",
                  inputFocused ? "text-[var(--site-accent)]" : "text-muted-foreground"
                )} />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="Search posts, notes..."
                  className={cn(
                    "h-[48px] pl-12 pr-12 text-base rounded-2xl border-border/60 bg-card shadow-xl shadow-black/[0.06] dark:shadow-black/[0.3] transition-all duration-200",
                    inputFocused
                      ? "ring-2 ring-[var(--site-accent)]/20 border-[var(--site-accent)]/40 shadow-[var(--site-accent)]/[0.05]"
                      : "focus-visible:ring-1 focus-visible:ring-ring/30"
                  )}
                />
                {query && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => handleInputChange("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer size-5 flex items-center justify-center rounded-full hover:bg-muted transition-colors duration-200"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5 text-muted-foreground hover:text-foreground" />
                  </motion.button>
                )}
                {!query && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <kbd className="hidden sm:inline-flex h-5 items-center rounded-md border border-border/50 bg-muted/60 px-1.5 font-mono text-[10px] font-medium text-muted-foreground shadow-sm">
                      ESC
                    </kbd>
                  </div>
                )}
              </div>

              {/* Results */}
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: 0.05 }}
                className="mt-3 rounded-2xl border border-border/60 bg-card shadow-xl shadow-black/[0.06] dark:shadow-black/[0.3] overflow-hidden max-h-[50vh]"
              >
                <ScrollArea className="max-h-[50vh]">
                  <div className="p-2">
                    {/* Loading */}
                    {isSearching && (
                      <div className="flex items-center justify-center py-10">
                        <div className="size-5 border-2 border-border border-t-foreground rounded-full animate-spin" />
                      </div>
                    )}

                    {/* No query - show recent searches */}
                    {!query && !isSearching && recentSearches.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between px-2 py-2">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Recent
                          </span>
                          <button
                            onClick={clearRecentSearches}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer rounded-md px-1.5 py-0.5 hover:bg-muted/60"
                          >
                            <RotateCcw className="size-3" />
                            Clear
                          </button>
                        </div>
                        {recentSearches.map((search) => (
                          <button
                            key={search.query}
                            onClick={() => {
                              setQuery(search.query);
                              doSearch(search.query);
                            }}
                            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left cursor-pointer group"
                          >
                            <RotateCcw className="size-3.5 text-muted-foreground/60 flex-shrink-0 group-hover:text-muted-foreground transition-colors duration-200" />
                            <span className="text-sm text-foreground">{search.query}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* No results */}
                    {!isSearching && query && !hasResults && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex flex-col items-center justify-center py-12 text-center px-4"
                      >
                        <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                          <FileSearch className="size-5 text-muted-foreground/40" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">No results found</p>
                        <p className="text-xs text-muted-foreground/60 max-w-[220px]">
                          We couldn&apos;t find anything matching your search. Try different keywords.
                        </p>
                      </motion.div>
                    )}

                    {/* Blog results */}
                    {!isSearching && blogResults.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 px-2 py-2">
                          <FileText className="size-3.5 text-muted-foreground/60" />
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Blog Posts
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-4 px-1.5 font-normal"
                          >
                            {blogResults.length}
                          </Badge>
                        </div>
                        {blogResults.map((result, i) => {
                          const flatIdx = results.indexOf(result);
                          return (
                            <motion.button
                              key={result.blog?.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.15, delay: i * 0.03 }}
                              onClick={() => selectResult(result)}
                              className={cn(
                                "w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-left cursor-pointer transition-all duration-150",
                                activeIndex === flatIdx
                                  ? "bg-muted/80"
                                  : "hover:bg-muted/60"
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {result.blog?.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                                  {result.blog?.publishedAt && (
                                    <time>{result.blog.publishedAt}</time>
                                  )}
                                  {result.blog?.readingTime && (
                                    <span className="inline-flex items-center gap-0.5">
                                      <Clock className="size-2.5" />
                                      {result.blog.readingTime}m
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ArrowRight className="size-3.5 text-muted-foreground/30 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                            </motion.button>
                          );
                        })}
                      </div>
                    )}

                    {/* Note results */}
                    {!isSearching && noteResults.length > 0 && (
                      <div className="mt-1">
                        <div className="flex items-center gap-2 px-2 py-2">
                          <StickyNote className="size-3.5 text-muted-foreground/60" />
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Notes
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-4 px-1.5 font-normal"
                          >
                            {noteResults.length}
                          </Badge>
                        </div>
                        {noteResults.map((result, i) => {
                          const flatIdx = results.indexOf(result);
                          return (
                            <motion.button
                              key={result.note?.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.15, delay: i * 0.03 }}
                              onClick={() => selectResult(result)}
                              className={cn(
                                "w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-left cursor-pointer transition-all duration-150",
                                activeIndex === flatIdx
                                  ? "bg-muted/80"
                                  : "hover:bg-muted/60"
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">
                                  {result.note?.content.slice(0, 80)}
                                </p>
                              </div>
                              <ArrowRight className="size-3.5 text-muted-foreground/30 flex-shrink-0" />
                            </motion.button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </motion.div>

              {/* Keyboard hints with better styling */}
              <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-muted-foreground/50">
                <span className="flex items-center gap-1.5">
                  <kbd className="inline-flex h-[18px] items-center rounded-md border border-border/40 bg-muted/40 px-1.5 font-mono text-[10px] shadow-[0_1px_0] border-b shadow-border/30">
                    ↑↓
                  </kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="inline-flex h-[18px] items-center rounded-md border border-border/40 bg-muted/40 px-1.5 font-mono text-[10px] shadow-[0_1px_0] border-b shadow-border/30">
                    ↵
                  </kbd>
                  Select
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="inline-flex h-[18px] items-center rounded-md border border-border/40 bg-muted/40 px-1.5 font-mono text-[10px] shadow-[0_1px_0] border-b shadow-border/30">
                    esc
                  </kbd>
                  Close
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
