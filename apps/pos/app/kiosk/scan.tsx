import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { useEngagementService } from "@/hooks/useEngagementService";
import { useSyncEngine } from "@/hooks/useSyncEngine";

const parseCustomerId = (payload: string) => {
  if (payload.startsWith("customer:")) {
    return payload.replace("customer:", "");
  }
  if (payload.startsWith("party:")) {
    return payload.replace("party:", "");
  }
  return payload;
};

export default function KioskScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const { apiClient } = useAuthStore();
  const { engagementService } = useEngagementService();
  const { isOnline } = useSyncEngine();

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#999" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>We need access to your camera to scan QR codes</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleQrScanned = async ({ data }: { data: string }) => {
    if (scanned) {
      return;
    }
    setScanned(true);
    const customerPartyId = parseCustomerId(data);

    let customer = await engagementService?.getCustomerById(customerPartyId);
    if (!customer && isOnline && apiClient) {
      try {
        const fetched = await apiClient.getCustomer({ id: customerPartyId });
        await engagementService?.upsertCustomerCache({
          customerPartyId: fetched.id,
          displayName: fetched.displayName,
          phone: fetched.phone ?? null,
          email: fetched.email ?? null,
          tags: fetched.tags ?? [],
          updatedAt: new Date(),
        });
        customer = await engagementService?.getCustomerById(customerPartyId);
      } catch (error) {
        console.error("Failed to fetch customer:", error);
      }
    }

    if (!customer) {
      Alert.alert("Customer Not Found", "We couldn’t find that QR code.", [
        {
          text: "Enter Phone",
          onPress: () => router.replace("/kiosk/lookup"),
        },
        {
          text: "Try Again",
          onPress: () => setScanned(false),
        },
      ]);
      return;
    }

    router.replace({
      pathname: "/kiosk/confirm",
      params: { customerId: customer.customerPartyId },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Scan QR</Text>
        <View style={{ width: 24 }} />
      </View>

      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : handleQrScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.instruction}>Position QR code within the frame</Text>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    color: "#fff",
  },
  permissionText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#2196f3",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanArea: {
    width: 260,
    height: 260,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#2196f3",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instruction: {
    color: "#fff",
    fontSize: 16,
    marginTop: 32,
    textAlign: "center",
  },
});
