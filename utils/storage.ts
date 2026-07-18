import { Platform } from 'react-native';
import { StorageData, Notebook, Entry } from '@/types';

// On web, use localStorage as fallback since expo-file-system lacks web support.
// On native, use expo-file-system.
let readData: () => StorageData;
let writeData: (data: StorageData) => void;

if (Platform.OS === 'web') {
  const WEB_KEY = 'ledger_data';
  readData = () => {
    try {
      const raw = localStorage.getItem(WEB_KEY);
      return raw ? (JSON.parse(raw) as StorageData) : { notebooks: [] };
    } catch {
      return { notebooks: [] };
    }
  };
  writeData = (data: StorageData) => {
    localStorage.setItem(WEB_KEY, JSON.stringify(data));
  };
} else {
  const { File, Paths } = require('expo-file-system');
  const storageFile = new File(Paths.document, 'ledger_data.json');

  readData = () => {
    if (!storageFile.exists) return { notebooks: [] };
    try {
      return JSON.parse(storageFile.textSync()) as StorageData;
    } catch {
      return { notebooks: [] };
    }
  };
  writeData = (data: StorageData) => {
    if (!storageFile.exists) {
      storageFile.create();
    }
    storageFile.write(JSON.stringify(data));
  };
}

// ─── Notebook CRUD ───────────────────────────────────────────

export function getNotebooks(): Notebook[] {
  return readData().notebooks;
}

export function getNotebook(id: string): Notebook | undefined {
  return readData().notebooks.find((n) => n.id === id);
}

export function createNotebook(name: string): Notebook {
  const data = readData();
  const notebook: Notebook = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 9),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    entries: [],
  };
  data.notebooks.unshift(notebook);
  writeData(data);
  return notebook;
}

export function renameNotebook(id: string, newName: string): void {
  const data = readData();
  const nb = data.notebooks.find((n) => n.id === id);
  if (nb) {
    nb.name = newName.trim();
    writeData(data);
  }
}

export function deleteNotebook(id: string): void {
  const data = readData();
  data.notebooks = data.notebooks.filter((n) => n.id !== id);
  writeData(data);
}

// ─── Entry CRUD ──────────────────────────────────────────────

export function addEntry(
  notebookId: string,
  entry: Omit<Entry, 'id'>
): Entry {
  const data = readData();
  const nb = data.notebooks.find((n) => n.id === notebookId);
  if (!nb) throw new Error('Notebook not found');
  const newEntry: Entry = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 9),
    ...entry,
  };
  nb.entries.unshift(newEntry);
  writeData(data);
  return newEntry;
}

export function updateEntry(
  notebookId: string,
  entryId: string,
  updates: Partial<Omit<Entry, 'id'>>
): void {
  const data = readData();
  const nb = data.notebooks.find((n) => n.id === notebookId);
  if (!nb) throw new Error('Notebook not found');
  const entry = nb.entries.find((e) => e.id === entryId);
  if (!entry) throw new Error('Entry not found');
  Object.assign(entry, updates);
  writeData(data);
}

export function deleteEntry(notebookId: string, entryId: string): void {
  const data = readData();
  const nb = data.notebooks.find((n) => n.id === notebookId);
  if (!nb) throw new Error('Notebook not found');
  nb.entries = nb.entries.filter((e) => e.id !== entryId);
  writeData(data);
}
