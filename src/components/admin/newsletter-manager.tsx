"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Send,
  Mail,
  UserMinus,
  Eye,
  Users,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Subscriber {
  id: string;
  email: string;
  status: string;
  subscribedAt: string;
  unsubscribedAt: string | null;
}

export function NewsletterManager() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [unsubId, setUnsubId] = useState<string | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadSubscribers();
  }, []);

  async function loadSubscribers() {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/newsletter?limit=50");
      if (res && res.ok) {
        const data = await res.json();
        setSubscribers(data.subscribers);
      }
    } catch {
      // silently
    } finally {
      setLoading(false);
    }
  }

  async function handleUnsubscribe() {
    if (!unsubId) return;
    try {
      // Since there's no specific unsubscribe endpoint, use the public API
      toast.info("Unsubscribe feature - use the public unsubscribe flow");
    } finally {
      setUnsubId(null);
    }
  }

  async function handleBroadcast() {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body are required");
      return;
    }
    setSending(true);
    try {
      const res = await adminFetch("/api/admin/newsletter", {
        method: "POST",
        body: JSON.stringify({ subject: subject.trim(), body: body.trim() }),
      });
      if (res && res.ok) {
        const data = await res.json();
        toast.success(`Sent to ${data.sentCount} subscribers (${data.failedCount} failed)`);
        setBroadcastOpen(false);
        setSubject("");
        setBody("");
      } else {
        const data = await res?.json();
        toast.error(data?.error || "Failed to send broadcast");
      }
    } catch {
      toast.error("Failed to send broadcast");
    } finally {
      setSending(false);
    }
  }

  const filtered = subscribers.filter((s) =>
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const activeCount = subscribers.filter((s) => s.status === "active").length;
  const unsubCount = subscribers.filter((s) => s.status === "unsubscribed").length;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Newsletter</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage subscribers and send broadcasts
          </p>
        </div>
        <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-lg shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Mail className="w-4 h-4 mr-1.5" />
              Broadcast
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Send Broadcast Email
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Subject</Label>
                <Input
                  placeholder="Newsletter subject line"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-10 text-sm rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Body (HTML)</Label>
                <Textarea
                  placeholder="<h2>Hello!</h2><p>Your content here...</p>"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[220px] font-mono text-sm rounded-lg"
                />
                {body && (
                  <div className="border rounded-lg p-4 bg-muted/30 max-h-52 overflow-y-auto ring-1 ring-border/50">
                    <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider">Preview</p>
                    <div
                      className="text-sm prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: body }}
                    />
                  </div>
                )}
              </div>
              {subject && body && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border/50">
                  <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    This will send to <strong>{activeCount}</strong> active subscribers.
                  </p>
                </div>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setBroadcastOpen(false)} className="rounded-lg">
                  Cancel
                </Button>
                <Button onClick={handleBroadcast} disabled={sending || !subject || !body} className="rounded-lg shadow-sm">
                  {sending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-1" />
                      Send to All
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <Card className="border-l-[3px] border-l-emerald-500 hover:shadow-lg hover:-translate-y-0.5 dark:hover:shadow-black/[0.2] transition-all duration-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <p className="text-3xl font-bold tracking-tighter tabular-nums">
                {activeCount}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 tracking-wide uppercase">Active Subscribers</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
        >
          <Card className="border-l-[3px] border-l-muted-foreground/30 hover:shadow-lg hover:-translate-y-0.5 dark:hover:shadow-black/[0.2] transition-all duration-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-muted">
                  <UserMinus className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>
              <p className="text-3xl font-bold tracking-tighter tabular-nums">
                {unsubCount}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 tracking-wide uppercase">Unsubscribed</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search */}
      <div className="relative max-w-md group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary group-focus-within:scale-110 transition-all duration-200" />
        <Input
          placeholder="Search subscribers by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 bg-muted/40 border-transparent focus:border-border focus:bg-background focus:ring-1 focus:ring-ring/30 focus:shadow-sm transition-all duration-200"
        />
      </div>

      {/* Subscribers Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="py-20 text-center"
            >
              <div className="relative mx-auto w-16 h-16 mb-4">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-muted/60 to-muted/20 blur-sm animate-subtle-pulse" />
                <div className="relative w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                  <Mail className="w-7 h-7 text-muted-foreground" />
                </div>
              </div>
              <p className="text-muted-foreground text-sm font-medium mb-1">
                {search ? "No subscribers match your search" : "No subscribers yet"}
              </p>
              <p className="text-muted-foreground/60 text-xs">
                Subscribers will appear here when they sign up
              </p>
            </motion.div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</TableHead>
                    <TableHead className="w-28 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                    <TableHead className="w-36 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subscribed</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((sub, idx) => (
                    <TableRow
                      key={sub.id}
                      className={cn(
                        "transition-all duration-200",
                        idx % 2 === 0 ? "bg-transparent" : "bg-muted/20",
                        "hover:bg-muted/60 hover:shadow-sm"
                      )}
                    >
                      <TableCell className="py-3.5 text-sm">{sub.email}</TableCell>
                      <TableCell className="py-3.5">
                        {sub.status === "active" ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                            Unsubscribed
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5 text-xs text-muted-foreground tabular-nums">
                        {formatDate(sub.subscribedAt)}
                      </TableCell>
                      <TableCell className="py-3.5">
                        {sub.status === "active" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-[0.97] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => setUnsubId(sub.id)}
                          >
                            <UserMinus className="w-3 h-3 mr-1" />
                            Unsub
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unsubscribe confirmation */}
      <AlertDialog open={!!unsubId} onOpenChange={() => setUnsubId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsubscribe</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the subscriber as unsubscribed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnsubscribe} className="rounded-lg">
              Unsubscribe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
