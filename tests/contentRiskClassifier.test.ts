// tests/contentRiskClassifier.test.ts

import { describe, it, expect } from 'vitest';
import {
  scanTextForRisk,
  classifyCardRisk,
  LOW_RISK_CONTENT_EXAMPLES,
  HIGH_RISK_CONTENT_EXAMPLES,
} from '../lib/content/riskClassifier';
import type { CampaignCardInput } from '../lib/content/types';

const SAFE_CARD: Pick<CampaignCardInput, 'content_pillar' | 'creative_angle' | 'driver_insight' | 'cta_type'> = {
  content_pillar:  'recognition',
  creative_angle:  'driver_recognition',
  driver_insight:  'Yrkesförare med CE håller Sverige igång varje dag',
  cta_type:        'none',
};

describe('scanTextForRisk', () => {
  it('returns empty array for safe text', () => {
    const result = scanTextForRisk('CE-förare kör varje dag och bidrar till samhällets logistik.');
    expect(result).toHaveLength(0);
  });

  it('detects job offer language — vi söker', () => {
    const result = scanTextForRisk('Vi söker erfarna CE-förare till spännande uppdrag.');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]!.reason).toContain('job offer');
  });

  it('detects salary claim — kr/h', () => {
    const result = scanTextForRisk('Timlön: 200 kr/h för nattskift.');
    expect(result.length).toBeGreaterThan(0);
  });

  it('detects named company — schenker', () => {
    const result = scanTextForRisk('Vi jobbar med Schenker och DHL varje dag.');
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((f) => f.reason.includes('schenker'))).toBe(true);
  });

  it('detects ungrounded percentage statistic', () => {
    const result = scanTextForRisk('85% av förare saknar YKB i tid.');
    expect(result.length).toBeGreaterThan(0);
  });

  it('detects verified driver claim', () => {
    const result = scanTextForRisk('Vi har 500 verifierade förare redo att börja.');
    expect(result.length).toBeGreaterThan(0);
  });

  it('is case-insensitive for company names', () => {
    const result = scanTextForRisk('ICA Logistik har öppnat nya rutter.');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns empty for logistikklubb mention without risk patterns', () => {
    const result = scanTextForRisk('Välkommen till Logistikklubben! Ställ frågor nedan.');
    expect(result).toHaveLength(0);
  });
});

describe('classifyCardRisk', () => {
  it('returns low risk for a safe card', () => {
    const result = classifyCardRisk(SAFE_CARD);
    expect(result.risk_level).toBe('low');
    expect(result.findings).toHaveLength(0);
  });

  it('returns high risk when driver_insight contains job offer language', () => {
    const result = classifyCardRisk({
      ...SAFE_CARD,
      driver_insight: 'Vi söker nya CE-förare till ett stort åkeri',
    });
    expect(result.risk_level).toBe('high');
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('returns high risk when draft text contains company name', () => {
    const result = classifyCardRisk(SAFE_CARD, 'PostNord behöver fler förare i Stockholm.');
    expect(result.risk_level).toBe('high');
  });

  it('returns low risk for Logistikklubb CTA text', () => {
    const result = classifyCardRisk(
      { ...SAFE_CARD, cta_type: 'community_join' },
      'Välkommen till Logistikklubben! 👉 drivernord.com/logistikklubb'
    );
    expect(result.risk_level).toBe('low');
  });
});

describe('example arrays', () => {
  it('LOW_RISK_CONTENT_EXAMPLES is a non-empty tuple', () => {
    expect(LOW_RISK_CONTENT_EXAMPLES.length).toBeGreaterThan(0);
  });
  it('HIGH_RISK_CONTENT_EXAMPLES is a non-empty tuple', () => {
    expect(HIGH_RISK_CONTENT_EXAMPLES.length).toBeGreaterThan(0);
  });
});
