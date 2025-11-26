"use client";
import { useNotifications } from "@/app/hooks/useNotifications";
import SyncLocalStorage from "@/lib/database/localStorageReplacement";
import logger from "@/lib/utils/logger";
import type { User } from "@supabase/supabase-js";
import { Bell, Settings, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { MutableRefObject } from "react";
import { useEffect, useState } from "react";
import type React from "react";

interface NotificationItem {
  id: string;
  title: string;
  message?: string;
  body?: string;
  type: string;
  data?: Record<string, unknown>;
}

export default function UserDropdown({
  darkMode,
  user,
  photoUrl,
  displayName,
  username,
  handleSignOut,
  clearingAll,
  setClearingAll,
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
  clearingAll: boolean;
  setClearingAll: (v: boolean) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (v: boolean) => void;
  dropdownRef: MutableRefObject<HTMLDivElement | null>;
  triggerRef: MutableRefObject<HTMLButtonElement | null>;
}) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, refresh } = useNotifications();
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  }, [redirectUrl]);

  // Helper function to handle team invite acceptance
  const handleTeamInviteAccept = async (n: NotificationItem) => {
    try {
      const requestBody = {
        id: n.id,
        type: n.type,
        school: n.data?.school,
        division: n.data?.division,
        teamId: n.data?.teamId,
        memberName: n.data?.memberName,
      };

      const res = await fetch("/api/notifications/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const j = await res.json();

      if (res.ok && j?.success) {
        try {
          await markAsRead(n.id);
        } catch (markError) {
          logger.error("Failed to mark notification as read:", markError);
        }

        if (typeof window !== "undefined" && user?.id) {
          SyncLocalStorage.removeItem(`user-teams-${user.id}`);
          SyncLocalStorage.removeItem("user-teams-cache");

          setTimeout(() => {
            if (j?.slug) {
              window.location.href = `/teams/${j.slug}`;
            } else {
              window.location.href = "/teams";
            }
          }, 1000);
        }
      } else {
        alert(`Failed to accept invitation: ${j?.error || "Unknown error"}`);
      }
    } catch (error) {
      logger.error("Failed to accept team invite:", error);
      alert("Failed to accept invitation. Please try again.");
    }
  };

  // Helper function to handle team invite decline
  const handleTeamInviteDecline = async (n: NotificationItem) => {
    try {
      const res = await fetch("/api/notifications/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: n.id,
          type: "team_invite",
          school: n.data?.school,
          division: n.data?.division,
          teamId: n.data?.teamId,
          memberName: n.data?.memberName,
        }),
      });

      if (res.ok) {
        await markAsRead(n.id);
        await refresh(true);
      }
    } catch (error) {
      logger.error("Failed to decline team invite:", error);
    }
  };

  // Helper function to handle roster link invitation acceptance
  const handleRosterLinkInviteAccept = async (n: NotificationItem) => {
    try {
      const res = await fetch("/api/notifications/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: n.id,
          type: "roster_link_invitation",
          assignmentId: n.data?.assignment_id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        await markAsRead(n.id);
        await refresh(true);

        if (data.redirect) {
          setRedirectUrl(data.redirect);
        }
      }
    } catch (error) {
      logger.error("Failed to accept roster link invitation:", error);
    }
  };

  // Helper function to handle roster link invitation decline
  const handleRosterLinkInviteDecline = async (n: NotificationItem) => {
    try {
      const res = await fetch("/api/notifications/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: n.id,
          type: "roster_link_invitation",
          assignmentId: n.data?.assignment_id,
        }),
      });

      if (res.ok) {
        await markAsRead(n.id);
        await refresh(true);
      }
    } catch (error) {
      logger.error("Failed to decline roster link invitation:", error);
    }
  };

  // Helper function to handle roster link invitation acceptance (with invitation_id)
  const handleRosterLinkInviteAcceptWithId = async (n: NotificationItem) => {
    try {
      const requestBody = {
        id: n.id,
        type: "roster_link_invitation",
        invitationId: n.data?.invitation_id,
      };
      const res = await fetch("/api/notifications/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const j = await res.json();
      if (res.ok && j?.success) {
        await markAsRead(n.id);
        await refresh(true);
        if (typeof window !== "undefined" && user?.id) {
          SyncLocalStorage.removeItem(`user-teams-${user.id}`);
          SyncLocalStorage.removeItem("user-teams-cache");
          setRedirectUrl("/teams");
        }
      } else {
        logger.error("Failed to accept roster link invitation:", j?.error);
      }
    } catch (error) {
      logger.error("Failed to accept roster link invitation:", error);
    }
  };

  // Helper function to handle roster link invitation decline (with invitation_id)
  const handleRosterLinkInviteDeclineWithId = async (n: NotificationItem) => {
    try {
      const res = await fetch("/api/notifications/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: n.id,
          type: "roster_link_invitation",
          invitationId: n.data?.invitation_id,
        }),
      });

      if (res.ok) {
        await markAsRead(n.id);
        await refresh(true);
      }
    } catch (error) {
      logger.error("Failed to decline roster link invitation:", error);
    }
  };

  // Helper function to get dismiss button classes
  const getDismissButtonClasses = () =>
    `px-2 py-1 rounded ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-200" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}`;

  // Helper function to render team invite actions
  const renderTeamInviteActions = (n: NotificationItem) => (
    <div className="mt-2 flex items-center gap-2">
      <button
        type="button"
        onClick={() => handleTeamInviteAccept(n)}
        className="px-2 py-1 rounded text-white bg-blue-600 hover:bg-blue-700"
      >
        Accept
      </button>
      <button
        type="button"
        onClick={() => handleTeamInviteDecline(n)}
        className={getDismissButtonClasses()}
      >
        Dismiss
      </button>
    </div>
  );

  // Helper function to render roster link invitation actions (with assignment_id)
  const renderRosterLinkInviteActionsWithAssignment = (n: NotificationItem) => (
    <div className="mt-2 flex items-center gap-2">
      <button
        type="button"
        onClick={() => handleRosterLinkInviteAccept(n)}
        className="px-2 py-1 rounded text-white bg-green-600 hover:bg-green-700"
      >
        Accept
      </button>
      <button
        type="button"
        onClick={() => handleRosterLinkInviteDecline(n)}
        className={getDismissButtonClasses()}
      >
        Decline
      </button>
    </div>
  );

  // Helper function to render roster link invitation actions (with invitation_id)
  const renderRosterLinkInviteActionsWithId = (n: NotificationItem) => (
    <div className="mt-2 flex items-center gap-2">
      <button
        type="button"
        onClick={() => handleRosterLinkInviteAcceptWithId(n)}
        className="px-2 py-1 rounded text-white bg-green-600 hover:bg-green-700"
      >
        Accept
      </button>
      <button
        type="button"
        onClick={() => handleRosterLinkInviteDeclineWithId(n)}
        className={getDismissButtonClasses()}
      >
        Dismiss
      </button>
    </div>
  );

  // Helper function to render notification action buttons
  const renderNotificationActions = (n: NotificationItem) => {
    if (n.type === "team_invite") {
      return renderTeamInviteActions(n);
    }
    if (n.type === "roster_link_invitation" && n.data?.assignment_id) {
      return renderRosterLinkInviteActionsWithAssignment(n);
    }
    if (n.type === "roster_link_invitation" && n.data?.invitation_id) {
      return renderRosterLinkInviteActionsWithId(n);
    }
    return null;
  };

  // Helper function to render single notification
  const renderNotification = (n: NotificationItem) => (
    <div
      key={n.id}
      className={`rounded border ${darkMode ? "border-gray-700" : "border-gray-200"} p-2 text-xs`}
    >
      <div className="font-medium">{n.title}</div>
      {(n.body || n.message) && (
        <div className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
          {n.body || n.message}
        </div>
      )}
      {renderNotificationActions(n)}
    </div>
  );

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
      {unreadCount > 0 && (
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-600 text-white text-[10px]">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
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

  // Helper function to render notifications section
  const renderNotificationsSection = () => (
    <div className={`px-4 py-2 text-sm ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
      <div className="flex items-center justify-between">
        <div className="font-medium flex items-center gap-2">
          <Bell className="w-4 h-4" /> Notifications
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-600 text-white text-[10px]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                type="button"
                disabled={clearingAll}
                onClick={async () => {
                  setClearingAll(true);
                  await markAllAsRead();
                  setClearingAll(false);
                }}
                className={`${darkMode ? "text-gray-300 hover:text-gray-100" : "text-gray-600 hover:text-gray-800"} text-[10px] underline`}
                title="Clear all notifications"
              >
                {clearingAll ? "Clearing…" : "Clear all"}
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="mt-2 max-h-56 overflow-auto space-y-2">
        {notifications.length === 0 ? (
          <div className={`${darkMode ? "text-gray-400" : "text-gray-500"} text-xs`}>
            No notifications
          </div>
        ) : (
          notifications.map(renderNotification)
        )}
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
      {renderNotificationsSection()}
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
