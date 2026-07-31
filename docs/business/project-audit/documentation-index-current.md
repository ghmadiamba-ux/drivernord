# DriverNord — Documentation Index
**Date:** 2026-05-26  
**Status:** Post Batch 1 — Phase close

---

## Canonical Docs (use these — authoritative)

### Architecture
| File | Status |
|------|--------|
| docs/current/architecture-context.md | CANONICAL |
| docs/current/database-schema.md | CANONICAL |
| docs/current/agent-system.md | CANONICAL |
| docs/current/security-state.md | CANONICAL |
| docs/current/website-state.md | CANONICAL |
| docs/autonomous-system-audit-v1.md | CANONICAL (pre-phase audit) |
| docs/operator-cockpit-design-v1.md | CANONICAL |

### Agents
| File | Status |
|------|--------|
| docs/business/outreach-agent/contact-agent-v1-smtp-spec.md | CANONICAL |
| docs/business/outreach-agent/batch-2-contact-agent-workflow.md | CANONICAL |
| docs/business/outreach-agent/zoho-outreach-agent-v1-spec.md | CANONICAL (OAuth path) |
| docs/business/outreach-agent/zoho-outreach-agent-completion-status.md | CANONICAL (updated) |

### Outreach — Batch 1
| File | Status |
|------|--------|
| docs/business/outreach-agent/manual-zoho-send-tracker-batch-1.md | CANONICAL |
| docs/business/outreach-agent/manual-smtp-execution-report-batch-1.md | CANONICAL |
| docs/business/outreach-agent/batch-1-final-status.md | CANONICAL (if exists) |
| docs/business/outreach-agent/batch-1-smtp-send-retrospective.md | CANONICAL |
| docs/business/outreach-agent/contact-agent-runs/2026-05-26-batch-1-smtp-run.md | CANONICAL |

### Outreach — Templates/Queue
| File | Status |
|------|--------|
| docs/business/outreach-agent/manual-smtp-batch-1-emails.json | HISTORICAL (Batch 1 sent) |
| docs/business/outreach-agent/contact-agent-queue-template.json | CANONICAL |
| docs/business/outreach-agent/contact-agent-queue-v2.json | DOES NOT EXIST YET |
| docs/business/outreach-agent/manual-smtp-execution-guide.md | CANONICAL |

### Outreach — Safety / Patterns
| File | Status |
|------|--------|
| docs/business/outreach-agent/outreach-agent-safety-rules.md | CANONICAL |
| docs/business/outreach-agent/founder-approved-email-patterns.md | CANONICAL |
| docs/business/outreach-agent/dry-run-queue-batch-1-review.md | HISTORICAL |
| docs/business/outreach-agent/batch-1-canonical-emails.md | HISTORICAL |

### Phase Audit (this session)
| File | Status |
|------|--------|
| docs/business/project-audit/driverNord-end-to-end-system-audit-2026-05-26.md | CANONICAL |
| docs/business/project-audit/driverNord-phase-close-executive-summary.md | CANONICAL |
| docs/business/project-audit/next-phase-roadmap-after-batch-1.md | CANONICAL |
| docs/business/project-audit/driverNord-risk-register-current.md | CANONICAL |
| docs/business/project-audit/driverNord-current-state.json | CANONICAL |
| docs/business/project-audit/driverNord-phase-close-context-for-next-chat.md | CANONICAL |
| docs/business/project-audit/next-chat-driverNord-continuation-prompt.md | CANONICAL |
| docs/business/project-audit/documentation-index-current.md | CANONICAL (this file) |

### Market Research
| File | Status |
|------|--------|
| docs/business/market-entry-research/ (multiple) | CANONICAL |
| docs/business/global-driver-matching-business-model-research/ | CANONICAL |
| docs/business/persona-research-v1/ | CANONICAL |

### Monetization
| File | Status |
|------|--------|
| docs/business/monetization-strategy/ (16+ files) | CANONICAL |

### Legal
| File | Status |
|------|--------|
| docs/business/legal/ | CANONICAL (incomplete — needs GDPR register) |
| docs/business/legal-public-validation/ | CANONICAL |
| docs/business/privacy-and-tracking-consent/ | CANONICAL |

### Deployment
| File | Status |
|------|--------|
| docs/current/website-state.md | CANONICAL |
| docs/current/security-state.md | CANONICAL |

---

## Needs Review

| File | Reason |
|------|--------|
| docs/business/outreach-agent/zoho-api-or-smtp-integration-plan.md | OAuth path paused; may contradict current SMTP-only approach |
| docs/business/email-setup/ | May reference outdated Zoho setup steps |
| docs/audits/ | Pre-phase audits; partially superseded |
| docs/business/project-audit/end-to-end-structure-audit/ | May be superseded by this session's audit |

---

## Obsolete / Archive

| File | Reason |
|------|--------|
| docs/archive/bemanning-driver-model/ | DriverNord is NOT bemanning — archived correctly |
| docs/archive/driver-acquisition-pre-meta-technical-readiness/ | Pre-Meta phase — historical only |
| Any doc referencing ZOHO_ACCOUNT_ID as required for SMTP | OAuth not used for SMTP — conceptual error |

---

## Missing (Should Be Created)

| Document | Priority |
|----------|----------|
| docs/business/outreach-agent/contact-agent-queue-v2.json | HIGH — Batch 2 prep |
| docs/business/project-audit/batch-1-final-status.md | MEDIUM |
| GDPR processing register | HIGH |
| Deployment runbook (Vercel step-by-step) | MEDIUM |
| Cockpit user guide | MEDIUM |
| Reply handling playbook | HIGH |
| Commercial conversion template (Package 4) | HIGH |
| ADR/tanker driver recruitment brief | HIGH |
| Kylfrys driver recruitment brief | HIGH |
