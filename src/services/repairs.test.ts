import { describe, it, expect } from 'vitest';
import {
  sanitizeFilterTerm,
  extFromMime,
  normalizePhone,
  STATUS_LABELS,
  REPAIR_STATUSES,
} from './repairs';

describe('sanitizeFilterTerm', () => {
  it('trims and collapses whitespace', () => {
    expect(sanitizeFilterTerm('  hello   world  ')).toBe('hello world');
  });
  it('strips PostgREST filter-grammar + wildcard characters', () => {
    // comma, parentheses, percent, asterisk, backslash must not survive
    expect(sanitizeFilterTerm('a,b)c(d%e*f\\g')).toBe('a b c d e f g');
  });
  it('returns empty string for whitespace-only input', () => {
    expect(sanitizeFilterTerm('   ')).toBe('');
  });
  it('leaves a normal job number intact', () => {
    expect(sanitizeFilterTerm('JOB-1101')).toBe('JOB-1101');
  });
});

describe('extFromMime', () => {
  it('maps known image mime types', () => {
    expect(extFromMime('image/png')).toBe('png');
    expect(extFromMime('image/webp')).toBe('webp');
    expect(extFromMime('image/jpeg')).toBe('jpg');
  });
  it('defaults unknown/empty mime to jpg', () => {
    expect(extFromMime('')).toBe('jpg');
    expect(extFromMime('application/octet-stream')).toBe('jpg');
  });
});

describe('normalizePhone', () => {
  it('keeps digits and a single leading plus, drops other characters', () => {
    expect(normalizePhone('+91 97255 69604')).toBe('+919725569604');
    expect(normalizePhone('(97255) 69-604')).toBe('9725569604');
  });
  it('does not keep a plus that is not leading', () => {
    expect(normalizePhone('97255+69604')).toBe('9725569604');
  });
  it('trims surrounding whitespace', () => {
    expect(normalizePhone('  9725569604 ')).toBe('9725569604');
  });
});

describe('repair status constants', () => {
  it('has a human label for every enum value and no extras', () => {
    const expected = [
      'received', 'diagnosing', 'waiting_for_approval',
      'in_repair', 'ready', 'completed', 'cancelled',
    ];
    expect(REPAIR_STATUSES).toEqual(expected);
    expect(Object.keys(STATUS_LABELS).sort()).toEqual([...expected].sort());
  });
  it('labels are non-empty, readable strings', () => {
    for (const s of REPAIR_STATUSES) {
      expect(STATUS_LABELS[s].length).toBeGreaterThan(0);
    }
  });
});
