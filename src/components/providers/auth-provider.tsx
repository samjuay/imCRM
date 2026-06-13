"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/auth.service";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const reset = useAuthStore((state) => state.reset);

  useEffect(() => {
    console.log('[AUTH] AuthProvider useEffect mounted');

    // Bootstrap initialization on mount
    initialize();

    const {
      data: { subscription },
    } = authService.onAuthStateChange(async (event: "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED" | "INITIAL_SESSION" | "USER_UPDATED" | "PASSWORD_RECOVERY" | "MFA_CHALLENGE_VERIFIED") => {
      console.log('[AUTH] onAuthStateChange event:', event);

      if (event === "SIGNED_OUT") {
        reset();
        return;
      }

      // Only TOKEN_REFRESHED triggers profile refresh
      if (event === "TOKEN_REFRESHED") {
        console.log('[AUTH] TOKEN_REFRESHED received, calling refreshProfile()');
        await refreshProfile();
      }

      // INITIAL_SESSION and SIGNED_IN are handled by mount-time initialize()
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initialize, refreshProfile, reset]);

  return <>{children}</>;
}