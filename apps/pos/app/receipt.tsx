import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { format } from "date-fns";

export default function ReceiptScreen() {
  const router = useRouter();
  const { saleId } = useLocalSearchParams<{ saleId: string }>();

  // TODO: Load actual sale from SQLite or state
  const mockSale = {
    receiptNumber: "REG1-20250329-001",
    createdAt: new Date(),
    lineItems: [
      {
        name: "Sample Product 1",
        quantity: 2,
        unitPriceCents: 1500,
        lineTotalCents: 3000,
      },
      {
        name: "Sample Product 2",
        quantity: 1,
        unitPriceCents: 2500,
        lineTotalCents: 2500,
      },
    ],
    subtotalCents: 5500,
    taxCents: 550,
    totalCents: 6050,
    payments: [
      {
        method: "CASH",
        amountCents: 7000,
      },
    ],
    changeDue: 950,
  };

  const handlePrint = () => {
    // TODO: Implement print functionality
    console.log("Print receipt");
  };

  const handleEmail = () => {
    // TODO: Implement email functionality
    console.log("Email receipt");
  };

  const handleNewSale = () => {
    router.replace("/(main)");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Receipt</Text>
        <TouchableOpacity onPress={handlePrint}>
          <Ionicons name="print-outline" size={24} color="#2196f3" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.receipt}>
          <View style={styles.receiptHeader}>
            <Text style={styles.storeName}>Corely POS</Text>
            <Text style={styles.receiptNumber}>{mockSale.receiptNumber}</Text>
            <Text style={styles.dateTime}>{format(mockSale.createdAt, "MMM d, yyyy h:mm a")}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.items}>
            {mockSale.lineItems.map((item, index) => (
              <View key={index} style={styles.item}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemTotal}>${(item.lineTotalCents / 100).toFixed(2)}</Text>
                </View>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemQty}>
                    {item.quantity} × ${(item.unitPriceCents / 100).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>${(mockSale.subtotalCents / 100).toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>${(mockSale.taxCents / 100).toFixed(2)}</Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>${(mockSale.totalCents / 100).toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.payments}>
            {mockSale.payments.map((payment, index) => (
              <View key={index} style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>{payment.method}</Text>
                <Text style={styles.paymentValue}>${(payment.amountCents / 100).toFixed(2)}</Text>
              </View>
            ))}
            {mockSale.changeDue > 0 && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Change Due</Text>
                <Text style={styles.changeValue}>${(mockSale.changeDue / 100).toFixed(2)}</Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          <Text style={styles.footer}>Thank you for your business!</Text>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleEmail}>
          <Ionicons name="mail-outline" size={20} color="#2196f3" />
          <Text style={styles.actionButtonText}>Email</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={handleNewSale}
        >
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={[styles.actionButtonText, { color: "#fff" }]}>New Sale</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  receipt: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 24,
    borderRadius: 8,
  },
  receiptHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  storeName: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 8,
  },
  receiptNumber: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  dateTime: {
    fontSize: 14,
    color: "#999",
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 16,
  },
  items: {
    marginBottom: 8,
  },
  item: {
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: "500",
  },
  itemDetails: {
    flexDirection: "row",
  },
  itemQty: {
    fontSize: 14,
    color: "#666",
  },
  totals: {
    marginBottom: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 16,
    color: "#666",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  grandTotal: {
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
  payments: {
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  paymentLabel: {
    fontSize: 16,
    color: "#666",
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  changeValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#4caf50",
  },
  footer: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    gap: 8,
  },
  actionButtonPrimary: {
    backgroundColor: "#2196f3",
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2196f3",
  },
});
