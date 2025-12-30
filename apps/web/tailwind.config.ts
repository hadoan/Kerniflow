import type { Config } from "tailwindcss";
import preset from "@corely/tailwind-preset";

export default {
  presets: [preset],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  // All theme configuration is inherited from @corely/tailwind-preset
  // Add project-specific overrides here if needed
  theme: {
    extend: {
      // Project-specific customizations (currently none)
    },
  },
} satisfies Config;
