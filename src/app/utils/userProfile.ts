import { supabase } from '@/lib/supabase';


export interface UserProfile {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  displayName?: string | null;
}

const defaultProfile: UserProfile = {};

// --- local storage functions for anonymous users ---

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

const saveLocalProfile = (profile: UserProfile) => {
  localStorage.setItem('userProfile', JSON.stringify(profile));
};

// --- supabase functions for logged-in users ---

/**
 * Fetches the user's profile data.
 * Returns default profile if not found or for anonymous users.
 * @param userId The user's ID, or null for anonymous users.
 * @returns The user's profile data.
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