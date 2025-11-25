"use client";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "@/app/contexts/themeContext";
import type { ReactNode } from "react";
import { useEffect } from "react";

// (notifications fetch monkeypatch removed)

export function Providers({ children }: { children: ReactNode }) {
  const { darkMode } = useTheme();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator &&
        (window.navigator as { standalone?: boolean }).standalone === true);
    const isOfflinePage = window.location.pathname === "/offline/";

    if (!(isStandalone || isOfflinePage)) {
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // ignore
      }
    };

    const id = setTimeout(register, 0);
    return () => clearTimeout(id);
  }, []);

  // (no notifications fetch on load)

  return (
    <>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss={true}
        draggable={true}
        pauseOnHover={true}
        theme={darkMode ? "dark" : "light"}
      />
    </>
  );
}
