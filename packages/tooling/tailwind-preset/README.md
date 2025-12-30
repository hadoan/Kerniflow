# @corely/tailwind-preset

Shared Tailwind CSS preset for the Corely design system.

## Installation

```bash
pnpm add -D @corely/tailwind-preset@workspace:* tailwindcss tailwindcss-animate
```

## Usage

### Basic Usage

```typescript
// tailwind.config.ts
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
} satisfies Config;
```

### With Custom Overrides

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";
import preset from "@corely/tailwind-preset";

export default {
  presets: [preset],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Add project-specific customizations
      colors: {
        brand: "#your-color",
      },
    },
  },
} satisfies Config;
```

## What's Included

### Colors

- **Base colors**: border, background, foreground with variants
- **UI components**: panel, input, ring
- **Semantic colors**: primary, secondary, destructive, muted, accent
- **Status colors**: success, warning, danger
- **Component colors**: popover, card, sidebar
- **Chart colors**: chart-1 through chart-5

All colors use CSS variables (e.g., `hsl(var(--primary))`) for easy theming.

### Typography

- **Sans**: Inter with system fallback
- **Mono**: JetBrains Mono with fallback

### Border Radius

Dynamic radius based on `--radius` CSS variable with sm/md/lg/xl/2xl/3xl variants.

### Shadows

- `glow`, `glow-lg` - Accent-based glows
- `card`, `card-hover` - Card elevations
- `elevated` - Standard elevated surface

### Animations

- **Accordion**: accordion-down, accordion-up
- **Fades**: fade-in, fade-out
- **Slides**: slide-in-right, slide-out-right, slide-in-left, slide-in-up
- **Scale**: scale-in
- **Effects**: spin-slow, shimmer, pulse-glow

### Plugins

- `tailwindcss-animate` - Animation utilities

## Design Tokens

This preset is designed to work with CSS variables for theming. Ensure your global CSS defines the required variables:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  /* ... other variables */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... other variables */
}
```

## Notes

- All colors use HSL with CSS variables for maximum flexibility
- Dark mode is configured via `class` strategy
- Container is centered with 2rem padding by default
- Preset uses `tailwindcss-animate` for animation utilities
