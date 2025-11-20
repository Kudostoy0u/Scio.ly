/* Presentational Auth modal extracted from AuthButton */
"use client";
import { Eye, EyeOff, X } from "lucide-react";
import { createPortal } from "react-dom";
import GoogleSignInButton from "./GoogleSignInButton";

type AuthMode = "signin" | "signup" | "reset";

export default function AuthModal({
  open,
  darkMode,
  authMode,
  setAuthMode,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  showPassword,
  setShowPassword,
  authError,
  authSuccess,
  authLoading,
  oauthLoading,
  isOffline,
  subtleLinkClass,
  resetEmailSent,
  onClose,
  handlePasswordReset,
  handleEmailPasswordAuth,
  handleGoogleSignIn,
}: {
  open: boolean;
  darkMode: boolean;
  authMode: AuthMode;
  setAuthMode: (m: AuthMode) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  authError: string;
  authSuccess: string;
  authLoading: boolean;
  oauthLoading: boolean;
  isOffline: boolean;
  subtleLinkClass: string;
  resetEmailSent: boolean;
  onClose: () => void;
  handlePasswordReset: () => void | Promise<void>;
  handleEmailPasswordAuth: () => void | Promise<void>;
  handleGoogleSignIn: () => void | Promise<void>;
}) {
  if (!open) {
    return null;
  }

  const content = (
    <div
      className="fixed inset-0 z-[9999]"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
      }}
      onMouseDown={onClose}
    >
      <div
        className={`relative rounded-lg p-6 w-full max-w-md ${darkMode ? "bg-gray-800" : "bg-white"}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 transition-colors duration-200 ${darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <h2 className={`text-2xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
            {authMode === "signin"
              ? "Sign In"
              : authMode === "signup"
                ? "Sign Up"
                : "Reset Password"}
          </h2>
          <p className={darkMode ? "text-gray-300" : "text-gray-600"}>
            {authMode === "signin"
              ? "Welcome back! Sign in to continue your learning journey."
              : authMode === "signup"
                ? "Join Scio.ly to start practicing Science Olympiad questions."
                : "Enter your email to receive a password reset link."}
          </p>
        </div>

        {authMode === "reset" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePasswordReset();
            }}
            className="space-y-4"
          >
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "border-gray-300 text-gray-900 placeholder-gray-500"}`}
                required={true}
              />
            </div>
            {authError && (
              <div className="text-red-500 text-sm bg-red-400 p-3 rounded-lg">{authError}</div>
            )}
            {resetEmailSent && (
              <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                Password reset email sent! Check your inbox.
              </div>
            )}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              {authLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Sending Reset Email...
                </div>
              ) : (
                "Send Reset Email"
              )}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => setAuthMode("signin")}
                className={`${subtleLinkClass} text-sm`}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        ) : (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEmailPasswordAuth();
              }}
              className="space-y-4"
            >
              {authMode === "signup" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "border-gray-300 text-gray-900 placeholder-gray-500"}`}
                    required={true}
                  />
                  <input
                    type="text"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "border-gray-300 text-gray-900 placeholder-gray-500"}`}
                    required={true}
                  />
                </div>
              )}
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "border-gray-300 text-gray-900 placeholder-gray-500"}`}
                  required={true}
                />
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "border-gray-300 text-gray-900 placeholder-gray-500"}`}
                  required={true}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 ${darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {authMode === "signup" && (
                <div>
                  <input
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : "border-gray-300 text-gray-900 placeholder-gray-500"}`}
                    required={true}
                    minLength={6}
                  />
                </div>
              )}
              {authError && (
                <div className="text-white text-sm bg-red-400 p-3 rounded-lg">{authError}</div>
              )}
              {authSuccess && (
                <div className="text-green-700 text-sm bg-green-50 p-3 rounded-lg">{authSuccess}</div>
              )}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                {authLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    {authMode === "signin" ? "Signing In..." : "Signing Up..."}
                  </div>
                ) : authMode === "signin" ? (
                  "Sign In"
                ) : (
                  "Sign Up"
                )}
              </button>
              {authMode === "signin" && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("reset");
                    }}
                    className={`${subtleLinkClass} text-sm`}
                  >
                    Forgot your password?
                  </button>
                </div>
              )}
            </form>
            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div
                    className={`w-full border-t ${darkMode ? "border-gray-600" : "border-gray-300"}`}
                  />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span
                    className={`px-2 ${darkMode ? "bg-gray-800 text-gray-400" : "bg-white text-gray-500"}`}
                  >
                    Or continue with
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <GoogleSignInButton
                  darkMode={darkMode}
                  oauthLoading={oauthLoading}
                  isOffline={isOffline}
                  onClick={handleGoogleSignIn}
                />
              </div>
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setAuthMode(authMode === "signin" ? "signup" : "signin");
                }}
                className={`${subtleLinkClass} text-sm`}
              >
                {authMode === "signin"
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
