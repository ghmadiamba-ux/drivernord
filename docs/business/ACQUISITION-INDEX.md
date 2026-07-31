# Driver Acquisition — Documentation Index

**Purpose:** Navigation guide for acquisition content. Tells you which to read, which to use operationally, and what each covers.

---

## Quick answer: which document do I use?

| Task | Use |
|------|-----|
| **Writing any driver-facing copy or campaign** | **`docs/business/driver-acquisition-positioning-v1.md` ← START HERE** |
| Understanding driver personas (research basis) | `docs/business/persona-research-v1/` (12 documents) |
| Final launch readiness status | `docs/business/acquisition-pipeline-final-status.md` |
| Migration 013 execution | `docs/business/final-migration-013-execution.md` |
| UTM validation | `docs/business/utm-validation-checklist.md` |
| 46elks SMS setup | `docs/business/46elks-readiness-audit.md` |
| Setting up Meta ads (prerequisites) | `meta-acquisition-integration/meta-ads-preparation-workflow.md` (if exists) |
| Meta Pixel / CAPI implementation | `meta-acquisition-integration/pixel-event-architecture.md` + `conversions-api-architecture.md` |
| Setting up Facebook Page + Business Manager | `meta-acquisition-integration/facebook-page-and-business-manager-checklist.md` |
| Setting up Events Manager + domain verification | `meta-acquisition-integration/domain-and-events-manager-checklist.md` |
| Understanding the full Meta integration plan | `meta-acquisition-integration/meta-integration-executive-plan.md` |
| Reading post-implementation E2E test results | `driver-acquisition-technical-readiness/global-10-driver-e2e-simulation-result.md` |

---

## Location 0: `docs/business/` — **Current canonical documents**

The authoritative documents for V1 launch. All written 2026-05-18. Supersede earlier drafts where they conflict.

| File | What it contains |
|------|-----------------|
| `driver-acquisition-positioning-v1.md` | **CANONICAL POSITIONING** — personas, tone, words to use/avoid, anti-bemanning, CTAs, trust rules, copy examples, site copy recommendations, campaign implications |
| `acquisition-pipeline-final-status.md` | Full technical launch readiness — what is READY / READY WITH LIMITATIONS / NOT READY |
| `final-migration-013-execution.md` | Exact SQL for Migration 013 — consent and UTM columns |
| `utm-validation-checklist.md` | Test URLs, expected DB values, debugging steps |
| `46elks-readiness-audit.md` | 46elks setup procedure, environment variables, test procedure |

**Persona research (12 documents in `docs/business/persona-research-v1/`):**

| File | What it contains |
|------|-----------------|
| `executive-summary.md` | Market overview, 2+2 persona structure, key findings |
| `top-priority-persona-1.md` | "Aktive Johan" — CE freelancer, 33–52, Stockholm |
| `top-priority-persona-2.md` | "Missnöjde Marcus" — Employed CE/C, 27–50, Stockholm |
| `optional-persona-3.md` | YKB-Perioden — seasonal overlay |
| `optional-persona-4.md` | Unga CE-kortet — deprioritize in V1 |
| `persona-comparison-matrix.md` | Full comparison + funnel conversion numbers + sequencing |
| `acquisition-strategy-by-persona.md` | Channel mix, CPL estimates, budget |
| `neuromarketing-triggers-map.md` | 9 psychological frameworks with star matrix by persona |
| `language-jargon-and-copywriting-map.md` | Authentic Swedish transport vocabulary, words that kill conversion |
| `meta-hook-ideas-by-persona.md` | 18 specific hooks with full Swedish copy |
| `trust-and-skepticism-analysis.md` | Why drivers distrust services + how to build trust from zero |
| `recommended-v1-target-persona.md` | Final recommendation: Marcus first, Johan second, Sunday evening angle |

**Supersession note:** The personas in `driver-acquisition-plan.md` (Erik, Karim, Mikael, Fatima) are superseded by Johan and Marcus from persona-research-v1/. Budget scenarios, technical architecture, and channel strategy in that document remain valid.

---

## Location A: `driver-acquisition-execution-kit/` — Early operational drafts

Written at project start. Contains SMS sequences, early Meta ad copy bank, Facebook Groups posts, and Platsbanken draft.

**Status:** Superseded by the Creative Agent spec for operational use. Some content (SMS sequences) has no equivalent in the new system and remains relevant. Group post drafts are superseded by the angle library.

**Read if:** You want to see the original SMS message templates or the early ad copy thinking.

---

## Location B: `driver-acquisition-technical-readiness/` — Post-implementation validation

Written after the consent/UTM implementation (2026-05-14). Contains:
- `global-10-driver-e2e-simulation-plan.md` — test design for 10 driver profiles
- `global-10-driver-e2e-simulation-result.md` — results (660/660 pass)
- `local-fake-driver-test-plan.md` — local test procedure
- `implementation-progress.md` — what was built

**Status:** Current and accurate. This is the record that 660 tests pass and all pipeline stages are verified.

**Read if:** You need evidence that the technical pipeline works end-to-end.

---

## Location C: `meta-acquisition-integration/` — Meta platform integration docs

Written 2026-05-14. Contains the full Meta integration plan:
- Facebook Page and Business Manager setup checklist
- Domain and Events Manager checklist
- Pixel event architecture
- CAPI architecture
- Implementation options (A/B/C — Option C is recommended)
- Organic content test plan *(older — see Creative Agent spec for current angles)*
- AI-driven creative production workflow *(foundational — see Creative Agent spec for operational detail)*
- Environment variables and security plan
- Readiness summary

**Status:** Current for platform setup documentation. The `organic-content-test-plan.md` is partially superseded by the Creative Agent angle library (the angle library has 8 angles with more developed copy; the old plan has 6 angles with shorter drafts — no unique content lost).

**Read if:** You are setting up the Facebook Page, Business Manager, Events Manager, or implementing Pixel/CAPI.

---

## Location D: `agents/creative-acquisition-agent/` — **CANONICAL for content production**

Written 2026-05-16. The complete Creative Agent specification. This is the primary operational document for all driver acquisition content.

| File | What it contains |
|------|-----------------|
| `creative-acquisition-agent-spec.md` | Agent mission, inputs, outputs, memory, tools |
| `driver-personas-and-pain-points.md` | 3 personas with pain point severity matrix |
| `content-angle-library.md` | **8 angles with full Swedish copy ready to post** |
| `organic-content-production-workflow.md` | Week-by-week production cycle |
| `meta-ads-preparation-workflow.md` | Prerequisites and structure for paid campaigns |
| `creative-performance-feedback-loop.md` | Scoring algorithm and learning cycle |
| `approval-gates-and-risk-rules.md` | What the agent must never do; compliance rules |
| `mvp-implementation-plan.md` | TypeScript spec for building the agent |
| `execution-summary.md` | 14-day content calendar; founder blocklist |

**Read for all content production tasks.**

---

## Location E: `agents/agentic-operating-system/` — Agent architecture

Contains the broader agentic system design that includes the Creative Agent as one of 8 planned agents. The Creative Agent's approval gates, state management, and publishing workflow are defined here.

**Read if:** You are working on the agent architecture, the approval queue, or the orchestration layer.

---

## Reading order for a new session focused on acquisition

1. `agents/creative-acquisition-agent/execution-summary.md` — what to do this week
2. `agents/creative-acquisition-agent/content-angle-library.md` — the content angles
3. `meta-acquisition-integration/facebook-page-and-business-manager-checklist.md` — if Page not yet created
4. `agents/creative-acquisition-agent/approval-gates-and-risk-rules.md` — compliance before publishing

---

## Reading order for a new session focused on campaign creation

1. `docs/business/driver-acquisition-positioning-v1.md` — positioning and copy rules
2. `docs/business/persona-research-v1/recommended-v1-target-persona.md` — which angle to run first
3. `docs/business/persona-research-v1/meta-hook-ideas-by-persona.md` — production-ready hooks
4. `docs/business/acquisition-pipeline-final-status.md` — what is technically ready
5. `docs/business/final-migration-013-execution.md` — complete Migration 013 before launch

---

*Last updated: 2026-05-18 — persona research integration + canonical positioning added*
