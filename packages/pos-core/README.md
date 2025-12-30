# @corely/pos-core

Platform-agnostic POS business logic for Corely.

## Purpose

This package contains shared POS domain logic that can be reused across web and React Native apps:

- **Sale calculation** - Line totals, subtotals, discounts, tax, payments
- **Sale validation** - Ensure sale data is correct before finalization
- **Receipt formatting** - Format sale data for display or printing
- **Sync command mapping** - Map POS sale to API sync payload
- **Receipt numbering** - Generate local receipt numbers for offline mode

## Usage

```typescript
import { SaleBuilder, ReceiptFormatter } from "@corely/pos-core";

// Calculate totals
const builder = new SaleBuilder();
const lineTotal = builder.calculateLineTotal(2, 1000, 100); // 2 × $10.00 - $1.00 = $19.00

// Format receipt
const formatter = new ReceiptFormatter();
const receiptData = formatter.formatForDisplay(posSale, {
  locale: "en-US",
  currency: "USD",
  cashierName: "John Doe",
});
```

## Design Principles

- **No framework dependencies** - Pure TypeScript, works everywhere
- **No platform-specific code** - No React, React Native, or DOM APIs
- **Testable** - All logic is pure functions or simple classes
- **Type-safe** - Uses `@corely/contracts` for shared types
