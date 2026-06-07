"use client";

import { useAuthStore } from "@/store/auth.store";

export function useAuth() {
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const profile = useAuthStore((state) => state.profile);
  const signIn = useAuthStore((state) => state.signIn);
  const signOut = useAuthStore((state) => state.signOut);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);

  return {
    isLoading,
    isAuthenticated,
    profile,
    signIn,
    signOut,
    refreshProfile,
  };
}