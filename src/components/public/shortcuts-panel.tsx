"use client";

import { useEffect, useCallback } from "react";
import { usePublicStore } from "@/stores/public-store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Keyboard,
  Search,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  Navigation,
  Bookmark,
} from "lucide-react";

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  title: string;
  icon: React.ReactNode;
  shortcuts: ShortcutItem[];
}

const shortcutCategories: ShortcutCategory[] = [
  {
    title: "General",
    icon: <Keyboard className="size-4" />,
    shortcuts: [
      { keys: ["?"], description: "Show shortcuts" },
      { keys: ["Esc"], description: "Close overlay / go back" },
    ],
  },
  {
    title: "Search",
    icon: <Search className="size-4" />,
    shortcuts: [
      { keys: ["⌘", "K"], description: "Open search" },
      { keys: ["↑", "↓"], description: "Navigate results" },
      { keys: ["↵"], description: "Select result" },
      { keys: ["Esc"], description: "Close search" },
    ],
  },
  {
    title: "Navigation",
    icon: <Navigation className="size-4" />,
    shortcuts: [
      { keys: ["1"], description: "Blogs tab" },
      { keys: ["2"], description: "Notes tab" },
    ],
  },
  {
    title: "Blog",
    icon: <Bookmark className="size-4" />,
    shortcuts: [
      { keys: ["B"], description: "Toggle bookmark" },
    ],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[26px] h-7 px-2 rounded-md border border-border/50 bg-muted/50 font-mono text-xs font-medium text-foreground shadow-[0_1px_0_1px_hsl(var(--border)/0.3),inset_0_0.5px_0_hsl(var(--border)/0.2)] dark:shadow-[0_1px_0_1px_hsl(var(--border)/0.15),inset_0_0.5px_0_hsl(var(--border)/0.1)] transition-colors duration-150 select-none">
      {children}
    </kbd>
  );
}

export function ShortcutsPanel() {
  const { showShortcuts, setShowShortcuts } = usePublicStore();

  const handleClose = useCallback(() => {
    setShowShortcuts(false);
  }, [setShowShortcuts]);

  // Listen for ? key and Escape to open/close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === "Escape" && showShortcuts) {
        e.preventDefault();
        handleClose();
        return;
      }

      // Open/close on ? (Shift+/) - but not when typing in an input
      if (e.key === "?" && e.shiftKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement).isContentEditable) {
          return;
        }
        e.preventDefault();
        setShowShortcuts(!showShortcuts);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showShortcuts, setShowShortcuts, handleClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (showShortcuts) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showShortcuts]);

  return (
    <AnimatePresence>
      {showShortcuts && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-lg rounded-2xl border border-border/60 bg-card/80 backdrop-blur-2xl shadow-2xl shadow-black/[0.08] dark:shadow-black/[0.4] overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-8 rounded-lg bg-muted/60">
                  <Keyboard className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Keyboard Shortcuts</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Navigate faster with shortcuts</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 px-2 py-1 rounded-md hover:bg-muted/60 cursor-pointer"
              >
                Press
                <Kbd>Esc</Kbd>
              </button>
            </div>

            {/* Divider */}
            <div className="mx-6 h-px bg-border/40" />

            {/* Shortcuts grid */}
            <div className="px-6 py-5 space-y-5">
              {shortcutCategories.map((category, catIdx) => (
                <motion.div
                  key={category.title}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.05 * (catIdx + 1) }}
                >
                  {/* Category header */}
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-muted-foreground/70">{category.icon}</span>
                    <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                      {category.title}
                    </h3>
                  </div>

                  {/* Shortcut items */}
                  <div className="space-y-1">
                    {category.shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.description}
                        className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded-lg hover:bg-muted/40 transition-colors duration-150 group"
                      >
                        <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors duration-150">
                          {shortcut.description}
                        </span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, i) => (
                            <span key={i} className="flex items-center gap-1">
                              {i > 0 && (
                                <span className="text-[10px] text-muted-foreground/40 mx-0.5">+</span>
                              )}
                              <Kbd>{key}</Kbd>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="mx-6 h-px bg-border/40" />
            <div className="px-6 py-3.5 flex items-center justify-center">
              <button
                onClick={handleClose}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
