"use client";

import { useSyncExternalStore, useEffect, useState, useCallback } from "react";
import { usePublicStore } from "@/stores/public-store";
import { useSite } from "@/components/site-provider";
import { useTheme } from "next-themes";
import {
  Moon,
  Sun,
  Mail,
  PenLine,
  Search,
  Bookmark,
  User,
  Layers,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function Header() {
  const { view, setView, setShowAbout, setShowContact, setShowSearch, showSearch, setShowReadingList, setShowSeries, readingList, setShowWebHistory } =
    usePublicStore();
  const { siteSettings } = useSite();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleNewsletterClick = () => {
    document.getElementById("newsletter-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const bookmarkCount = mounted ? readingList.length : 0;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-300 ease-out",
        scrolled
          ? "bg-background/90 backdrop-blur-2xl shadow-sm shadow-black/[0.03] dark:shadow-black/[0.2]"
          : "bg-background/80 backdrop-blur-xl"
      )}
    >
      {/* Animated gradient border - uses CSS @keyframes for smoother animation */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-px transition-opacity duration-300",
          scrolled ? "opacity-100" : "opacity-60"
        )}
      >
        <div
          className="h-full animate-gradient-border"
          style={{
            background: "linear-gradient(90deg, transparent, var(--site-accent), var(--foreground), var(--site-accent), transparent)",
            backgroundSize: "200% 100%",
          }}
        />
      </div>

      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Left: Site name with dot icon - scroll to top on click */}
        <button
          onClick={scrollToTop}
          className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md px-1 py-0.5"
        >
          <span className="size-1.5 rounded-full bg-foreground/80 group-hover:scale-125 group-hover:bg-[var(--site-accent)] transition-all duration-300" />
          <span className="font-serif text-lg font-semibold tracking-tight group-hover:opacity-70 transition-opacity duration-300">
            {siteSettings?.siteName || "Blog"}
          </span>
        </button>

        {/* Center: Desktop tabs */}
        <nav className="hidden lg:flex items-center gap-1.5" role="tablist">
          {(["blogs", "notes"] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={view === tab}
              onClick={() => setView(tab)}
              className={cn(
                "relative px-5 py-2 text-sm font-medium rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                view === tab
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {view === tab && (
                <motion.span
                  layoutId="header-tab"
                  className="absolute inset-0 bg-muted rounded-full"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}
              <span className="relative capitalize">{tab}</span>
            </button>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-0.5">
          {/* Search button with pulsing dot when search overlay is closed */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex size-9 rounded-full hover:bg-muted transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring relative"
            onClick={() => setShowSearch(true)}
            aria-label="Search"
          >
            <Search className="size-[18px]" />
            {!showSearch && (
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-[var(--site-accent)] notif-pulse" />
            )}
          </Button>

          {/* Web History button */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex size-9 rounded-full hover:bg-muted transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setShowWebHistory(true)}
            aria-label="History"
          >
            <History className="size-[18px]" />
          </Button>

          {/* Reading list button with badge */}
          <Button
            variant="ghost"
            size="icon"
            className="relative hidden sm:flex size-9 rounded-full hover:bg-muted transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setShowReadingList(true)}
            aria-label="Reading list"
          >
            <Bookmark className="size-[18px]" />
            {mounted && bookmarkCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-background"
              >
                {bookmarkCount > 9 ? "9+" : bookmarkCount}
              </motion.span>
            )}
          </Button>

          {/* About button */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex size-9 rounded-full hover:bg-muted transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setShowAbout(true)}
            aria-label="About"
          >
            <User className="size-[18px]" />
          </Button>

          {/* Collections button */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex size-9 rounded-full hover:bg-muted transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setShowSeries(true)}
            aria-label="Collections"
          >
            <Layers className="size-[18px]" />
          </Button>

          {/* Contact button */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex size-9 rounded-full hover:bg-muted transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setShowContact(true)}
            aria-label="Contact"
          >
            <Mail className="size-[18px]" />
          </Button>

          {/* Newsletter */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex size-9 rounded-full hover:bg-muted transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
            onClick={handleNewsletterClick}
            aria-label="Newsletter"
          >
            <PenLine className="size-[18px]" />
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
            className="size-9 rounded-full hover:bg-muted transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {!mounted ? (
              <div className="size-[18px]" />
            ) : resolvedTheme === "dark" ? (
              <motion.div
                key="sun"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Sun className="size-[18px]" />
              </motion.div>
            ) : (
              <motion.div
                key="moon"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Moon className="size-[18px]" />
              </motion.div>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
