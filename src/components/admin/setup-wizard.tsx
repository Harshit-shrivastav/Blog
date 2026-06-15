"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, ArrowLeft, ArrowRight, Check, Sparkles, Globe, User, Shield, Palette, Link as LinkIcon } from "lucide-react";
import { setAdminToken } from "@/lib/admin-utils";
import { getPasswordStrength } from "@/lib/admin-utils";
import { useAdminStore } from "@/stores/admin-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SetupWizardProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 5;

const stepInfo = [
  { icon: Globe, title: "Your Site", description: "Name and tagline" },
  { icon: User, title: "Admin Details", description: "Name and email" },
  { icon: Shield, title: "Password", description: "Secure your account" },
  { icon: Palette, title: "Customize", description: "Accent color" },
  { icon: LinkIcon, title: "Admin URL", description: "Set your admin path" },
];

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setAdmin } = useAdminStore();

  const [siteName, setSiteName] = useState("");
  const [tagline, setTagline] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accentColor, setAccentColor] = useState("#0a0a0a");
  const [adminSlug, setAdminSlug] = useState("admin-dashboard");

  const strength = getPasswordStrength(password);

  function validateStep(): boolean {
    setError("");
    switch (step) {
      case 0:
        if (!siteName.trim()) {
          setError("Site name is required");
          return false;
        }
        return true;
      case 1:
        if (!displayName.trim()) {
          setError("Display name is required");
          return false;
        }
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setError("Valid email is required");
          return false;
        }
        return true;
      case 2:
        if (password.length < 8) {
          setError("Password must be at least 8 characters");
          return false;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          return false;
        }
        return true;
      case 3:
        return true;
      case 4:
        if (!adminSlug.trim() || !/^[a-z0-9-]+$/.test(adminSlug)) {
          setError("Admin slug must only contain lowercase letters, numbers, and hyphens");
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  async function handleSubmit() {
    if (!validateStep()) return;

    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName: siteName.trim(),
          tagline: tagline.trim(),
          displayName: displayName.trim(),
          email: email.trim(),
          password,
          accentColor,
          adminSlug: adminSlug.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Setup failed");
        return;
      }

      setAdminToken(data.token);
      setAdmin({
        id: "",
        displayName: displayName.trim(),
        email: email.trim(),
        avatar: null,
      });
      toast.success("Setup complete! Welcome to your blog.");
      onComplete();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (step > 0) {
      setStep(step - 1);
      setError("");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {stepInfo.map((s, i) => {
              const isCompleted = i < step;
              const isCurrent = i === step;
              return (
                <div key={i} className="flex items-center">
                  <motion.div
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300",
                      isCompleted
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : isCurrent
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground"
                    )}
                    animate={{ scale: isCurrent ? 1.05 : 1 }}
                    transition={{ type: "spring", bounce: 0.3 }}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      i + 1
                    )}
                  </motion.div>
                  {i < stepInfo.length - 1 && (
                    <div className="w-6 sm:w-10 h-0.5 mx-1.5 rounded-full overflow-hidden bg-muted">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ width: i < step ? "100%" : "0%" }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between">
            {stepInfo.map((s, i) => (
              <span
                key={i}
                className={cn(
                  "text-[10px] sm:text-xs transition-colors duration-300",
                  i === step ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                <span className="hidden sm:inline">{s.title}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <Card className="shadow-lg">
              <CardHeader className="text-center pb-2 pt-8">
                <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
                  {(() => {
                    const Icon = stepInfo[step].icon;
                    return <Icon className="w-6 h-6 text-primary" />;
                  })()}
                </div>
                <CardTitle className="text-xl">{stepInfo[step].title}</CardTitle>
                <CardDescription className="mt-1">{stepInfo[step].description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 px-8 pb-8">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Step 0: Site Info */}
                {step === 0 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="siteName" className="text-sm font-medium">Site Name</Label>
                      <Input
                        id="siteName"
                        placeholder="My Blog"
                        value={siteName}
                        onChange={(e) => setSiteName(e.target.value)}
                        autoFocus
                        className="h-10 rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tagline" className="text-sm font-medium">Tagline (optional)</Label>
                      <Input
                        id="tagline"
                        placeholder="A place for my thoughts"
                        value={tagline}
                        onChange={(e) => setTagline(e.target.value)}
                        className="h-10 rounded-lg"
                      />
                    </div>
                  </>
                )}

                {/* Step 1: Admin Details */}
                {step === 1 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="displayName" className="text-sm font-medium">Display Name</Label>
                      <Input
                        id="displayName"
                        placeholder="Your Name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        autoFocus
                        className="h-10 rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-10 rounded-lg"
                      />
                    </div>
                  </>
                )}

                {/* Step 2: Password */}
                {step === 2 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="At least 8 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoFocus
                          className="h-10 pr-10 rounded-lg"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {password && (
                        <div className="space-y-2">
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500 ease-out",
                                strength.score === 0 && "w-0",
                                strength.score === 1 && "w-1/5 bg-red-500",
                                strength.score === 2 && "w-2/5 bg-orange-500",
                                strength.score === 3 && "w-3/5 bg-amber-500",
                                strength.score === 4 && "w-4/5 bg-emerald-500",
                                strength.score === 5 && "w-full bg-emerald-500",
                              )}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {strength.label}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Repeat your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-10 rounded-lg"
                      />
                    </div>
                  </>
                )}

                {/* Step 3: Customize */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Accent Color</Label>
                      <p className="text-xs text-muted-foreground">
                        Choose a color for links, buttons, and highlights
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <input
                            type="color"
                            value={accentColor}
                            onChange={(e) => setAccentColor(e.target.value)}
                            className="w-12 h-12 rounded-xl border-0 cursor-pointer p-0 shadow-inner"
                          />
                        </div>
                        <Input
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="flex-1 font-mono rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-6 gap-2.5">
                      {[
                        "#0a0a0a", "#1a1a2e", "#2d1b69", "#1b4332",
                        "#7c2d12", "#581c87", "#0c4a6e", "#365314",
                        "#991b1b", "#4c1d95", "#065f46", "#9a3412",
                      ].map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={cn(
                            "w-full aspect-square rounded-xl border-2 transition-all duration-200 hover:scale-110",
                            accentColor === color
                              ? "border-foreground scale-110 ring-2 ring-foreground/20"
                              : "border-transparent hover:border-muted-foreground/40"
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => setAccentColor(color)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 4: Admin Slug */}
                {step === 4 && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="adminSlug" className="text-sm font-medium">Admin URL Path</Label>
                      <p className="text-xs text-muted-foreground">
                        This is the URL where you access your admin panel
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground whitespace-nowrap font-mono bg-muted/50 px-3 py-2.5 rounded-lg">/</span>
                        <Input
                          id="adminSlug"
                          value={adminSlug}
                          onChange={(e) =>
                            setAdminSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                          }
                          className="font-mono rounded-lg"
                        />
                      </div>
                    </div>
                    <Alert className="border-primary/20 bg-primary/5">
                      <AlertDescription className="text-xs">
                        <Sparkles className="w-3 h-3 inline mr-1" />
                        Make note of your admin URL. You will need it to log in.
                        Your admin panel will be at: <strong>/{adminSlug}</strong>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between pt-6">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    disabled={step === 0}
                    className={cn("rounded-lg", step === 0 ? "invisible" : "")}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className={cn(
                      "rounded-lg shadow-sm hover:shadow-md transition-all duration-200 min-w-[120px]",
                      step === TOTAL_STEPS - 1 && "bg-primary hover:bg-primary/90 shadow-md"
                    )}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Setting up...
                      </span>
                    ) : step === TOTAL_STEPS - 1 ? (
                      "Complete Setup"
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <p className="text-center text-xs text-muted-foreground mt-6 tabular-nums">
          Step {step + 1} of {TOTAL_STEPS}
        </p>
      </div>
    </div>
  );
}
