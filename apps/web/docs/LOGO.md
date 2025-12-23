# Bizflow Logo Guidelines

## Logo Concept

The Bizflow logo represents "flow + connectivity" - a rounded square containing interconnected nodes that symbolize workflow processes and business operations.

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
- Don't change the node arrangement
- Don't use low contrast combinations
