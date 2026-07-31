# DriverNord — Current Doctrine

*Effective: 2026-06-16. Supersedes positioning in project-state.md (2026-05-14), roadmap-next-phases.md (2026-05-14), and any document that treats DriverNord as a driver-leads-only or shortlist-only product.*

---

## Doctrine Summary (Read This First)

DriverNord is an **adaptive logistics capacity network**, not a driver lead-selling or shortlist-only business.

Key operating principles for all Claude Code agents and future sessions:

1. **Lead/shortlist is one entry point, not the ceiling.** Three commercial paths exist: Matchning, Rekrytering, Bemanning.
2. **Bemanning (logistics staffing) is a legitimate planned commercial offer.** It is not blocked conceptually — it awaits founder operational setup before first live mission.
3. **Staffing/bemanning companies are NOT normal client prospects.** They are market signal sources, hidden-client intelligence, potential partners, or partial competitors. They belong in `agency_posting_signals`, not the normal client pipeline.
4. **Distribution must run in parallel with product development.** Every technical task must connect to supply, trust, distribution, commercial trigger, monetization, or simplification.
5. **The scope covers all logistics workers**, not only CE/C/D drivers. See [scope-and-transition-plan.md](../logistikbemanning/scope-and-transition-plan.md).
6. **Strategy is adaptive, not frozen.** Older documents reflect earlier decisions. When they conflict with this file, this file governs.
7. **The founder understands Swedish employer obligations** from prior experience (~20 employees). Do not over-index on basic employer/legal warnings in documentation.

---

## What DriverNord Is

DriverNord is a **transport and logistics capacity network** operating in the Swedish market.

It connects logistics workers (chauffeurs, lagerpersonal, truckförare, terminal/logistics staff) with companies that need them, through an AI-driven platform that classifies, scores, matches, and prepares introductions — with human approval before any outreach.

**The platform supports three commercial paths:**

| Path | Product name | Entry trigger |
|------|-------------|--------------|
| A | Matchning / Kortlist | Company needs a qualified driver shortlist fast |
| B | Rekrytering / Introduktion | Company wants to hire directly, needs verified candidates |
| C | Bemanning / Logistikpersonal | Company needs staffed capacity short-term or recurring |

See [commercial-offer-model.md](commercial-offer-model.md) for full product definitions and pricing logic.

---

## What Has Changed from Earlier Documentation

These earlier decisions have been explicitly superseded:

| Old position (pre-2026-06-16) | Current position |
|-------------------------------|-----------------|
| "No bemanning — Phase 9+, 24–36 months away" | Bemanning is a planned commercial path; founder handles operational setup before first mission |
| "Lager/warehouse/forklift — not in target market" | All logistics workers are in scope: lagerpersonal, truckförare, terminalpersonal, orderplock, lastning/lossning |
| "Lead/shortlist only" | Three commercial paths: Matchning, Rekrytering, Bemanning |
| "Shortlist model must be validated with 3 sales before any scope expansion" | Scope and commercial paths can evolve based on market evidence, not internal milestones only |
| "Do not expand scope prematurely" | Controlled, documented expansion is correct when market shows opportunity |
| Driver-only (C/CE/D) | C/CE/D + distribution + fjärr + schakt/bygg + kyl/frys + ADR/tank + lagerpersonal + truckförare + terminalpersonal + orderplock + lastning/lossning |
| "Not a staffing/bemanning company" (as permanent identity) | Not currently operating as a bemanning company; preparing for it as a future commercial path |

---

## What Has NOT Changed

| Principle | Status |
|-----------|--------|
| AI-driven end to end; human validates and approves | Unchanged |
| No outreach without founder approval | Unchanged |
| Staffing/bemanning companies ≠ normal client prospects | Unchanged |
| No production migrations without explicit approval | Unchanged |
| No secrets exposed | Unchanged |
| Legal/GDPR documents still required before profile sharing | Unchanged |
| Stockholm-first geography for initial supply build | Unchanged |
| No CV — structured intake only | Unchanged |
| Suggest mode as default for all agent contact | Unchanged |

---

## Adaptive Doctrine Principle

DriverNord's strategy is built in contact with the real Swedish logistics market. The model evolves as market evidence appears.

**How evolution works:**
- Supply reality reveals what workers are actually available
- Client response reveals what offers resonate
- Market scans reveal competitor activity, gaps, demand patterns
- Founder field experience reveals what the market actually asks for
- Distribution performance reveals what channels and content convert
- Monetization evidence reveals what clients will actually pay

**When an older document conflicts with current market evidence or the founder's direction, the founder's current direction governs.** Historical documents are preserved as context, not as constraints.

**Every market scan should generate one or more of:**
- A business action
- A supply gap signal
- A prospecting target
- A community/content signal
- A staffing/partner intelligence signal

If a scan produces none of the above, the scan needs redesign.

---

## Bemanning Classification Doctrine (Agency Gate)

Staffing/bemanning companies detected in Platsbanken or other market sources are:

1. **Routed to `agency_posting_signals`** — not the client pipeline
2. **Classified for commercial type** via `commercial_classification`: `signal_only | hidden_client | potential_partner | competitor | unknown`
3. **Set to `hold_agency` draft_status** if they appear in `company_need_drafts`
4. **Blocked from promotion** by `validateForPromotion()` and `classifyMarketLifecycle()`
5. **Never staged for outreach** without explicit founder approval of a partner-style approach

This doctrine protects the client pipeline from noise while preserving agency intelligence as a strategic asset.

---

## Document Hierarchy

When Claude Code sessions find conflicting guidance across documents, apply this priority order:

1. This file (`current-driverNord-doctrine.md`) — effective 2026-06-16
2. `CLAUDE.md` (project root) — engineering constraints
3. [commercial-offer-model.md](commercial-offer-model.md) — product definitions
4. [distribution-doctrine.md](../distribution/distribution-doctrine.md) — distribution rules
5. [scope-and-transition-plan.md](../logistikbemanning/scope-and-transition-plan.md) — worker scope
6. Everything else — treat as historical context, not binding constraints

---

*This document should be updated whenever the founder's strategic direction evolves. Date each update.*
