"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Send, Loader2, Check, Sparkles, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface NewsletterWidgetProps {
  variant?: "footer" | "inline";
  className?: string;
}

export function NewsletterWidget({ variant = "footer", className }: NewsletterWidgetProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (res.ok) {
        toast.success("Subscribed! Thank you.");
        setEmail("");
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (variant === "inline") {
    return (
      <div className={className}>
        <div className="rounded-2xl p-[1px] bg-gradient-to-br from-border/40 via-[var(--site-accent)]/20 to-border/10 overflow-hidden">
          {/* Glassmorphism card */}
          <div className="rounded-2xl bg-card/80 backdrop-blur-xl p-6 sm:p-8 relative overflow-hidden bg-gradient-to-br from-muted/40 to-muted/20">
            {/* Decorative blurred orbs */}
            <div className="absolute -top-8 -right-8 size-32 rounded-full bg-[var(--site-accent)]/5 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-6 -left-6 size-24 rounded-full bg-muted/40 blur-2xl pointer-events-none" />

            {/* Subtle dot pattern */}
            <div className="absolute inset-0 dot-pattern opacity-[0.015] pointer-events-none" />

            <div className="relative space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-[var(--site-accent)]" />
                <h3 className="font-serif text-xl font-semibold">Stay in the loop</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Get notified when I publish something new. No spam, unsubscribe anytime.
              </p>
              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-2.5 py-2"
                  >
                    {/* Animated checkmark circle with ring expand */}
                    <div className="relative">
                      <motion.div
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", bounce: 0.4, delay: 0.1 }}
                        className="size-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center ring-2 ring-green-200 dark:ring-green-800/50"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", bounce: 0.3, delay: 0.25 }}
                        >
                          <Check className="size-4 text-green-600 dark:text-green-400" strokeWidth={3} />
                        </motion.div>
                      </motion.div>
                      {/* Expanding ring effect */}
                      <motion.div
                        initial={{ scale: 1, opacity: 0.4 }}
                        animate={{ scale: 1.6, opacity: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="absolute inset-0 rounded-full border-2 border-green-300 dark:border-green-700/50 pointer-events-none"
                      />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400 block">
                        You&apos;re subscribed!
                      </span>
                      <span className="text-xs text-muted-foreground">Welcome aboard.</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="flex gap-2.5"
                  >
                    <div className="flex-1 relative">
                      {/* Animated gradient border on focus */}
                      <div className={cn(
                        "absolute -inset-[1.5px] rounded-xl bg-gradient-to-r from-[var(--site-accent)]/40 via-[var(--site-accent)]/15 to-[var(--site-accent)]/40 opacity-0 transition-opacity duration-300 blur-[0.5px]",
                        focused && "opacity-100"
                      )} />
                      <Input
                        type="email"
                        placeholder="you@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        className="relative h-11 rounded-xl border-border/50 bg-background/90 focus-visible:ring-2 focus-visible:ring-[var(--site-accent)]/30 focus-visible:border-[var(--site-accent)]/50 focus-visible:outline-none transition-all duration-200"
                        disabled={loading}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-11 px-5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-black/[0.08] bg-gradient-to-r from-[var(--site-accent)] to-[var(--site-accent)]/80 text-white hover:scale-[1.02] active:scale-[0.98] hover:from-[var(--site-accent)]/95 hover:to-[var(--site-accent)]/75"
                    >
                      {loading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4 mr-1.5" />
                      )}
                      Subscribe
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 p-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Mail className="size-4 text-muted-foreground/60" />
        <span className="text-xs font-medium text-muted-foreground">Newsletter</span>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          {/* Animated gradient border on focus for footer variant */}
          <div className={cn(
            "absolute -inset-[1.5px] rounded-lg bg-gradient-to-r from-[var(--site-accent)]/40 via-[var(--site-accent)]/15 to-[var(--site-accent)]/40 opacity-0 transition-opacity duration-300 blur-[0.5px]",
            focused && "opacity-100"
          )} />
          <Input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="relative h-9 rounded-lg border-border/50 bg-background/50 focus-visible:ring-2 focus-visible:ring-[var(--site-accent)]/30 focus-visible:border-[var(--site-accent)]/50 focus-visible:outline-none transition-all duration-200 text-sm"
            disabled={loading}
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={loading}
          className="h-9 rounded-lg transition-all duration-200 bg-[var(--site-accent)] hover:bg-[var(--site-accent)]/90 text-white hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Send className="size-3.5" />
          )}
        </Button>
      </div>
    </form>
  );
}
