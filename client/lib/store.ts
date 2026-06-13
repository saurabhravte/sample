"use client";

import { create } from "zustand";

/**
 * Global UI state via zustand — one tiny store (no provider tree) shared by
 * the layout, sidebar, and every page that filters on focus mode.
 */
type UiState = {
  focusMode: boolean;
  paletteOpen: boolean;
  helpOpen: boolean;
  sidebarCollapsed: boolean;
  toggleFocus: () => void;
  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
  toggleHelp: () => void;
  toggleSidebar: () => void;
  closeOverlays: () => void;
};

const COLLAPSE_KEY = "ui:sidebarCollapsed";
const initialCollapsed = typeof window !== "undefined" && window.localStorage.getItem(COLLAPSE_KEY) === "1";

export const useUiStore = create<UiState>((set) => ({
  focusMode: false,
  paletteOpen: false,
  helpOpen: false,
  sidebarCollapsed: initialCollapsed,
  toggleFocus: () => set((s) => ({ focusMode: !s.focusMode })),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
  toggleHelp: () => set((s) => ({ helpOpen: !s.helpOpen })),
  toggleSidebar: () =>
    set((s) => {
      const next = !s.sidebarCollapsed;
      if (typeof window !== "undefined") window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return { sidebarCollapsed: next };
    }),
  closeOverlays: () => set({ paletteOpen: false, helpOpen: false }),
}));

/** Selector hook kept stable so pages only re-render when focus flips. */
export const useFocusMode = () => useUiStore((s) => s.focusMode);
