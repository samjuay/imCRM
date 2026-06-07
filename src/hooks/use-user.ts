"use client";

import { useAuthStore } from "@/store/auth.store";

export function useUser() {
  return useAuthStore((state) => state.profile);
}