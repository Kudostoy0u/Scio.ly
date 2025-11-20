"use client";

import { getFavoriteConfigs, isConfigFavorited, toggleFavoriteConfig } from "@/app/utils/favorites";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import type { Settings } from "@/app/practice/types";

export default function FavoriteHeart({
  darkMode,
  selectedEventName,
  settings,
}: {
  darkMode: boolean;
  selectedEventName: string | null;
  settings: Settings;
}) {
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    if (!selectedEventName) {
      setFavorited(false);
      return;
    }
    try {
      setFavorited(isConfigFavorited({ eventName: selectedEventName, settings }));
    } catch {}
  }, [selectedEventName, settings]);

  const toggle = () => {
    if (!selectedEventName) {
      return;
    }
    const already = isConfigFavorited({ eventName: selectedEventName, settings });
    if (!already) {
      try {
        const count = getFavoriteConfigs().length;
        if (count >= 4) {
          toast.error(
            "Maximum of 4 favorites reached. Unfavorite a configuration to add a new one."
          );
          return;
        }
      } catch {}
    }
    const { favorited: nowFav } = toggleFavoriteConfig({ eventName: selectedEventName, settings });
    setFavorited(nowFav);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!selectedEventName}
      className={`p-2 rounded-md border transition-colors ${
        selectedEventName
          ? favorited
            ? (
                darkMode
                  ? "border-pink-500 text-pink-400 hover:bg-pink-500/10"
                  : "border-pink-500 text-pink-600 hover:bg-pink-100"
              )
            : (
                darkMode
                  ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                  : "border-gray-200 text-gray-700 hover:bg-gray-100"
              )
          : darkMode
            ? "opacity-50 border-gray-700 text-gray-500"
            : "opacity-50 border-gray-200 text-gray-400"
      }`}
      title={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart className={`w-5 h-5 ${favorited ? "fill-current" : ""}`} />
    </button>
  );
}
