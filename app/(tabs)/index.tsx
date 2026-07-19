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
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Notebook } from '@/types';
import { getNotebooks, createNotebook, renameNotebook, deleteNotebook } from '@/utils/storage';
import { formatCurrency, totalAmount } from '@/utils/format';

export default function NotebooksScreen() {
  const router = useRouter();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New notebook modal
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');

  // Rename modal
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Notebook | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const loadNotebooks = useCallback(async () => {
    const data = await getNotebooks();
    setNotebooks(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotebooks();
    }, [loadNotebooks])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotebooks();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createNotebook(newName.trim());
    setNewName('');
    setModalVisible(false);
    loadNotebooks();
  };

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    await renameNotebook(renameTarget.id, renameValue.trim());
    setRenameVisible(false);
    setRenameTarget(null);
    setRenameValue('');
    loadNotebooks();
  };

  const handleDelete = (notebook: Notebook) => {
    Alert.alert(
      'Delete Notebook',
      `Are you sure you want to delete "${notebook.name}"? All entries will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteNotebook(notebook.id);
            loadNotebooks();
          },
        },
      ]
    );
  };

  const handleLongPress = (notebook: Notebook) => {
    Alert.alert(notebook.name, 'Choose an action', [
      {
        text: 'Rename',
        onPress: () => {
          setRenameTarget(notebook);
          setRenameValue(notebook.name);
          setRenameVisible(true);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => handleDelete(notebook),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderNotebook = ({ item }: { item: Notebook }) => {
    const total = totalAmount(item.entries);
    return (
      <Swipeable
        renderRightActions={() => (
          <View style={styles.swipeAction}>
            <TouchableOpacity
              style={styles.swipeDeleteButton}
              onPress={() => handleDelete(item)}
            >
              <Text style={styles.swipeDeleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        overshootRight={false}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(`/notebook/${item.id}` as any)}
          onLongPress={() => handleLongPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.cardTop}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.cardCount}>
              {item.entries.length} {item.entries.length === 1 ? 'entry' : 'entries'}
            </Text>
          </View>
          <Text style={[styles.cardTotal, total < 0 && styles.cardTotalNegative]}>
            {formatCurrency(total)}
          </Text>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📓</Text>
      <Text style={styles.emptyTitle}>No notebooks yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap the + button below to create your first notebook
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ledger</Text>
        <Text style={styles.headerSubtitle}>Notebooks</Text>
      </View>

      <FlatList
        data={notebooks}
        keyExtractor={(item) => item.id}
        renderItem={renderNotebook}
        ListEmptyComponent={!loading ? renderEmpty : null}
        contentContainerStyle={notebooks.length === 0 ? styles.listEmpty : styles.list}
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
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>New Notebook</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Notebook name"
              placeholderTextColor="#999"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setModalVisible(false);
                  setNewName('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, !newName.trim() && styles.modalSaveDisabled]}
                onPress={handleCreate}
                disabled={!newName.trim()}
              >
                <Text style={styles.modalSaveText}>Create</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Rename Modal */}
      <Modal
        visible={renameVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setRenameVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Rename Notebook</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="New name"
              placeholderTextColor="#999"
              value={renameValue}
              onChangeText={setRenameValue}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setRenameVisible(false);
                  setRenameTarget(null);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, !renameValue.trim() && styles.modalSaveDisabled]}
                onPress={handleRename}
                disabled={!renameValue.trim()}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
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
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  listEmpty: {
    flexGrow: 1,
  },
  swipeAction: {
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'flex-end',
    borderRadius: 12,
    marginBottom: 12,
    width: 100,
  },
  swipeDeleteButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
  },
  swipeDeleteText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  cardCount: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  cardTotal: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.3,
  },
  cardTotalNegative: {
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#FAFAFA',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  modalSave: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  modalSaveDisabled: {
    opacity: 0.3,
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});
