/**
 * Utility functions for consistent user display name handling across the application
 */

// Regex for matching 8-character hex strings (UUID fragments)
const HEX_8_REGEX = /^[a-f0-9]{8}$/;
// Regex for matching user- prefixed names
const USER_PREFIX_REGEX = /^@user-/;

export interface UserProfile {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
}

/**
 * Generate a display name with comprehensive fallbacks
 * @param profile User profile data
 * @param userId User ID for fallback generation
 * @returns Object with name and whether user needs a name prompt
 */
export function generateDisplayName(
  profile: UserProfile | null,
  userId?: string
): {
  name: string;
  needsNamePrompt: boolean;
} {
  if (!profile) {
    return {
      name: userId ? "@unknown" : "@unknown",
      needsNamePrompt: true,
    };
  }

  // Comprehensive fallback chain for display names
  if (profile.displayName?.trim()) {
    return {
      name: profile.displayName.trim(),
      needsNamePrompt: false,
    };
  }

  if (profile.firstName && profile.lastName) {
    return {
      name: `${profile.firstName.trim()} ${profile.lastName.trim()}`,
      needsNamePrompt: false,
    };
  }

  if (profile.firstName?.trim()) {
    return {
      name: profile.firstName.trim(),
      needsNamePrompt: false,
    };
  }

  if (profile.lastName?.trim()) {
    return {
      name: profile.lastName.trim(),
      needsNamePrompt: false,
    };
  }

  if (profile.username?.trim() && !profile.username.startsWith("user_")) {
    return {
      name: `@${profile.username.trim()}`,
      needsNamePrompt: false,
    };
  }

  if (profile.email?.includes("@")) {
    const emailLocal = profile.email.split("@")[0];
    if (emailLocal && emailLocal.length > 2 && !emailLocal.match(HEX_8_REGEX)) {
      return {
        name: `@${emailLocal}`,
        needsNamePrompt: false,
      };
    }
  }

  // Check for auto-generated names that should prompt for better names
  if (profile.username?.startsWith("user_")) {
    return {
      name: "@unknown",
      needsNamePrompt: true,
    };
  }

  return {
    name: "@unknown",
    needsNamePrompt: true,
  };
}

// Removed unused export: generateUsername

/**
 * Check if a display name indicates the user needs a name prompt
 * @param name Display name to check
 * @returns True if user needs a name prompt
 */
export function needsNamePrompt(name: string | null | undefined): boolean {
  // Handle null/undefined cases
  if (!name || typeof name !== "string") {
    return true; // Prompt for name if no name provided
  }

  return (
    name === "@unknown" ||
    name.startsWith("User ") ||
    Boolean(name.match(HEX_8_REGEX)) ||
    name.startsWith("user_") ||
    USER_PREFIX_REGEX.test(name)
  );
}

/**
 * Generate an avatar initial from a display name
 * @param name Display name
 * @param email Email as fallback
 * @returns Single character for avatar
 */
export function getAvatarInitial(name: string, email?: string): string {
  if (name && name !== "@unknown") {
    // Remove @ prefix for initials
    const cleanName = name.startsWith("@") ? name.slice(1) : name;
    if (cleanName && cleanName.length > 0 && cleanName[0]) {
      return cleanName[0].toUpperCase();
    }
  }

  if (email?.includes("@")) {
    const emailLocal = email.split("@")[0];
    if (emailLocal && emailLocal.length > 0 && emailLocal[0]) {
      return emailLocal[0].toUpperCase();
    }
  }

  return "U";
}
