import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useShiftStore } from '@/stores/shiftStore';
import { format } from 'date-fns';

export default function CloseShiftScreen() {
  const router = useRouter();
  const { currentShift, closeShift, isLoading } = useShiftStore();
  const [closingCash, setClosingCash] = useState('');

  if (!currentShift) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color="#999" />
          <Text style={styles.emptyTitle}>No Active Shift</Text>
          <Text style={styles.emptyText}>
            There is no active shift to close
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleCloseShift = async () => {
    const closingCashCents = closingCash
      ? Math.round(parseFloat(closingCash) * 100)
      : null;

    if (closingCash && (isNaN(closingCashCents!) || closingCashCents! < 0)) {
      Alert.alert('Invalid Amount', 'Please enter a valid closing cash amount');
      return;
    }

    Alert.alert(
      'Close Shift',
      'Are you sure you want to close this shift? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Shift',
          style: 'destructive',
          onPress: async () => {
            try {
              await closeShift({ closingCashCents });

              Alert.alert(
                'Shift Closed',
                'Your shift has been closed successfully',
                [
                  {
                    text: 'OK',
                    onPress: () => router.replace('/(main)/settings'),
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to close shift');
            }
          },
        },
      ]
    );
  };

  const startingCash = currentShift.startingCashCents ?? 0;
  const totalSales = currentShift.totalSalesCents ?? 0;
  const totalCashReceived = currentShift.totalCashReceivedCents ?? 0;
  const expectedCash = startingCash + totalCashReceived;
  const closingCashCents = closingCash
    ? Math.round(parseFloat(closingCash) * 100)
    : null;
  const variance =
    closingCashCents !== null ? closingCashCents - expectedCash : null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Close Shift</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.shiftInfo}>
          <Ionicons name="time-outline" size={48} color="#2196f3" />
          <Text style={styles.shiftTitle}>Active Shift</Text>
          <Text style={styles.shiftTime}>
            Started {format(new Date(currentShift.openedAt), 'MMM d, h:mm a')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shift Summary</Text>
          <View style={styles.card}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Sales</Text>
              <Text style={styles.summaryValue}>
                ${(totalSales / 100).toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Starting Cash</Text>
              <Text style={styles.summaryValue}>
                ${(startingCash / 100).toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cash Received</Text>
              <Text style={styles.summaryValue}>
                ${(totalCashReceived / 100).toFixed(2)}
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Expected Cash</Text>
              <Text style={styles.totalValue}>
                ${(expectedCash / 100).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cash Count</Text>
          <View style={styles.form}>
            <Text style={styles.label}>Closing Cash (Optional)</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={closingCash}
                onChangeText={setClosingCash}
                keyboardType="decimal-pad"
                editable={!isLoading}
              />
            </View>

            {variance !== null && (
              <View style={styles.variance}>
                <Text style={styles.varianceLabel}>Variance</Text>
                <Text
                  style={[
                    styles.varianceValue,
                    variance > 0 && styles.variancePositive,
                    variance < 0 && styles.varianceNegative,
                  ]}
                >
                  {variance >= 0 ? '+' : ''}${(variance / 100).toFixed(2)}
                </Text>
              </View>
            )}

            <Text style={styles.hint}>
              Count the cash in your drawer and enter the total amount
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.closeButton, isLoading && styles.buttonDisabled]}
          onPress={handleCloseShift}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
              <Text style={styles.buttonText}>Close Shift</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    padding: 24,
  },
  shiftInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  shiftTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
  },
  shiftTime: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2196f3',
  },
  form: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    paddingVertical: 12,
  },
  variance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 12,
  },
  varianceLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  varianceValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
  },
  variancePositive: {
    color: '#4caf50',
  },
  varianceNegative: {
    color: '#d32f2f',
  },
  hint: {
    fontSize: 14,
    color: '#999',
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d32f2f',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#2196f3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
});
