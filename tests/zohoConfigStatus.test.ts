import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getZohoConfigStatus } from '../lib/zohoMailClient';

const REQUIRED = [
  'ZOHO_CLIENT_ID',
  'ZOHO_CLIENT_SECRET',
  'ZOHO_REFRESH_TOKEN',
  'ZOHO_ACCOUNT_ID',
  'ZOHO_FROM_EMAIL',
  'ZOHO_FROM_NAME',
] as const;

function setAllEnv() {
  for (const k of REQUIRED) process.env[k] = `test-${k}`;
}

function clearAllEnv() {
  for (const k of REQUIRED) delete process.env[k];
}

beforeEach(() => clearAllEnv());
afterEach(() => clearAllEnv());

describe('getZohoConfigStatus', () => {
  it('returns configured=false and lists all 6 missing vars when none are set', () => {
    const s = getZohoConfigStatus();
    expect(s.configured).toBe(false);
    expect(s.missing_env).toHaveLength(6);
    for (const k of REQUIRED) {
      expect(s.missing_env).toContain(k);
    }
  });

  it('returns configured=true when all 6 vars are set', () => {
    setAllEnv();
    const s = getZohoConfigStatus();
    expect(s.configured).toBe(true);
    expect(s.missing_env).toHaveLength(0);
  });

  it('returns configured=false when only ZOHO_CLIENT_ID is missing', () => {
    setAllEnv();
    delete process.env.ZOHO_CLIENT_ID;
    const s = getZohoConfigStatus();
    expect(s.configured).toBe(false);
    expect(s.missing_env).toContain('ZOHO_CLIENT_ID');
    expect(s.missing_env).toHaveLength(1);
  });

  it('returns configured=false when only ZOHO_REFRESH_TOKEN is missing', () => {
    setAllEnv();
    delete process.env.ZOHO_REFRESH_TOKEN;
    const s = getZohoConfigStatus();
    expect(s.configured).toBe(false);
    expect(s.missing_env).toContain('ZOHO_REFRESH_TOKEN');
  });

  it('returns configured=false when only ZOHO_FROM_EMAIL is missing', () => {
    setAllEnv();
    delete process.env.ZOHO_FROM_EMAIL;
    const s = getZohoConfigStatus();
    expect(s.configured).toBe(false);
    expect(s.missing_env).toContain('ZOHO_FROM_EMAIL');
  });

  it('returns configured=false when only ZOHO_FROM_NAME is missing', () => {
    setAllEnv();
    delete process.env.ZOHO_FROM_NAME;
    const s = getZohoConfigStatus();
    expect(s.configured).toBe(false);
    expect(s.missing_env).toContain('ZOHO_FROM_NAME');
  });

  it('never includes env var values in the response — only names', () => {
    setAllEnv();
    delete process.env.ZOHO_CLIENT_SECRET;
    const s = getZohoConfigStatus();
    // missing_env contains names (strings), never secret values
    expect(s.missing_env).toContain('ZOHO_CLIENT_SECRET');
    // the only thing in missing_env is the key name, not any value
    for (const entry of s.missing_env) {
      expect(entry).toMatch(/^ZOHO_/);
    }
  });

  it('missing_env array is a fresh copy each call', () => {
    const s1 = getZohoConfigStatus();
    const s2 = getZohoConfigStatus();
    expect(s1.missing_env).not.toBe(s2.missing_env);
  });

  it('partial config: 3 of 6 missing', () => {
    process.env.ZOHO_CLIENT_ID     = 'id';
    process.env.ZOHO_CLIENT_SECRET = 'secret';
    process.env.ZOHO_REFRESH_TOKEN = 'token';
    // ZOHO_ACCOUNT_ID, ZOHO_FROM_EMAIL, ZOHO_FROM_NAME not set
    const s = getZohoConfigStatus();
    expect(s.configured).toBe(false);
    expect(s.missing_env).toHaveLength(3);
    expect(s.missing_env).toContain('ZOHO_ACCOUNT_ID');
    expect(s.missing_env).toContain('ZOHO_FROM_EMAIL');
    expect(s.missing_env).toContain('ZOHO_FROM_NAME');
  });
});
