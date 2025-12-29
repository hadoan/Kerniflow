/**
 * API Client
 * Web platform wrapper around @kerniflow/auth-client ApiClient
 */

import { ApiClient } from "@kerniflow/auth-client";
import { authClient } from "./auth-client";
import { WebStorageAdapter } from "./storage-adapter";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const storage = new WebStorageAdapter();

// Get the underlying shared auth client from the wrapper
const sharedAuthClient = authClient.client;

// Create shared API client
const sharedApiClient = new ApiClient({
  apiUrl: API_URL,
  authClient: sharedAuthClient,
  storage,
  onAuthError: () => {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  },
});

export const apiClient = sharedApiClient;
