import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { format } from "date-fns";

export default function SyncScreen() {
  const { pendingCommands, syncStatus, isOnline, triggerSync, retryFailedCommand } =
    useSyncEngine();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await triggerSync();
    setRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Ionicons name="time-outline" size={24} color="#ff9800" />;
      case "SYNCING":
        return <Ionicons name="sync-outline" size={24} color="#2196f3" />;
      case "SUCCEEDED":
        return <Ionicons name="checkmark-circle-outline" size={24} color="#4caf50" />;
      case "FAILED":
        return <Ionicons name="close-circle-outline" size={24} color="#d32f2f" />;
      case "CONFLICT":
        return <Ionicons name="alert-circle-outline" size={24} color="#ff5722" />;
      default:
        return <Ionicons name="help-circle-outline" size={24} color="#999" />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <View style={styles.statusIndicator}>
            <View
              style={[styles.statusDot, { backgroundColor: isOnline ? "#4caf50" : "#d32f2f" }]}
            />
            <Text style={styles.statusText}>{isOnline ? "Online" : "Offline"}</Text>
          </View>
          <TouchableOpacity style={styles.syncButton} onPress={handleRefresh} disabled={!isOnline}>
            <Ionicons name="sync-outline" size={20} color="#fff" />
            <Text style={styles.syncButtonText}>Sync Now</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{pendingCommands.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {pendingCommands.filter((c) => c.status === "FAILED").length}
            </Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{syncStatus === "syncing" ? "..." : "0"}</Text>
            <Text style={styles.statLabel}>Syncing</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={pendingCommands}
        keyExtractor={(item) => item.commandId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.commandItem}>
            <View style={styles.commandHeader}>
              {getStatusIcon(item.status)}
              <View style={styles.commandInfo}>
                <Text style={styles.commandType}>{item.type}</Text>
                <Text style={styles.commandDate}>
                  {format(new Date(item.createdAt), "MMM d, h:mm a")}
                </Text>
              </View>
              {item.status === "FAILED" && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => retryFailedCommand(item.commandId)}
                >
                  <Ionicons name="refresh-outline" size={20} color="#2196f3" />
                </TouchableOpacity>
              )}
            </View>

            {item.status === "FAILED" && item.error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{item.error.message}</Text>
                {item.error.code && <Text style={styles.errorCode}>Code: {item.error.code}</Text>}
              </View>
            )}
            {item.status === "CONFLICT" && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Conflict detected</Text>
                <Text style={styles.errorCode}>Review and retry</Text>
              </View>
            )}

            {item.attempts > 1 && (
              <Text style={styles.attemptsText}>Attempts: {item.attempts}</Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-outline" size={64} color="#999" />
            <Text style={styles.emptyTitle}>All Synced</Text>
            <Text style={styles.emptyText}>No pending commands to sync</Text>
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
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "500",
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2196f3",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  syncButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "600",
    color: "#2196f3",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  commandItem: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  commandHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  commandInfo: {
    flex: 1,
    marginLeft: 12,
  },
  commandType: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  commandDate: {
    fontSize: 14,
    color: "#666",
  },
  retryButton: {
    padding: 8,
  },
  errorContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#ffebee",
    borderRadius: 4,
  },
  errorText: {
    fontSize: 14,
    color: "#d32f2f",
    marginBottom: 4,
  },
  errorCode: {
    fontSize: 12,
    color: "#666",
  },
  attemptsText: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
  },
  emptyState: {
    alignItems: "center",
    padding: 48,
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
});
