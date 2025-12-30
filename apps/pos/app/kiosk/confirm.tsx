import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { v4 as uuidv4 } from "@lukeed/uuid";
import { useAuthStore } from "@/stores/authStore";
import { useRegisterStore } from "@/stores/registerStore";
import { useEngagementService } from "@/hooks/useEngagementService";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { getOutboxStore } from "@/lib/offline/outboxStore";
import { buildCreateCheckInCommand } from "@/offline/engagementOutbox";
import type { CreateCheckInEventInput } from "@corely/contracts";
import { HttpError } from "@corely/api-client";

export default function KioskConfirmScreen() {
  const router = useRouter();
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const { apiClient, user } = useAuthStore();
  const { selectedRegister } = useRegisterStore();
  const { engagementService } = useEngagementService();
  const { isOnline, triggerSync } = useSyncEngine();
  const [customerName, setCustomerName] = useState<string>("Customer");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const checkInIdRef = useRef<string | null>(null);

  useEffect(() => {
    const loadCustomer = async () => {
      if (!customerId) {
        return;
      }
      const cached = await engagementService?.getCustomerById(customerId);
      if (cached) {
        setCustomerName(cached.displayName);
      } else if (apiClient) {
        try {
          const fetched = await apiClient.getCustomer({ id: customerId });
          setCustomerName(fetched.displayName);
        } catch (error) {
          console.error("Failed to load customer:", error);
        }
      }
    };
    void loadCustomer();
  }, [customerId, engagementService, apiClient]);

  const handleConfirm = async (overrideDuplicate = false) => {
    if (!customerId || !selectedRegister || !user?.workspaceId) {
      Alert.alert("Missing Info", "Customer or register not available.");
      return;
    }

    setSubmitting(true);
    if (!checkInIdRef.current) {
      checkInIdRef.current = uuidv4();
    }
    const checkInEventId = checkInIdRef.current;
    const payload: CreateCheckInEventInput = {
      checkInEventId,
      customerPartyId: customerId,
      registerId: selectedRegister.registerId,
      checkedInByType: "SELF_SERVICE",
      checkedInByEmployeePartyId: user?.userId ?? null,
      checkedInAt: new Date(),
      visitReason: reason || null,
      overrideDuplicate,
    };

    const now = new Date();

    try {
      if (isOnline && apiClient) {
        const idempotencyKey = uuidv4();
        const result = await apiClient.createCheckIn(payload, idempotencyKey);
        await engagementService?.addOrUpdateCheckIn({
          checkInEventId,
          customerPartyId: customerId,
          registerId: selectedRegister.registerId,
          status: result.checkInEvent.status,
          checkedInAt: result.checkInEvent.checkedInAt,
          visitReason: reason || null,
          assignedEmployeePartyId: result.checkInEvent.assignedEmployeePartyId ?? null,
          notes: result.checkInEvent.notes ?? null,
          pointsAwarded: result.pointsAwarded ?? null,
          syncStatus: "SYNCED",
          syncError: null,
          createdAt: now,
          updatedAt: now,
        });
        router.replace({
          pathname: "/kiosk/success",
          params: {
            customerId,
            points: result.pointsAwarded?.toString() ?? "0",
          },
        });
      } else {
        const idempotencyKey = uuidv4();
        const outboxStore = await getOutboxStore();
        await outboxStore.enqueue(
          buildCreateCheckInCommand(user.workspaceId, payload, idempotencyKey)
        );
        await engagementService?.addOrUpdateCheckIn({
          checkInEventId,
          customerPartyId: customerId,
          registerId: selectedRegister.registerId,
          status: "ACTIVE",
          checkedInAt: payload.checkedInAt ?? now,
          visitReason: reason || null,
          assignedEmployeePartyId: null,
          notes: null,
          pointsAwarded: null,
          syncStatus: "PENDING",
          syncError: null,
          createdAt: now,
          updatedAt: now,
        });
        router.replace({ pathname: "/kiosk/success", params: { customerId, points: "0" } });
        await triggerSync();
      }
    } catch (error) {
      if (error instanceof HttpError && error.status === 409) {
        Alert.alert("Possible Duplicate", "A recent check-in exists. Proceed anyway?", [
          { text: "Cancel", style: "cancel", onPress: () => setSubmitting(false) },
          {
            text: "Proceed",
            onPress: () => handleConfirm(true),
          },
        ]);
        return;
      }
      Alert.alert("Check-In Failed", "Please try again.");
      console.error("Check-in error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Confirm Check-In</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.card}>
        <Ionicons name="person-circle-outline" size={64} color="#2196f3" />
        <Text style={styles.customerName}>{customerName}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Reason for Visit (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Repair, Consultation"
          value={reason}
          onChangeText={setReason}
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.confirmButton, submitting && styles.disabledButton]}
          onPress={() => handleConfirm()}
          disabled={submitting}
        >
          <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
          <Text style={styles.confirmText}>Confirm Check-In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
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
  card: {
    margin: 24,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  customerName: {
    fontSize: 20,
    fontWeight: "600",
  },
  form: {
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 12,
    textTransform: "uppercase",
    color: "#666",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  actions: {
    marginTop: 24,
    paddingHorizontal: 24,
    gap: 12,
  },
  confirmButton: {
    backgroundColor: "#4caf50",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  confirmText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    padding: 12,
    alignItems: "center",
  },
  cancelText: {
    color: "#666",
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: "#a5d6a7",
  },
});
