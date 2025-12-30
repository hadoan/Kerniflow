# Corely POS - React Native App

AI-Native, Offline-First Point of Sale application for Corely.

## Features

- **Offline-First**: Full POS functionality works offline with automatic background sync
- **AI-Native**: Integrated AI Copilot for natural language product search, cart building, upsell suggestions
- **Real-time Sync**: Background sync engine with conflict resolution
- **Barcode Scanning**: Built-in barcode scanner for quick product lookup
- **Shift Management**: Open/close shifts with cash reconciliation
- **Multi-platform**: Runs on iOS, Android, and Web

## Tech Stack

- **Expo**: React Native framework with managed workflow
- **Expo Router**: File-based navigation
- **SQLite**: Local database for offline storage
- **Zustand**: State management
- **Zod**: Schema validation (via @corely/contracts)

## Project Structure

```
apps/pos/
├── app/                      # Expo Router screens
│   ├── (main)/              # Main app (tabs)
│   │   ├── index.tsx        # POS Home screen
│   │   ├── cart.tsx         # Cart screen
│   │   ├── sync.tsx         # Sync queue screen
│   │   └── settings.tsx     # Settings screen
│   ├── login.tsx            # Login screen
│   ├── _layout.tsx          # Root layout
│   └── index.tsx            # Entry point
├── src/
│   ├── stores/              # Zustand stores
│   │   ├── authStore.ts     # Authentication state
│   │   ├── cartStore.ts     # Shopping cart state
│   │   ├── shiftStore.ts    # Shift session state
│   │   └── catalogStore.ts  # Product catalog cache
│   └── hooks/               # React hooks
│       └── useSyncEngine.ts # Sync engine hook
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Expo CLI (`npm install -g expo-cli`)

### Installation

```bash
# From monorepo root
pnpm install

# Navigate to POS app
cd apps/pos

# Copy environment variables
cp .env.example .env

# Start development server
pnpm start
```

### Running on Devices

```bash
# iOS
pnpm ios

# Android
pnpm android

# Web
pnpm web
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

## Shared Packages

This app uses shared packages from the monorepo:

- `@corely/contracts` - Type-safe API contracts and schemas
- `@corely/api-client` - API client with auth
- `@corely/offline-core` - Platform-agnostic sync engine
- `@corely/offline-rn` - React Native SQLite adapter
- `@corely/pos-core` - POS business logic (sale calculations, receipt formatting)

## Key Features

### Offline-First Architecture

- All sales are created locally with local-first IDs
- Background sync engine automatically syncs when online
- Idempotency ensures duplicate sales are prevented
- Failed syncs are retried with exponential backoff

### AI Copilot Integration

The POS app includes AI-powered features:

- **Natural Language Search**: "red wine under $50"
- **Voice-to-Cart**: "Add 2 cases of Chardonnay and 1 dozen roses"
- **Smart Upsell**: Context-aware product suggestions
- **Discount Guard**: Anomaly detection for unusual discounts
- **Shift Digest**: AI-powered shift summary with insights

### Shift Management

- Open shift with starting cash count
- Close shift with cash reconciliation
- Variance detection (over/short)
- Daily sales reports

### Product Search

- Text search by name, SKU, barcode
- Barcode scanner integration
- Offline catalog caching
- Fast fuzzy search

## Development

### Type Checking

```bash
pnpm type-check
```

### Linting

```bash
pnpm lint
```

## Architecture

### State Management

Uses Zustand for lightweight, scalable state management:

- `authStore` - JWT tokens, user session
- `cartStore` - Current cart items, totals
- `shiftStore` - Active shift session
- `catalogStore` - Product catalog cache

### Offline Sync

Uses the `@corely/offline-core` sync engine:

1. User actions create commands in local outbox
2. Background sync processes pending commands
3. Idempotency prevents duplicate operations
4. Failed commands marked for retry
5. Conflict resolution UI for user intervention

## Next Steps

- [ ] Implement checkout flow
- [ ] Add receipt screen
- [ ] Implement AI Copilot integration
- [ ] Add shift open/close flows
- [ ] Implement barcode scanner screen
- [ ] Add sales history
- [ ] Implement catalog sync
