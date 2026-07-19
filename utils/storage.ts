import { supabase } from '@/lib/supabase';
import { Notebook, Entry } from '@/types';

/** Map a Supabase DB row (snake_case) to our Notebook type (camelCase). */
function mapNotebook(row: any): Notebook {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    entries: (row.entries ?? []).map(mapEntry),
  };
}

/** Map a Supabase DB row (snake_case) to our Entry type (camelCase). */
function mapEntry(row: any): Entry {
  return {
    id: row.id,
    date: row.date,
    amount: row.amount,
    remarks: row.remarks,
  };
}

// ─── Notebook CRUD ───────────────────────────────────────────────

export async function getNotebooks(): Promise<Notebook[]> {
  const { data, error } = await supabase
    .from('notebooks')
    .select('*, entries(*)')
    .order('created_at', { ascending: false })
    .order('date', { foreignTable: 'entries', ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapNotebook);
}

export async function getNotebook(id: string): Promise<Notebook | undefined> {
  const { data, error } = await supabase
    .from('notebooks')
    .select('*, entries(*)')
    .eq('id', id)
    .order('date', { foreignTable: 'entries', ascending: false })
    .single();

  if (error) {
    if (error.code === 'PGRST116') return undefined; // not found
    throw error;
  }
  return mapNotebook(data);
}

export async function createNotebook(name: string): Promise<Notebook> {
  const { data, error } = await supabase
    .from('notebooks')
    .insert({ name: name.trim() })
    .select('*, entries(*)')
    .single();

  if (error) throw error;
  return mapNotebook(data);
}

export async function renameNotebook(id: string, newName: string): Promise<void> {
  const { error } = await supabase
    .from('notebooks')
    .update({ name: newName.trim() })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteNotebook(id: string): Promise<void> {
  // Entries are cascade-deleted by the DB foreign key
  const { error } = await supabase.from('notebooks').delete().eq('id', id);
  if (error) throw error;
}

// ─── Entry CRUD ─────────────────────────────────────────────────

export async function addEntry(
  notebookId: string,
  entry: Omit<Entry, 'id'>
): Promise<Entry> {
  const { data, error } = await supabase
    .from('entries')
    .insert({
      notebook_id: notebookId,
      date: entry.date,
      amount: entry.amount,
      remarks: entry.remarks.trim(),
    })
    .select()
    .single();

  if (error) throw error;
  return mapEntry(data);
}

export async function updateEntry(
  notebookId: string,
  entryId: string,
  updates: Partial<Omit<Entry, 'id'>>
): Promise<void> {
  const dbUpdates: Record<string, any> = {};
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.remarks !== undefined) dbUpdates.remarks = updates.remarks.trim();

  const { error } = await supabase
    .from('entries')
    .update(dbUpdates)
    .eq('id', entryId)
    .eq('notebook_id', notebookId);

  if (error) throw error;
}

export async function deleteEntry(notebookId: string, entryId: string): Promise<void> {
  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', entryId)
    .eq('notebook_id', notebookId);

  if (error) throw error;
}
