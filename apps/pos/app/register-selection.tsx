import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useRegisterStore } from "@/stores/registerStore";
import type { Register } from "@corely/contracts";

export default function RegisterSelectionScreen() {
  const { registers, selectedRegister, isLoading, loadRegisters, selectRegister } =
    useRegisterStore();
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    loadRegisters().catch((error) => {
      Alert.alert("Error", "Failed to load registers");
      console.error(error);
    });
  }, []);

  const handleSelectRegister = async (register: Register) => {
    setSelecting(true);
    try {
      await selectRegister(register.registerId);
      // Navigate back or to main screen
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(main)");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select register");
      console.error(error);
    } finally {
      setSelecting(false);
    }
  };

  const renderRegister = ({ item }: { item: Register }) => {
    const isSelected = selectedRegister?.registerId === item.registerId;

    return (
      <TouchableOpacity
        style={[styles.registerCard, isSelected && styles.selectedCard]}
        onPress={() => handleSelectRegister(item)}
        disabled={selecting}
      >
        <View style={styles.registerInfo}>
          <Text style={styles.registerName}>{item.name}</Text>
          {item.location && <Text style={styles.registerLocation}>{item.location}</Text>}
          <Text style={styles.registerStatus}>Status: {item.status}</Text>
        </View>
        {isSelected && (
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedText}>✓ Selected</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading registers...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Register</Text>
        <Text style={styles.subtitle}>Choose which register you want to use</Text>
      </View>

      {registers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No active registers available</Text>
          <Text style={styles.emptySubtext}>Contact your administrator to set up registers</Text>
        </View>
      ) : (
        <FlatList
          data={registers}
          renderItem={renderRegister}
          keyExtractor={(item) => item.registerId}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {selecting && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
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
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  listContainer: {
    padding: 16,
  },
  registerCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedCard: {
    borderColor: "#4CAF50",
    backgroundColor: "#f1f8f4",
  },
  registerInfo: {
    flex: 1,
  },
  registerName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  registerLocation: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  registerStatus: {
    fontSize: 12,
    color: "#999",
  },
  selectedBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selectedText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
});
