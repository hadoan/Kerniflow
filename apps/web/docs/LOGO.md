# Corely Logo Guidelines

## Logo Concept

The Corely logo features a distinctive "C" lettermark within a rounded square container, representing the core ("core" + "ly") foundation of AI-native ERP workflows.

## Logo Files

- `src/assets/logo-mark.svg` - Icon only (40x40)
- `src/assets/logo-full.svg` - Icon + wordmark (160x40)

## Usage

### Spacing

- Minimum clear space: 1x icon height on all sides
- Minimum size: 24px for icon, 120px for full logo

### Color Usage

- **Primary (dark backgrounds):** Use `currentColor` with cyan accent
- **Monochrome:** Single color version for limited color contexts

### React Component

```tsx
import { Logo } from '@/shared/components/Logo';

// Icon + text
<Logo size="md" showText={true} />

// Icon only
<Logo size="sm" showText={false} />
```

## Don'ts

- Don't stretch or distort
- Don't add effects or shadows
- Don't change the lettermark design
- Don't use low contrast combinations
