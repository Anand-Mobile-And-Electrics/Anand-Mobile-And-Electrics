import { supabase } from '../lib/supabase';
import imageCompression from 'browser-image-compression';
import { v4 as uuidv4 } from 'uuid';
import { isDemoMode } from '../data/demoMode';
import * as demo from '../data/demoRepairs';

/* ------------------------------------------------------------------ */
/* Shared types                                                        */
/* ------------------------------------------------------------------ */

export type RepairStatus =
  | 'received'
  | 'diagnosing'
  | 'waiting_for_approval'
  | 'in_repair'
  | 'ready'
  | 'completed'
  | 'cancelled';

export const REPAIR_STATUSES: RepairStatus[] = [
  'received',
  'diagnosing',
  'waiting_for_approval',
  'in_repair',
  'ready',
  'completed',
  'cancelled',
];

export const STATUS_LABELS: Record<RepairStatus, string> = {
  received: 'Received',
  diagnosing: 'Diagnosing',
  waiting_for_approval: 'Waiting for Approval',
  in_repair: 'In Repair',
  ready: 'Ready for Collection',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Device {
  id: string;
  customer_id: string;
  brand: string;
  model: string;
  imei_serial: string | null;
  created_at?: string;
}

export interface Technician {
  id: string;
  role: string;
  full_name?: string | null;
}

export interface Repair {
  id: string;
  job_number: string;
  customer_id: string;
  device_id: string;
  assigned_to: string;
  status: RepairStatus;
  required_work: string;
  repair_notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Embedded relations (optional depending on query)
  customers?: Pick<Customer, 'full_name' | 'phone'> | null;
  devices?: Pick<Device, 'brand' | 'model'> | null;
  assignee?: { id: string } | null;
}

export interface RepairHistoryEntry {
  id: string;
  repair_id: string;
  old_status: RepairStatus | null;
  new_status: RepairStatus;
  changed_by: string | null;
  changed_at: string;
}

export interface RepairPhoto {
  id: string;
  repair_id: string;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
}

export interface ListRepairsParams {
  search?: string;
  status?: RepairStatus | '';
  sortBy?: 'created_at' | 'updated_at' | 'job_number' | 'status';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ListRepairsResult {
  rows: Repair[];
  count: number;
}

const BUCKET = 'repair-photos';

/**
 * Strip characters that are reserved in PostgREST filter grammar
 * (comma, parentheses) and the ilike wildcards so a user's raw text
 * cannot break the .or() filter or inject extra conditions.
 */
export function sanitizeFilterTerm(raw: string): string {
  return raw.trim().replace(/[,()%*\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

/* ------------------------------------------------------------------ */
/* Repairs                                                             */
/* ------------------------------------------------------------------ */

const REPAIR_SELECT =
  '*, customers(full_name, phone), devices(brand, model), assignee:profiles!assigned_to(id)';

/**
 * Tables: repairs (+ embedded customers, devices, profiles).
 * Server-side search/filter/sort/pagination.
 */
export async function listRepairs(params: ListRepairsParams): Promise<ListRepairsResult> {
  if (isDemoMode()) return demo.listRepairs(params);
  const {
    search = '',
    status = '',
    sortBy = 'created_at',
    sortDir = 'desc',
    page = 1,
    pageSize = 10,
  } = params;

  let query = supabase
    .from('repairs')
    .select(REPAIR_SELECT, { count: 'exact' });

  const trimmed = sanitizeFilterTerm(search);
  if (trimmed) {
    const like = `%${trimmed}%`;
    // Search job number / problem text on the repairs row directly, plus
    // customer (name, phone) and device (brand, model) via their own
    // RLS-filtered lookups, then match repairs by the resolved foreign keys.
    // This keeps a single top-level OR filter (no embedded-OR limitation) and
    // never exposes rows the current user is not authorized to see, because
    // every sub-query runs under the same authenticated, RLS-scoped client.
    const [custRes, devRes] = await Promise.all([
      supabase.from('customers').select('id').or(`full_name.ilike.${like},phone.ilike.${like}`).limit(1000),
      supabase.from('devices').select('id').or(`brand.ilike.${like},model.ilike.${like}`).limit(1000),
    ]);
    // Surface sub-query failures instead of silently returning partial results.
    if (custRes.error) throw custRes.error;
    if (devRes.error) throw devRes.error;
    const custIds = (custRes.data ?? []).map((r) => r.id);
    const devIds = (devRes.data ?? []).map((r) => r.id);

    const clauses = [`job_number.ilike.${like}`, `required_work.ilike.${like}`];
    if (custIds.length) clauses.push(`customer_id.in.(${custIds.join(',')})`);
    if (devIds.length) clauses.push(`device_id.in.(${devIds.join(',')})`);
    query = query.or(clauses.join(','));
  }
  if (status) {
    query = query.eq('status', status);
  }

  query = query.order(sortBy, { ascending: sortDir === 'asc' });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as Repair[], count: count ?? 0 };
}

/** Table: repairs. Per-status counts via head+count. */
export async function getStatusCounts(): Promise<Record<RepairStatus, number> & { total: number }> {
  if (isDemoMode()) return demo.getStatusCounts();
  const results = await Promise.all(
    REPAIR_STATUSES.map(async (s) => {
      const { count, error } = await supabase
        .from('repairs')
        .select('*', { count: 'exact', head: true })
        .eq('status', s);
      if (error) throw error;
      return [s, count ?? 0] as const;
    }),
  );
  const { count: total, error: totalErr } = await supabase
    .from('repairs')
    .select('*', { count: 'exact', head: true });
  if (totalErr) throw totalErr;

  const map = Object.fromEntries(results) as Record<RepairStatus, number>;
  return { ...map, total: total ?? 0 };
}

/** Table: repairs (+ embedded relations). */
export async function getRepair(id: string): Promise<Repair> {
  if (isDemoMode()) return demo.getRepair(id);
  const { data, error } = await supabase
    .from('repairs')
    .select(REPAIR_SELECT)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as unknown as Repair;
}

/** Table: repair_history (SELECT only — append-only via trigger). */
export async function getRepairHistory(repairId: string): Promise<RepairHistoryEntry[]> {
  if (isDemoMode()) return demo.getRepairHistory(repairId);
  const { data, error } = await supabase
    .from('repair_history')
    .select('*')
    .eq('repair_id', repairId)
    .order('changed_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as RepairHistoryEntry[];
}

/* ------------------------------------------------------------------ */
/* Profiles / technicians                                              */
/* ------------------------------------------------------------------ */

/** Table: profiles. owner/manager may read all; used for assignment dropdown. */
export async function listTechnicians(): Promise<Technician[]> {
  if (isDemoMode()) return demo.listTechnicians();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .order('role');
  if (error) throw error;
  return (data ?? []) as Technician[];
}

/* ------------------------------------------------------------------ */
/* Customers & devices                                                 */
/* ------------------------------------------------------------------ */

export function normalizePhone(raw: string): string {
  // Keep digits and leading +, strip everything else. No country assumptions.
  const trimmed = raw.trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  return plus + trimmed.replace(/[^\d]/g, '');
}

/** Table: customers. ilike search on name/phone. */
export async function searchCustomers(term: string): Promise<Customer[]> {
  if (isDemoMode()) return demo.searchCustomers(term);
  const t = sanitizeFilterTerm(term);
  if (!t) return [];
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .or(`full_name.ilike.%${t}%,phone.ilike.%${t}%`)
    .order('full_name')
    .limit(20);
  if (error) throw error;
  return (data ?? []) as Customer[];
}

/** Table: devices. */
export async function getCustomerDevices(customerId: string): Promise<Device[]> {
  if (isDemoMode()) return demo.getCustomerDevices(customerId);
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Device[];
}

/** Table: customers. */
export async function createCustomer(input: {
  full_name: string;
  phone: string;
  email?: string | null;
}): Promise<Customer> {
  if (isDemoMode()) return demo.createCustomer(input);
  const { data, error } = await supabase
    .from('customers')
    .insert({
      full_name: input.full_name.trim(),
      phone: normalizePhone(input.phone),
      email: input.email?.trim() ? input.email.trim() : null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Customer;
}

/** Table: devices. */
export async function createDevice(input: {
  customer_id: string;
  brand: string;
  model: string;
  imei_serial?: string | null;
}): Promise<Device> {
  if (isDemoMode()) return demo.createDevice(input);
  const { data, error } = await supabase
    .from('devices')
    .insert({
      customer_id: input.customer_id,
      brand: input.brand.trim(),
      model: input.model.trim(),
      imei_serial: input.imei_serial?.trim() ? input.imei_serial.trim() : null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Device;
}

/** Table: repairs. job_number & completed_at are DB-controlled — never sent. */
export async function createRepair(input: {
  customer_id: string;
  device_id: string;
  assigned_to: string;
  required_work: string;
  repair_notes?: string | null;
}): Promise<Repair> {
  if (isDemoMode()) return demo.createRepair(input);
  if (!input.customer_id || !input.device_id || !input.assigned_to) {
    throw new Error('Customer, device, and technician are required.');
  }
  if (!input.required_work.trim()) throw new Error('Reported problem / required work is required.');
  const { data, error } = await supabase
    .from('repairs')
    .insert({
      customer_id: input.customer_id,
      device_id: input.device_id,
      assigned_to: input.assigned_to,
      required_work: input.required_work.trim(),
      repair_notes: input.repair_notes?.trim() ? input.repair_notes.trim() : null,
    })
    .select(REPAIR_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as Repair;
}

/** Table: repairs. Never send completed_at (DB sets it on 'completed'). */
export async function updateRepairStatus(id: string, status: RepairStatus): Promise<void> {
  if (isDemoMode()) return demo.updateRepairStatus(id, status);
  const { error } = await supabase.from('repairs').update({ status }).eq('id', id);
  if (error) throw error;
}

/** Table: repairs. */
export async function updateRepairNotes(id: string, repair_notes: string): Promise<void> {
  if (isDemoMode()) return demo.updateRepairNotes(id, repair_notes);
  const trimmed = repair_notes.trim();
  const { error } = await supabase
    .from('repairs')
    .update({ repair_notes: trimmed ? trimmed : null })
    .eq('id', id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Photos (storage bucket 'repair-photos' + repair_photos table)       */
/* ------------------------------------------------------------------ */

/** Table: repair_photos (SELECT). */
export async function listRepairPhotos(repairId: string): Promise<RepairPhoto[]> {
  if (isDemoMode()) return demo.listRepairPhotos(repairId);
  const { data, error } = await supabase
    .from('repair_photos')
    .select('*')
    .eq('repair_id', repairId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as RepairPhoto[];
}

export function extFromMime(mime: string): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
    default:
      return 'jpg';
  }
}

/**
 * Storage bucket 'repair-photos' + table repair_photos.
 * Atomic flow: upload object FIRST, then insert metadata.
 * If metadata insert fails, delete the just-uploaded object (orphan cleanup).
 */
export async function uploadRepairPhoto(
  repairId: string,
  file: File,
  uploadedBy: string,
): Promise<RepairPhoto> {
  if (isDemoMode()) return demo.uploadRepairPhoto(repairId, file, uploadedBy);
  const compressed = await imageCompression(file, {
    maxSizeMB: 1.0,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
  });

  const ext = extFromMime(compressed.type);
  const path = `${repairId}/${uuidv4()}.${ext}`;

  // 1. Upload to storage first.
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { contentType: compressed.type, upsert: false });
  if (uploadError) throw uploadError;

  // 2. Insert metadata; on failure, clean up the orphaned object.
  const { data, error: insertError } = await supabase
    .from('repair_photos')
    .insert({ repair_id: repairId, storage_path: path, uploaded_by: uploadedBy })
    .select()
    .single();

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw insertError;
  }

  return data as RepairPhoto;
}

/** Storage bucket 'repair-photos'. Private bucket — signed URLs only. */
export async function getSignedPhotoUrl(path: string, expiresIn = 3600): Promise<string> {
  if (isDemoMode()) return demo.getSignedPhotoUrl(path);
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
