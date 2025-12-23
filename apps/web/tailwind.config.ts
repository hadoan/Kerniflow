import type { Config } from "tailwindcss";
import preset from "@kerniflow/tailwind-preset";

export default {
  presets: [preset],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  // All theme configuration is inherited from @kerniflow/tailwind-preset
  // Add project-specific overrides here if needed
  theme: {
    extend: {
      // Project-specific customizations (currently none)
    },
  },
} satisfies Config;
