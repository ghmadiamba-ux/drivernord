import { describe, it, expect } from 'vitest';
import {
  triageEmail,
  detectLanguage,
  classifyCategory,
  detectComplianceFlags,
  extractDriverFields,
  extractCompanyFields,
  generateDraftReply,
  type EmailTriageInput,
} from '../lib/emailTriageAgent';

// ─── Test fixtures ────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<EmailTriageInput> = {}): EmailTriageInput {
  return {
    from:       'test@example.com',
    to:         'hej@drivernord.com',
    subject:    '',
    body:       '',
    receivedAt: '2026-05-17T10:00:00Z',
    source:     'mock',
    ...overrides,
  };
}

const DRIVER_SV = makeInput({
  from:    'erik.svensson@gmail.com',
  subject: 'Söker körning — CE-chaufför',
  body:    'Hej! Jag är CE-chaufför med giltig YKB. Bor i Stockholm och är tillgänglig omgående. Söker distributionskörning.',
});

const DRIVER_EN = makeInput({
  from:    'john.smith@hotmail.com',
  subject: 'Driver registration inquiry',
  body:    'Hello, I am a truck driver with CE license and valid CPC card. I am based in Stockholm and available immediately. Looking for local distribution work.',
});

const COMPANY_SV = makeInput({
  from:    'sara.lindqvist@transportab.se',
  subject: 'Vi söker CE-chaufförer omgående',
  body:    'Hej, vi är ett transportföretag i Stockholm och behöver 3 CE-chaufförer med YKB för distributionskörning, dagtid, helst från måndag nästa vecka.',
});

const COMPANY_BEMANNING = makeInput({
  from:    'tobias.berg@logistik.se',
  subject: 'Hyr chaufförer via er?',
  body:    'Hej, vi vill hyra chaufförer via er som bemanningsbolag. Vi behöver personal på löpande basis.',
});

const SPAM_EN = makeInput({
  from:    'noreply@marketing-promo.com',
  subject: 'YOU HAVE WON — Claim your prize now',
  body:    'Congratulations! You have been selected to receive a prize. Click here to claim. Unsubscribe.',
});

const GDPR_SV = makeInput({
  from:    'anna.karlsson@outlook.com',
  subject: 'Radera mina uppgifter',
  body:    'Hej, jag vill att ni raderar alla mina personuppgifter från era system. GDPR ger mig rätt att bli bortglömd.',
});

const COMPLAINT_SV = makeInput({
  from:    'mikael.holm@yahoo.se',
  subject: 'Skandalöst!',
  body:    'Jag har aldrig registrerat mig men fick ett SMS från er. Jag anmäler er till IMY om ni inte svarar. Radera mina uppgifter.',
});

const PARTNERSHIP_SV = makeInput({
  from:    'partner@affiliatemarketing.se',
  subject: 'Samarbetsmöjlighet',
  body:    'Hej DriverNord! Vi erbjuder ett affiliate-program. Kontakta oss för samarbete.',
});

const META_LEAD = makeInput({
  from:    'notification@facebookmail.com',
  subject: 'Du har fått ett nytt meddelande via Facebook',
  body:    'Hej! Jag såg er annons på Facebook. Jag är CE-chaufför och söker körning.',
});

// ─── Invariants — apply to every scenario ────────────────────────────────────

describe('invariants — shouldAutoSend and requiresHumanApproval', () => {
  const allInputs = [DRIVER_SV, DRIVER_EN, COMPANY_SV, COMPANY_BEMANNING, SPAM_EN, GDPR_SV, COMPLAINT_SV, PARTNERSHIP_SV, META_LEAD];

  for (const input of allInputs) {
    it(`shouldAutoSend is always false — ${input.subject}`, () => {
      expect(triageEmail(input).shouldAutoSend).toBe(false);
    });

    it(`requiresHumanApproval is always true — ${input.subject}`, () => {
      expect(triageEmail(input).requiresHumanApproval).toBe(true);
    });
  }
});

describe('invariants — no forbidden claims in drafts', () => {
  const allInputs = [DRIVER_SV, DRIVER_EN, COMPANY_SV, COMPANY_BEMANNING, GDPR_SV, PARTNERSHIP_SV, META_LEAD];
  const forbidden = ['garanterat jobb', 'garanterar arbete', 'guaranteed job', 'officiellt verifierad', 'officially verified'];

  for (const input of allInputs) {
    for (const phrase of forbidden) {
      it(`draft does not contain "${phrase}" — ${input.subject}`, () => {
        const result = triageEmail(input);
        expect(result.draftReply.toLowerCase()).not.toContain(phrase.toLowerCase());
      });
    }
  }
});

describe('invariants — category and confidence are valid values', () => {
  const allInputs = [DRIVER_SV, DRIVER_EN, COMPANY_SV, COMPANY_BEMANNING, SPAM_EN, GDPR_SV, COMPLAINT_SV, PARTNERSHIP_SV, META_LEAD];
  const validCategories = ['DRIVER_INQUIRY', 'COMPANY_INQUIRY', 'META_LEAD_RESPONSE', 'SUPPORT_REQUEST', 'LEGAL_ADMIN', 'PARTNERSHIP', 'SPAM_OR_IRRELEVANT', 'UNKNOWN'];
  const validConfidence = ['high', 'medium', 'low'];
  const validLanguages  = ['sv', 'en', 'unknown'];

  for (const input of allInputs) {
    it(`category is valid — ${input.subject}`, () => {
      expect(validCategories).toContain(triageEmail(input).category);
    });
    it(`confidence is valid — ${input.subject}`, () => {
      expect(validConfidence).toContain(triageEmail(input).confidence);
    });
    it(`language is valid — ${input.subject}`, () => {
      expect(validLanguages).toContain(triageEmail(input).language);
    });
  }
});

// ─── Language detection ───────────────────────────────────────────────────────

describe('detectLanguage', () => {
  it('detects Swedish from Swedish driver email', () => {
    expect(detectLanguage(DRIVER_SV)).toBe('sv');
  });

  it('detects English from English driver email', () => {
    expect(detectLanguage(DRIVER_EN)).toBe('en');
  });

  it('detects Swedish from Swedish company email', () => {
    expect(detectLanguage(COMPANY_SV)).toBe('sv');
  });

  it('returns unknown for empty body and subject', () => {
    expect(detectLanguage(makeInput({ subject: '', body: '' }))).toBe('unknown');
  });
});

// ─── Driver inquiry classification ───────────────────────────────────────────

describe('classifyCategory — DRIVER_INQUIRY', () => {
  it('classifies Swedish driver email as DRIVER_INQUIRY', () => {
    const { category } = classifyCategory(DRIVER_SV);
    expect(category).toBe('DRIVER_INQUIRY');
  });

  it('classifies English driver email as DRIVER_INQUIRY', () => {
    const { category } = classifyCategory(DRIVER_EN);
    expect(category).toBe('DRIVER_INQUIRY');
  });

  it('confidence is high or medium for clear driver signals', () => {
    const { confidence } = classifyCategory(DRIVER_SV);
    expect(['high', 'medium']).toContain(confidence);
  });
});

// ─── Company inquiry classification ──────────────────────────────────────────

describe('classifyCategory — COMPANY_INQUIRY', () => {
  it('classifies Swedish company email as COMPANY_INQUIRY', () => {
    const { category } = classifyCategory(COMPANY_SV);
    expect(category).toBe('COMPANY_INQUIRY');
  });

  it('confidence is high or medium for clear company signals', () => {
    const { confidence } = classifyCategory(COMPANY_SV);
    expect(['high', 'medium']).toContain(confidence);
  });
});

// ─── Bemanning compliance ─────────────────────────────────────────────────────

describe('compliance — COMPLIANCE_BEMANNING_LANGUAGE', () => {
  it('detects bemanning language in company inquiry', () => {
    const flags = detectComplianceFlags(COMPANY_BEMANNING);
    expect(flags).toContain('COMPLIANCE_BEMANNING_LANGUAGE');
  });

  it('draft for bemanning inquiry contains model clarification', () => {
    const result = triageEmail(COMPANY_BEMANNING);
    const draft = result.draftReply.toLowerCase();
    expect(draft).toMatch(/matchningstj|introduction service|not a staffing/i);
  });

  it('bemanning inquiry is still classified as COMPANY_INQUIRY', () => {
    const { category } = classifyCategory(COMPANY_BEMANNING);
    expect(category).toBe('COMPANY_INQUIRY');
  });
});

// ─── Spam classification ──────────────────────────────────────────────────────

describe('classifyCategory — SPAM_OR_IRRELEVANT', () => {
  it('classifies obvious spam as SPAM_OR_IRRELEVANT', () => {
    const { category } = classifyCategory(SPAM_EN);
    expect(category).toBe('SPAM_OR_IRRELEVANT');
  });

  it('spam result has empty draft reply', () => {
    const result = triageEmail(SPAM_EN);
    expect(result.draftReply).toBe('');
  });

  it('spam status is IGNORED', () => {
    const result = triageEmail(SPAM_EN);
    expect(result.status).toBe('IGNORED');
  });

  it('spam next action recommends ignoring', () => {
    const result = triageEmail(SPAM_EN);
    expect(result.suggestedNextAction.toLowerCase()).toContain('ignor');
  });
});

// ─── GDPR / Legal classification ─────────────────────────────────────────────

describe('classifyCategory — LEGAL_ADMIN (GDPR request)', () => {
  it('classifies GDPR deletion request as LEGAL_ADMIN', () => {
    const { category } = classifyCategory(GDPR_SV);
    expect(category).toBe('LEGAL_ADMIN');
  });

  it('GDPR flag is present', () => {
    const flags = detectComplianceFlags(GDPR_SV);
    expect(flags).toContain('LEGAL_GDPR_REQUEST');
  });

  it('requiresHumanApproval is true for GDPR request', () => {
    expect(triageEmail(GDPR_SV).requiresHumanApproval).toBe(true);
  });

  it('shouldAutoSend is false for GDPR request', () => {
    expect(triageEmail(GDPR_SV).shouldAutoSend).toBe(false);
  });

  it('GDPR draft is acknowledgement only — does not confirm or deny data held', () => {
    const draft = triageEmail(GDPR_SV).draftReply.toLowerCase();
    expect(draft).toMatch(/bekräftar|confirm receipt/i);
    expect(draft).not.toMatch(/vi har inga uppgifter|we have no data/i);
  });

  it('GDPR next action contains escalate', () => {
    const result = triageEmail(GDPR_SV);
    expect(result.suggestedNextAction.toLowerCase()).toContain('escalat');
  });
});

// ─── Complaint classification ─────────────────────────────────────────────────

describe('compliance — LEGAL_COMPLAINT', () => {
  it('detects complaint in angry email', () => {
    const flags = detectComplianceFlags(COMPLAINT_SV);
    expect(flags).toContain('LEGAL_COMPLAINT');
  });

  it('complaint email classified as LEGAL_ADMIN', () => {
    const { category } = classifyCategory(COMPLAINT_SV);
    expect(category).toBe('LEGAL_ADMIN');
  });

  it('complaint draft is not dismissive or enthusiastic', () => {
    const draft = triageEmail(COMPLAINT_SV).draftReply.toLowerCase();
    // Should be acknowledgement, not a business reply inviting them to register
    expect(draft).not.toContain('drivernord.com/chat');
    expect(draft).not.toContain('vill du registrera');
  });
});

// ─── Partnership classification ───────────────────────────────────────────────

describe('classifyCategory — PARTNERSHIP', () => {
  it('classifies partnership pitch as PARTNERSHIP', () => {
    const { category } = classifyCategory(PARTNERSHIP_SV);
    expect(category).toBe('PARTNERSHIP');
  });

  it('partnership draft is neutral — no commitment', () => {
    const draft = triageEmail(PARTNERSHIP_SV).draftReply.toLowerCase();
    expect(draft).toMatch(/noterar|noted|återkommer om|follow up if/i);
    expect(draft).not.toMatch(/ja, absolut|yes, definitely|intresserad/i);
  });
});

// ─── Meta lead classification ─────────────────────────────────────────────────

describe('classifyCategory — META_LEAD_RESPONSE', () => {
  it('classifies Facebook message with driver content as META_LEAD_RESPONSE or DRIVER_INQUIRY', () => {
    const { category } = classifyCategory(META_LEAD);
    expect(['META_LEAD_RESPONSE', 'DRIVER_INQUIRY']).toContain(category);
  });

  it('meta lead draft invites driver to /chat flow', () => {
    const result = triageEmail(META_LEAD);
    expect(result.draftReply.toLowerCase()).toContain('drivernord.com/chat');
  });
});

// ─── Field extraction ─────────────────────────────────────────────────────────

describe('extractDriverFields', () => {
  it('extracts CE license from driver email', () => {
    const fields = extractDriverFields(DRIVER_SV);
    expect(fields.licenseCategory).toBe('CE');
  });

  it('extracts Stockholm as city from driver email', () => {
    const fields = extractDriverFields(DRIVER_SV);
    expect(fields.city).toBe('Stockholm');
  });

  it('detects YKB presence in Swedish driver email', () => {
    const fields = extractDriverFields(DRIVER_SV);
    expect(fields.ykb).toBe(true);
  });

  it('detects immediate availability from "omgående"', () => {
    const fields = extractDriverFields(DRIVER_SV);
    expect(fields.availability).toBe('omgående');
  });
});

describe('extractCompanyFields', () => {
  it('extracts CE license requirement from company email', () => {
    const fields = extractCompanyFields(COMPANY_SV);
    expect(fields.licenseRequired).toBe('CE');
  });

  it('extracts number of drivers from company email', () => {
    const fields = extractCompanyFields(COMPANY_SV);
    expect(fields.numberOfDrivers).toBe(3);
  });

  it('extracts Stockholm location from company email', () => {
    const fields = extractCompanyFields(COMPANY_SV);
    expect(fields.location).toBe('Stockholm');
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('handles empty body without throwing', () => {
    expect(() => triageEmail(makeInput({ subject: '', body: '' }))).not.toThrow();
  });

  it('classifies empty input as UNKNOWN with low confidence', () => {
    const result = triageEmail(makeInput({ subject: '', body: '' }));
    expect(result.category).toBe('UNKNOWN');
    expect(result.confidence).toBe('low');
  });

  it('handles very long body without throwing', () => {
    const longBody = 'Hej, jag är CE-chaufför. '.repeat(500);
    expect(() => triageEmail(makeInput({ body: longBody }))).not.toThrow();
  });

  it('does not throw on XSS-like subject', () => {
    expect(() => triageEmail(makeInput({ subject: '<script>alert(1)</script>' }))).not.toThrow();
  });

  it('shouldAutoSend is false for empty input', () => {
    expect(triageEmail(makeInput()).shouldAutoSend).toBe(false);
  });

  it('requiresHumanApproval is true for empty input', () => {
    expect(triageEmail(makeInput()).requiresHumanApproval).toBe(true);
  });
});

// ─── Draft generation rules ───────────────────────────────────────────────────

describe('generateDraftReply — DriverNord model compliance', () => {
  it('Swedish driver draft invites to /chat flow', () => {
    const draft = generateDraftReply('DRIVER_INQUIRY', 'sv', [], 'high');
    expect(draft).toContain('drivernord.com/chat');
  });

  it('English driver draft invites to /chat flow', () => {
    const draft = generateDraftReply('DRIVER_INQUIRY', 'en', [], 'high');
    expect(draft).toContain('drivernord.com/chat');
  });

  it('driver draft closes with DriverNord signature', () => {
    const draft = generateDraftReply('DRIVER_INQUIRY', 'sv', [], 'high');
    expect(draft).toContain('DriverNord');
    expect(draft).toContain('hej@drivernord.com');
  });

  it('spam draft is empty string', () => {
    const draft = generateDraftReply('SPAM_OR_IRRELEVANT', 'en', [], 'high');
    expect(draft).toBe('');
  });

  it('company draft with bemanning flag includes model clarification', () => {
    const draft = generateDraftReply('COMPANY_INQUIRY', 'sv', ['COMPLIANCE_BEMANNING_LANGUAGE'], 'medium');
    expect(draft.toLowerCase()).toMatch(/matchningstj|inte ett bemanningsföretag/i);
  });

  it('GDPR draft does not confirm what data is held', () => {
    const draft = generateDraftReply('LEGAL_ADMIN', 'sv', ['LEGAL_GDPR_REQUEST'], 'high');
    expect(draft.toLowerCase()).not.toMatch(/vi har inga uppgifter|we have no data about you/i);
  });
});
