"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import type React from "react";
import { useState } from "react";

interface PasswordAuthProps {
  onAuthenticated: (password: string) => void;
}

export default function PasswordAuth({ onAuthenticated }: PasswordAuthProps) {
  const { darkMode } = useTheme();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const bg = darkMode ? "bg-gray-900" : "bg-gray-50";
  const card = darkMode ? "bg-gray-800" : "bg-white";
  const border = darkMode ? "border-gray-700" : "border-gray-200";
  const input = darkMode
    ? "bg-gray-700 border-gray-600 text-white"
    : "bg-white border-gray-300 text-gray-900";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": password,
        },
      });

      if (response.status === 401) {
        setError("Incorrect password");
        return;
      }

      if (!response.ok) {
        setError("Authentication failed");
        return;
      }

      onAuthenticated(password);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${bg} flex items-center justify-center`}>
      <div className={`${card} border ${border} rounded-lg p-8 max-w-md w-full mx-4`}>
        <h1 className="text-2xl font-bold text-center mb-6">Admin Access</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${input}`}
              placeholder="Enter admin password"
              required={true}
            />
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
              isLoading || !password.trim()
                ? "opacity-50 cursor-not-allowed bg-gray-400"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isLoading ? "Authenticating..." : "Access Admin Panel"}
          </button>
        </form>
      </div>
    </div>
  );
}
