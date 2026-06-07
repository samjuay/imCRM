import { create } from "zustand";

type UIState = {
  isSidebarCollapsed: boolean;
  isMobileMenuOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  isSidebarCollapsed: false,
  isMobileMenuOpen: false,
  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
}));