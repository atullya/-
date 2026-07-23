import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Notebook } from '@/types';
import { getNotebook } from '@/utils/storage';
import { getDistanceStats, NEPALI_MONTHS, totalAmount, formatCurrency } from '@/utils/format';

export default function YearScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [year, setYear] = useState<Notebook | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { if (id) setYear((await getNotebook(id)) ?? null); }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const months = useMemo(() => NEPALI_MONTHS.map((name, index) => {
    const month = index + 1;
    const entries = (year?.entries ?? []).filter((entry) => entry.dateCalendar === 'bs' && Number(entry.date.split('-')[1]) === month);
    return { month, name, entries, total: totalAmount(entries), stats: getDistanceStats(entries) };
  }), [year]);

  if (!year) return <SafeAreaView style={styles.container}><View style={styles.center}><Text>Loading year…</Text></View></SafeAreaView>;
  return <SafeAreaView style={styles.container} edges={['top']}>
    <View style={styles.header}><TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Text style={styles.backArrow}>‹</Text></TouchableOpacity><View><Text style={styles.title}>{year.name}</Text><Text style={styles.subtitle}>Select a Nepali month</Text></View></View>
    <FlatList data={months} keyExtractor={(item) => String(item.month)} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000" />} renderItem={({ item }) => <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: '/notebook/[id]', params: { id: year.id, month: String(item.month) } })}>
      <View style={styles.cardTop}><Text style={styles.name}>{item.name}</Text><Text style={styles.count}>{item.entries.length} {item.entries.length === 1 ? 'record' : 'records'}</Text></View>
      <Text style={styles.total}>{formatCurrency(item.total)}</Text>
      <Text style={styles.meter}>{item.stats.currentMeter === null ? 'No meter reading yet' : `Latest meter: ${item.stats.currentMeter.toLocaleString('en-IN')} km`}</Text>
    </TouchableOpacity>} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' }, header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EEE', padding: 16 }, backButton: { width: 36, height: 36, justifyContent: 'center' }, backArrow: { fontSize: 36, lineHeight: 36 }, title: { fontSize: 22, fontWeight: '800' }, subtitle: { color: '#777', marginTop: 2 }, list: { padding: 16, paddingBottom: 30 }, card: { backgroundColor: '#FFF', padding: 18, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EEE' }, cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, name: { fontSize: 17, fontWeight: '700' }, count: { color: '#888', fontSize: 12 }, total: { fontSize: 21, fontWeight: '800', marginTop: 8 }, meter: { color: '#666', fontSize: 12, marginTop: 5 },
});
