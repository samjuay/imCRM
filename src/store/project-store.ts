import { create } from "zustand";
import { projectService } from "@/services/projects";
import type { Project } from "@/types/project";

type ProjectState = {
  projects: Project[];
  isLoading: boolean;
  loadedCompanyId: string | null;
  loadByCompany: (companyId: string) => Promise<void>;
  reset: () => void;
};

const initialState = {
  projects: [] as Project[],
  isLoading: false,
  loadedCompanyId: null as string | null,
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  ...initialState,

  reset: () => {
    set(initialState);
  },

  loadByCompany: async (companyId) => {
    if (get().loadedCompanyId === companyId) {
      return;
    }

    set({ isLoading: true });

    const { data, error } = await projectService.getByCompany(companyId);

    if (error) {
      set({ isLoading: false });
      return;
    }

    set({
      projects: (data ?? []) as Project[],
      isLoading: false,
      loadedCompanyId: companyId,
    });
  },
}));