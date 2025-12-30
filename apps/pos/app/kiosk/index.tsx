import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSyncEngine } from "@/hooks/useSyncEngine";

export default function KioskWelcomeScreen() {
  const router = useRouter();
  const { isOnline, pendingCommands } = useSyncEngine();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>Corely Check-In</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? "#4caf50" : "#d32f2f" }]} />
          <Text style={styles.statusText}>{isOnline ? "Online" : "Offline"}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/kiosk/scan")}>
          <Ionicons name="qr-code-outline" size={28} color="#fff" />
          <Text style={styles.primaryText}>Check in with QR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/kiosk/lookup")}
        >
          <Ionicons name="call-outline" size={28} color="#2196f3" />
          <Text style={styles.secondaryText}>Check in with Phone</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/kiosk/today")}
        >
          <Ionicons name="list-outline" size={28} color="#2196f3" />
          <Text style={styles.secondaryText}>Today’s Check-Ins</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Pending sync: {pendingCommands.length}</Text>
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
    padding: 24,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  brand: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: "#666",
  },
  actions: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: "#2196f3",
    borderRadius: 12,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  primaryText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  secondaryText: {
    color: "#2196f3",
    fontSize: 18,
    fontWeight: "600",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  footerText: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
  },
});
