import { describe, it, expect, beforeEach } from 'vitest';
import { createLead, getLead, updateLead, clearStore } from '../lib/store';

beforeEach(() => clearStore());

describe('createLead', () => {
  it('returns a lead with the given lang', () => {
    const lead = createLead('sv');
    expect(lead.lang).toBe('sv');
  });

  it('assigns a non-empty id', () => {
    const lead = createLead('en');
    expect(typeof lead.id).toBe('string');
    expect(lead.id.length).toBeGreaterThan(0);
  });

  it('generates unique ids for each lead', () => {
    const a = createLead('sv');
    const b = createLead('sv');
    expect(a.id).not.toBe(b.id);
  });

  it('sets created_at to a recent timestamp', () => {
    const before = Date.now();
    const lead = createLead('sv');
    const after = Date.now();
    expect(lead.created_at.getTime()).toBeGreaterThanOrEqual(before);
    expect(lead.created_at.getTime()).toBeLessThanOrEqual(after);
  });

  it('initialises lead_status as anonymous_dropoff', () => {
    const lead = createLead('sv');
    expect(lead.lead_status).toBe('anonymous_dropoff');
  });

  it('initialises all optional fields as null', () => {
    const lead = createLead('en');
    expect(lead.region).toBeNull();
    expect(lead.license).toBeNull();
    expect(lead.phone).toBeNull();
    expect(lead.email).toBeNull();
    expect(lead.completed_at).toBeNull();
    expect(lead.lead_priority).toBeNull();
    expect(lead.follow_up_at).toBeNull();
  });

  it('sets last_step_reached to 0', () => {
    const lead = createLead('sv');
    expect(lead.last_step_reached).toBe(0);
  });

  it('sets follow_up_sent to false', () => {
    const lead = createLead('sv');
    expect(lead.follow_up_sent).toBe(false);
  });
});

describe('getLead', () => {
  it('returns the lead after creation', () => {
    const created = createLead('sv');
    const found = getLead(created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
  });

  it('returns null for an unknown id', () => {
    expect(getLead('does-not-exist')).toBeNull();
  });

  it('multiple leads coexist independently', () => {
    const a = createLead('sv');
    const b = createLead('en');
    expect(getLead(a.id)?.lang).toBe('sv');
    expect(getLead(b.id)?.lang).toBe('en');
  });
});

describe('updateLead', () => {
  it('persists field changes', () => {
    const lead = createLead('sv');
    updateLead({ ...lead, phone: '+46701234567' });
    expect(getLead(lead.id)?.phone).toBe('+46701234567');
  });

  it('does not affect other leads', () => {
    const a = createLead('sv');
    const b = createLead('en');
    updateLead({ ...a, phone: '+46701234567' });
    expect(getLead(b.id)?.phone).toBeNull();
  });
});

describe('clearStore', () => {
  it('removes all leads', () => {
    const lead = createLead('sv');
    clearStore();
    expect(getLead(lead.id)).toBeNull();
  });
});
