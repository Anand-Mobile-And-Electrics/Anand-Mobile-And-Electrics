export type SpinOffer = { id: string; label: string; description: string; category?: string; active: boolean; createdAt: string; updatedAt: string };
export type SpinEntry = { id: string; offerId: string; customerName: string; address: string; phone: string; reason: string; createdAt: string; offerValidUntil: string; recordExpiresAt: string };
const OFFERS_KEY = 'anand-spin-offers-v1';
const ENTRIES_KEY = 'anand-spin-entries-v1';
const defaults: SpinOffer[] = [
  { id: 'surprise-10-repair', label: 'Surprise: 10% Off Repairs', description: 'Surprise reward: 10% discount on any mobile or electrical repair service.', category: 'Surprise', active: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'surprise-free-glass', label: 'Surprise: Free Tempered Glass', description: 'Surprise gift: Free premium screen protector with expert installation.', category: 'Surprise', active: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'surprise-50-accessories', label: 'Surprise: ₹50 Off Accessories', description: 'Surprise discount: Flat ₹50 off on cables, chargers, or mobile covers.', category: 'Surprise', active: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'surprise-free-checkup', label: 'Surprise: Free Device Checkup', description: 'Surprise inspection: Complete smartphone or electrical diagnostic checkup at ₹0.', category: 'Surprise', active: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'surprise-15-battery', label: 'Surprise: 15% Off Battery', description: 'Surprise saving: 15% discount on original battery replacement.', category: 'Surprise', active: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'surprise-special-reward', label: 'Surprise: Special Gift Reward', description: 'Surprise exclusive: Special loyalty gift reward on your order today!', category: 'Surprise', active: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
];
function read<T>(key: string, fallback: T): T { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
export const getOffers = () => {
  const stored = read<SpinOffer[] | null>(OFFERS_KEY, null);
  // If stored has old sample data, upgrade to new Surprise offers
  if (!stored || stored.some((offer) => offer.id.startsWith('sample-') || offer.label.startsWith('Sample offer'))) {
    saveOffers(defaults);
    return defaults;
  }
  const existing = new Set(stored.map((offer) => offer.id));
  const seeded = defaults.filter((offer) => !existing.has(offer.id));
  return stored.length < 6 ? [...stored, ...seeded] : stored;
};
export const saveOffers = (offers: SpinOffer[]) => localStorage.setItem(OFFERS_KEY, JSON.stringify(offers));
export const getEntries = () => read<SpinEntry[]>(ENTRIES_KEY, []);
export const saveEntry = (entry: SpinEntry) => { const now = Date.now(); const entries = getEntries().filter((item) => new Date(item.recordExpiresAt).getTime() > now); localStorage.setItem(ENTRIES_KEY, JSON.stringify([...entries, entry])); };
export const cleanupEntries = () => { const entries = getEntries(); const cleaned = entries.filter((item) => new Date(item.recordExpiresAt).getTime() > Date.now()); localStorage.setItem(ENTRIES_KEY, JSON.stringify(cleaned)); return cleaned; };
export const chooseOffer = (offers: SpinOffer[], random = Math.random()) => { const active = offers.filter((offer) => offer.active); return active.length ? active[Math.min(active.length - 1, Math.floor(random * active.length))] : undefined; };
