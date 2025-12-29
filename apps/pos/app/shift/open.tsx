import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { v4 as uuidv4 } from "@lukeed/uuid";
import { useShiftStore } from "@/stores/shiftStore";

export default function OpenShiftScreen() {
  const router = useRouter();
  const { openShift, isLoading } = useShiftStore();
  const [startingCash, setStartingCash] = useState("");

  // TODO: Get actual register from settings/selection
  const registerId = "placeholder-register-id";

  const handleOpenShift = async () => {
    const startingCashCents = startingCash ? Math.round(parseFloat(startingCash) * 100) : null;

    if (startingCash && (isNaN(startingCashCents!) || startingCashCents! < 0)) {
      Alert.alert("Invalid Amount", "Please enter a valid starting cash amount");
      return;
    }

    try {
      await openShift({
        sessionId: uuidv4(),
        registerId,
        startingCashCents,
      });

      Alert.alert("Shift Opened", "Your shift has been opened successfully", [
        {
          text: "OK",
          onPress: () => router.replace("/(main)"),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to open shift");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Open Shift</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="time-outline" size={64} color="#2196f3" />
        </View>

        <Text style={styles.description}>
          Start a new shift to begin selling. Enter the starting cash amount in the register drawer
          (optional).
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Starting Cash (Optional)</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={startingCash}
              onChangeText={setStartingCash}
              keyboardType="decimal-pad"
              editable={!isLoading}
            />
          </View>

          <Text style={styles.hint}>This helps track cash variance at the end of your shift</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleOpenShift}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
              <Text style={styles.buttonText}>Open Shift</Text>
            </>
          )}
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
    padding: 24,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  form: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: "600",
    color: "#666",
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: "600",
    paddingVertical: 16,
  },
  hint: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4caf50",
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
