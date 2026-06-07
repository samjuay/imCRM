import { create } from "zustand";
import {
  followupTypeService,
  leadSourceService,
  leadStatusService,
} from "@/services/master-data";
import type { FollowupType } from "@/types/followup";
import type { LeadSource } from "@/types/lead-source";
import type { LeadStatus } from "@/types/lead-status";

type MasterDataState = {
  leadSources: LeadSource[];
  leadStatuses: LeadStatus[];
  followupTypes: FollowupType[];
  isLoading: boolean;
  loadedCompanyId: string | null;
  loadByCompany: (companyId: string) => Promise<void>;
  reset: () => void;
};

const initialState = {
  leadSources: [] as LeadSource[],
  leadStatuses: [] as LeadStatus[],
  followupTypes: [] as FollowupType[],
  isLoading: false,
  loadedCompanyId: null as string | null,
};

export const useMasterDataStore = create<MasterDataState>((set, get) => ({
  ...initialState,

  reset: () => {
    set(initialState);
  },

  loadByCompany: async (companyId) => {
    if (get().loadedCompanyId === companyId) {
      return;
    }

    set({ isLoading: true });

    const [sourcesResult, statusesResult, typesResult] = await Promise.all([
      leadSourceService.getByCompany(companyId),
      leadStatusService.getByCompany(companyId),
      followupTypeService.getByCompany(companyId),
    ]);

    if (sourcesResult.error || statusesResult.error || typesResult.error) {
      set({ isLoading: false });
      return;
    }

    set({
      leadSources: (sourcesResult.data ?? []) as LeadSource[],
      leadStatuses: (statusesResult.data ?? []) as LeadStatus[],
      followupTypes: (typesResult.data ?? []) as FollowupType[],
      isLoading: false,
      loadedCompanyId: companyId,
    });
  },
}));