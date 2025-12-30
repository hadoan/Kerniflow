import { create } from "zustand";
import type { ShiftSession } from "@corely/contracts";
import { useAuthStore } from "./authStore";

interface ShiftState {
  currentShift: ShiftSession | null;
  isLoading: boolean;

  loadCurrentShift: (registerId: string) => Promise<void>;
  openShift: (data: {
    sessionId: string;
    registerId: string;
    startingCashCents: number | null;
  }) => Promise<void>;
  closeShift: (data: { closingCashCents: number | null }) => Promise<void>;
  setCurrentShift: (shift: ShiftSession | null) => void;
}

export const useShiftStore = create<ShiftState>((set, get) => ({
  currentShift: null,
  isLoading: false,

  loadCurrentShift: async (registerId: string) => {
    const apiClient = useAuthStore.getState().apiClient;
    if (!apiClient) {
      throw new Error("API client not initialized");
    }

    set({ isLoading: true });
    try {
      const data = await apiClient.getCurrentShift({ registerId });
      set({ currentShift: data.session ?? null, isLoading: false });
    } catch (error) {
      console.error("Failed to load current shift:", error);
      set({ isLoading: false });
      throw error;
    }
  },

  openShift: async (data) => {
    const apiClient = useAuthStore.getState().apiClient;
    if (!apiClient) {
      throw new Error("API client not initialized");
    }

    const user = useAuthStore.getState().user;
    if (!user) {
      throw new Error("User not authenticated");
    }

    set({ isLoading: true });
    try {
      const result = await apiClient.openShift({
        ...data,
        openedByEmployeePartyId: user.userId,
      });

      // Reload to get full session data
      await get().loadCurrentShift(data.registerId);
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  closeShift: async (data) => {
    const apiClient = useAuthStore.getState().apiClient;
    if (!apiClient) {
      throw new Error("API client not initialized");
    }

    const user = useAuthStore.getState().user;
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { currentShift } = get();
    if (!currentShift) {
      throw new Error("No active shift to close");
    }

    set({ isLoading: true });
    try {
      await apiClient.closeShift({
        sessionId: currentShift.sessionId,
        closedByEmployeePartyId: user.userId,
        ...data,
      });

      set({ currentShift: null, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  setCurrentShift: (shift) => {
    set({ currentShift: shift });
  },
}));
