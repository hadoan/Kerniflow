# @corely/offline-rn

React Native adapters for offline-first sync with Corely.

## Purpose

This package provides React Native-specific implementations of offline-core ports:

- **RnNetworkMonitor** - Network status monitoring using `@react-native-community/netinfo`
- **SqliteOutboxStore** - Command queue persistence using SQLite (expo-sqlite or react-native-sqlite-storage)

## Usage

### Network Monitoring

```typescript
import { RnNetworkMonitor } from "@corely/offline-rn";

const networkMonitor = new RnNetworkMonitor();

// Subscribe to network changes
const unsubscribe = networkMonitor.subscribe((status) => {
  console.log("Network status:", status); // "ONLINE" | "OFFLINE"
});

// Get current status
const currentStatus = await networkMonitor.getCurrent();
```

### SQLite Outbox Store

```typescript
import * as SQLite from "expo-sqlite";
import { SqliteOutboxStore } from "@corely/offline-rn";

// Open database
const db = SQLite.openDatabaseSync("pos-outbox.db");

// Create store
const outboxStore = new SqliteOutboxStore(db);

// Initialize schema
await outboxStore.initialize();

// Use with SyncEngine
const syncEngine = new SyncEngine({
  store: outboxStore,
  transport: myTransport,
  // ... other deps
});
```

## Dependencies

- `@react-native-community/netinfo` - Required for network monitoring
- `expo-sqlite` or `react-native-sqlite-storage` - Required for SQLite storage (peer dependency)

## Installation in RN App

```bash
pnpm add @react-native-community/netinfo expo-sqlite
```

## Design Notes

- **Platform-specific adapters only** - Business logic stays in `@corely/offline-core`
- **Minimal API surface** - Implements core ports, nothing more
- **Type-safe** - All types come from `@corely/offline-core`
