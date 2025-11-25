"use client";

import { useTheme } from "@/app/contexts/themeContext";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

// using half the navbar opacity to better match system ui tinting as the user scrolls.
export default function ThemeColorMeta() {
  const { darkMode } = useTheme();
  const pathname = usePathname();
  const [scrollOpacity, setScrollOpacity] = useState(0);

  const onScroll = useCallback(() => {
    const threshold = 300; // match header.tsx fade distance
    const y = typeof window !== "undefined" ? window.scrollY : 0;
    const progress = Math.min(y / threshold, 1);
    setScrollOpacity(progress);
  }, []);

  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true } as EventListenerOptions);
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  useEffect(() => {
    // Helper function to check if path is a test page
    const isTestPage = (path: string): boolean => {
      return (
        path?.startsWith("/test") ||
        path === "/codebusters" ||
        path === "/unlimited" ||
        path === "/practice"
      );
    };

    // Helper function to convert RGB to hex
    const toHex = (n: number): string => n.toString(16).padStart(2, "0");
    const rgbToHex = (r: number, g: number, b: number): string =>
      `#${toHex(r)}${toHex(g)}${toHex(b)}`;

    // Helper function to get color for test/practice pages
    const getTestPageColor = (isDark: boolean): string => {
      return isDark ? "#111827" /* gray-900 */ : "#ffffff" /* white */;
    };

    // Helper function to blend colors for dark mode home page
    const blendColorsForDarkHome = (opacity: number): string => {
      const targetOpacity = 0.95; // match header.tsx
      const navAlpha = Math.min(opacity * targetOpacity, targetOpacity);
      const blendAlpha = navAlpha; // use actual navbar opacity so colors match visually

      const nav = { r: 17, g: 24, b: 39 }; // gray-900
      const bg = { r: 2, g: 6, b: 23 }; // slate-950 (matches initial in layout.tsx)

      const r = Math.round(nav.r * blendAlpha + bg.r * (1 - blendAlpha));
      const g = Math.round(nav.g * blendAlpha + bg.g * (1 - blendAlpha));
      const b = Math.round(nav.b * blendAlpha + bg.b * (1 - blendAlpha));
      return rgbToHex(r, g, b);
    };

    // Helper function to get theme color based on path and mode
    const getThemeColor = (path: string, isDark: boolean, opacity: number): string => {
      if (isTestPage(path)) {
        return getTestPageColor(isDark);
      }

      if (path !== "/") {
        return getTestPageColor(isDark);
      }

      if (!isDark) {
        return "#ffffff" /* white */;
      }

      return blendColorsForDarkHome(opacity);
    };

    const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      return;
    }

    const color = getThemeColor(pathname, darkMode, scrollOpacity);
    meta.setAttribute("content", color);
  }, [darkMode, pathname, scrollOpacity]);

  return null;
}
