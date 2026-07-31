import { describe, it, expect } from 'vitest';
import { hasMojibake, MOJIBAKE_SEQUENCES } from '../lib/outreachEncoding';

// ─── hasMojibake ──────────────────────────────────────────────────────────────

describe('hasMojibake — clean Swedish text', () => {
  it('returns false for correct UTF-8 Swedish', () => {
    expect(hasMojibake('Följer upp mitt mejl angående CE-förare.')).toBe(false);
  });

  it('returns false for plain ASCII text', () => {
    expect(hasMojibake('Hello world')).toBe(false);
  });

  it('returns false for null', () => {
    expect(hasMojibake(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(hasMojibake(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(hasMojibake('')).toBe(false);
  });

  it('returns false for Swedish company name without encoding issues', () => {
    expect(hasMojibake('Sjölander Maskintransport AB')).toBe(false);
  });

  it('returns false for signature block', () => {
    expect(hasMojibake('Ghislain Alexander Mad\nDriverNord\nhej@drivernord.com')).toBe(false);
  });
});

describe('hasMojibake — corrupted Swedish text (mojibake)', () => {
  it('detects Ã¶ (corrupted ö)', () => {
    expect(hasMojibake('FÃ¶ljer upp')).toBe(true);
  });

  it('detects Ã¤ (corrupted ä)', () => {
    expect(hasMojibake('fÃ¤rre')).toBe(true);
  });

  it('detects Ã¥ (corrupted å)', () => {
    expect(hasMojibake('Ã¥ret')).toBe(true);
  });

  it('detects Ã… (corrupted Å)', () => {
    expect(hasMojibake('Ã…keri')).toBe(true);
  });

  it('detects Ã© (corrupted é)', () => {
    expect(hasMojibake('cafÃ©')).toBe(true);
  });

  it('detects lone Ã prefix in subject line', () => {
    expect(hasMojibake('CE-chauffiÃ¶rer fÃ¶r maskintransport')).toBe(true);
  });

  it('detects Â sequence', () => {
    expect(hasMojibake('nÃ¥got Â text')).toBe(true);
  });

  it('detects mojibake in company name snapshot', () => {
    // "Sjölander" corrupted
    expect(hasMojibake('SjÃ¶lander Maskintransport AB')).toBe(true);
  });

  it('detects mojibake in full email body excerpt', () => {
    const body = 'FÃ¶ljer upp mitt mejl frÃ¥n fÃ¶rra veckan angÃ¥ende CE-chauffiÃ¶rer.';
    expect(hasMojibake(body)).toBe(true);
  });
});

describe('hasMojibake — boundary cases', () => {
  it('is case-sensitive — Ã is detected but ã alone is not a sequence match', () => {
    // Clean ã in isolation (Portuguese, not a mojibake marker in this context)
    // The function only matches the full MOJIBAKE_SEQUENCES entries
    // 'Ã' alone IS in the list, so this returns true
    expect(hasMojibake('Ã')).toBe(true);
  });

  it('returns false for a string containing only numbers', () => {
    expect(hasMojibake('0709385267')).toBe(false);
  });

  it('MOJIBAKE_SEQUENCES exports a non-empty array', () => {
    expect(MOJIBAKE_SEQUENCES.length).toBeGreaterThan(0);
  });

  it('all MOJIBAKE_SEQUENCES are detected by hasMojibake', () => {
    for (const seq of MOJIBAKE_SEQUENCES) {
      expect(hasMojibake(`prefix ${seq} suffix`)).toBe(true);
    }
  });
});
