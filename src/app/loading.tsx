"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import Image from "next/image";

export default function Loading() {
  const { darkMode } = useTheme();
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches || ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true));

  if (!isStandalone) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}
    >
      <Image
        src="https://res.cloudinary.com/djilwi4nh/image/upload/v1760504427/site-logo_lzc8t0.png"
        alt="Scio.ly"
        width={96}
        height={96}
        className="rounded-lg shadow-sm"
        priority={true}
      />
      <div className={`mt-4 text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Loading…</div>
      <div className="mt-4 h-1.5 w-40 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div className="h-full w-1/3 rounded-full bg-blue-600 animate-[scio-loading_1.2s_ease-in-out_infinite]" />
      </div>
      <style jsx={true}>{`
        @keyframes scio-loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
