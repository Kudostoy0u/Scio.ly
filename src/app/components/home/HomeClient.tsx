"use client";

import { useTheme } from "@/app/contexts/themeContext";
import HylasBanner from "@/app/dashboard/components/HylasBanner";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import logger from "@/lib/utils/logger";
import Header from "@components/Header";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { ByStudentsSection } from "./components/ByStudentsSection";
import { FaqSection } from "./components/FaqSection";
import { FeaturesCarousel } from "./components/FeaturesCarousel";
import { Footer } from "./components/Footer";
import { HeroSection } from "./components/HeroSection";
import { TestimonialsSection } from "./components/TestimonialsSection";

export default function HomeClient() {
  const { darkMode } = useTheme();
  const router = useRouter();
  const [pwaChecked, setPwaChecked] = useState(false);
  const [isPwa, setIsPwa] = useState(false);
  const [bannerVisible, setBannerVisible] = useState<boolean | null>(null);

  useEffect(() => {
    const standalone =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone) {
      setIsPwa(true);
      router.replace("/dashboard");
    }
    setPwaChecked(true);
  }, [router]);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60);

  useEffect(() => {
    if (!darkMode && buttonRef.current) {
      const button = buttonRef.current;
      button.style.boxShadow = "";
      button.style.border = "";
    }
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark-scrollbar", darkMode);
    document.documentElement.classList.toggle("light-scrollbar", !darkMode);
  }, [darkMode]);

  // Sync banner visibility with localStorage and events (same as dashboard/header)
  useEffect(() => {
    const checkBannerVisibility = () => {
      const bannerClosed = SyncLocalStorage.getItem("hylas-banner-closed") === "true";
      setBannerVisible(!bannerClosed);
    };
    checkBannerVisibility();
    window.addEventListener("storage", checkBannerVisibility);
    window.addEventListener("banner-closed", checkBannerVisibility);
    return () => {
      window.removeEventListener("storage", checkBannerVisibility);
      window.removeEventListener("banner-closed", checkBannerVisibility);
    };
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      return;
    }
    const intervalId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [timeLeft]);

  const titleColor = darkMode ? "text-blue-400" : "text-blue-600";

  if (!pwaChecked || isPwa) {
    return null;
  }

  return (
    <div
      className={`relative font-Poppins w-full max-w-full overflow-x-hidden ${darkMode ? "bg-[#020617]" : "bg-white"}  cursor-default`}
    >
      {bannerVisible && (
        <HylasBanner
          onClose={() => {
            try {
              SyncLocalStorage.setItem("hylas-banner-closed", "true");
              window.dispatchEvent(new CustomEvent("banner-closed"));
            } catch (error) {
              logger.error("Failed to close banner:", error);
            }
            setBannerVisible(false);
          }}
        />
      )}
      <div
        className={bannerVisible ? "relative" : ""}
        style={bannerVisible ? { marginTop: "32px" } : {}}
      >
        <Header />
      </div>
      <HeroSection
        darkMode={darkMode}
        bannerVisible={!!bannerVisible}
        buttonRef={buttonRef as React.RefObject<HTMLButtonElement>}
      />
      <FeaturesCarousel darkMode={darkMode} titleColor={titleColor} />
      <ByStudentsSection darkMode={darkMode} />
      <TestimonialsSection darkMode={darkMode} />
      <FaqSection darkMode={darkMode} titleColor={titleColor} />
      <Footer darkMode={darkMode} />

      <style>{`
        .embla { overflow: hidden; }
        .embla__container { display: flex; gap: 1rem; }
        .embla__slide { flex: 0 0 30%; min-width: 0; }
        @media (max-width: 1024px) { .embla__slide { flex: 0 0 45%; } }
        @media (max-width: 768px) { .embla__slide { flex: 0 0 80%; } }
      `}</style>
    </div>
  );
}
