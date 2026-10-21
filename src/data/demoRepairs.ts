// Demo (in-memory) data adapter for the repairs domain. Deterministic synthetic
// data, clearly labelled "DEMO". Mirrors the exported functions of
// services/repairs.ts so the UI is identical whether live or demo.
// NO real business data. Writes mutate the in-memory store for the session only.
import type {
  Repair, RepairStatus, Customer, Device, Technician,
  RepairHistoryEntry, RepairPhoto, ListRepairsParams, ListRepairsResult,
} from '../services/repairs';

const STATUSES: RepairStatus[] = [
  'received', 'diagnosing', 'waiting_for_approval', 'in_repair', 'ready', 'completed', 'cancelled',
];

const now = '2026-01-01T10:00:00.000Z';
let jobSeq = 2000;

const customers: Customer[] = [
  { id: 'demo-c1', full_name: 'DEMO Asha Patel', phone: '9000000001', email: null, created_at: now, updated_at: now },
  { id: 'demo-c2', full_name: 'DEMO Ravi Shah', phone: '9000000002', email: 'demo.ravi@example.test', created_at: now, updated_at: now },
];
const devices: Device[] = [
  { id: 'demo-d1', customer_id: 'demo-c1', brand: 'DEMO Samsung', model: 'Galaxy A14', imei_serial: null, created_at: now },
  { id: 'demo-d2', customer_id: 'demo-c2', brand: 'DEMO Nokia', model: '105', imei_serial: 'DEMО-IMEI-2', created_at: now },
];
const technicians: Technician[] = [
  { id: 'demo-owner', role: 'owner', full_name: 'DEMO Owner' },
  { id: 'demo-mgr', role: 'manager', full_name: 'DEMO Manager' },
  { id: 'demo-tech', role: 'technician', full_name: 'DEMO Technician' },
];
const repairs: Repair[] = [
  {
    id: 'demo-r1', job_number: 'JOB-2001', customer_id: 'demo-c1', device_id: 'demo-d1',
    assigned_to: 'demo-tech', status: 'in_repair', required_work: 'DEMO cracked screen replacement',
    repair_notes: 'DEMO awaiting part', completed_at: null, created_at: now, updated_at: now,
    customers: { full_name: 'DEMO Asha Patel', phone: '9000000001' },
    devices: { brand: 'DEMO Samsung', model: 'Galaxy A14' }, assignee: { id: 'demo-tech' },
  },
  {
    id: 'demo-r2', job_number: 'JOB-2002', customer_id: 'demo-c2', device_id: 'demo-d2',
    assigned_to: 'demo-mgr', status: 'received', required_work: 'DEMO battery not charging',
    repair_notes: null, completed_at: null, created_at: now, updated_at: now,
    customers: { full_name: 'DEMO Ravi Shah', phone: '9000000002' },
    devices: { brand: 'DEMO Nokia', model: '105' }, assignee: { id: 'demo-mgr' },
  },
];
const history: RepairHistoryEntry[] = [
  { id: 'demo-h1', repair_id: 'demo-r1', old_status: null, new_status: 'received', changed_by: 'demo-owner', changed_at: now },
  { id: 'demo-h2', repair_id: 'demo-r1', old_status: 'received', new_status: 'in_repair', changed_by: 'demo-tech', changed_at: now },
  { id: 'demo-h3', repair_id: 'demo-r2', old_status: null, new_status: 'received', changed_by: 'demo-mgr', changed_at: now },
];
const photos: RepairPhoto[] = [];

const clean = (s: string) => s.trim().toLowerCase();
let idSeq = 100;
const newId = (p: string) => `${p}-${++idSeq}`;

export async function listRepairs(params: ListRepairsParams): Promise<ListRepairsResult> {
  const { search = '', status = '', sortBy = 'created_at', sortDir = 'desc', page = 1, pageSize = 10 } = params;
  let rows = [...repairs];
  const t = clean(search);
  if (t) {
    rows = rows.filter((r) =>
      r.job_number.toLowerCase().includes(t) ||
      r.required_work.toLowerCase().includes(t) ||
      (r.customers?.full_name ?? '').toLowerCase().includes(t) ||
      (r.customers?.phone ?? '').toLowerCase().includes(t) ||
      (r.devices?.brand ?? '').toLowerCase().includes(t) ||
      (r.devices?.model ?? '').toLowerCase().includes(t));
  }
  if (status) rows = rows.filter((r) => r.status === status);
  rows.sort((a, b) => {
    const av = String((a as unknown as Record<string, unknown>)[sortBy] ?? '');
    const bv = String((b as unknown as Record<string, unknown>)[sortBy] ?? '');
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });
  const count = rows.length;
  const from = (page - 1) * pageSize;
  return { rows: rows.slice(from, from + pageSize), count };
}

export async function getStatusCounts(): Promise<Record<RepairStatus, number> & { total: number }> {
  const map = Object.fromEntries(STATUSES.map((s) => [s, repairs.filter((r) => r.status === s).length])) as Record<RepairStatus, number>;
  return { ...map, total: repairs.length };
}

export async function getRepair(id: string): Promise<Repair> {
  const r = repairs.find((x) => x.id === id);
  if (!r) throw new Error('DEMO: repair not found');
  return { ...r };
}

export async function getRepairHistory(repairId: string): Promise<RepairHistoryEntry[]> {
  return history.filter((h) => h.repair_id === repairId).sort((a, b) => b.changed_at.localeCompare(a.changed_at));
}

export async function listTechnicians(): Promise<Technician[]> {
  return [...technicians];
}

export async function searchCustomers(term: string): Promise<Customer[]> {
  const t = clean(term);
  if (!t) return [];
  return customers.filter((c) => c.full_name.toLowerCase().includes(t) || c.phone.toLowerCase().includes(t));
}

export async function getCustomerDevices(customerId: string): Promise<Device[]> {
  return devices.filter((d) => d.customer_id === customerId);
}

export async function createCustomer(input: { full_name: string; phone: string; email?: string | null }): Promise<Customer> {
  const c: Customer = { id: newId('demo-c'), full_name: input.full_name.trim(), phone: input.phone.trim(), email: input.email?.trim() || null, created_at: now, updated_at: now };
  customers.push(c);
  return c;
}

export async function createDevice(input: { customer_id: string; brand: string; model: string; imei_serial?: string | null }): Promise<Device> {
  const d: Device = { id: newId('demo-d'), customer_id: input.customer_id, brand: input.brand.trim(), model: input.model.trim(), imei_serial: input.imei_serial?.trim() || null, created_at: now };
  devices.push(d);
  return d;
}

export async function createRepair(input: { customer_id: string; device_id: string; assigned_to: string; required_work: string; repair_notes?: string | null }): Promise<Repair> {
  const cust = customers.find((c) => c.id === input.customer_id);
  const dev = devices.find((d) => d.id === input.device_id);
  if (!dev || dev.customer_id !== input.customer_id) throw new Error('DEMO: device does not belong to customer');
  const r: Repair = {
    id: newId('demo-r'), job_number: `JOB-${++jobSeq}`, customer_id: input.customer_id, device_id: input.device_id,
    assigned_to: input.assigned_to, status: 'received', required_work: input.required_work.trim(),
    repair_notes: input.repair_notes?.trim() || null, completed_at: null, created_at: now, updated_at: now,
    customers: cust ? { full_name: cust.full_name, phone: cust.phone } : null,
    devices: dev ? { brand: dev.brand, model: dev.model } : null, assignee: { id: input.assigned_to },
  };
  repairs.unshift(r);
  history.unshift({ id: newId('demo-h'), repair_id: r.id, old_status: null, new_status: 'received', changed_by: input.assigned_to, changed_at: now });
  return r;
}

export async function updateRepairStatus(id: string, status: RepairStatus): Promise<void> {
  const r = repairs.find((x) => x.id === id);
  if (!r) throw new Error('DEMO: repair not found');
  const old = r.status;
  r.status = status;
  r.completed_at = status === 'completed' ? now : null; // mirrors DB-controlled behavior
  if (old !== status) history.unshift({ id: newId('demo-h'), repair_id: id, old_status: old, new_status: status, changed_by: r.assigned_to, changed_at: now });
}

export async function updateRepairNotes(id: string, repair_notes: string): Promise<void> {
  const r = repairs.find((x) => x.id === id);
  if (!r) throw new Error('DEMO: repair not found');
  r.repair_notes = repair_notes.trim() || null;
}

export async function listRepairPhotos(repairId: string): Promise<RepairPhoto[]> {
  return photos.filter((p) => p.repair_id === repairId);
}

export async function uploadRepairPhoto(repairId: string, _file: File, uploadedBy: string): Promise<RepairPhoto> {
  void _file;
  const p: RepairPhoto = { id: newId('demo-p'), repair_id: repairId, storage_path: `${repairId}/demo.png`, uploaded_by: uploadedBy, created_at: now };
  photos.push(p);
  return p;
}

export async function getSignedPhotoUrl(_path: string): Promise<string> {
  void _path;
  // Transparent 1x1 PNG placeholder — real signed URLs require live storage.
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
}
