import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { useEngagementService } from "@/hooks/useEngagementService";
import { useSyncEngine } from "@/hooks/useSyncEngine";

export default function KioskLookupScreen() {
  const router = useRouter();
  const { apiClient } = useAuthStore();
  const { engagementService } = useEngagementService();
  const { isOnline } = useSyncEngine();
  const [phone, setPhone] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async () => {
    const cachedResults = nameQuery
      ? await engagementService?.searchCustomersByName(nameQuery)
      : phone
        ? await engagementService?.searchCustomersByPhone(phone)
        : [];

    let combined = cachedResults ?? [];

    if (isOnline && apiClient && (phone || nameQuery)) {
      try {
        const serverResults = await apiClient.searchCustomers({
          q: phone || nameQuery,
          pageSize: 10,
        });
        for (const item of serverResults.items) {
          await engagementService?.upsertCustomerCache({
            customerPartyId: item.id,
            displayName: item.displayName,
            phone: item.phone ?? null,
            email: item.email ?? null,
            tags: item.tags ?? [],
            updatedAt: new Date(),
          });
        }
        combined = [
          ...combined,
          ...serverResults.items.map((item) => ({
            customerPartyId: item.id,
            displayName: item.displayName,
            phone: item.phone ?? null,
            email: item.email ?? null,
          })),
        ];
      } catch (error) {
        console.error("Customer search failed:", error);
      }
    }

    const deduped = new Map<string, any>();
    combined.forEach((item) => {
      deduped.set(item.customerPartyId, item);
    });
    setResults(Array.from(deduped.values()));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Find Customer</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchSection}>
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Search by name"
          value={nameQuery}
          onChangeText={setNameQuery}
        />

        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Ionicons name="search-outline" size={20} color="#fff" />
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.customerPartyId}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.resultItem}
            onPress={() =>
              router.replace({
                pathname: "/kiosk/confirm",
                params: { customerId: item.customerPartyId },
              })
            }
          >
            <View>
              <Text style={styles.resultName}>{item.displayName}</Text>
              <Text style={styles.resultMeta}>{item.phone || item.email || "No contact"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="person-outline" size={48} color="#999" />
            <Text style={styles.emptyText}>Search to find a customer</Text>
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
  searchSection: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  label: {
    fontSize: 12,
    textTransform: "uppercase",
    color: "#666",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchButton: {
    marginTop: 16,
    backgroundColor: "#2196f3",
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resultItem: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultName: {
    fontSize: 16,
    fontWeight: "600",
  },
  resultMeta: {
    fontSize: 14,
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
