"use client";

import { useEffect, useState } from "react";
import { useAdminStore } from "@/stores/admin-store";
import { getAdminToken, clearAdminToken } from "@/lib/admin-utils";
import { SetupWizard } from "@/components/admin/setup-wizard";
import { LoginPage } from "@/components/admin/login-page";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Skeleton } from "@/components/ui/skeleton";

type AdminState = "loading" | "setup" | "login" | "dashboard";

export default function AdminSlugPage() {
  const [state, setState] = useState<AdminState>("loading");
  const { setAdmin, clearAdmin, hydrateFromLocalStorage } = useAdminStore();

  useEffect(() => {
    async function init() {
      try {
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
            // Check localStorage for cross-tab navigation (edit blog/note)
            hydrateFromLocalStorage();
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
          // Check localStorage for cross-tab navigation (edit blog/note)
          hydrateFromLocalStorage();
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
