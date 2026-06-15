"use client";

import { useEffect, useState } from "react";
import {
  Globe,
  Twitter,
  Github,
  Linkedin,
  Plus,
  X,
  Save,
  AlertTriangle,
  Mail,
  Shield,
  Palette,
  Trash2,
  GripVertical,
  Code2,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { adminFetch } from "@/lib/admin-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SiteSettings {
  siteName: string;
  tagline: string;
  bio: string;
  accentColor: string;
  adminSlug: string;
  socialLinks: Record<string, string>;
  theme: string;
  customCss: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  useTls: boolean;
  isConfigured: boolean;
}

const SOCIAL_PRESETS = [
  { key: "twitter", label: "Twitter / X", icon: Twitter },
  { key: "github", label: "GitHub", icon: Github },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
];

export function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>({
    siteName: "",
    tagline: "",
    bio: "",
    accentColor: "#0a0a0a",
    adminSlug: "admin-dashboard",
    socialLinks: {},
    theme: "system",
    customCss: "",
  });
  const [smtp, setSmtp] = useState<SmtpConfig>({
    host: "",
    port: 587,
    username: "",
    password: "",
    fromName: "",
    fromEmail: "",
    useTls: true,
    isConfigured: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [showSmtpTest, setShowSmtpTest] = useState(false);
  const [slugWarning, setSlugWarning] = useState(false);
  const [showCssPreview, setShowCssPreview] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [settingsRes, smtpRes] = await Promise.all([
        adminFetch("/api/admin/settings"),
        adminFetch("/api/admin/smtp"),
      ]);

      if (settingsRes && settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data);
      }
      if (smtpRes && smtpRes.ok) {
        const data = await smtpRes.json();
        setSmtp(data);
      }
    } catch {
      // silently
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      if (res && res.ok) {
        toast.success("Settings saved");
      } else {
        const data = await res?.json();
        toast.error(data?.error || "Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function saveSmtp() {
    setSavingSmtp(true);
    try {
      const res = await adminFetch("/api/admin/smtp", {
        method: "PUT",
        body: JSON.stringify(smtp),
      });
      if (res && res.ok) {
        toast.success("SMTP configuration saved");
      } else {
        const data = await res?.json();
        toast.error(data?.error || "Failed to save SMTP config");
      }
    } catch {
      toast.error("Failed to save SMTP config");
    } finally {
      setSavingSmtp(false);
    }
  }

  async function testSmtp() {
    if (!testEmail) return;
    setTestingSmtp(true);
    try {
      const res = await adminFetch("/api/admin/smtp", {
        method: "POST",
        body: JSON.stringify({ to: testEmail }),
      });
      if (res && res.ok) {
        toast.success("Test email sent successfully!");
      } else {
        const data = await res?.json();
        toast.error(data?.error || "Failed to send test email");
      }
    } catch {
      toast.error("Failed to send test email");
    } finally {
      setTestingSmtp(false);
    }
  }

  function addSocialLink(key: string, label: string) {
    if (settings.socialLinks[key]) return;
    setSettings((prev) => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [key]: "" },
    }));
  }

  function removeSocialLink(key: string) {
    setSettings((prev) => {
      const newLinks = { ...prev.socialLinks };
      delete newLinks[key];
      return { ...prev, socialLinks: newLinks };
    });
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your site and server settings
        </p>
      </div>

      {/* Site Settings */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Globe className="w-4 h-4 text-primary" />
            </div>
            Site Settings
          </CardTitle>
          {/* Gradient underline with animated shimmer */}
          <div className="mt-3 h-[2px] bg-gradient-to-r from-primary/40 via-primary/15 to-transparent rounded-full" />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Site Name</Label>
              <Input
                value={settings.siteName}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, siteName: e.target.value }))
                }
                placeholder="My Blog"
                className="h-9 text-sm rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Tagline</Label>
              <Input
                value={settings.tagline}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, tagline: e.target.value }))
                }
                placeholder="A place for my thoughts"
                className="h-9 text-sm rounded-lg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Bio</Label>
            <Textarea
              value={settings.bio}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, bio: e.target.value }))
              }
              placeholder="Tell visitors about yourself..."
              className="resize-none rounded-lg"
              rows={3}
            />
          </div>

          {/* Accent Color */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Palette className="w-3 h-3" />
              Accent Color
            </Label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="color"
                  value={settings.accentColor}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, accentColor: e.target.value }))
                  }
                  className="w-10 h-10 rounded-xl border-0 cursor-pointer p-0 shadow-inner"
                />
              </div>
              <Input
                value={settings.accentColor}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, accentColor: e.target.value }))
                }
                className="w-32 font-mono text-sm rounded-lg"
              />
            </div>
            {/* Preset swatches with hover ring animation */}
            <div className="flex gap-2.5 mt-2">
              {["#0a0a0a", "#1a1a2e", "#0f3460", "#16213e", "#533483", "#e94560", "#0f766e", "#b45309", "#dc2626", "#7c3aed"].map((c) => (
                <button
                  key={c}
                  className={cn(
                    "w-7 h-7 rounded-full transition-all duration-200 hover:scale-125 focus-visible:ring-2 focus-visible:ring-ring",
                    settings.accentColor === c
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-sm"
                      : "ring-1 ring-border hover:ring-muted-foreground/40"
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setSettings((prev) => ({ ...prev, accentColor: c }))}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Default Theme</Label>
            <Select
              value={settings.theme}
              onValueChange={(v) =>
                setSettings((prev) => ({ ...prev, theme: v }))
              }
            >
              <SelectTrigger className="w-48 h-9 text-sm rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Gradient divider */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Social Links */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-muted-foreground">Social Links</Label>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                <GripVertical className="w-3 h-3" />
                <span>drag to reorder</span>
              </div>
            </div>
            {Object.entries(settings.socialLinks).map(([key, value]) => {
              const preset = SOCIAL_PRESETS.find((p) => p.key === key);
              const Icon = preset?.icon;
              return (
                <div key={key} className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs w-24 justify-center rounded-md gap-1.5">
                    {Icon && <Icon className="w-3 h-3" />}
                    {key}
                  </Badge>
                  <Input
                    value={value}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        socialLinks: { ...prev.socialLinks, [key]: e.target.value },
                      }))
                    }
                    placeholder={`https://${key}.com/...`}
                    className="flex-1 h-9 text-sm rounded-lg"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-200"
                    onClick={() => removeSocialLink(key)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
            <div className="flex gap-2 flex-wrap">
              {SOCIAL_PRESETS.filter(
                (preset) => !settings.socialLinks[preset.key]
              ).map((preset) => (
                <Button
                  key={preset.key}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs rounded-full gap-1 hover:bg-accent/80 active:scale-[0.97] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => addSocialLink(preset.key, preset.label)}
                >
                  <preset.icon className="w-3 h-3" />
                  {preset.label}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs rounded-full"
                onClick={() => {
                  const key = prompt("Enter social platform name (e.g., youtube):");
                  if (key) addSocialLink(key.toLowerCase(), key);
                }}
              >
                <Plus className="w-3 h-3 mr-1" />
                Custom
              </Button>
            </div>
          </div>

          {/* Gradient divider */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Admin Slug */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Admin URL Path</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-mono bg-muted/50 px-2.5 py-1.5 rounded-md">/</span>
              <Input
                value={settings.adminSlug}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                  setSettings((prev) => ({ ...prev, adminSlug: val }));
                  if (val !== settings.adminSlug) setSlugWarning(true);
                }}
                className="font-mono text-sm max-w-xs rounded-lg"
              />
            </div>
            {slugWarning && (
              <Alert className="border-amber-500/30 bg-amber-500/5">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-xs">
                  Changing the admin slug will change your admin panel URL. Make sure to bookmark the new URL.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="pt-2">
            <Button onClick={saveSettings} disabled={saving} size="sm" className="rounded-lg shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Save className="w-4 h-4 mr-1" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SMTP Configuration */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Mail className="w-4 h-4 text-primary" />
            </div>
            SMTP Configuration
          </CardTitle>
          {/* Gradient underline */}
          <div className="mt-3 h-[2px] bg-gradient-to-r from-primary/40 via-primary/15 to-transparent rounded-full" />
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            {smtp.isConfigured ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <Shield className="w-3 h-3" />
                Configured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                Not Configured
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">SMTP Host</Label>
              <Input
                value={smtp.host}
                onChange={(e) => setSmtp((prev) => ({ ...prev, host: e.target.value }))}
                placeholder="smtp.gmail.com"
                className="text-sm rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Port</Label>
              <Input
                type="number"
                value={smtp.port}
                onChange={(e) =>
                  setSmtp((prev) => ({ ...prev, port: parseInt(e.target.value) || 587 }))
                }
                className="text-sm rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Username</Label>
              <Input
                value={smtp.username}
                onChange={(e) =>
                  setSmtp((prev) => ({ ...prev, username: e.target.value }))
                }
                placeholder="user@gmail.com"
                className="text-sm rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Password</Label>
              <Input
                type="password"
                value={smtp.password}
                onChange={(e) =>
                  setSmtp((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder={smtp.isConfigured ? "••••••••" : "app-specific password"}
                className="text-sm rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">From Name</Label>
              <Input
                value={smtp.fromName}
                onChange={(e) =>
                  setSmtp((prev) => ({ ...prev, fromName: e.target.value }))
                }
                placeholder="My Blog"
                className="text-sm rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">From Email</Label>
              <Input
                type="email"
                value={smtp.fromEmail}
                onChange={(e) =>
                  setSmtp((prev) => ({ ...prev, fromEmail: e.target.value }))
                }
                placeholder="noreply@email.com"
                className="text-sm rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={smtp.useTls}
              onCheckedChange={(v) => setSmtp((prev) => ({ ...prev, useTls: v }))}
            />
            <Label className="text-xs font-medium text-muted-foreground">Use TLS/SSL</Label>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button onClick={saveSmtp} disabled={savingSmtp} size="sm" className="rounded-lg shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Save className="w-4 h-4 mr-1" />
              {savingSmtp ? "Saving..." : "Save SMTP"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSmtpTest(!showSmtpTest)}
              className="rounded-lg"
            >
              Test Email
            </Button>
          </div>

          {showSmtpTest && (
            <div className="flex gap-2 items-end p-4 bg-muted/40 rounded-xl border border-border/50">
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs font-medium text-muted-foreground">Recipient Email</Label>
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@email.com"
                  className="h-9 text-sm rounded-lg"
                />
              </div>
              <Button size="sm" onClick={testSmtp} disabled={testingSmtp || !testEmail} className="rounded-lg">
                {testingSmtp ? "Sending..." : "Send Test"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom CSS */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Code2 className="w-4 h-4 text-primary" />
            </div>
            Custom CSS
          </CardTitle>
          {/* Gradient underline */}
          <div className="mt-3 h-[2px] bg-gradient-to-r from-primary/40 via-primary/15 to-transparent rounded-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-amber-500/30 bg-amber-500/5">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-xs">
              Custom CSS will be applied site-wide. Be careful with styling changes.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">CSS Code</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowCssPreview(!showCssPreview)}
              >
                <Eye className="w-3 h-3 mr-1" />
                {showCssPreview ? "Hide Preview" : "Preview"}
              </Button>
            </div>

            {showCssPreview && settings.customCss && (
              <div className="rounded-lg border bg-muted/30 p-4 max-h-64 overflow-y-auto mb-3">
                <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words">
                  {settings.customCss}
                </pre>
              </div>
            )}

            <Textarea
              value={settings.customCss}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, customCss: e.target.value }))
              }
              placeholder={`/* Your custom CSS here */\n.my-custom-class {\n  color: red;\n}`}
              className="font-mono text-sm resize-none rounded-lg min-h-[160px]"
              rows={8}
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-muted-foreground/60">
                {settings.customCss.length} characters
              </span>
            </div>
          </div>

          <div className="pt-1">
            <Button onClick={saveSettings} disabled={saving} size="sm" className="rounded-lg shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Save className="w-4 h-4 mr-1" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
