"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/auth.service";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const reset = useAuthStore((state) => state.reset);

  useEffect(() => {
    void initialize();

    const {
      data: { subscription },
    } = authService.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        reset();
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await refreshProfile();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initialize, refreshProfile, reset]);

  return <>{children}</>;
}