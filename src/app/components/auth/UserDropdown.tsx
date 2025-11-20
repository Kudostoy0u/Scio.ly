"use client";
import { useNotifications } from "@/app/hooks/useNotifications";
import SyncLocalStorage from "@/lib/database/localStorage-replacement";
import type { User } from "@supabase/supabase-js";
import { Bell, Settings, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { MutableRefObject } from "react";

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
  return (
    <div className="relative" ref={dropdownRef}>
      <button
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
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt="Profile"
            width={24}
            height={24}
            className="w-6 h-6 rounded-full"
            unoptimized={true}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) {
                fallback.style.display = "flex";
              }
            }}
          />
        ) : user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
          <Image
            src={user.user_metadata.avatar_url || user.user_metadata.picture}
            alt="Profile"
            width={24}
            height={24}
            className="w-6 h-6 rounded-full"
            unoptimized={true}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) {
                fallback.style.display = "flex";
              }
            }}
          />
        ) : null}
        <div
          className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs"
          style={{
            display:
              photoUrl || user.user_metadata?.avatar_url || user.user_metadata?.picture
                ? "none"
                : "flex",
          }}
        >
          {(user.user_metadata?.name ||
            user.user_metadata?.full_name ||
            user.email ||
            "U")[0].toUpperCase()}
        </div>
        <span className="hidden sm:block">
          {displayName || username || user.email?.split("@")[0] || "User"}
        </span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
        </svg>
      </button>

      {isDropdownOpen && (
        <div
          className={`absolute right-0 top-full mt-2 w-64 rounded-md shadow-lg py-1 border z-50 ${darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"}`}
        >
          <div
            className={`px-4 py-2 text-sm border-b ${darkMode ? "text-gray-200 border-gray-600" : "text-gray-700 border-gray-100"}`}
          >
            <div className="font-medium truncate">{displayName || username || "User"}</div>
            <div className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} break-all`}>
              {username || user.email?.split("@")[0] || ""}
            </div>
          </div>
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
                notifications.map((n: any) => (
                  <div
                    key={n.id}
                    className={`rounded border ${darkMode ? "border-gray-700" : "border-gray-200"} p-2 text-xs`}
                  >
                    <div className="font-medium">{n.title}</div>
                    {!!n.body && (
                      <div className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>{n.body}</div>
                    )}
                    {/* ASSIGNMENT NOTIFICATIONS DISABLED - Users should use assignments tab instead */}
                    {n.type === "team_invite" ? (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={async () => {
                            try {
                              // For team invites, we still need to use the API since it involves complex team logic
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
                                } catch (_markError) {
                                  // Don't fail the whole process for this
                                }

                                // Invalidate teams cache to ensure the new team shows up
                                if (typeof window !== "undefined" && user?.id) {
                                  // Clear any cached team data
                                  SyncLocalStorage.removeItem(`user-teams-${user.id}`);
                                  SyncLocalStorage.removeItem("user-teams-cache");

                                  // Add a small delay to ensure backend processing is complete
                                  setTimeout(() => {
                                    // Force a page reload to refresh teams list
                                    if (j?.slug) {
                                      window.location.href = `/teams/${j.slug}`;
                                    } else {
                                      window.location.href = "/teams";
                                    }
                                  }, 1000);
                                }
                              } else {
                                // Show user-friendly error message
                                alert(
                                  `Failed to accept invitation: ${j?.error || "Unknown error"}`
                                );
                              }
                            } catch (_error) {}
                          }}
                          className={"px-2 py-1 rounded text-white bg-blue-600 hover:bg-blue-700"}
                        >
                          Accept
                        </button>
                        <button
                          onClick={async () => {
                            await markAsRead(n.id);
                          }}
                          className={`px-2 py-1 rounded ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-200" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}`}
                        >
                          Dismiss
                        </button>
                      </div>
                    ) : n.type === "roster_link_invitation" ? (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={async () => {
                            try {
                              // For assignment invitations, we still need to use the API since it involves complex team logic
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
                                // Mark notification as read and refresh
                                await markAsRead(n.id);
                                await refresh(true);

                                // Redirect to test page if provided
                                if (data.redirect) {
                                  window.location.href = data.redirect;
                                }
                              }
                            } catch (_error) {}
                          }}
                          className={"px-2 py-1 rounded text-white bg-green-600 hover:bg-green-700"}
                        >
                          Accept
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              // For assignment invitations, we still need to use the API since it involves complex team logic
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
                                // Mark notification as read and refresh
                                await markAsRead(n.id);
                                await refresh(true);
                              }
                            } catch (_error) {}
                          }}
                          className={`px-2 py-1 rounded ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-200" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}`}
                        >
                          Decline
                        </button>
                      </div>
                    ) : n.type === "roster_link_invitation" ? (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={async () => {
                            try {
                              // For roster link invitations, we still need to use the API since it involves complex team logic
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
                                // Invalidate teams cache to ensure the new team shows up
                                if (typeof window !== "undefined" && user?.id) {
                                  // Clear any cached team data
                                  SyncLocalStorage.removeItem(`user-teams-${user.id}`);
                                  SyncLocalStorage.removeItem("user-teams-cache");
                                  // Redirect to teams page to see the newly joined team
                                  window.location.href = "/teams";
                                }
                              } else {
                              }
                            } catch (_error) {}
                          }}
                          className={"px-2 py-1 rounded text-white bg-green-600 hover:bg-green-700"}
                        >
                          Accept
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              // For roster link invitations, we still need to use the API since it involves complex team logic
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
                                // Mark notification as read and refresh
                                await markAsRead(n.id);
                                await refresh(true);
                              }
                            } catch (_error) {}
                          }}
                          className={`px-2 py-1 rounded ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-200" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}`}
                        >
                          Dismiss
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
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
            onClick={handleSignOut}
            className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-200 ${darkMode ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"}`}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
