import { describe, it, expect } from 'vitest';
import { looksLikePhoneNumber, detectDataQualityIssues } from '../lib/dataQuality';

// ─── looksLikePhoneNumber ─────────────────────────────────────────────────────

describe('looksLikePhoneNumber', () => {
  it('Swedish mobile 07xxxxxxxx → true', () => {
    expect(looksLikePhoneNumber('0701234567')).toBe(true);
  });

  it('Swedish mobile with spaces → true', () => {
    expect(looksLikePhoneNumber('070 123 45 67')).toBe(true);
  });

  it('Swedish landline 08xxxxxxxx → true', () => {
    expect(looksLikePhoneNumber('08123456789')).toBe(true);
  });

  it('International +4670... → true', () => {
    expect(looksLikePhoneNumber('+46701234567')).toBe(true);
  });

  it('International +46 with spaces → true', () => {
    expect(looksLikePhoneNumber('+46 70 123 45 67')).toBe(true);
  });

  it('International +1 US number → true', () => {
    expect(looksLikePhoneNumber('+12025551234')).toBe(true);
  });

  it('Pure 10-digit string → true', () => {
    expect(looksLikePhoneNumber('0701234567')).toBe(true);
  });

  it('8-digit pure digits → true', () => {
    expect(looksLikePhoneNumber('12345678')).toBe(true);
  });

  it('Ordinary first name "Erik" → false', () => {
    expect(looksLikePhoneNumber('Erik')).toBe(false);
  });

  it('Name with digits but not phone-like "A1B2" → false', () => {
    expect(looksLikePhoneNumber('A1B2')).toBe(false);
  });

  it('Short digit string "123" → false', () => {
    expect(looksLikePhoneNumber('123')).toBe(false);
  });

  it('Empty string → false', () => {
    expect(looksLikePhoneNumber('')).toBe(false);
  });

  it('Email address → false', () => {
    expect(looksLikePhoneNumber('test@example.com')).toBe(false);
  });
});

// ─── detectDataQualityIssues ──────────────────────────────────────────────────

const PHONE = '+46701234567';

describe('detectDataQualityIssues — clean data', () => {
  it('valid name + phone + null email → clean', () => {
    const result = detectDataQualityIssues({ firstName: 'Erik', phone: PHONE, email: null });
    expect(result.clean).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('valid name + phone + valid email → clean', () => {
    const result = detectDataQualityIssues({ firstName: 'Erik', phone: PHONE, email: 'erik@example.com' });
    expect(result.clean).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('Swedish first name with special chars → clean', () => {
    const result = detectDataQualityIssues({ firstName: 'Åsa', phone: PHONE, email: null });
    expect(result.clean).toBe(true);
  });
});

describe('detectDataQualityIssues — name is phone number', () => {
  it('name === phone → name_is_phone_number', () => {
    const result = detectDataQualityIssues({ firstName: PHONE, phone: PHONE, email: null });
    expect(result.clean).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe('name_is_phone_number');
    expect(result.issues[0].field).toBe('first_name');
  });

  it('name looks like phone (different from stored phone) → name_is_phone_number', () => {
    const result = detectDataQualityIssues({ firstName: '0701234567', phone: '+46701234567', email: null });
    expect(result.clean).toBe(false);
    expect(result.issues[0].type).toBe('name_is_phone_number');
  });

  it('name with leading/trailing spaces equal to phone → name_is_phone_number', () => {
    const result = detectDataQualityIssues({ firstName: `  ${PHONE}  `, phone: PHONE, email: null });
    expect(result.clean).toBe(false);
    expect(result.issues[0].type).toBe('name_is_phone_number');
  });
});

describe('detectDataQualityIssues — name missing or unusable', () => {
  it('single character → name_missing_or_unusable', () => {
    const result = detectDataQualityIssues({ firstName: 'A', phone: PHONE, email: null });
    expect(result.clean).toBe(false);
    expect(result.issues[0].type).toBe('name_missing_or_unusable');
  });

  it('empty string → name_missing_or_unusable', () => {
    const result = detectDataQualityIssues({ firstName: '', phone: PHONE, email: null });
    expect(result.clean).toBe(false);
    expect(result.issues[0].type).toBe('name_missing_or_unusable');
  });

  it('whitespace only → name_missing_or_unusable', () => {
    const result = detectDataQualityIssues({ firstName: '   ', phone: PHONE, email: null });
    expect(result.clean).toBe(false);
    expect(result.issues[0].type).toBe('name_missing_or_unusable');
  });

  it('non-letter non-phone string "---" → name_missing_or_unusable', () => {
    const result = detectDataQualityIssues({ firstName: '---', phone: PHONE, email: null });
    expect(result.clean).toBe(false);
    expect(result.issues[0].type).toBe('name_missing_or_unusable');
  });
});

describe('detectDataQualityIssues — email is phone number', () => {
  it('email === phone → email_is_phone_number', () => {
    const result = detectDataQualityIssues({ firstName: 'Erik', phone: PHONE, email: PHONE });
    expect(result.clean).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe('email_is_phone_number');
    expect(result.issues[0].field).toBe('email');
  });

  it('email looks like phone (local format) → email_is_phone_number', () => {
    const result = detectDataQualityIssues({ firstName: 'Erik', phone: PHONE, email: '0701234567' });
    expect(result.clean).toBe(false);
    expect(result.issues[0].type).toBe('email_is_phone_number');
  });

  it('email is null → no email issue', () => {
    const result = detectDataQualityIssues({ firstName: 'Erik', phone: PHONE, email: null });
    expect(result.issues.filter((i) => i.field === 'email')).toHaveLength(0);
  });
});

describe('detectDataQualityIssues — multiple issues', () => {
  it('name is phone AND email is phone → two issues', () => {
    const result = detectDataQualityIssues({ firstName: PHONE, phone: PHONE, email: PHONE });
    expect(result.clean).toBe(false);
    expect(result.issues).toHaveLength(2);
    const types = result.issues.map((i) => i.type);
    expect(types).toContain('name_is_phone_number');
    expect(types).toContain('email_is_phone_number');
  });
});
