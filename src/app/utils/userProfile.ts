import { supabase } from '@/lib/supabase';

// Define the structure of the user's profile data
export interface UserProfile {
  navbarStyle?: 'default' | 'golden' | 'rainbow';
  hasUnlockedGolden?: boolean;
  hasUnlockedRainbow?: boolean;
}

const defaultProfile: UserProfile = {
  navbarStyle: 'default',
  hasUnlockedGolden: false,
  hasUnlockedRainbow: false,
};

// --- Local Storage Functions for Anonymous Users ---

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

// --- Supabase Functions for Logged-in Users ---

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
      .select('navbar_style, has_unlocked_golden, has_unlocked_rainbow')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error getting user profile:', error);
      return { ...defaultProfile };
    }

    if (data) {
      return {
        navbarStyle: data.navbar_style as 'default' | 'golden' | 'rainbow',
        hasUnlockedGolden: data.has_unlocked_golden,
        hasUnlockedRainbow: data.has_unlocked_rainbow,
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
    // Anonymous user: Update localStorage
    const currentProfile = getLocalProfile();
    const updatedProfile = { ...currentProfile, ...updates };
    saveLocalProfile(updatedProfile);
    return;
  }

  // Logged-in user: Update Supabase
  try {
    const updateData: Record<string, unknown> = {};
    
    if (updates.navbarStyle !== undefined) {
      updateData.navbar_style = updates.navbarStyle;
    }
    if (updates.hasUnlockedGolden !== undefined) {
      updateData.has_unlocked_golden = updates.hasUnlockedGolden;
    }
    if (updates.hasUnlockedRainbow !== undefined) {
      updateData.has_unlocked_rainbow = updates.hasUnlockedRainbow;
    }

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