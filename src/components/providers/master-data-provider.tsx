"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import {
  loadMasterDataForUser,
  resetMasterDataStores,
} from "@/lib/master-data/loader";
import { useProjectStore } from "@/store/project-store";

export function MasterDataProvider({ children }: { children: React.ReactNode }) {
  const profile = useAuthStore((state) => state.profile);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const resetProjects = useProjectStore((state) => state.reset);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!profile) {
      resetMasterDataStores();
      resetProjects();
      return;
    }

    void loadMasterDataForUser(profile);
  }, [profile, isAuthLoading, resetProjects]);

  return <>{children}</>;
}