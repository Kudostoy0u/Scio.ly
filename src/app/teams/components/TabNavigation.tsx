"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { ClipboardList, MessageSquare, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface TabNavigationProps {
  teamSlug: string;
}

export default function TabNavigation({ teamSlug }: TabNavigationProps) {
  const { darkMode } = useTheme();
  const pathname = usePathname();

  const tabs = [
    { id: "roster", label: "Roster", icon: Users, href: `/teams/${teamSlug}` },
    { id: "stream", label: "Stream", icon: MessageSquare, href: `/teams/${teamSlug}/stream` },
    {
      id: "assignments",
      label: "Assignments",
      icon: ClipboardList,
      href: `/teams/${teamSlug}/assignments`,
    },
    { id: "people", label: "People", icon: UserPlus, href: `/teams/${teamSlug}/people` },
  ];

  const isActiveTab = (tabId: string) => {
    if (tabId === "roster") {
      return pathname === `/teams/${teamSlug}`;
    }
    return pathname === `/teams/${teamSlug}/${tabId}`;
  };

  return (
    <>
      {/* Desktop Navigation - Sticky */}
      <div
        className={`hidden md:block sticky top-0 z-20 border-b ${darkMode ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white"}`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  isActiveTab(tab.id)
                    ? "border-blue-500 text-blue-600"
                    : darkMode
                      ? "border-transparent text-gray-400 hover:text-gray-300"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 ${darkMode ? "bg-gray-800 border-t border-gray-700" : "bg-white border-t border-gray-200"}`}
      >
        <div className="grid grid-cols-4 h-16">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex flex-col items-center justify-center space-y-1 ${
                isActiveTab(tab.id)
                  ? darkMode
                    ? "text-blue-400"
                    : "text-blue-600"
                  : darkMode
                    ? "text-gray-400"
                    : "text-gray-500"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
