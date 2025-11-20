"use client";
import logger from "@/lib/utils/logger";

import { supabase } from "@/lib/supabase";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { type ReactNode, createContext, useContext, useEffect, useRef, useState } from "react";

/**
 * Authentication context type definition
 * Provides user authentication state and Supabase client
 */
type AuthContextType = {
  /** Current authenticated user or null if not logged in */
  user: User | null;
  /** Loading state for authentication operations */
  loading: boolean;
  /** Supabase client for database operations */
  client: SupabaseClient<any, "public", any>;
};

/** Authentication context for managing user state */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication provider component
 * Manages user authentication state and profile synchronization
 *
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components
 * @param {User | null} [props.initialUser] - Initial user state from server
 * @returns {JSX.Element} Authentication provider component
 * @example
 * ```tsx
 * <AuthProvider initialUser={serverUser}>
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({
  children,
  initialUser,
}: { children: ReactNode; initialUser?: User | null }) {
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [loading, setLoading] = useState<boolean>(true);
  const hasSyncedRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) {
          return;
        }
        const incoming = data.session?.user ?? null;
        setUser((prev) => {
          const prevId = prev?.id ?? null;
          const nextId = incoming?.id ?? null;
          if (prevId === nextId) {
            return prev;
          }
          return incoming;
        });
      } catch {
        // ignore
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }
      const incoming = session?.user ?? null;
      setUser((prev) => {
        const prevId = prev?.id ?? null;
        const nextId = incoming?.id ?? null;
        if (prevId === nextId) {
          return prev;
        }
        return incoming;
      });
    });

    const resync = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) {
          return;
        }
        const incoming = data.session?.user ?? null;
        setUser((prev) => {
          const prevId = prev?.id ?? null;
          const nextId = incoming?.id ?? null;
          if (prevId === nextId) {
            return prev;
          }
          return incoming;
        });
      } catch {
        /* noop */
      }
    };
    const onFocus = () => void resync();
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void resync();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [initialUser]);

  // Run profile sync; guarded so it no-ops if already synced for this user
  useEffect(() => {
    const syncProfileFromAuth = async () => {
      if (!user) {
        return;
      }
      if (hasSyncedRef.current === user.id) {
        return;
      }

      if (!user.id || typeof user.id !== "string" || user.id.trim() === "") {
        logger.warn("Invalid user ID for profile sync:", user.id);
        return;
      }

      try {
        const isGoogle =
          user?.app_metadata?.provider === "google" ||
          (Array.isArray(user?.identities) &&
            user.identities.some((i) => i.provider === "google"));

        const { data: existing, error: readError } = await supabase
          .from("users")
          .select("id, email, first_name, last_name, display_name, username, photo_url")
          .eq("id", user.id)
          .maybeSingle();

        if (readError) {
          logger.warn("Error reading existing profile:", readError);
        }

        const meta: any = user.user_metadata || {};
        const given = (meta.given_name || meta.givenName || "").toString().trim();
        const family = (meta.family_name || meta.familyName || "").toString().trim();
        const full = (meta.name || meta.full_name || meta.fullName || "").toString().trim();

        let firstName: string | null = null;
        let lastName: string | null = null;

        if (given || family) {
          firstName = given || null;
          lastName = family || null;
        } else if (full) {
          const parts = full.split(/\s+/).filter(Boolean);
          if (parts.length >= 2) {
            firstName = parts[0];
            lastName = parts.slice(1).join(" ");
          } else if (parts.length === 1) {
            firstName = parts[0];
            lastName = null;
          }
        }

        const email = user.email || (existing as { email?: string } | null)?.email;

        // Improved username generation with better fallbacks
        let username: string;
        const existingTyped = existing as { username?: string; email?: string; display_name?: string; first_name?: string; last_name?: string; photo_url?: string } | null;
        if (existingTyped?.username?.trim()) {
          username = existingTyped.username.trim();
        } else if (email?.includes("@")) {
          const emailLocal = email.split("@")[0];
          if (emailLocal && emailLocal.length > 2 && !emailLocal.match(/^[a-f0-9]{8}$/)) {
            username = emailLocal;
          } else {
            username = `user_${user.id.slice(0, 8)}`;
          }
        } else {
          username = `user_${user.id.slice(0, 8)}`;
        }

        // Improved display name generation with better fallbacks
        let displayName: string | null = null;
        if (existingTyped?.display_name?.trim()) {
          displayName = existingTyped.display_name.trim();
        } else if (full?.trim()) {
          displayName = full.trim();
        } else if (given?.trim()) {
          displayName = given.trim();
        } else if (firstName && lastName) {
          displayName = `${firstName.trim()} ${lastName.trim()}`;
        } else if (firstName?.trim()) {
          displayName = firstName.trim();
        } else if (lastName?.trim()) {
          displayName = lastName.trim();
        } else if (email?.includes("@")) {
          const emailLocal = email.split("@")[0];
          if (emailLocal && emailLocal.length > 2 && !emailLocal.match(/^[a-f0-9]{8}$/)) {
            displayName = `@${emailLocal}`;
          }
        }
        const photoUrl = existingTyped?.photo_url || meta.avatar_url || meta.picture || null;

        const shouldForceUpdateNames = Boolean(isGoogle) && (firstName || lastName);

        if (!(user.id && email && username)) {
          logger.warn("Missing required user fields for upsert:", { id: user.id, email, username });
          return;
        }

        // Additional safety check to ensure email is not null/undefined/empty
        if (!email || email.trim() === "") {
          logger.warn("Email is null, undefined, or empty - skipping upsert:", {
            id: user.id,
            email,
          });
          return;
        }

        if (
          typeof user.id !== "string" ||
          user.id.trim() === "" ||
          typeof email !== "string" ||
          email.trim() === "" ||
          typeof username !== "string" ||
          username.trim() === ""
        ) {
          logger.warn("Invalid field types or empty values for upsert:", {
            id: user.id,
            idType: typeof user.id,
            email,
            emailType: typeof email,
            username,
            usernameType: typeof username,
          });
          return;
        }

        // Build a minimal payload containing only fields that would actually change
        const upsertPayload: Record<string, any> = {
          id: user.id.trim(),
          email: email.trim(),
          username: username.trim(),
        };

        const changes: Record<string, any> = {};
        if (existingTyped) {
          if (!existingTyped.username && upsertPayload.username) {
            changes.username = upsertPayload.username;
          }
          if (existingTyped.email !== upsertPayload.email) {
            changes.email = upsertPayload.email; // rare
          }
        } else {
          changes.email = upsertPayload.email;
          changes.username = upsertPayload.username;
        }

        const shouldWriteFirst =
          shouldForceUpdateNames ||
          (!existingTyped?.first_name && firstName !== null && firstName !== undefined);
        if (
          shouldWriteFirst &&
          firstName !== null &&
          firstName !== undefined &&
          existingTyped?.first_name !== firstName
        ) {
          changes.first_name = firstName;
        }
        const shouldWriteLast =
          shouldForceUpdateNames ||
          (!existingTyped?.last_name && lastName !== null && lastName !== undefined);
        if (
          shouldWriteLast &&
          lastName !== null &&
          lastName !== undefined &&
          existingTyped?.last_name !== lastName
        ) {
          changes.last_name = lastName;
        }
        if (
          !existingTyped?.display_name &&
          displayName !== null &&
          displayName !== undefined &&
          existingTyped?.display_name !== displayName
        ) {
          changes.display_name = displayName;
        }
        if (!existingTyped?.photo_url && photoUrl && existingTyped?.photo_url !== photoUrl) {
          changes.photo_url = photoUrl;
        }

        const hasMeaningfulChanges = !existingTyped || Object.keys(changes).length > 0;
        if (hasMeaningfulChanges) {
          try {
            const payload = { id: upsertPayload.id, ...changes };
            const { error: upsertError } = await supabase
              .from("users")
              .upsert(payload as any, { onConflict: "id" });
            if (upsertError) {
              logger.warn("Failed to upsert user profile:", upsertError);
            }
          } catch (error) {
            logger.warn("Error upserting user profile:", error);
          }
        }

        hasSyncedRef.current = user.id;
      } catch {
        // swallow; non-critical
      }
    };

    void syncProfileFromAuth();
  }, [user]);

  const value: AuthContextType = {
    user,
    loading,
    client: supabase as unknown as SupabaseClient<any, "public", any>,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context
 * Provides user state and Supabase client
 *
 * @returns {AuthContextType} Authentication context with user, loading, and client
 * @throws {Error} When used outside of AuthProvider
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, loading, client } = useAuth();
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (!user) return <div>Please log in</div>;
 *
 *   return <div>Welcome, {user.email}!</div>;
 * }
 * ```
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
