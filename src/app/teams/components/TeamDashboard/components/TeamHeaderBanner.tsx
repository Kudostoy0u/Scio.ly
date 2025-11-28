"use client";
import { Archive, LogOut, UserPlus } from "lucide-react";

interface TeamHeaderBannerProps {
  team: {
    school: string;
    division: "B" | "C";
  };
  isCaptain: boolean;
  darkMode: boolean;
  onInvitePerson: () => void;
  onExitTeam: () => void;
  onArchiveTeam: () => void;
}

export function TeamHeaderBanner({
  team,
  isCaptain,
  darkMode,
  onInvitePerson,
  onExitTeam,
  onArchiveTeam,
}: TeamHeaderBannerProps) {
  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{team.school}</h1>
            <p className="text-purple-100 mt-2">Division {team.division}</p>
          </div>
          <div className="flex items-center space-x-4">
            {isCaptain && (
              <button
                type="button"
                onClick={onInvitePerson}
                className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 group shadow-lg ${
                  darkMode
                    ? "bg-gray-900 bg-opacity-90 hover:bg-opacity-100"
                    : "bg-white bg-opacity-90 hover:bg-opacity-100"
                }`}
                title="Invite Person"
              >
                <UserPlus className="w-6 h-6 text-purple-600 group-hover:scale-110 transition-transform" />
              </button>
            )}
            <button
              type="button"
              onClick={onExitTeam}
              className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 group shadow-lg ${
                darkMode
                  ? "bg-gray-900 bg-opacity-90 hover:bg-opacity-100"
                  : "bg-white bg-opacity-90 hover:bg-opacity-100"
              }`}
              title="Exit Team"
            >
              <LogOut className="w-6 h-6 text-red-600 group-hover:scale-110 transition-transform" />
            </button>
            {isCaptain && (
              <button
                type="button"
                onClick={onArchiveTeam}
                className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 group shadow-lg ${
                  darkMode
                    ? "bg-gray-900 bg-opacity-90 hover:bg-opacity-100"
                    : "bg-white bg-opacity-90 hover:bg-opacity-100"
                }`}
                title="Archive Team"
              >
                <Archive className="w-6 h-6 text-orange-600 group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
