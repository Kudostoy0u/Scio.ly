"use client";

import { useAuth } from "@/app/contexts/authContext";
import SyncLocalStorage from "@/lib/database/localStorage-replacement";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

const HEX_ID_REGEX = /^[a-f0-9]{8}$/;

interface NamePromptState {
  needsPrompt: boolean;
  currentName: string;
  currentEmail: string;
  isLoading: boolean;
}

export function useNamePrompt(): NamePromptState {
  const { user } = useAuth();
  const [state, setState] = useState<NamePromptState>({
    needsPrompt: false,
    currentName: "",
    currentEmail: "",
    isLoading: true,
  });

  useEffect(() => {
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex name prompt logic with async checks and state management
    const checkNamePrompt = async () => {
      if (!user?.id) {
        setState({
          needsPrompt: false,
          currentName: "",
          currentEmail: "",
          isLoading: false,
        });
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from("users")
          .select("display_name, first_name, last_name, username, email")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          setState({
            needsPrompt: false,
            currentName: "",
            currentEmail: user.email || "",
            isLoading: false,
          });
          return;
        }

        const profileData = profile as {
          email?: string;
          display_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          username?: string | null;
        } | null;

        const email = profileData?.email || user.email || "";

        // Check if user needs a name prompt
        let needsPrompt = false;
        let currentName = "";

        if (profileData?.display_name?.trim()) {
          currentName = profileData.display_name.trim();
        } else if (profileData?.first_name && profileData?.last_name) {
          currentName = `${profileData.first_name.trim()} ${profileData.last_name.trim()}`;
        } else if (profileData?.first_name?.trim()) {
          currentName = profileData.first_name.trim();
        } else if (profileData?.last_name?.trim()) {
          currentName = profileData.last_name.trim();
        } else if (profileData?.username?.trim() && !profileData.username.startsWith("user_")) {
          currentName = `@${profileData.username.trim()}`;
        } else if (email?.includes("@")) {
          const emailLocal = email.split("@")[0];
          if (emailLocal && emailLocal.length > 2 && !emailLocal.match(HEX_ID_REGEX)) {
            currentName = `@${emailLocal}`;
          } else {
            currentName = "@unknown";
            needsPrompt = true;
          }
        } else {
          currentName = "@unknown";
          needsPrompt = true;
        }

        // Also check for auto-generated names that should prompt for better names
        if (
          !needsPrompt &&
          (currentName.startsWith("User ") ||
            currentName.match(HEX_ID_REGEX) ||
            profileData?.username?.startsWith("user_"))
        ) {
          needsPrompt = true;
        }

        // Check if user has already dismissed this prompt recently
        const dismissedKey = `name_prompt_dismissed_${user.id}`;
        const dismissed = SyncLocalStorage.getItem(dismissedKey);
        if (dismissed) {
          const dismissedTime = Number.parseInt(dismissed, 10);
          const now = Date.now();
          // Don't prompt again for 7 days
          if (now - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
            needsPrompt = false;
          }
        }

        setState({
          needsPrompt,
          currentName,
          currentEmail: email,
          isLoading: false,
        });
      } catch (_error) {
        setState({
          needsPrompt: false,
          currentName: "",
          currentEmail: user.email || "",
          isLoading: false,
        });
      }
    };

    checkNamePrompt();
  }, [user?.id, user?.email]);

  return state;
}

export function dismissNamePrompt(userId: string) {
  const dismissedKey = `name_prompt_dismissed_${userId}`;
  SyncLocalStorage.setItem(dismissedKey, Date.now().toString());
}
