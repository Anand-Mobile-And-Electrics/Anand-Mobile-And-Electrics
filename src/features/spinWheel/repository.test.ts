import { beforeEach, describe, expect, it } from 'vitest';
import { chooseOffer, cleanupEntries, getEntries, getOffers, saveEntry, type SpinOffer } from './repository';

describe('spin wheel local repository', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    globalThis.localStorage = { clear: () => values.clear(), getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key), key: (index) => [...values.keys()][index] ?? null, get length() { return values.size; } } as Storage;
    localStorage.clear();
  });
  it('stores entries with independent offer and record expiry', () => {
    saveEntry({ id: '1', offerId: 'x', customerName: 'A', address: 'Demo address', phone: '9876543210', reason: 'Demo reason', createdAt: new Date().toISOString(), offerValidUntil: '2030-01-01T00:00:00.000Z', recordExpiresAt: '2030-02-01T00:00:00.000Z' });
    expect(getEntries()[0].offerValidUntil).not.toBe(getEntries()[0].recordExpiresAt);
  });
  it('cleans expired records', () => {
    saveEntry({ id: '1', offerId: 'x', customerName: 'A', address: 'Demo address', phone: '9876543210', reason: 'Demo reason', createdAt: new Date().toISOString(), offerValidUntil: '2000-01-01T00:00:00.000Z', recordExpiresAt: '2000-01-01T00:00:00.000Z' });
    expect(cleanupEntries()).toHaveLength(0);
  });

  it('selects uniformly from active offers and excludes inactive offers', () => {
    const offers: SpinOffer[] = [
      { id: 'inactive', label: 'Inactive', description: '', active: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      { id: 'a', label: 'A', description: '', active: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      { id: 'b', label: 'B', description: '', active: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
    ];
    expect(chooseOffer(offers, 0)?.id).toBe('a');
    expect(chooseOffer(offers, 0.99)?.id).toBe('b');
    expect(chooseOffer([offers[0]], 0)).toBeUndefined();
  });

  it('provides six sample offers for the local preview without limiting future additions', () => {
    expect(getOffers()).toHaveLength(6);
    expect(getOffers().every((offer) => offer.active)).toBe(true);
  });

  it('keeps 30-day offer validity distinct from 45-day retention', () => {
    const created = new Date('2026-01-01T00:00:00.000Z');
    const entry = { id: '2', offerId: 'a', customerName: 'A', address: 'Demo address', phone: '9876543210', reason: 'Demo reason', createdAt: created.toISOString(), offerValidUntil: new Date(created.getTime() + 30 * 86400000).toISOString(), recordExpiresAt: new Date(created.getTime() + 45 * 86400000).toISOString() };
    saveEntry(entry);
    const saved = getEntries()[0];
    expect(new Date(saved.offerValidUntil).getTime() - created.getTime()).toBe(30 * 86400000);
    expect(new Date(saved.recordExpiresAt).getTime() - created.getTime()).toBe(45 * 86400000);
  });
});
