import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useShiftStore } from "@/stores/shiftStore";
import { useCartStore } from "@/stores/cartStore";
import { useCatalogStore } from "@/stores/catalogStore";
import { useRegisterStore } from "@/stores/registerStore";

export default function POSHomeScreen() {
  const router = useRouter();
  const { selectedRegister } = useRegisterStore();
  const { currentShift } = useShiftStore();
  const { addItem, items } = useCartStore();
  const { searchProducts } = useCatalogStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      const results = await searchProducts(query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleAddToCart = (product: any) => {
    addItem({
      productId: product.productId,
      name: product.name,
      quantity: 1,
      unitPriceCents: product.salePriceCents,
      discountCents: 0,
    });
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleOpenScanner = () => {
    router.push("/scanner");
  };

  // Check if register is selected
  if (!selectedRegister) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="desktop-outline" size={64} color="#999" />
          <Text style={styles.emptyTitle}>No Register Selected</Text>
          <Text style={styles.emptyText}>Please select a register to start using the POS</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push("/register-selection")}
          >
            <Text style={styles.buttonText}>Select Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!currentShift) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={64} color="#999" />
          <Text style={styles.emptyTitle}>No Active Shift</Text>
          <Text style={styles.emptyText}>Please open a shift to start selling</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.push("/shift/open")}>
            <Text style={styles.buttonText}>Open Shift</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity style={styles.scanButton} onPress={handleOpenScanner}>
          <Ionicons name="barcode-outline" size={24} color="#2196f3" />
        </TouchableOpacity>
      </View>

      {searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.productId}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.productItem} onPress={() => handleAddToCart(item)}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productSku}>{item.sku}</Text>
              </View>
              <Text style={styles.productPrice}>${(item.salePriceCents / 100).toFixed(2)}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {searchResults.length === 0 && searchQuery.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color="#999" />
          <Text style={styles.emptyText}>Search for products or scan barcodes to add to cart</Text>
        </View>
      )}

      {items.length > 0 && (
        <View style={styles.cartPreview}>
          <Text style={styles.cartPreviewText}>{items.length} items in cart</Text>
          <TouchableOpacity onPress={() => router.push("/(main)/cart")}>
            <Text style={styles.cartPreviewLink}>View Cart →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  searchContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    paddingVertical: 12,
  },
  scanButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
  },
  productItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  productSku: {
    fontSize: 14,
    color: "#666",
  },
  productPrice: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2196f3",
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
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#2196f3",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cartPreview: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#2196f3",
  },
  cartPreviewText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cartPreviewLink: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
