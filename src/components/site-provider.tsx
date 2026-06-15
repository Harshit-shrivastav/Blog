"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface SiteContextType {
  siteSettings: {
    siteName: string;
    tagline: string;
    bio: string;
    accentColor: string;
    socialLinks: Record<string, string>;
    globalCommentsEnabled: boolean;
  } | null;
  loading: boolean;
}

const SiteContext = createContext<SiteContextType>({ siteSettings: null, loading: true });

export function SiteProvider({ children }: { children: ReactNode }) {
  const [siteSettings, setSiteSettings] = useState<SiteContextType["siteSettings"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/site/settings")
      .then((r) => r.json())
      .then((data) => {
        setSiteSettings(data);
        setLoading(false);
        if (data?.accentColor) {
          document.documentElement.style.setProperty("--site-accent", data.accentColor);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <SiteContext.Provider value={{ siteSettings, loading }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  return useContext(SiteContext);
}
