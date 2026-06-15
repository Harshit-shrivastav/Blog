"use client";

import { useEffect, useState } from "react";
import {
  User,
  Camera,
  Save,
  Eye,
  EyeOff,
  Shield,
  X,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { adminFetch, fileToBase64, getPasswordStrength } from "@/lib/admin-utils";
import { useAdminStore } from "@/stores/admin-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const passwordRequirements = [
  { label: "At least 8 characters", met: (p: string) => p.length >= 8 },
  { label: "Contains uppercase", met: (p: string) => /[A-Z]/.test(p) },
  { label: "Contains lowercase", met: (p: string) => /[a-z]/.test(p) },
  { label: "Contains number", met: (p: string) => /[0-9]/.test(p) },
  { label: "Contains special character", met: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export function AccountPage() {
  const { admin, setAdmin } = useAdminStore();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (admin) {
      setDisplayName(admin.displayName);
      setEmail(admin.email);
      setAvatar(admin.avatar);
    }
  }, [admin]);

  const strength = getPasswordStrength(newPassword);

  async function saveProfile() {
    if (!displayName.trim() || !email.trim()) {
      toast.error("Display name and email are required");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await adminFetch("/api/admin/me", {
        method: "PUT",
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim(),
          avatar,
        }),
      });
      if (res && res.ok) {
        const data = await res.json();
        setAdmin(data.admin);
        toast.success("Profile updated");
      } else {
        const data = await res?.json();
        toast.error(data?.error || "Failed to update profile");
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    if (!currentPassword) {
      toast.error("Current password is required");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await adminFetch("/api/admin/me", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      if (res && res.ok) {
        toast.success("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res?.json();
        toast.error(data?.error || "Failed to change password");
      }
    } catch {
      toast.error("Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  }

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    fileToBase64(file).then((base64) => {
      setAvatar(base64);
    });
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your admin account
        </p>
      </div>

      {/* Profile */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <User className="w-4 h-4 text-primary" />
            </div>
            Profile
          </CardTitle>
          <div className="h-[1px] bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="relative">
                <Avatar className="h-20 w-20 ring-2 ring-border">
                  <AvatarImage src={avatar || undefined} />
                  <AvatarFallback className="text-xl bg-gradient-to-br from-primary/20 to-primary/5">
                    {displayName
                      ? displayName.slice(0, 2).toUpperCase()
                      : "AD"}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -inset-1 rounded-full bg-gradient-to-tr from-primary/40 via-transparent to-primary/10 -z-10" />
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px] rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 ring-1 ring-white/20">
                <Camera className="w-5 h-5 text-white drop-shadow-md" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </label>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{displayName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{email}</p>
            </div>
            {avatar && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs text-muted-foreground rounded-lg"
                onClick={() => setAvatar(null)}
              >
                Remove
              </Button>
            )}
          </div>

          <Separator />

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="text-sm rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-sm rounded-lg"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={saveProfile} disabled={savingProfile} size="sm" className="rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
              <Save className="w-4 h-4 mr-1" />
              {savingProfile ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            Change Password
          </CardTitle>
          <div className="h-[1px] bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Current Password</Label>
            <div className="relative">
              <Input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="text-sm pr-10 rounded-lg"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">New Password</Label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="text-sm pr-10 rounded-lg"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            {newPassword && (
              <div className="space-y-3">
                {/* Strength bar */}
                <div className="space-y-1.5">
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className={cn(
                        "h-full rounded-full",
                        strength.score <= 1 && "bg-red-500",
                        strength.score === 2 && "bg-orange-500",
                        strength.score === 3 && "bg-amber-500",
                        strength.score >= 4 && "bg-gradient-to-r from-emerald-400 to-emerald-600",
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${(strength.score / 5) * 100}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </div>
                  <p className={cn("text-xs font-medium transition-colors duration-300",
                    strength.score <= 1 && "text-red-500",
                    strength.score === 2 && "text-orange-500",
                    strength.score === 3 && "text-amber-500",
                    strength.score >= 4 && "text-emerald-500"
                  )}>{strength.label}</p>
                </div>
                {/* Requirements checklist */}
                <div className="space-y-1.5">
                  {passwordRequirements.map((req) => (
                    <div
                      key={req.label}
                      className={cn(
                        "flex items-center gap-2 text-xs transition-colors duration-200",
                        req.met(newPassword) ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/60"
                      )}
                    >
                      {req.met(newPassword) ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-current" />
                      )}
                      {req.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Confirm New Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="text-sm rounded-lg"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <X className="w-3 h-3" />
                Passwords do not match
              </p>
            )}
          </div>

          <div className="pt-2">
            <Button
              onClick={changePassword}
              disabled={
                savingPassword ||
                !currentPassword ||
                !newPassword ||
                newPassword !== confirmPassword
              }
              size="sm"
              className="rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Save className="w-4 h-4 mr-1" />
              {savingPassword ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
