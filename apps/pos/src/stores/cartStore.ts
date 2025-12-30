import { create } from "zustand";
import { v4 as uuidv4 } from "@lukeed/uuid";
import type { PosTicketLineItem } from "@corely/contracts";
import { SaleBuilder } from "@corely/pos-core";

const saleBuilder = new SaleBuilder();

interface CartItem extends Omit<PosTicketLineItem, "lineId"> {
  id: string;
}

interface CartState {
  items: CartItem[];
  customerId: string | null;
  notes: string | null;

  addItem: (item: Omit<CartItem, "id">) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateDiscount: (itemId: string, discountCents: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  setCustomer: (customerId: string | null) => void;
  setNotes: (notes: string | null) => void;
  getTotals: () => {
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
  };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerId: null,
  notes: null,

  addItem: (item) => {
    const { items } = get();
    const existingItem = items.find((i) => i.productId === item.productId);

    if (existingItem) {
      set({
        items: items.map((i) =>
          i.id === existingItem.id ? { ...i, quantity: i.quantity + item.quantity } : i
        ),
      });
    } else {
      set({
        items: [...items, { ...item, id: uuidv4() }],
      });
    }
  },

  updateQuantity: (itemId, quantity) => {
    set({
      items: get().items.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
    });
  },

  updateDiscount: (itemId, discountCents) => {
    set({
      items: get().items.map((item) => (item.id === itemId ? { ...item, discountCents } : item)),
    });
  },

  removeItem: (itemId) => {
    set({
      items: get().items.filter((item) => item.id !== itemId),
    });
  },

  clearCart: () => {
    set({
      items: [],
      customerId: null,
      notes: null,
    });
  },

  setCustomer: (customerId) => {
    set({ customerId });
  },

  setNotes: (notes) => {
    set({ notes });
  },

  getTotals: () => {
    const { items } = get();
    const subtotalCents = items.reduce((sum, item) => {
      return (
        sum + saleBuilder.calculateLineTotal(item.quantity, item.unitPriceCents, item.discountCents)
      );
    }, 0);

    // TODO: Calculate actual tax based on tax rules
    const taxCents = Math.round(subtotalCents * 0.1); // 10% placeholder
    const totalCents = subtotalCents + taxCents;

    return { subtotalCents, taxCents, totalCents };
  },
}));
