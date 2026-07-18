import { useCallback, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Entry, Notebook } from '@/types';
import {
  getNotebook,
  addEntry,
  updateEntry,
  deleteEntry,
} from '@/utils/storage';
import { formatCurrency, formatDate, todayISO } from '@/utils/format';

type EntryForm = {
  date: string;
  amount: string;
  remarks: string;
};

const getEmptyForm = (): EntryForm => ({ date: todayISO(), amount: '', remarks: '' });

export default function NotebookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Entry form modal
  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState<EntryForm>(getEmptyForm());
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const parseDate = (iso: string): Date => {
    if (!iso) return new Date();
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const handleDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const y = selectedDate.getFullYear();
      const mo = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setForm({ ...form, date: `${y}-${mo}-${day}` });
    }
  };

  const load = useCallback(() => {
    if (!id) return;
    const data = getNotebook(id);
    setNotebook(data ?? null);
    setLoading(false);
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const total = (notebook?.entries ?? []).reduce(
    (sum, e) => sum + e.amount,
    0
  );

  const openAddForm = () => {
    setForm(getEmptyForm());
    setEditingEntryId(null);
    setFormVisible(true);
  };

  const openEditForm = (entry: Entry) => {
    setForm({
      date: entry.date,
      amount: String(entry.amount),
      remarks: entry.remarks,
    });
    setEditingEntryId(entry.id);
    setFormVisible(true);
  };

  const handleSaveEntry = () => {
    if (!form.date.trim() || !form.amount.trim() || !id) return;

    const amount = parseFloat(form.amount);
    if (isNaN(amount)) return;

    try {
      if (editingEntryId) {
        updateEntry(id, editingEntryId, {
          date: form.date.trim(),
          amount,
          remarks: form.remarks.trim(),
        });
      } else {
        addEntry(id, {
          date: form.date.trim(),
          amount,
          remarks: form.remarks.trim(),
        });
      }
      setFormVisible(false);
      load();
    } catch (e) {
      Alert.alert('Error', 'Failed to save entry');
    }
  };

  const handleDeleteEntry = (entry: Entry) => {
    if (!id) return;
    try {
      deleteEntry(id, entry.id);
      load();
    } catch (e) {
      Alert.alert('Error', 'Failed to delete entry');
    }
  };

  const handleLongPressEntry = (entry: Entry) => {
    Alert.alert('Entry Options', '', [
      {
        text: 'Edit',
        onPress: () => openEditForm(entry),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => handleDeleteEntry(entry),
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSwipeDelete = (entry: Entry) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDeleteEntry(entry),
      },
    ]);
  };

  const renderEntry = ({ item }: { item: Entry }) => (
    <Swipeable
      renderRightActions={() => (
        <View style={styles.entrySwipeAction}>
          <TouchableOpacity
            style={styles.entrySwipeButton}
            onPress={() => handleSwipeDelete(item)}
          >
            <Text style={styles.entrySwipeText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
      overshootRight={false}
    >
      <TouchableOpacity
        style={styles.entryRow}
        onPress={() => openEditForm(item)}
        onLongPress={() => handleLongPressEntry(item)}
        activeOpacity={0.7}
      >
        <View style={styles.entryLeft}>
          <Text style={styles.entryDate}>{formatDate(item.date)}</Text>
          {item.remarks ? (
            <Text style={styles.entryRemarks} numberOfLines={1}>
              {item.remarks}
            </Text>
          ) : null}
        </View>
        <Text
          style={[
            styles.entryAmount,
            item.amount < 0 && styles.entryAmountNegative,
          ]}
        >
          {formatCurrency(item.amount)}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📝</Text>
      <Text style={styles.emptyTitle}>No entries yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap the + button to add your first entry
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!notebook) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Notebook not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {notebook.name}
          </Text>
        </View>
      </View>

      {/* Running Total */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Running Total</Text>
        <Text style={[styles.totalValue, total < 0 && styles.totalNegative]}>
          {formatCurrency(total)}
        </Text>
        <Text style={styles.totalCount}>
          {notebook.entries.length}{' '}
          {notebook.entries.length === 1 ? 'entry' : 'entries'}
        </Text>
      </View>

      {/* Entries List */}
      <FlatList
        data={notebook.entries}
        keyExtractor={(item) => item.id}
        renderItem={renderEntry}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          notebook.entries.length === 0 ? styles.listEmpty : styles.list
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#000"
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={openAddForm}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Entry Form Modal */}
      <Modal
        visible={formVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFormVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setFormVisible(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <Pressable
              style={styles.formContent}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.formTitle}>
                {editingEntryId ? 'Edit Entry' : 'New Entry'}
              </Text>

              {/* Date */}
              <Text style={styles.formLabel}>Date</Text>
              {Platform.OS === 'ios' ? (
                <View style={styles.dateButton}>
                  <DateTimePicker
                    value={parseDate(form.date)}
                    mode="date"
                    display="compact"
                    onChange={handleDateChange}
                  />
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dateButtonText}>{formatDate(form.date)}</Text>
                    <Text style={styles.dateButtonIcon}>📅</Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={parseDate(form.date)}
                      mode="date"
                      display="default"
                      onChange={handleDateChange}
                    />
                  )}
                </>
              )}

              {/* Amount */}
              <Text style={styles.formLabel}>Amount (Rs)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="0"
                placeholderTextColor="#999"
                value={form.amount}
                onChangeText={(t) => setForm({ ...form, amount: t })}
                keyboardType="numeric"
              />

              {/* Remarks */}
              <Text style={styles.formLabel}>Remarks</Text>
              <TextInput
                style={[styles.formInput, styles.formRemarksInput]}
                placeholder="Optional note..."
                placeholderTextColor="#999"
                value={form.remarks}
                onChangeText={(t) => setForm({ ...form, remarks: t })}
                multiline
              />

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.formCancel}
                  onPress={() => setFormVisible(false)}
                >
                  <Text style={styles.formCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.formSave,
                    (!form.date.trim() || !form.amount.trim()) &&
                      styles.formSaveDisabled,
                  ]}
                  onPress={handleSaveEntry}
                  disabled={!form.date.trim() || !form.amount.trim()}
                >
                  <Text style={styles.formSaveText}>
                    {editingEntryId ? 'Save' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
  },
  backLink: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
    marginTop: 12,
    textDecorationLine: 'underline',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: '#FFF',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  backArrow: {
    fontSize: 24,
    color: '#000',
    fontWeight: '600',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  totalCard: {
    backgroundColor: '#FFF',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.8,
  },
  totalNegative: {
    color: '#000',
  },
  totalCount: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  listEmpty: {
    flexGrow: 1,
  },
  entrySwipeAction: {
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  entrySwipeButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  entrySwipeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  entryLeft: {
    flex: 1,
    marginRight: 12,
  },
  entryDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  entryRemarks: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  entryAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  entryAmountNegative: {
    color: '#000',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  fabText: {
    fontSize: 28,
    color: '#FFF',
    lineHeight: 30,
    fontWeight: '300',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  formContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    marginTop: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#FAFAFA',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    padding: 14,
    backgroundColor: '#FAFAFA',
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  dateButtonIcon: {
    fontSize: 18,
  },
  formRemarksInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 10,
  },
  formCancel: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  formCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  formSave: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  formSaveDisabled: {
    opacity: 0.3,
  },
  formSaveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});
