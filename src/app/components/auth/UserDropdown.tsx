"use client";
import type { User } from "@supabase/supabase-js";
import { Settings, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { MutableRefObject } from "react";
import type React from "react";

export default function UserDropdown({
  darkMode,
  user,
  photoUrl,
  displayName,
  username,
  handleSignOut,
  isDropdownOpen,
  setIsDropdownOpen,
  dropdownRef,
  triggerRef,
}: {
  darkMode: boolean;
  user: User;
  photoUrl: string | null;
  displayName: string | null;
  username: string | null;
  handleSignOut: () => Promise<void> | void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (v: boolean) => void;
  dropdownRef: MutableRefObject<HTMLDivElement | null>;
  triggerRef: MutableRefObject<HTMLButtonElement | null>;
}) {
  // Helper function to render profile image
  const renderProfileImage = () => {
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
      const target = e.target as HTMLImageElement;
      target.style.display = "none";
      const fallback = target.nextElementSibling as HTMLElement;
      if (fallback) {
        fallback.style.display = "flex";
      }
    };

    if (photoUrl) {
      return (
        <Image
          src={photoUrl}
          alt="Profile"
          width={24}
          height={24}
          className="w-6 h-6 rounded-full"
          unoptimized={true}
          onError={handleImageError}
        />
      );
    }
    if (user.user_metadata?.avatar_url || user.user_metadata?.picture) {
      return (
        <Image
          src={user.user_metadata.avatar_url || user.user_metadata.picture}
          alt="Profile"
          width={24}
          height={24}
          className="w-6 h-6 rounded-full"
          unoptimized={true}
          onError={handleImageError}
        />
      );
    }
    return null;
  };

  // Helper function to render profile fallback
  const renderProfileFallback = () => {
    const hasImage = photoUrl || user.user_metadata?.avatar_url || user.user_metadata?.picture;
    return (
      <div
        className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs"
        style={{ display: hasImage ? "none" : "flex" }}
      >
        {(user.user_metadata?.name ||
          user.user_metadata?.full_name ||
          user.email ||
          "U")[0].toUpperCase()}
      </div>
    );
  };

  // Helper function to render dropdown trigger button
  const renderTriggerButton = () => (
    <button
      type="button"
      ref={triggerRef}
      onClick={() => {
        const nextOpen = !isDropdownOpen;
        setIsDropdownOpen(nextOpen);
      }}
      className={`flex items-center space-x-2 border rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
        darkMode
          ? "bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-200"
          : "bg-white hover:bg-gray-50 border-gray-300 text-gray-700"
      }`}
    >
      {renderProfileImage()}
      {renderProfileFallback()}
      <span className="hidden sm:block">
        {displayName || username || user.email?.split("@")[0] || "User"}
      </span>
      <svg
        className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-label="Dropdown toggle"
      >
        <title>Toggle dropdown</title>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
      </svg>
    </button>
  );

  // Helper function to render user header
  const renderUserHeader = () => (
    <div
      className={`px-4 py-2 text-sm border-b ${darkMode ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-100"}`}
    >
      <div className="font-medium truncate">{displayName || username || "User"}</div>
      <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} break-all`}>
        {username || user.email?.split("@")[0] || ""}
      </div>
    </div>
  );

  // Helper function to render dropdown links
  const renderDropdownLinks = () => (
    <>
      <Link
        href="/leaderboard"
        className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-200 flex items-center gap-2 ${darkMode ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}
      >
        <Trophy className="w-4 h-4" />
        Leaderboards
      </Link>
      <Link
        href="/profile"
        className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-200 flex items-center gap-2 ${darkMode ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}
      >
        <Settings className="w-4 h-4" />
        Profile Settings
      </Link>
      <button
        type="button"
        onClick={handleSignOut}
        className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-200 ${darkMode ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}
      >
        Sign out
      </button>
    </>
  );

  // Helper function to render dropdown content
  const renderDropdownContent = () => (
    <div
      className={`absolute right-0 top-full mt-2 w-64 rounded-md shadow-lg py-1 border z-50 ${darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"}`}
    >
      {renderUserHeader()}
      {renderDropdownLinks()}
    </div>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {renderTriggerButton()}
      {isDropdownOpen && renderDropdownContent()}
    </div>
  );
}