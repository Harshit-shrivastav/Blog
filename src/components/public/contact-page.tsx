"use client";

import { useState, FormEvent } from "react";
import { useSite } from "@/components/site-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Github, Twitter, Linkedin, Send, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const subjectOptions = [
  "General Inquiry",
  "Collaboration",
  "Bug Report",
  "Feature Request",
  "Other",
];

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  github: Github,
  twitter: Twitter,
  x: Twitter,
  linkedin: Linkedin,
};

interface ContactPageProps {
  onClose: () => void;
}

export function ContactPage({ onClose }: ContactPageProps) {
  const { siteSettings } = useSite();
  const socialLinks = (siteSettings?.socialLinks || {}) as Record<string, string>;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Name is required";
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Please enter a valid email";
    }
    if (!subject) newErrors.subject = "Please select a subject";
    if (!message.trim()) newErrors.message = "Message is required";
    else if (message.trim().length < 10) newErrors.message = "Message must be at least 10 characters";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          subject,
          message: message.trim(),
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        toast.success("Message sent successfully!");
        // Reset after a moment
        setTimeout(() => {
          setName("");
          setEmail("");
          setSubject("");
          setMessage("");
          setSubmitted(false);
        }, 3000);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to send message");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const socialEntries = Object.entries(socialLinks) as [string, string][];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-background"
      >
        <div className="h-full overflow-y-auto">
          {/* Top bar */}
          <div className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 sm:px-6 bg-background/80 backdrop-blur-xl border-b border-border/40">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-md px-2 py-1 -ml-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="size-4" />
              Back
            </button>
            <h2 className="text-sm font-medium">Contact</h2>
            <div className="w-16" />
          </div>

          <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-16 relative">
            {/* Decorative shapes */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-[var(--site-accent)]/[0.03] rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-20 -left-20 w-48 h-48 bg-muted/40 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="text-center mb-10 relative"
            >
              {/* Gradient accent line above heading */}
              <div className="mx-auto w-12 h-1 rounded-full bg-gradient-to-r from-[var(--site-accent)] to-transparent mb-6" />
              <h1
                className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                Get in Touch
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                Have a question, idea, or just want to say hello? Fill out the form
                below and I&apos;ll get back to you as soon as possible.
              </p>
            </motion.div>

            {/* Form Card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
            >
              <Card className="border-border/40 shadow-none relative overflow-hidden">
                {/* Subtle gradient accent at top of card */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--site-accent)]/30 to-transparent" />
                <CardContent className="p-6 sm:p-8">
                  <AnimatePresence mode="wait">
                    {submitted ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-12 text-center"
                      >
                        {/* Success checkmark with ring expand effect */}
                        <div className="relative mb-4">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                          >
                            <CheckCircle2 className="size-14 text-emerald-500" />
                          </motion.div>
                          {/* Expanding ring */}
                          <motion.div
                            initial={{ scale: 1, opacity: 0.3 }}
                            animate={{ scale: 1.8, opacity: 0 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="absolute inset-0 rounded-full border-2 border-emerald-400/30 pointer-events-none"
                          />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Message Sent!</h3>
                        <p className="text-sm text-muted-foreground">
                          Thank you for reaching out. I&apos;ll respond soon.
                        </p>
                      </motion.div>
                    ) : (
                      <motion.form
                        key="form"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onSubmit={handleSubmit}
                        className="space-y-5"
                      >
                        {/* Name & Email row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="contact-name" className="text-sm font-medium">
                              Name
                            </Label>
                            <Input
                              id="contact-name"
                              placeholder="Your name"
                              value={name}
                              onChange={(e) => {
                                setName(e.target.value);
                                if (errors.name) setErrors((p) => ({ ...p, name: "" }));
                              }}
                              className={cn(
                                "transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-ring/40",
                                errors.name ? "border-destructive focus-visible:ring-destructive/20" : ""
                              )}
                            />
                            {errors.name && (
                              <p className="text-xs text-destructive">{errors.name}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="contact-email" className="text-sm font-medium">
                              Email
                            </Label>
                            <Input
                              id="contact-email"
                              type="email"
                              placeholder="you@email.com"
                              value={email}
                              onChange={(e) => {
                                setEmail(e.target.value);
                                if (errors.email) setErrors((p) => ({ ...p, email: "" }));
                              }}
                              className={cn(
                                "transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-ring/40",
                                errors.email ? "border-destructive focus-visible:ring-destructive/20" : ""
                              )}
                            />
                            {errors.email && (
                              <p className="text-xs text-destructive">{errors.email}</p>
                            )}
                          </div>
                        </div>

                        {/* Subject */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Subject</Label>
                          <Select
                            value={subject}
                            onValueChange={(val) => {
                              setSubject(val);
                              if (errors.subject) setErrors((p) => ({ ...p, subject: "" }));
                            }}
                          >
                            <SelectTrigger
                              className={cn(
                                "transition-all duration-200 focus:ring-2 focus:ring-ring/20 focus:border-ring/40",
                                errors.subject ? "border-destructive focus:ring-destructive/20" : ""
                              )}
                            >
                              <SelectValue placeholder="Select a subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {subjectOptions.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.subject && (
                            <p className="text-xs text-destructive">{errors.subject}</p>
                          )}
                        </div>

                        {/* Message */}
                        <div className="space-y-2">
                          <Label htmlFor="contact-message" className="text-sm font-medium">
                            Message
                          </Label>
                          <Textarea
                            id="contact-message"
                            placeholder="Your message..."
                            rows={5}
                            value={message}
                            onChange={(e) => {
                              setMessage(e.target.value);
                              if (errors.message) setErrors((p) => ({ ...p, message: "" }));
                            }}
                            className={cn(
                              "resize-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-ring/40",
                              errors.message ? "border-destructive focus-visible:ring-destructive/20" : ""
                            )}
                          />
                          {errors.message && (
                            <p className="text-xs text-destructive">{errors.message}</p>
                          )}
                        </div>

                        {/* Submit */}
                        <Button
                          type="submit"
                          disabled={submitting}
                          className="w-full h-11 rounded-xl font-medium gap-2 transition-all duration-200 hover:shadow-lg hover:shadow-black/[0.06] active:scale-[0.98] bg-[var(--site-accent)] hover:bg-[var(--site-accent)]/90 text-white"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="size-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="size-4" />
                              Send Message
                            </>
                          )}
                        </Button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>

            {/* Social links */}
            {socialEntries.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.2 }}
                className="mt-10 text-center"
              >
                <p className="text-sm text-muted-foreground mb-4">
                  Or find me elsewhere
                </p>
                <div className="flex items-center justify-center gap-3">
                  {socialEntries.map(([platform, url]) => {
                    const Icon = platformIcons[platform.toLowerCase()];
                    return (
                      <motion.a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.92 }}
                        className="size-10 flex items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:text-[var(--site-accent)] hover:border-[var(--site-accent)]/30 hover:bg-[var(--site-accent)]/5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={platform}
                      >
                        {Icon ? (
                          <Icon className="size-4" />
                        ) : (
                          <span className="text-xs font-medium capitalize">
                            {platform}
                          </span>
                        )}
                      </motion.a>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
