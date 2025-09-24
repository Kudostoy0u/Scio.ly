'use client';
import React, { MutableRefObject } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Settings, Trophy, Bell } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

export default function UserDropdown({
  darkMode,
  user,
  photoUrl,
  displayName,
  username,
  unread,
  notifs,
  refresh,
  markAllRead,
  markReadById,
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
  unread: number;
  notifs: Array<any>;
  refresh: (force?: boolean) => Promise<void>;
  markAllRead: () => Promise<void>;
  markReadById: (id: string) => Promise<void>;
  handleSignOut: () => Promise<void> | void;
  clearingAll: boolean;
  setClearingAll: (v: boolean) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (v: boolean) => void;
  dropdownRef: MutableRefObject<HTMLDivElement | null>;
  triggerRef: MutableRefObject<HTMLButtonElement | null>;
}) {
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={triggerRef}
        onClick={async () => {
          const nextOpen = !isDropdownOpen;
          setIsDropdownOpen(nextOpen);
          if (nextOpen) {
            try { await refresh(false); } catch {}
          }
        }}
        className={`flex items-center space-x-2 border rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
          darkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-600 text-gray-200' : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'
        }`}
      >
        {unread > 0 && (
          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-600 text-white text-[10px]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
        {photoUrl ? (
          <Image src={photoUrl} alt="Profile" width={24} height={24} className="w-6 h-6 rounded-full" />
        ) : user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
          <Image src={user.user_metadata.avatar_url || user.user_metadata.picture} alt="Profile" width={24} height={24} className="w-6 h-6 rounded-full" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
            {(user.user_metadata?.name || user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
          </div>
        )}
        <span className="hidden sm:block">{displayName || username || user.email?.split('@')[0] || 'User'}</span>
        <svg className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
        </svg>
      </button>

      {isDropdownOpen && (
        <div className={`absolute right-0 top-full mt-2 w-64 rounded-md shadow-lg py-1 border z-50 ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
          <div className={`px-4 py-2 text-sm border-b ${darkMode ? 'text-gray-200 border-gray-600' : 'text-gray-700 border-gray-100'}`}>
            <div className="font-medium truncate">{displayName || username || 'User'}</div>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} break-all`}>{username || (user.email?.split('@')[0] || '')}</div>
          </div>
          <div className={`px-4 py-2 text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            <div className="flex items-center justify-between">
              <div className="font-medium flex items-center gap-2"><Bell className="w-4 h-4" /> Notifications</div>
              <div className="flex items-center gap-2">
                {unread > 0 && <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-600 text-white text-[10px]">{unread > 9 ? '9+' : unread}</span>}
                <div className="flex items-center gap-2">
                  {notifs.length > 0 && (
                    <button disabled={clearingAll} onClick={async () => { setClearingAll(true); await markAllRead(); setClearingAll(false); }} className={`${darkMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-800'} text-[10px] underline`} title="Clear all notifications">
                      {clearingAll ? 'Clearing…' : 'Clear all'}
                    </button>
                  )}
                  <button onClick={async () => { try { await refresh(true); } catch {} }} className={`${darkMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-800'} text-[10px] underline`} title="Refresh notifications">
                    Refresh
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-2 max-h-56 overflow-auto space-y-2">
              {notifs.length === 0 ? (
                <div className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-xs`}>No notifications</div>
              ) : (
                notifs.map((n: any) => (
                  <div key={n.id} className={`rounded border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-2 text-xs`}>
                    <div className="font-medium">{n.title}</div>
                    {!!n.body && <div className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{n.body}</div>}
                    {n.type === 'assignment' ? (
                      <div className="mt-2 flex items-center gap-2">
                        <button onClick={async () => { await markReadById(n.id); window.location.href = n.data?.url || '/test'; }} className={`px-2 py-1 rounded text-white bg-blue-600 hover:bg-blue-700`}>
                          Start
                        </button>
                        <button onClick={async () => { await markReadById(n.id); }} className={`px-2 py-1 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>
                          Decline
                        </button>
                      </div>
                    ) : n.type === 'team_invite' && (
                      <div className="mt-2 flex items-center gap-2">
                        <button onClick={async () => { try { const res = await fetch('/api/notifications/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id, school: n.data?.school, division: n.data?.division, teamId: n.data?.teamId, memberName: n.data?.memberName }) }); const j = await res.json(); if (res.ok && j?.success) { await markReadById(n.id); if (j?.slug) window.location.href = `/teams/${j.slug}`; } } catch {} }} className={`px-2 py-1 rounded text-white bg-blue-600 hover:bg-blue-700`}>
                          Accept
                        </button>
                        <button onClick={async () => { await markReadById(n.id); }} className={`px-2 py-1 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          <Link href="/leaderboard" className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-200 flex items-center gap-2 ${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
            <Trophy className="w-4 h-4" />
            Leaderboards
          </Link>
          <Link href="/profile" className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-200 flex items-center gap-2 ${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
            <Settings className="w-4 h-4" />
            Profile Settings
          </Link>
          <button onClick={handleSignOut} className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-200 ${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}


