import { useCallback, useMemo, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl,
  SectionList, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Entry, Notebook } from '@/types';
import { addEntry, deleteEntry, getNotebook, updateEntry } from '@/utils/storage';
import { daysInBsMonth, formatBsDate, formatCurrency, formatDate, formatMeterReading, getDistanceStats, getTodayBsDate, meterReadingToKm, NEPALI_MONTHS, totalAmount, todayBsISO } from '@/utils/format';

type EntryForm = { date: string; amount: string; meterReading: string; remarks: string };
const getEmptyForm = (): EntryForm => ({ date: todayBsISO(), amount: '', meterReading: '', remarks: '' });

function parseBsDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

function getEntryDistance(entry: Entry, entries: Entry[]) {
  if (entry.dateCalendar !== 'bs' || entry.meterReading === null) return null;
  const ordered = entries.filter((item) => item.dateCalendar === 'bs' && item.meterReading !== null).sort((a, b) => a.date.localeCompare(b.date));
  const index = ordered.findIndex((item) => item.id === entry.id);
  const previous = ordered[index - 1];
  return previous && entry.meterReading >= previous.meterReading! ? meterReadingToKm(entry.meterReading) - meterReadingToKm(previous.meterReading!) : null;
}

export default function NotebookDetailScreen() {
  const { id, month: monthParam } = useLocalSearchParams<{ id: string; month?: string }>();
  const router = useRouter();
  const selectedMonth = Number(monthParam);
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState<EntryForm>(getEmptyForm());
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try { setNotebook((await getNotebook(id)) ?? null); } catch { Alert.alert('Error', 'Could not load this year.'); }
    finally { setLoading(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const visibleEntries = (notebook?.entries ?? []).filter((entry) =>
    !selectedMonth || (entry.dateCalendar === 'bs' && parseBsDate(entry.date).month === selectedMonth)
  );
  const stats = getDistanceStats(visibleEntries);
  const sections = useMemo(() => {
    const entries = visibleEntries;
    const grouped = new Map<string, Entry[]>();
    for (const entry of entries) {
      const title = entry.dateCalendar === 'bs' ? `${NEPALI_MONTHS[parseBsDate(entry.date).month - 1]} ${parseBsDate(entry.date).year}` : 'Older entries (AD)';
      grouped.set(title, [...(grouped.get(title) ?? []), entry]);
    }
    return [...grouped.entries()].map(([title, data]) => ({ title, data: data.sort((a, b) => b.date.localeCompare(a.date)) }));
  }, [visibleEntries]);

  const openAddForm = () => {
    const today = getTodayBsDate();
    const year = Number(notebook?.name) || today.year;
    const month = selectedMonth || today.month;
    const day = year === today.year && month === today.month ? today.day : 1;
    setForm({ date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, amount: '', meterReading: '', remarks: '' });
    setEditingEntryId(null); setFormVisible(true);
  };
  const openEditForm = (entry: Entry) => {
    if (entry.dateCalendar === 'ad') { Alert.alert('Older entry', 'Older Gregorian entries can still be read. Add a new Nepali-date petrol entry for odometer tracking.'); return; }
    setForm({ date: entry.date, amount: String(entry.amount), meterReading: entry.meterReading === null ? '' : String(entry.meterReading), remarks: entry.remarks });
    setEditingEntryId(entry.id); setFormVisible(true);
  };

  const updateDatePart = (part: 'year' | 'month' | 'day', value: string) => {
    const current = parseBsDate(form.date);
    const next = { ...current, [part]: Number(value.replace(/[^0-9]/g, '')) || 0 };
    if (part !== 'day' && next.year >= 2000 && next.month >= 1 && next.month <= 12) next.day = Math.min(Math.max(next.day, 1), daysInBsMonth(next.year, next.month));
    setForm({ ...form, date: `${next.year}-${String(next.month).padStart(2, '0')}-${String(next.day).padStart(2, '0')}` });
  };

  const handleSaveEntry = async () => {
    if (!id || !form.amount.trim()) return;
    const { year: enteredYear, month: enteredMonth, day } = parseBsDate(form.date);
    const year = selectedMonth ? Number(notebook?.name) : enteredYear;
    const month = selectedMonth || enteredMonth;
    const amount = Number(form.amount); const meterReading = form.meterReading.trim() ? Number(form.meterReading) : null;
    if (!Number.isFinite(amount) || amount < 0 || (meterReading !== null && (!Number.isFinite(meterReading) || meterReading < 0)) || year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > daysInBsMonth(year, month)) {
      Alert.alert('Check entry', 'Enter a valid Bikram Sambat date, amount, and (if provided) a non-negative meter reading.'); return;
    }
    try {
      const values = { date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, dateCalendar: 'bs' as const, amount, meterReading, remarks: form.remarks.trim() };
      if (editingEntryId) await updateEntry(id, editingEntryId, values); else await addEntry(id, values);
      setFormVisible(false); await load();
    } catch { Alert.alert('Could not save', 'Run the Supabase migration in lib/schema.sql, then try again.'); }
  };

  const confirmDelete = (entry: Entry) => Alert.alert('Delete entry?', 'This petrol record will be permanently removed.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { if (id) { await deleteEntry(id, entry.id); load(); } } },
  ]);

  const renderEntry = ({ item }: { item: Entry }) => {
    const distance = getEntryDistance(item, notebook?.entries ?? []);
    return <Swipeable renderRightActions={() => <TouchableOpacity style={styles.swipeDelete} onPress={() => confirmDelete(item)}><Text style={styles.swipeDeleteText}>Delete</Text></TouchableOpacity>} overshootRight={false}>
      <TouchableOpacity style={styles.entryRow} onPress={() => openEditForm(item)} onLongPress={() => confirmDelete(item)}>
        <View style={styles.entryLeft}>
          <Text style={styles.entryDate}>{item.dateCalendar === 'bs' ? formatBsDate(item.date) : formatDate(item.date)}</Text>
          <Text style={styles.entryMeta}>{item.meterReading === null ? 'Meter not recorded' : `${formatMeterReading(item.meterReading)}${distance === null ? '' : ` · ${distance.toLocaleString('en-IN')} km since previous fill`}`}</Text>
          {!!item.remarks && <Text style={styles.entryRemarks} numberOfLines={1}>{item.remarks}</Text>}
        </View>
        <Text style={styles.entryAmount}>{formatCurrency(item.amount)}</Text>
      </TouchableOpacity>
    </Swipeable>;
  };

  if (loading || !notebook) return <SafeAreaView style={styles.container}><View style={styles.center}><Text>{loading ? 'Loading…' : 'Year not found'}</Text>{!loading && <TouchableOpacity onPress={() => router.back()}><Text style={styles.backLink}>Go back</Text></TouchableOpacity>}</View></SafeAreaView>;
  const current = getTodayBsDate();
  const dateParts = parseBsDate(form.date);

  return <SafeAreaView style={styles.container} edges={['top']}>
    <View style={styles.header}><TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Text style={styles.backArrow}>‹</Text></TouchableOpacity><View><Text style={styles.headerTitle}>{selectedMonth ? `${NEPALI_MONTHS[selectedMonth - 1]} ${notebook.name}` : notebook.name}</Text><Text style={styles.headerSubtitle}>{selectedMonth ? 'Petrol records' : 'Bikram Sambat petrol ledger'}</Text></View></View>
    <View style={styles.summaryCard}>
      <View><Text style={styles.summaryLabel}>Petrol spent</Text><Text style={styles.totalValue}>{formatCurrency(totalAmount(visibleEntries))}</Text></View>
      <View style={styles.summaryRight}><Text style={styles.summaryLabel}>Current meter</Text><Text style={styles.summaryStat}>{stats.currentMeter === null ? '—' : `${stats.currentMeter.toLocaleString('en-IN')} km`}</Text></View>
      <View style={styles.summaryFooter}><Text style={styles.summaryFooterText}>Average between fills: {stats.averageDistance === null ? 'Add 2 meter readings' : `${stats.averageDistance.toFixed(1)} km`}</Text><Text style={styles.summaryFooterText}>{stats.intervals} valid interval{stats.intervals === 1 ? '' : 's'}</Text></View>
    </View>
    <SectionList sections={sections} keyExtractor={(item) => item.id} renderItem={renderEntry} renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>} ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyTitle}>No petrol entries yet</Text><Text style={styles.emptyText}>Add the amount and odometer at each fill-up.</Text></View>} contentContainerStyle={sections.length ? styles.list : styles.emptyList} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000" />} />
    <TouchableOpacity style={styles.fab} onPress={openAddForm}><Text style={styles.fabText}>+</Text></TouchableOpacity>
    <Modal visible={formVisible} transparent animationType="slide" onRequestClose={() => setFormVisible(false)}><Pressable style={styles.overlay} onPress={() => setFormVisible(false)}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}><Pressable style={styles.formContent} onPress={(event) => event.stopPropagation()}>
      <Text style={styles.formTitle}>{editingEntryId ? 'Edit petrol fill-up' : 'New petrol fill-up'}</Text>
      <Text style={styles.formLabel}>Nepali date (Bikram Sambat)</Text>
      {selectedMonth ? <View style={styles.lockedDate}><Text style={styles.lockedDateText}>{NEPALI_MONTHS[selectedMonth - 1]} {notebook.name}</Text><TextInput style={[styles.formInput, styles.dayOnlyInput]} value={String(dateParts.day)} keyboardType="number-pad" placeholder="Day" onChangeText={(value) => updateDatePart('day', value)} /></View> : <View style={styles.dateFields}><TextInput style={[styles.formInput, styles.yearInput]} value={String(dateParts.year)} keyboardType="number-pad" placeholder={String(current.year)} onChangeText={(value) => updateDatePart('year', value)} /><TextInput style={[styles.formInput, styles.smallDateInput]} value={String(dateParts.month)} keyboardType="number-pad" placeholder="Month" onChangeText={(value) => updateDatePart('month', value)} /><TextInput style={[styles.formInput, styles.smallDateInput]} value={String(dateParts.day)} keyboardType="number-pad" placeholder="Day" onChangeText={(value) => updateDatePart('day', value)} /></View>}
      <Text style={styles.dateHint}>{dateParts.month >= 1 && dateParts.month <= 12 ? `${NEPALI_MONTHS[dateParts.month - 1]} · day 1–${dateParts.year >= 2000 && dateParts.year <= 2100 ? daysInBsMonth(dateParts.year, dateParts.month) : '…'}` : 'Month must be 1–12'}</Text>
      <Text style={styles.formLabel}>Amount (Rs)</Text><TextInput style={styles.formInput} placeholder="0" value={form.amount} onChangeText={(value) => setForm({ ...form, amount: value })} keyboardType="decimal-pad" />
      <Text style={styles.formLabel}>Meter reading (optional)</Text><TextInput style={styles.formInput} placeholder="e.g. 355075 (last digit is ignored)" value={form.meterReading} onChangeText={(value) => setForm({ ...form, meterReading: value })} keyboardType="number-pad" />
      <Text style={styles.formLabel}>Remarks (optional)</Text><TextInput style={[styles.formInput, styles.remarksInput]} placeholder="Fuel station or note" value={form.remarks} onChangeText={(value) => setForm({ ...form, remarks: value })} multiline />
      <View style={styles.actions}><TouchableOpacity style={styles.cancel} onPress={() => setFormVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.save, !form.amount && styles.disabled]} onPress={handleSaveEntry} disabled={!form.amount}><Text style={styles.saveText}>{editingEntryId ? 'Save' : 'Add'}</Text></TouchableOpacity></View>
    </Pressable></KeyboardAvoidingView></Pressable></Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  lockedDate: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lockedDateText: { flex: 1, fontSize: 15, fontWeight: '700' },
  dayOnlyInput: { width: 100 },
  container: { flex: 1, backgroundColor: '#FAFAFA' }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }, backLink: { marginTop: 12, fontWeight: '700', textDecorationLine: 'underline' }, header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EEE' }, backButton: { width: 36, height: 36, justifyContent: 'center' }, backArrow: { fontSize: 36, lineHeight: 36 }, headerTitle: { fontSize: 19, fontWeight: '800' }, headerSubtitle: { color: '#777', marginTop: 2 }, summaryCard: { margin: 16, padding: 18, backgroundColor: '#000', borderRadius: 14, flexDirection: 'row', flexWrap: 'wrap' }, summaryLabel: { fontSize: 11, fontWeight: '700', color: '#AAA', textTransform: 'uppercase' }, totalValue: { color: '#FFF', fontSize: 27, fontWeight: '800', marginTop: 3 }, summaryRight: { marginLeft: 'auto', alignItems: 'flex-end' }, summaryStat: { color: '#FFF', fontSize: 16, fontWeight: '700', marginTop: 6 }, summaryFooter: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, paddingTop: 12, borderTopWidth: 1, borderColor: '#333' }, summaryFooterText: { color: '#DDD', fontSize: 12 }, list: { paddingHorizontal: 16, paddingBottom: 90 }, emptyList: { flexGrow: 1 }, sectionHeader: { marginTop: 8, paddingTop: 12, paddingBottom: 7, fontWeight: '800', fontSize: 15, color: '#555' }, entryRow: { backgroundColor: '#FFF', padding: 15, flexDirection: 'row', alignItems: 'center', borderRadius: 10, marginBottom: 6 }, entryLeft: { flex: 1, marginRight: 12 }, entryDate: { fontWeight: '700', fontSize: 15 }, entryMeta: { color: '#555', marginTop: 3, fontSize: 12 }, entryRemarks: { color: '#999', marginTop: 3, fontSize: 12 }, entryAmount: { fontWeight: '800', fontSize: 16 }, swipeDelete: { width: 84, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', marginBottom: 6, borderRadius: 10 }, swipeDeleteText: { color: '#FFF', fontWeight: '700' }, emptyTitle: { fontSize: 19, fontWeight: '800' }, emptyText: { color: '#777', marginTop: 7, textAlign: 'center' }, fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', elevation: 4 }, fabText: { color: '#FFF', fontSize: 30, lineHeight: 32, fontWeight: '300' }, overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', justifyContent: 'flex-end' }, keyboardView: { justifyContent: 'flex-end' }, formContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 38 }, formTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12 }, formLabel: { fontSize: 12, fontWeight: '700', color: '#666', marginTop: 13, marginBottom: 6, textTransform: 'uppercase' }, formInput: { borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 10, padding: 13, fontSize: 16, backgroundColor: '#FAFAFA' }, dateFields: { flexDirection: 'row', gap: 8 }, yearInput: { flex: 1.4 }, smallDateInput: { flex: 1 }, dateHint: { color: '#777', fontSize: 12, marginTop: 5 }, remarksInput: { minHeight: 58, textAlignVertical: 'top' }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 24 }, cancel: { paddingVertical: 12, paddingHorizontal: 22, backgroundColor: '#F0F0F0', borderRadius: 8 }, cancelText: { fontWeight: '700', color: '#555' }, save: { paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#000', borderRadius: 8 }, saveText: { fontWeight: '700', color: '#FFF' }, disabled: { opacity: .3 },
});
