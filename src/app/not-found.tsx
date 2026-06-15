"use client";

import { motion } from "framer-motion";
import { Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

function FloatingShape({
  size,
  x,
  y,
  delay,
  duration,
  color,
}: {
  size: number;
  x: string;
  y: string;
  delay: number;
  duration: number;
  color: string;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        background: color,
      }}
      animate={{
        y: [0, -20, 10, -15, 0],
        x: [0, 8, -5, 10, 0],
        scale: [1, 1.05, 0.95, 1.02, 1],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

export default function NotFound() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Floating background shapes */}
      <FloatingShape size={180} x="10%" y="15%" delay={0} duration={8} color="oklch(0.965 0.002 0)" />
      <FloatingShape size={120} x="75%" y="20%" delay={1.5} duration={10} color="oklch(0.93 0.005 280)" />
      <FloatingShape size={90} x="60%" y="70%" delay={3} duration={9} color="oklch(0.96 0.01 80)" />
      <FloatingShape size={60} x="20%" y="75%" delay={2} duration={7} color="oklch(0.95 0.008 160)" />
      <FloatingShape size={140} x="80%" y="55%" delay={4} duration={11} color="oklch(0.97 0.003 0)" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-md mx-auto space-y-8 relative z-10"
      >
        {/* 404 as a design element */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          {/* Large 404 number with gradient */}
          <span
            className="block font-serif text-[8rem] sm:text-[10rem] font-extralight leading-none tracking-tighter select-none"
            style={{
              background: "linear-gradient(135deg, var(--foreground) 0%, var(--muted-foreground) 50%, var(--border) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            404
          </span>

          {/* Overlapping text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                {/* Decorative dots */}
                <span className="size-1.5 rounded-full bg-foreground/20" />
                <span className="size-2 rounded-full bg-foreground/10" />
                <span className="size-1.5 rounded-full bg-foreground/20" />
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                This page doesn&apos;t exist
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
                The page you&apos;re looking for may have been moved, deleted, or never existed.
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Search input */}
        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          onSubmit={handleSearch}
          className="relative max-w-xs mx-auto"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-9 rounded-full border-border/50 bg-muted/30 focus-visible:ring-2 focus-visible:ring-foreground/10 transition-all duration-200 text-sm"
          />
        </motion.form>

        {/* Go home button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Button
            asChild
            variant="outline"
            className="rounded-full px-6 hover:shadow-md hover:bg-foreground hover:text-background transition-all duration-300 cursor-pointer"
          >
            <Link href="/">
              <Home className="size-4 mr-2" />
              Go back home
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
