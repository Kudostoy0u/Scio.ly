import { supabase } from '@/lib/supabase';

/**
 * User profile utilities for Science Olympiad platform
 * Provides user profile management for both authenticated and anonymous users
 */

/**
 * User profile interface
 * Contains all user profile information
 */
export interface UserProfile {
  /** User's first name */
  firstName?: string | null;
  /** User's last name */
  lastName?: string | null;
  /** User's username */
  username?: string | null;
  /** User's display name */
  displayName?: string | null;
}

/** Default empty profile */
const defaultProfile: UserProfile = {};

// --- local storage functions for anonymous users ---

/**
 * Get local profile from localStorage
 * Retrieves profile data for anonymous users
 * 
 * @returns {UserProfile} Local profile data
 */
const getLocalProfile = (): UserProfile => {
  const localProfile = localStorage.getItem('userProfile');
  if (localProfile) {
    try {
      return { ...defaultProfile, ...JSON.parse(localProfile) };
    } catch (e) {
      console.error("Error parsing local profile:", e);
      return { ...defaultProfile };
    }
  }
  return { ...defaultProfile };
};

/**
 * Save local profile to localStorage
 * Stores profile data for anonymous users
 * 
 * @param {UserProfile} profile - Profile data to save
 */
const saveLocalProfile = (profile: UserProfile) => {
  localStorage.setItem('userProfile', JSON.stringify(profile));
};

// --- supabase functions for logged-in users ---

/**
 * Fetches the user's profile data
 * Returns default profile if not found or for anonymous users
 * 
 * @param {string | null} userId - The user's ID, or null for anonymous users
 * @returns {Promise<UserProfile>} The user's profile data
 * @example
 * ```typescript
 * const profile = await getUserProfile('user-123');
 * console.log(profile.displayName);
 * ```
 */
export const getUserProfile = async (userId: string | null): Promise<UserProfile> => {
  if (!userId) {
    return getLocalProfile();
  }

  try {
    const { data, error } = await (supabase as any)
      .from('users')
      .select('first_name, last_name, username, display_name')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting user profile:', error);
      return { ...defaultProfile };
    }

    if (data) {
      return {
        firstName: data.first_name,
        lastName: data.last_name,
        username: data.username,
        displayName: data.display_name,
      };
    }

    return { ...defaultProfile };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { ...defaultProfile };
  }
};

/**
 * Updates specific fields in the user's profile data.
 * @param userId The user's ID, or null for anonymous users.
 * @param updates An object containing the profile fields to update.
 */
export const updateUserProfile = async (userId: string | null, updates: Partial<UserProfile>): Promise<void> => {
  if (!userId) {

    const currentProfile = getLocalProfile();
    const updatedProfile = { ...currentProfile, ...updates };
    saveLocalProfile(updatedProfile);
    return;
  }


  try {
    const updateData: Record<string, unknown> = {};

    if (updates.firstName !== undefined) updateData.first_name = updates.firstName;
    if (updates.lastName !== undefined) updateData.last_name = updates.lastName;
    if (updates.username !== undefined) updateData.username = updates.username;
    if (updates.displayName !== undefined) updateData.display_name = updates.displayName;

    const { error } = await (supabase as any)
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      console.error('Error updating user profile:', error);
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
  }
};