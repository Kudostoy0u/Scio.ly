"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// using half the navbar opacity to better match system ui tinting as the user scrolls.
export default function ThemeColorMeta() {
  const { darkMode } = useTheme();
  const pathname = usePathname();
  const [scrollOpacity, setScrollOpacity] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const threshold = 300; // match header.tsx fade distance
      const y = typeof window !== "undefined" ? window.scrollY : 0;
      const progress = Math.min(y / threshold, 1);
      setScrollOpacity(progress);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true } as EventListenerOptions);
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      return;
    }
    const isHome = pathname === "/";
    const isPractice = pathname === "/practice";
    const isTest = pathname?.startsWith("/test");
    const isCodebusters = pathname === "/codebusters";
    const isUnlimited = pathname === "/unlimited";

    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    const rgbToHex = (r: number, g: number, b: number) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

    if (isTest || isCodebusters || isUnlimited || isPractice) {
      const color = darkMode ? "#111827" /* gray-900 */ : "#ffffff" /* white */;
      meta.setAttribute("content", color);
      return;
    }

    if (!isHome) {
      const color = darkMode ? "#111827" /* gray-900 */ : "#ffffff";
      meta.setAttribute("content", color);
      return;
    }

    if (!darkMode) {
      const navbarActive = scrollOpacity > 0;
      const color = navbarActive ? "#ffffff" : "#ffffff" /* white */;
      meta.setAttribute("content", color);
      return;
    }

    const targetOpacity = 0.95; // match header.tsx
    const navAlpha = Math.min(scrollOpacity * targetOpacity, targetOpacity);
    const blendAlpha = navAlpha; // use actual navbar opacity so colors match visually

    const nav = { r: 17, g: 24, b: 39 }; // gray-900
    const bg = { r: 2, g: 6, b: 23 }; // slate-950 (matches initial in layout.tsx)

    const r = Math.round(nav.r * blendAlpha + bg.r * (1 - blendAlpha));
    const g = Math.round(nav.g * blendAlpha + bg.g * (1 - blendAlpha));
    const b = Math.round(nav.b * blendAlpha + bg.b * (1 - blendAlpha));
    const blendedHex = rgbToHex(r, g, b);
    meta.setAttribute("content", blendedHex);
  }, [darkMode, pathname, scrollOpacity]);

  return null;
}
