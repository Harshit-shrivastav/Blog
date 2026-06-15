"use client";

import { useEffect, useState } from "react";

export function CustomCss() {
  const [css, setCss] = useState("");

  useEffect(() => {
    fetch("/api/site/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.customCss) {
          setCss(data.customCss);
        }
      })
      .catch(() => {
        // silently ignore
      });
  }, []);

  if (!css) return null;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
