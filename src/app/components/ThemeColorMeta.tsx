"use client";

import { useEffect, useState } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { usePathname } from 'next/navigation';

// Keeps theme-color meta aligned with the visible navbar/background
// On the homepage in dark mode, blends the navbar color over the page background
// using half the navbar opacity to better match system UI tinting as the user scrolls.
export default function ThemeColorMeta() {
  const { darkMode } = useTheme();
  const pathname = usePathname();
  const [scrollOpacity, setScrollOpacity] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const threshold = 300; // match Header.tsx fade distance
      const y = typeof window !== 'undefined' ? window.scrollY : 0;
      const progress = Math.min(y / threshold, 1);
      setScrollOpacity(progress);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true } as EventListenerOptions);
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) return;
    const isHome = pathname === '/';
    const isPractice = pathname === '/practice';
    const isTest = pathname?.startsWith('/test');
    const isCodebusters = pathname === '/codebusters';
    const isUnlimited = pathname === '/unlimited';

    // Helper: RGB -> hex string
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    const rgbToHex = (r: number, g: number, b: number) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

    if (isTest || isCodebusters || isUnlimited || isPractice) {
      const color = darkMode ? '#111827' /* gray-900 */ : '#f9fafb' /* gray-50 */;
      meta.setAttribute('content', color);
      return;
    }

    // Default colors (other pages)
    if (!isHome) {
      const color = darkMode ? '#111827' /* gray-900 */ : '#f9fafb';
      meta.setAttribute('content', color);
      return;
    }

    // Homepage behavior
    if (!darkMode) {
      // Keep existing light mode behavior simple
      const navbarActive = scrollOpacity > 0;
      const color = navbarActive ? '#ffffff' : '#f9fafb' /* gray-50 */;
      meta.setAttribute('content', color);
      return;
    }

    // Dark mode on homepage: blend navbar over background using same opacity as the navbar
    const targetOpacity = 0.95; // match Header.tsx
    const navAlpha = Math.min(scrollOpacity * targetOpacity, targetOpacity);
    const blendAlpha = navAlpha; // use actual navbar opacity so colors match visually

    // Colors
    const nav = { r: 17, g: 24, b: 39 }; // gray-900
    const bg = { r: 2, g: 6, b: 23 }; // slate-950 (matches initial in layout.tsx)

    const r = Math.round(nav.r * blendAlpha + bg.r * (1 - blendAlpha));
    const g = Math.round(nav.g * blendAlpha + bg.g * (1 - blendAlpha));
    const b = Math.round(nav.b * blendAlpha + bg.b * (1 - blendAlpha));
    const blendedHex = rgbToHex(r, g, b);
    meta.setAttribute('content', blendedHex);
  }, [darkMode, pathname, scrollOpacity]);

  return null;
}


