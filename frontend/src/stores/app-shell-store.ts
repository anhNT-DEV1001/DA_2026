import { create } from "zustand";

interface AppShellState {
  /** Panel menu con (desktop) đang mở */
  panelOpen: boolean;
  /** Menu overlay trên mobile đang mở */
  mobileOpen: boolean;
  /** Menu gốc user chọn thủ công trên dock (null = theo route) */
  selectedRootId: number | null;
  /** Workspace user chọn trong switcher (null = theo route / mặc định) */
  selectedWorkspaceId: number | null;

  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  setMobileOpen: (open: boolean) => void;
  setSelectedRootId: (id: number | null) => void;
  setSelectedWorkspaceId: (id: number | null) => void;
}

export const useAppShellStore = create<AppShellState>()((set) => ({
  panelOpen: true,
  mobileOpen: false,
  selectedRootId: null,
  selectedWorkspaceId: null,

  setPanelOpen: (panelOpen) => set({ panelOpen }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
  setMobileOpen: (mobileOpen) => set({ mobileOpen }),
  setSelectedRootId: (selectedRootId) => set({ selectedRootId }),
  setSelectedWorkspaceId: (selectedWorkspaceId) => set({ selectedWorkspaceId }),
}));
