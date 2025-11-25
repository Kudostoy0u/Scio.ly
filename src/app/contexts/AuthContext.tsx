"use client";
import logger from "@/lib/utils/logger";

import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/types/database";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { type ReactNode, createContext, useContext, useEffect, useRef, useState } from "react";

// Top-level regex patterns for performance
const WHITESPACE_REGEX = /\s+/;
const HEX_PATTERN_REGEX = /^[a-f0-9]{8}$/;

// Helper function to check if user is from Google
function isGoogleUser(user: User): boolean {
  return (
    user?.app_metadata?.provider === "google" ||
    (Array.isArray(user?.identities) && user.identities.some((i) => i.provider === "google"))
  );
}

// Helper function to extract names from user metadata
function extractNamesFromMetadata(meta: Record<string, unknown>): {
  firstName: string | null;
  lastName: string | null;
  full: string;
  given: string;
  family: string;
} {
  const given = (meta.given_name || meta.givenName || "").toString().trim();
  const family = (meta.family_name || meta.familyName || "").toString().trim();
  const full = (meta.name || meta.full_name || meta.fullName || "").toString().trim();

  let firstName: string | null = null;
  let lastName: string | null = null;

  if (given || family) {
    firstName = given || null;
    lastName = family || null;
  } else if (full) {
    const parts = full.split(WHITESPACE_REGEX).filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0];
      firstName = first !== undefined && typeof first === "string" ? first : null;
      const lastNameStr = parts.slice(1).join(" ");
      if (typeof lastNameStr === "string" && lastNameStr.length > 0) {
        lastName = lastNameStr;
      } else {
        lastName = null;
      }
    } else if (parts.length === 1) {
      const first = parts[0];
      firstName = first !== undefined && typeof first === "string" ? first : null;
      lastName = null;
    }
  }

  return { firstName, lastName, full, given, family };
}

// Helper function to generate username
function generateUsername(
  existingUsername: string | undefined,
  email: string | null | undefined,
  userId: string
): string {
  if (existingUsername?.trim()) {
    return existingUsername.trim();
  }
  if (email?.includes("@")) {
    const emailLocal = email.split("@")[0];
    if (emailLocal && emailLocal.length > 2 && !emailLocal.match(HEX_PATTERN_REGEX)) {
      return emailLocal;
    }
  }
  return `user_${userId.slice(0, 8)}`;
}

// Helper function to generate display name
function generateDisplayName(
  existingDisplayName: string | undefined,
  full: string,
  given: string,
  firstName: string | null,
  lastName: string | null,
  email: string | null | undefined
): string | null {
  if (existingDisplayName?.trim()) {
    return existingDisplayName.trim();
  }
  if (full?.trim()) {
    return full.trim();
  }
  if (given?.trim()) {
    return given.trim();
  }
  if (firstName && lastName) {
    return `${firstName.trim()} ${lastName.trim()}`;
  }
  if (firstName?.trim()) {
    return firstName.trim();
  }
  if (lastName?.trim()) {
    return lastName.trim();
  }
  if (email?.includes("@")) {
    const emailLocal = email.split("@")[0];
    if (emailLocal && emailLocal.length > 2 && !emailLocal.match(HEX_PATTERN_REGEX)) {
      return `@${emailLocal}`;
    }
  }
  return null;
}

// Helper function to validate user fields
function validateUserFields(
  userId: string | undefined,
  email: string | null | undefined,
  username: string
): boolean {
  if (!(userId && email && username)) {
    return false;
  }
  if (!email || email.trim() === "") {
    return false;
  }
  if (
    typeof userId !== "string" ||
    userId.trim() === "" ||
    typeof email !== "string" ||
    email.trim() === "" ||
    typeof username !== "string" ||
    username.trim() === ""
  ) {
    return false;
  }
  return true;
}

// Helper function to calculate basic changes (username, email)
function calculateBasicChanges(
  existing: {
    username?: string;
    email?: string;
  } | null,
  upsertPayload: { id: string; email: string; username: string }
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  if (existing) {
    if (!existing.username && upsertPayload.username) {
      changes.username = upsertPayload.username;
    }
    if (existing.email !== upsertPayload.email) {
      changes.email = upsertPayload.email;
    }
  } else {
    changes.email = upsertPayload.email;
    changes.username = upsertPayload.username;
  }
  return changes;
}

// Helper function to calculate name changes
function calculateNameChanges(
  existing: {
    first_name?: string;
    last_name?: string;
  } | null,
  firstName: string | null,
  lastName: string | null,
  shouldForceUpdateNames: boolean
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};

  const shouldWriteFirst =
    shouldForceUpdateNames ||
    (!existing?.first_name && firstName !== null && firstName !== undefined);
  if (
    shouldWriteFirst &&
    firstName !== null &&
    firstName !== undefined &&
    existing?.first_name !== firstName
  ) {
    changes.first_name = firstName;
  }

  const shouldWriteLast =
    shouldForceUpdateNames || (!existing?.last_name && lastName !== null && lastName !== undefined);
  if (
    shouldWriteLast &&
    lastName !== null &&
    lastName !== undefined &&
    existing?.last_name !== lastName
  ) {
    changes.last_name = lastName;
  }

  return changes;
}

// Helper function to calculate display name and photo changes
function calculateDisplayChanges(
  existing: {
    display_name?: string;
    photo_url?: string;
  } | null,
  displayName: string | null,
  photoUrl: string | null
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};

  if (
    !existing?.display_name &&
    displayName !== null &&
    displayName !== undefined &&
    existing?.display_name !== displayName
  ) {
    changes.display_name = displayName;
  }

  if (!existing?.photo_url && photoUrl && existing?.photo_url !== photoUrl) {
    changes.photo_url = photoUrl;
  }

  return changes;
}

// Helper function to calculate changes for upsert
function calculateChanges(
  existing: {
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    display_name?: string;
    photo_url?: string;
  } | null,
  upsertPayload: { id: string; email: string; username: string },
  firstName: string | null,
  lastName: string | null,
  displayName: string | null,
  photoUrl: string | null,
  shouldForceUpdateNames: boolean
): Record<string, unknown> {
  const basicChanges = calculateBasicChanges(existing, upsertPayload);
  const nameChanges = calculateNameChanges(existing, firstName, lastName, shouldForceUpdateNames);
  const displayChanges = calculateDisplayChanges(existing, displayName, photoUrl);

  return { ...basicChanges, ...nameChanges, ...displayChanges };
}

// Helper function to perform user profile upsert
async function upsertUserProfile(userId: string, changes: Record<string, unknown>): Promise<void> {
  try {
    const payload = { id: userId, ...changes };
    const { error: upsertError } = await (
      supabase.from("users") as unknown as {
        upsert: (
          data: Record<string, unknown>,
          options: { onConflict: string }
        ) => Promise<{ error: unknown }>;
      }
    ).upsert(payload, {
      onConflict: "id",
    });
    if (upsertError) {
      logger.warn("Failed to upsert user profile:", upsertError);
    }
  } catch (error) {
    logger.warn("Error upserting user profile:", error);
  }
}

// Helper function to fetch existing user profile
async function fetchExistingProfile(userId: string): Promise<{
  username?: string;
  email?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
} | null> {
  const { data: existing, error: readError } = await supabase
    .from("users")
    .select("id, email, first_name, last_name, display_name, username, photo_url")
    .eq("id", userId)
    .maybeSingle();

  if (readError) {
    logger.warn("Error reading existing profile:", readError);
  }

  return existing as {
    username?: string;
    email?: string;
    display_name?: string;
    first_name?: string;
    last_name?: string;
    photo_url?: string;
  } | null;
}

// Helper function to process user profile data
function processUserProfileData(
  user: User,
  existing: {
    username?: string;
    email?: string;
    display_name?: string;
    first_name?: string;
    last_name?: string;
    photo_url?: string;
  } | null
): {
  email: string;
  username: string;
  displayName: string | null;
  photoUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  shouldForceUpdateNames: boolean;
} {
  const meta: Record<string, unknown> = user.user_metadata || {};
  const { firstName, lastName, full, given } = extractNamesFromMetadata(meta);

  const email = user.email || existing?.email || null;
  const username = generateUsername(existing?.username, email, user.id);
  const displayName = generateDisplayName(
    existing?.display_name,
    full,
    given,
    firstName,
    lastName,
    email
  );
  const photoUrlRaw: unknown = existing?.photo_url || meta.avatar_url || meta.picture || null;
  const photoUrl: string | null = typeof photoUrlRaw === "string" ? photoUrlRaw : null;

  const isGoogle = isGoogleUser(user);
  const shouldForceUpdateNames = Boolean(isGoogle && (firstName || lastName));

  return {
    email: email || "",
    username,
    displayName,
    photoUrl,
    firstName,
    lastName,
    shouldForceUpdateNames,
  };
}

// Helper function to sync user profile
async function syncUserProfile(
  user: User,
  existing: {
    username?: string;
    email?: string;
    display_name?: string;
    first_name?: string;
    last_name?: string;
    photo_url?: string;
  } | null
): Promise<void> {
  const profileData = processUserProfileData(user, existing);

  if (!validateUserFields(user.id, profileData.email, profileData.username)) {
    logger.warn("Invalid user fields for upsert:", {
      id: user.id,
      email: profileData.email,
      username: profileData.username,
    });
    return;
  }

  const upsertPayload = {
    id: user.id.trim(),
    email: profileData.email.trim(),
    username: profileData.username.trim(),
  };

  const changes = calculateChanges(
    existing,
    upsertPayload,
    profileData.firstName,
    profileData.lastName,
    profileData.displayName,
    profileData.photoUrl,
    profileData.shouldForceUpdateNames
  );

  const hasMeaningfulChanges = !existing || Object.keys(changes).length > 0;
  if (hasMeaningfulChanges) {
    await upsertUserProfile(upsertPayload.id, changes);
  }
}

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
  client: SupabaseClient<Database>;
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
    const runResync = () => {
      resync().catch(() => {
        // ignore resync errors
      });
    };
    const onFocus = () => {
      runResync();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        runResync();
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
  }, []);

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
        const existing = await fetchExistingProfile(user.id);
        await syncUserProfile(user, existing);

        hasSyncedRef.current = user.id;
      } catch {
        // swallow; non-critical
      }
    };

    syncProfileFromAuth().catch(() => {
      // profile sync failures are non-blocking
    });
  }, [user]);

  const value: AuthContextType = {
    user,
    loading,
    client: supabase,
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
