import { create } from "zustand";
import type { Register } from "@corely/contracts";
import { useAuthStore } from "./authStore";
import * as SecureStore from "expo-secure-store";

interface RegisterState {
  registers: Register[];
  selectedRegister: Register | null;
  isLoading: boolean;

  initialize: () => Promise<void>;
  loadRegisters: () => Promise<void>;
  selectRegister: (registerId: string) => Promise<void>;
  getSelectedRegisterId: () => string | null;
}

const SELECTED_REGISTER_KEY = "pos-selected-register";

export const useRegisterStore = create<RegisterState>((set, get) => ({
  registers: [],
  selectedRegister: null,
  isLoading: false,

  initialize: async () => {
    try {
      // Load previously selected register
      const registerId = await SecureStore.getItemAsync(SELECTED_REGISTER_KEY);

      if (registerId) {
        // Load registers to find the selected one
        await get().loadRegisters();

        const register = get().registers.find((r) => r.registerId === registerId);
        if (register && register.status === "ACTIVE") {
          set({ selectedRegister: register });
          console.log(`Restored register selection: ${register.name}`);
        } else {
          // Clear invalid selection
          await SecureStore.deleteItemAsync(SELECTED_REGISTER_KEY);
        }
      }
    } catch (error) {
      console.error("Failed to initialize register store:", error);
    }
  },

  loadRegisters: async () => {
    const apiClient = useAuthStore.getState().apiClient;
    if (!apiClient) {
      throw new Error("API client not initialized");
    }

    set({ isLoading: true });
    try {
      const data = await apiClient.listRegisters({ status: "ACTIVE" });
      set({ registers: data.registers, isLoading: false });
    } catch (error) {
      console.error("Failed to load registers:", error);
      set({ isLoading: false });
      throw error;
    }
  },

  selectRegister: async (registerId: string) => {
    const { registers } = get();
    const register = registers.find((r) => r.registerId === registerId);

    if (!register) {
      throw new Error("Register not found");
    }

    set({ selectedRegister: register });
    await SecureStore.setItemAsync(SELECTED_REGISTER_KEY, registerId);
    console.log(`Selected register: ${register.name}`);
  },

  getSelectedRegisterId: () => {
    return get().selectedRegister?.registerId ?? null;
  },
}));
