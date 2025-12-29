import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEngagementService } from "@/hooks/useEngagementService";

export default function KioskTodayScreen() {
  const router = useRouter();
  const { engagementService } = useEngagementService();
  const [checkIns, setCheckIns] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const items = await engagementService?.listTodayCheckIns();
      const withNames = await Promise.all(
        (items ?? []).map(async (item) => {
          const customer = await engagementService?.getCustomerById(item.customerPartyId);
          return {
            ...item,
            customerName: customer?.displayName ?? item.customerPartyId,
          };
        })
      );
      setCheckIns(withNames);
    };
    void load();
  }, [engagementService]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Today’s Check-Ins</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={checkIns}
        keyExtractor={(item) => item.checkInEventId}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() =>
              router.push({
                pathname: "/kiosk/customer",
                params: { customerId: item.customerPartyId },
              })
            }
          >
            <View>
              <Text style={styles.itemTitle}>{item.customerName}</Text>
              <Text style={styles.itemMeta}>
                {new Date(item.checkedInAt).toLocaleTimeString()} · {item.syncStatus}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={48} color="#999" />
            <Text style={styles.emptyText}>No check-ins yet today</Text>
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
  item: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  itemMeta: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    color: "#666",
    marginTop: 8,
  },
});
