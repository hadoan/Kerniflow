import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { useShiftStore } from "@/stores/shiftStore";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { currentShift } = useShiftStore();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const handleCloseShift = () => {
    if (currentShift) {
      router.push("/shift/close");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User</Text>
        <View style={styles.card}>
          <View style={styles.userInfo}>
            <Ionicons name="person-circle-outline" size={48} color="#666" />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.email}</Text>
              <Text style={styles.userRole}>POS Operator</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shift</Text>
        <View style={styles.card}>
          {currentShift ? (
            <>
              <View style={styles.shiftInfo}>
                <Ionicons name="time-outline" size={24} color="#4caf50" />
                <View style={styles.shiftDetails}>
                  <Text style={styles.shiftStatus}>Active Shift</Text>
                  <Text style={styles.shiftTime}>
                    Started {new Date(currentShift.openedAt).toLocaleTimeString()}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.actionButton} onPress={handleCloseShift}>
                <Text style={styles.actionButtonText}>Close Shift</Text>
                <Ionicons name="chevron-forward" size={20} color="#2196f3" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.shiftInfo}>
                <Ionicons name="time-outline" size={24} color="#999" />
                <View style={styles.shiftDetails}>
                  <Text style={styles.shiftStatus}>No Active Shift</Text>
                  <Text style={styles.shiftTime}>Open a shift to start selling</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push("/shift/open")}
              >
                <Text style={styles.actionButtonText}>Open Shift</Text>
                <Ionicons name="chevron-forward" size={20} color="#2196f3" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemContent}>
              <Ionicons name="receipt-outline" size={24} color="#666" />
              <Text style={styles.menuItemText}>Sales History</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemContent}>
              <Ionicons name="settings-outline" size={24} color="#666" />
              <Text style={styles.menuItemText}>Preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemContent}>
              <Ionicons name="help-circle-outline" size={24} color="#666" />
              <Text style={styles.menuItemText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemContent}>
              <Ionicons name="information-circle-outline" size={24} color="#666" />
              <Text style={styles.menuItemText}>About</Text>
            </View>
            <Text style={styles.versionText}>v0.1.0</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#d32f2f" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  section: {
    marginBottom: 24,
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
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  userDetails: {
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: "#666",
  },
  shiftInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  shiftDetails: {
    marginLeft: 16,
  },
  shiftStatus: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  shiftTime: {
    fontSize: 14,
    color: "#666",
  },
  actionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  actionButtonText: {
    fontSize: 16,
    color: "#2196f3",
    fontWeight: "500",
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 16,
  },
  versionText: {
    fontSize: 14,
    color: "#999",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d32f2f",
  },
  logoutButtonText: {
    fontSize: 16,
    color: "#d32f2f",
    fontWeight: "600",
    marginLeft: 8,
  },
});
