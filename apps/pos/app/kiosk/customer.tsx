import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/authStore";
import { useEngagementService } from "@/hooks/useEngagementService";
import { useSyncEngine } from "@/hooks/useSyncEngine";

export default function KioskCustomerScreen() {
  const router = useRouter();
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const { apiClient } = useAuthStore();
  const { engagementService } = useEngagementService();
  const { isOnline } = useSyncEngine();
  const [customerName, setCustomerName] = useState<string>(customerId ?? "Customer");
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);
  const [ledgerItems, setLedgerItems] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!customerId) {
        return;
      }
      const cached = await engagementService?.getCustomerById(customerId);
      if (cached) {
        setCustomerName(cached.displayName);
      }

      const cachedLoyalty = await engagementService?.getLoyaltySummary(customerId);
      if (cachedLoyalty) {
        setPointsBalance(cachedLoyalty.pointsBalance);
      }

      if (isOnline && apiClient) {
        try {
          const loyalty = await apiClient.getLoyaltySummary({ customerPartyId: customerId });
          setPointsBalance(loyalty.account.currentPointsBalance);
          await engagementService?.upsertLoyaltySummary({
            customerPartyId: customerId,
            pointsBalance: loyalty.account.currentPointsBalance,
            updatedAt: new Date(),
          });
          const ledger = await apiClient.listLoyaltyLedger({
            customerPartyId: customerId,
            pageSize: 20,
          });
          setLedgerItems(ledger.items);
        } catch (error) {
          console.error("Failed to load loyalty data:", error);
        }
      }
    };
    void load();
  }, [customerId, engagementService, apiClient, isOnline]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Customer Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.summaryCard}>
        <Ionicons name="person-circle-outline" size={56} color="#2196f3" />
        <View>
          <Text style={styles.customerName}>{customerName}</Text>
          <Text style={styles.pointsText}>Points balance: {pointsBalance ?? "—"}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Loyalty Ledger</Text>
      <FlatList
        data={ledgerItems}
        keyExtractor={(item) => item.entryId}
        renderItem={({ item }) => (
          <View style={styles.ledgerItem}>
            <Text style={styles.ledgerType}>{item.reasonCode}</Text>
            <Text style={styles.ledgerPoints}>
              {item.pointsDelta > 0 ? "+" : ""}
              {item.pointsDelta}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No ledger entries yet</Text>
          </View>
        }
      />
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
  summaryCard: {
    margin: 16,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: "600",
  },
  pointsText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginLeft: 16,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  ledgerItem: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ledgerType: {
    fontSize: 14,
    color: "#333",
  },
  ledgerPoints: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    color: "#666",
  },
});
