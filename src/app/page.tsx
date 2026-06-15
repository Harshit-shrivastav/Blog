"use client";

import { useEffect, useCallback, useRef } from "react";
import { usePublicStore } from "@/stores/public-store";
import { Header } from "@/components/public/header";
import { BottomNav } from "@/components/public/bottom-nav";
import { BlogGrid } from "@/components/public/blog-grid";
import { BlogDetailView } from "@/components/public/blog-detail";
import { NoteFeed } from "@/components/public/note-feed";
import { NoteModal } from "@/components/public/note-modal";
import { Footer } from "@/components/public/footer";
import { ContactPage } from "@/components/public/contact-page";
import { AboutPage } from "@/components/public/about-page";
import { SeriesPage } from "@/components/public/series-page";
import { ReadingList } from "@/components/public/reading-list";
import { SearchOverlay } from "@/components/public/search-overlay";
import { ShortcutsPanel } from "@/components/public/shortcuts-panel";
import { WebHistoryPanel } from "@/components/public/web-history-panel";
import { AnimatePresence, motion } from "framer-motion";

export default function HomePage() {
  const {
    view,
    setView,
    selectedBlog,
    setSelectedBlog,
    selectedNote,
    setSelectedNote,
    showContact,
    setShowContact,
    showAbout,
    setShowAbout,
    showSeries,
    setShowSeries,
    showShortcuts,
    setShowShortcuts,
    showSearch,
    readingList,
    setReadingList,
    readPosts,
    setReadPosts,
    addToReadingList,
    removeFromReadingList,
    isInReadingList,
    showWebHistory,
    setShowWebHistory,
  } = usePublicStore();

  // Whether to show bottom nav (hide when viewing detail)
  const showBottomNav = !selectedBlog && !selectedNote && !showContact && !showAbout && !showSeries;

  // Load reading list from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("blog-reading-list");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setReadingList(parsed);
      }
    } catch {}

    try {
      const stored = localStorage.getItem("blog-read-posts");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setReadPosts(new Set(parsed));
      }
    } catch {}
  }, []);

  // Keyboard shortcuts for navigation and bookmark toggle
  const shortcutsListenerRef = useRef(false);

  useEffect(() => {
    if (shortcutsListenerRef.current) return;
    shortcutsListenerRef.current = true;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement).isContentEditable) {
        return;
      }

      // Don't trigger when any overlay is open (except shortcuts panel itself)
      if (showContact || showAbout || showSeries || showSearch) return;

      // Escape: close overlays or go back
      if (e.key === "Escape") {
        if (showShortcuts) {
          setShowShortcuts(false);
          return;
        }
        if (selectedBlog) {
          setSelectedBlog(null);
          return;
        }
        if (selectedNote) {
          setSelectedNote(null);
          return;
        }
      }

      // 1: Switch to blogs tab
      if (e.key === "1" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (selectedBlog) {
          setSelectedBlog(null);
        }
        setView("blogs");
        return;
      }

      // 2: Switch to notes tab
      if (e.key === "2" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (selectedBlog) {
          setSelectedBlog(null);
        }
        setView("notes");
        return;
      }

      // B: Toggle bookmark on current blog
      if ((e.key === "b" || e.key === "B") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (selectedBlog) {
          if (isInReadingList(selectedBlog.id)) {
            removeFromReadingList(selectedBlog.id);
          } else {
            addToReadingList(selectedBlog);
          }
        }
      }

      // H: Toggle web history
      if ((e.key === "h" || e.key === "H") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (!selectedBlog && !selectedNote) {
          setShowWebHistory(!usePublicStore.getState().showWebHistory);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showContact, showAbout, showSeries, showSearch, showShortcuts, showWebHistory, selectedBlog, selectedNote, setView, setSelectedBlog, setSelectedNote, setShowShortcuts, addToReadingList, removeFromReadingList, isInReadingList, setShowWebHistory]);

  return (
    <motion.div
      className="min-h-screen flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
          <AnimatePresence mode="wait">
            {view === "blogs" && !selectedBlog && (
              <motion.div
                key="blogs"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <BlogGrid />
              </motion.div>
            )}

            {view === "notes" && !selectedBlog && (
              <motion.div
                key="notes"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <NoteFeed />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Blog detail overlay */}
        <AnimatePresence>
          {selectedBlog && (
            <BlogDetailView
              key={selectedBlog.id}
              blog={selectedBlog}
              onClose={() => setSelectedBlog(null)}
            />
          )}
        </AnimatePresence>

        {/* Note modal */}
        <AnimatePresence>
          {selectedNote && (
            <NoteModal
              key={selectedNote.id}
              note={selectedNote}
              onClose={() => setSelectedNote(null)}
            />
          )}
        </AnimatePresence>

        {/* About page overlay */}
        <AnimatePresence>
          {showAbout && (
            <AboutPage
              key="about"
              onClose={() => setShowAbout(false)}
            />
          )}
        </AnimatePresence>

        {/* Series page overlay */}
        <AnimatePresence>
          {showSeries && (
            <SeriesPage
              key="series"
              onClose={() => setShowSeries(false)}
            />
          )}
        </AnimatePresence>

        {/* Contact page overlay */}
        <AnimatePresence>
          {showContact && (
            <ContactPage
              key="contact"
              onClose={() => setShowContact(false)}
            />
          )}
        </AnimatePresence>
      </main>

      <Footer />

      {/* Bottom navigation (hidden when viewing detail) */}
      <AnimatePresence>
        {showBottomNav && (
          <motion.div
            initial={{ y: 0 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <BottomNav />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reading list slide-out panel */}
      <ReadingList />

      {/* Web History panel */}
      <WebHistoryPanel />

      {/* Search overlay */}
      <SearchOverlay />

      {/* Keyboard shortcuts panel */}
      <ShortcutsPanel />
    </motion.div>
  );
}