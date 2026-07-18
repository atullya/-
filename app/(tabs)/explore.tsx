import { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Notebook } from '@/types';
import { getNotebooks } from '@/utils/storage';
import { formatCurrency, totalAmount } from '@/utils/format';

export default function SummaryScreen() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    const data = getNotebooks();
    setNotebooks(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
    setRefreshing(false);
  };

  const grandTotal = notebooks.reduce((sum, nb) => sum + totalAmount(nb.entries), 0);

  // For bar chart scaling
  const maxAbsValue = Math.max(
    ...notebooks.map((nb) => Math.abs(totalAmount(nb.entries))),
    1
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Summary</Text>
        <Text style={styles.headerSubtitle}>All notebooks combined</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Grand Total */}
        <View style={styles.grandTotalCard}>
          <Text style={styles.grandTotalLabel}>Grand Total</Text>
          <Text style={[styles.grandTotalValue, grandTotal < 0 && styles.negative]}>
            {formatCurrency(grandTotal)}
          </Text>
        </View>

        {/* Breakdown */}
        {notebooks.length > 0 && (
          <View style={styles.breakdownSection}>
            <Text style={styles.sectionTitle}>Breakdown</Text>
            {notebooks.map((nb) => {
              const nbTotal = totalAmount(nb.entries);
              const barPercent =
                maxAbsValue > 0
                  ? (Math.abs(nbTotal) / maxAbsValue) * 100
                  : 0;
              return (
                <View key={nb.id} style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <Text style={styles.breakdownName} numberOfLines={1}>
                      {nb.name}
                    </Text>
                    <Text style={styles.breakdownCount}>
                      {nb.entries.length} {nb.entries.length === 1 ? 'entry' : 'entries'}
                    </Text>
                    {/* Horizontal bar */}
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${Math.max(barPercent, nbTotal === 0 ? 0 : 2)}%` },
                        ]}
                      />
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.breakdownAmount,
                      nbTotal < 0 && styles.negative,
                    ]}
                  >
                    {formatCurrency(nbTotal)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {notebooks.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptySubtitle}>
              Create notebooks and add entries to see your summary
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 2,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  grandTotalCard: {
    backgroundColor: '#000',
    borderRadius: 14,
    padding: 24,
    marginBottom: 24,
  },
  grandTotalLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  grandTotalValue: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -1,
  },
  negative: {},
  breakdownSection: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  breakdownLeft: {
    flex: 1,
    marginRight: 12,
  },
  barTrack: {
    height: 4,
    backgroundColor: '#EEEEEE',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    backgroundColor: '#000',
    borderRadius: 2,
    minWidth: 0,
  },
  breakdownName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  breakdownCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  breakdownAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
});
