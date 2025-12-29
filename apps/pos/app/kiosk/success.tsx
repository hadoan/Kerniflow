import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function KioskSuccessScreen() {
  const router = useRouter();
  const { points } = useLocalSearchParams<{ points?: string }>();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/kiosk");
    }, 6000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="checkmark-circle-outline" size={72} color="#4caf50" />
        <Text style={styles.title}>Checked In!</Text>
        <Text style={styles.subtitle}>Thank you for visiting.</Text>
        <Text style={styles.points}>+{points ?? "0"} points earned</Text>
      </View>
      <Text style={styles.footer}>Returning to welcome screen...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  points: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2196f3",
    marginTop: 12,
  },
  footer: {
    marginTop: 24,
    color: "#666",
  },
});
