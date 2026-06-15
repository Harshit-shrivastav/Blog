"use client";

import { useEffect, useState } from "react";
import { useAdminStore } from "@/stores/admin-store";
import { getAdminToken, clearAdminToken } from "@/lib/admin-utils";
import { SetupWizard } from "@/components/admin/setup-wizard";
import { LoginPage } from "@/components/admin/login-page";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Skeleton } from "@/components/ui/skeleton";

type AdminState = "loading" | "setup" | "login" | "dashboard" | "not-found";

export default function AdminCatchAllPage() {
  const [state, setState] = useState<AdminState>("loading");
  const { setAdmin, clearAdmin } = useAdminStore();
  const [isValidAdmin, setIsValidAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    async function init() {
      try {
        // First validate this is actually the admin route
        const pathname = window.location.pathname;
        const firstSegment = pathname.split("/")[1]; // e.g., "admin-dashboard" from /admin-dashboard

        if (!firstSegment) {
          setIsValidAdmin(false);
          setState("not-found");
          return;
        }

        // Fetch site settings to check the admin slug
        const settingsRes = await fetch("/api/site/settings");
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          // Only validate slug if adminSlug is present in settings response
          if (settings.adminSlug && firstSegment !== settings.adminSlug) {
            setIsValidAdmin(false);
            setState("not-found");
            return;
          }
        }
        // If settings fetch fails or adminSlug is not set, allow through (might be first setup)

        setIsValidAdmin(true);

        // Check if setup is complete
        const statusRes = await fetch("/api/admin/status");
        const statusData = await statusRes.json();

        if (!statusData.setupComplete) {
          setState("setup");
          return;
        }

        // Setup is complete, check auth token
        const token = getAdminToken();
        if (!token) {
          // Try cookie-based auth via /api/admin/me (cookie is httpOnly)
          const meRes = await fetch("/api/admin/me");
          if (meRes.ok) {
            const { admin } = await meRes.json();
            setAdmin(admin);
            setState("dashboard");
            return;
          }
          setState("login");
          return;
        }

        // Verify token
        const meRes = await fetch("/api/admin/me", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (meRes.ok) {
          const { admin } = await meRes.json();
          setAdmin(admin);
          setState("dashboard");
        } else {
          clearAdminToken();
          clearAdmin();
          setState("login");
        }
      } catch {
        setState("login");
      }
    }

    init();
  }, [setAdmin, clearAdmin]);

  // Show 404 if this is not the admin route
  if (state === "not-found" || isValidAdmin === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="text-8xl font-bold text-muted-foreground/20 mb-4">404</div>
        <h1 className="text-xl font-semibold mb-2">Page not found</h1>
        <p className="text-sm text-muted-foreground mb-6">The page you're looking for doesn't exist.</p>
        <a
          href="/"
          className="text-sm text-primary hover:underline underline-offset-4 transition-colors"
        >
          Go back home
        </a>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
          <div className="space-y-2 pt-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (state === "setup") {
    return <SetupWizard onComplete={() => setState("dashboard")} />;
  }

  if (state === "login") {
    return <LoginPage onLogin={() => setState("dashboard")} />;
  }

  return <AdminLayout />;
}
