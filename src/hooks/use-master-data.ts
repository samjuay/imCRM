"use client";

import { useMasterDataStore } from "@/store/master-data-store";

export function useMasterData() {
  const leadSources = useMasterDataStore((state) => state.leadSources);
  const leadStatuses = useMasterDataStore((state) => state.leadStatuses);
  const followupTypes = useMasterDataStore((state) => state.followupTypes);
  const isLoading = useMasterDataStore((state) => state.isLoading);

  return {
    leadSources,
    leadStatuses,
    followupTypes,
    isLoading,
  };
}