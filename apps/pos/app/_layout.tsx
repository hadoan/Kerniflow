import { useEffect } from "react";
import { Slot, SplashScreen } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useCatalogStore } from "@/stores/catalogStore";
import { useRegisterStore } from "@/stores/registerStore";
import { useSyncEngine } from "@/hooks/useSyncEngine";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { initialized, initialize } = useAuthStore();
  const { initialize: initializeCatalog } = useCatalogStore();
  const { initialize: initializeRegister } = useRegisterStore();
  const { initializeSync } = useSyncEngine();

  useEffect(() => {
    async function init() {
      await initialize();
      await initializeSync();

      // Initialize catalog and register after auth
      if (useAuthStore.getState().isAuthenticated) {
        await Promise.all([initializeCatalog(), initializeRegister()]);
      }

      await SplashScreen.hideAsync();
    }
    void init();
  }, []);

  if (!initialized) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}
