import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { AuthClient } from '@kerniflow/auth-client';
import { PosApiClient } from '@/lib/pos-api-client';
import { NativeStorageAdapter } from '@/lib/storage-adapter';
import { router } from 'expo-router';

interface User {
  userId: string;
  workspaceId: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialized: boolean;
  authClient: AuthClient | null;
  apiClient: PosApiClient | null;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const storage = new NativeStorageAdapter();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  initialized: false,
  authClient: null,
  apiClient: null,

  initialize: async () => {
    try {
      // Create shared auth client
      const authClient = new AuthClient({
        apiUrl: API_URL,
        storage,
      });

      // Load stored tokens
      await authClient.loadStoredTokens();

      // Create POS API client
      const apiClient = new PosApiClient({
        apiUrl: API_URL,
        authClient,
        storage,
        onAuthError: () => {
          get().logout();
        },
      });

      // Check if user is authenticated
      const accessToken = authClient.getAccessToken();
      const userJson = await SecureStore.getItemAsync('user');

      if (accessToken && userJson) {
        const user = JSON.parse(userJson);
        set({
          user,
          isAuthenticated: true,
          initialized: true,
          authClient,
          apiClient,
        });
      } else {
        set({ initialized: true, authClient, apiClient });
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ initialized: true });
    }
  },

  login: async (email: string, password: string) => {
    const { authClient } = get();
    if (!authClient) {
      throw new Error('Auth client not initialized');
    }

    set({ isLoading: true });
    try {
      const data = await authClient.signin({ email, password });

      const user: User = {
        userId: data.userId,
        workspaceId: data.workspaceId || data.tenantId || '',
        email: data.email,
      };

      await SecureStore.setItemAsync('user', JSON.stringify(user));

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    const { authClient } = get();

    if (authClient) {
      await authClient.signout();
    }

    await SecureStore.deleteItemAsync('user');

    set({
      user: null,
      isAuthenticated: false,
    });

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/login');
    }
  },
}));
