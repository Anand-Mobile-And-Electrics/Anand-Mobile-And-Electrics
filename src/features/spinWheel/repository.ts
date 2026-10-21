export type SpinOffer = { id: string; label: string; description: string; category?: string; active: boolean; createdAt: string; updatedAt: string };
export type SpinEntry = { id: string; offerId: string; customerName: string; address: string; phone: string; reason: string; createdAt: string; offerValidUntil: string; recordExpiresAt: string };
const OFFERS_KEY = 'anand-spin-offers-v1';
const ENTRIES_KEY = 'anand-spin-entries-v1';
const defaults: SpinOffer[] = [
  { id: 'sample-10-off', label: 'Sample offer — 10% off repairs', description: 'Development-only sample data', category: 'Sample', active: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'sample-free-screen', label: 'Sample offer — free screen protector', description: 'Development-only sample data', category: 'Sample', active: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'sample-accessory', label: 'Sample offer — accessory discount', description: 'Development-only sample data', category: 'Sample', active: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'sample-repair-check', label: 'Sample offer — free repair check', description: 'Development-only sample data', category: 'Sample', active: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'sample-bonus', label: 'Sample offer — bonus reward', description: 'Development-only sample data', category: 'Sample', active: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'sample-thanks', label: 'Sample offer — thank-you reward', description: 'Development-only sample data', category: 'Sample', active: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
];
function read<T>(key: string, fallback: T): T { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
export const getOffers = () => {
  const stored = read<SpinOffer[] | null>(OFFERS_KEY, null);
  if (!stored) return defaults;
  const existing = new Set(stored.map((offer) => offer.id));
  const seeded = defaults.filter((offer) => !existing.has(offer.id));
  return stored.length < 6 ? [...stored, ...seeded] : stored;
};
export const saveOffers = (offers: SpinOffer[]) => localStorage.setItem(OFFERS_KEY, JSON.stringify(offers));
export const getEntries = () => read<SpinEntry[]>(ENTRIES_KEY, []);
export const saveEntry = (entry: SpinEntry) => { const now = Date.now(); const entries = getEntries().filter((item) => new Date(item.recordExpiresAt).getTime() > now); localStorage.setItem(ENTRIES_KEY, JSON.stringify([...entries, entry])); };
export const cleanupEntries = () => { const entries = getEntries(); const cleaned = entries.filter((item) => new Date(item.recordExpiresAt).getTime() > Date.now()); localStorage.setItem(ENTRIES_KEY, JSON.stringify(cleaned)); return cleaned; };
export const chooseOffer = (offers: SpinOffer[], random = Math.random()) => { const active = offers.filter((offer) => offer.active); return active.length ? active[Math.min(active.length - 1, Math.floor(random * active.length))] : undefined; };
