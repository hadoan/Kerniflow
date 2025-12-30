import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { v4 as uuidv4 } from "@lukeed/uuid";
import { useCartStore } from "@/stores/cartStore";
import { useShiftStore } from "@/stores/shiftStore";
import { useAuthStore } from "@/stores/authStore";
import { useSalesService } from "@/hooks/useSalesService";
import type { PosSalePayment } from "@corely/contracts";

type PaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER" | "OTHER";

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, customerId, notes, getTotals, clearCart } = useCartStore();
  const { currentShift } = useShiftStore();
  const { user } = useAuthStore();
  const { salesService } = useSalesService();
  const totals = getTotals();

  const [payments, setPayments] = useState<PosSalePayment[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("CASH");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const totalPaid = payments.reduce((sum, p) => sum + p.amountCents, 0);
  const remaining = totals.totalCents - totalPaid;
  const changeDue = totalPaid > totals.totalCents ? totalPaid - totals.totalCents : 0;

  const handleAddPayment = () => {
    const amountCents = Math.round(parseFloat(paymentAmount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid payment amount");
      return;
    }

    const payment: PosSalePayment = {
      paymentId: uuidv4(),
      method: selectedMethod,
      amountCents,
      reference: null,
    };

    setPayments([...payments, payment]);
    setPaymentAmount("");
  };

  const handleRemovePayment = (paymentId: string) => {
    setPayments(payments.filter((p) => p.paymentId !== paymentId));
  };

  const handleCompleteSale = async () => {
    if (remaining > 0) {
      Alert.alert("Insufficient Payment", "Please collect full payment before completing sale");
      return;
    }

    if (!currentShift) {
      Alert.alert("No Active Shift", "Please open a shift before completing sales");
      return;
    }

    if (!salesService) {
      Alert.alert("Error", "Sales service not initialized");
      return;
    }

    if (!user) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    setIsProcessing(true);
    try {
      // Create POS sale and save to SQLite
      const sale = await salesService.createSale({
        workspaceId: user.workspaceId,
        sessionId: currentShift.sessionId,
        registerId: currentShift.registerId,
        customerId,
        lineItems: items,
        payments,
        notes,
        taxCents: totals.taxCents,
      });

      // TODO: Enqueue sync command via outbox

      Alert.alert(
        "Sale Complete",
        `Receipt: ${sale.receiptNumber}\nPayment: $${(totalPaid / 100).toFixed(2)}\nChange: $${(changeDue / 100).toFixed(2)}`,
        [
          {
            text: "Print Receipt",
            onPress: () => {
              clearCart();
              router.replace(`/receipt?saleId=${sale.posSaleId}`);
            },
          },
          {
            text: "New Sale",
            onPress: () => {
              clearCart();
              router.replace("/(main)");
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to complete sale");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items</Text>
            <Text style={styles.summaryValue}>{items.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${(totals.subtotalCents / 100).toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>${(totals.taxCents / 100).toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${(totals.totalCents / 100).toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment</Text>

        <View style={styles.methodSelector}>
          {(["CASH", "CARD", "BANK_TRANSFER", "OTHER"] as PaymentMethod[]).map((method) => (
            <TouchableOpacity
              key={method}
              style={[styles.methodButton, selectedMethod === method && styles.methodButtonActive]}
              onPress={() => setSelectedMethod(method)}
            >
              <Text
                style={[
                  styles.methodButtonText,
                  selectedMethod === method && styles.methodButtonTextActive,
                ]}
              >
                {method.replace("_", " ")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.paymentInput}>
          <TextInput
            style={styles.amountInput}
            placeholder="Amount"
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddPayment}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {payments.length > 0 && (
          <View style={styles.paymentsCard}>
            {payments.map((payment) => (
              <View key={payment.paymentId} style={styles.paymentItem}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentMethod}>{payment.method}</Text>
                  <Text style={styles.paymentAmount}>
                    ${(payment.amountCents / 100).toFixed(2)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRemovePayment(payment.paymentId)}>
                  <Ionicons name="close-circle" size={24} color="#d32f2f" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.paymentSummary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Due</Text>
            <Text style={styles.summaryValue}>${(totals.totalCents / 100).toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Paid</Text>
            <Text style={styles.summaryValue}>${(totalPaid / 100).toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{remaining > 0 ? "Remaining" : "Change"}</Text>
            <Text style={[styles.summaryValue, remaining < 0 && { color: "#4caf50" }]}>
              ${(Math.abs(remaining) / 100).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.completeButton,
          (remaining > 0 || isProcessing) && styles.completeButtonDisabled,
        ]}
        onPress={handleCompleteSale}
        disabled={remaining > 0 || isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.completeButtonText}>Complete Sale</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
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
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginLeft: 16,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: "#666",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2196f3",
  },
  methodSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 8,
  },
  methodButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  methodButtonActive: {
    backgroundColor: "#2196f3",
    borderColor: "#2196f3",
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  methodButtonTextActive: {
    color: "#fff",
  },
  paymentInput: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
  },
  amountInput: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  addButton: {
    backgroundColor: "#2196f3",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  paymentsCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 8,
  },
  paymentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
  },
  paymentInfo: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  paymentMethod: {
    fontSize: 16,
    fontWeight: "500",
  },
  paymentAmount: {
    fontSize: 16,
    color: "#666",
  },
  paymentSummary: {
    backgroundColor: "#fff",
    padding: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  completeButton: {
    backgroundColor: "#4caf50",
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  completeButtonDisabled: {
    backgroundColor: "#ccc",
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
