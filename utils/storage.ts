import { supabase } from '@/lib/supabase';
import { Notebook, Entry, ServiceRecord } from '@/types';

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
    dateCalendar: row.date_calendar ?? 'ad',
    amount: row.amount,
    meterReading: row.meter_reading ?? null,
    remarks: row.remarks,
  };
}

function mapService(row: any): ServiceRecord {
  return { id: row.id, date: row.date, price: row.price, meterReading: row.meter_reading ?? null, remarks: row.remarks };
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
      date_calendar: entry.dateCalendar,
      amount: entry.amount,
      meter_reading: entry.meterReading,
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
  if (updates.dateCalendar !== undefined) dbUpdates.date_calendar = updates.dateCalendar;
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.meterReading !== undefined) dbUpdates.meter_reading = updates.meterReading;
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

export async function getServices(): Promise<ServiceRecord[]> {
  const { data, error } = await supabase.from('services').select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapService);
}

export async function addService(service: Omit<ServiceRecord, 'id'>): Promise<ServiceRecord> {
  const { data, error } = await supabase.from('services').insert({
    date: service.date, price: service.price, meter_reading: service.meterReading, remarks: service.remarks.trim(),
  }).select().single();
  if (error) throw error;
  return mapService(data);
}

export async function updateService(id: string, service: Omit<ServiceRecord, 'id'>): Promise<void> {
  const { error } = await supabase.from('services').update({
    date: service.date, price: service.price, meter_reading: service.meterReading, remarks: service.remarks.trim(),
  }).eq('id', id);
  if (error) throw error;
}

export async function deleteService(id: string): Promise<void> {
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw error;
}
