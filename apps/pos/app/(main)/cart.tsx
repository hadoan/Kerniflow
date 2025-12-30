import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCartStore } from "@/stores/cartStore";
import { SaleBuilder } from "@corely/pos-core";

const saleBuilder = new SaleBuilder();

export default function CartScreen() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart, getTotals } = useCartStore();
  const totals = getTotals();

  const handleIncrement = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (item) {
      updateQuantity(itemId, item.quantity + 1);
    }
  };

  const handleDecrement = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (item && item.quantity > 1) {
      updateQuantity(itemId, item.quantity - 1);
    }
  };

  const handleCheckout = () => {
    router.push("/checkout");
  };

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={64} color="#999" />
          <Text style={styles.emptyTitle}>Cart is Empty</Text>
          <Text style={styles.emptyText}>Add products to start a new sale</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const lineTotal = saleBuilder.calculateLineTotal(
            item.quantity,
            item.unitPriceCents,
            item.discountCents
          );

          return (
            <View style={styles.cartItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>${(item.unitPriceCents / 100).toFixed(2)} each</Text>
              </View>

              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleDecrement(item.id)}
                >
                  <Ionicons name="remove" size={20} color="#666" />
                </TouchableOpacity>
                <Text style={styles.quantity}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleIncrement(item.id)}
                >
                  <Ionicons name="add" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.itemTotalContainer}>
                <Text style={styles.itemTotal}>${(lineTotal / 100).toFixed(2)}</Text>
                <TouchableOpacity onPress={() => removeItem(item.id)}>
                  <Ionicons name="trash-outline" size={20} color="#d32f2f" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <View style={styles.footer}>
            <TouchableOpacity style={styles.clearButton} onPress={clearCart}>
              <Text style={styles.clearButtonText}>Clear Cart</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.totalsContainer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>${(totals.subtotalCents / 100).toFixed(2)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax</Text>
          <Text style={styles.totalValue}>${(totals.taxCents / 100).toFixed(2)}</Text>
        </View>
        <View style={[styles.totalRow, styles.grandTotalRow]}>
          <Text style={styles.grandTotalLabel}>Total</Text>
          <Text style={styles.grandTotalValue}>${(totals.totalCents / 100).toFixed(2)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
        <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: "#666",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
  },
  quantity: {
    fontSize: 16,
    fontWeight: "600",
    marginHorizontal: 12,
    minWidth: 24,
    textAlign: "center",
  },
  itemTotalContainer: {
    alignItems: "flex-end",
    minWidth: 80,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  footer: {
    padding: 16,
  },
  clearButton: {
    padding: 12,
    alignItems: "center",
  },
  clearButtonText: {
    color: "#d32f2f",
    fontSize: 16,
    fontWeight: "600",
  },
  totalsContainer: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: "#666",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  grandTotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: "600",
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2196f3",
  },
  checkoutButton: {
    backgroundColor: "#2196f3",
    padding: 16,
    alignItems: "center",
    margin: 16,
    borderRadius: 8,
  },
  checkoutButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
