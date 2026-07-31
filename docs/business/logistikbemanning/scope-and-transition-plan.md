# DriverNord — Logistics Staffing Scope and Transition Plan

*Effective: 2026-06-16. Supersedes "Lager/warehouse/forklift — not in target market" from roadmap-next-phases.md (2026-05-14).*

---

## Worker Scope (Current)

DriverNord's worker database and intake must support all of the following categories:

### Heavy transport / Chauffeurs
- CE license (tung lastbil med släp)
- C license (tung lastbil utan släp)
- D license (buss / passageraretransport)
- Distribution drivers (lätt lastbil, körkort B+)
- Fjärrtransport (long-haul CE)
- Schakt/bygg transport (CE for construction logistics)
- Kyl/frys transport (temperature-controlled, CE/C)
- ADR/tank drivers (dangerous goods — where supply exists)

### Warehouse and terminal / Lager och terminal
- Lagerpersonal (general warehouse workers)
- Truckförare (forklift operators — truckkort A, B, C, D)
- Terminalpersonal (terminal/dock workers)
- Orderplock (order picking, WMS systems)
- Lastning/lossning (loading/unloading, no specialized license required)

### Logistics support (future expansion)
- Transportledare / Spedition (logistics coordinator)
- Godshanterare
- Other logistics roles as market evidence demands

---

## What the System Must Support Now

The following capabilities must be built or enabled now, even before the first bemanning mission is live:

### 1. Worker intake for all categories

`/chat` flow must capture workers across all categories listed above.

**Current state:** Intake optimized for CE/C/D drivers.

**Required expansion:**
- Add truckkort (A/B/C/D) as a license type alongside CE/C/D
- Add lagerpersonal, terminalpersonal, orderplock, lastning/lossning as `domain` or role types
- Capture relevant certifications: truckkort type, ADR class, YKB (for CE/C/D only)
- Availability and shift type capture — same logic as drivers

**Engineering note:** `types/lead.ts` `License` and `Domain` enums need extending. `classify.ts` scoring and `conversation.ts` step routing need updating. This is a planned task.

### 2. Company needs that include warehouse/logistics roles

When a client posts a need, the system must support:
- License type: CE / C / D / B / truckkort / ingen (no license required)
- Role type: chauffeur / truckförare / lagerpersonal / terminalpersonal / orderplock / lastning-lossning
- YKB required: yes / no / not applicable
- Truckkort type: A / B / C / D / not required

### 3. Market scan that detects warehouse/logistics demand

The Platsbanken market scan should detect and classify:
- CE/C/D postings (current)
- Truckkort postings (new)
- Lagerpersonal/warehouse postings (new)
- Terminal/dock postings (new)

This generates supply gap signals and prospecting targets for all categories, not only heavy transport.

### 4. Scoring that works for non-driver workers

The 100-point scoring model must be adapted:
- License score → role score (truckkort replaces CE license weight)
- YKB score → N/A for warehouse workers (set to neutral, not penalized)
- Experience domain → warehousing, terminal, distribution
- Availability and shift type scoring — identical logic

---

## What the Founder Handles Before First Bemanning Mission

The following are founder responsibilities, not system tasks. The system must prepare for them but not block on them.

| Requirement | Description | Status |
|-------------|-------------|--------|
| Employer registration (F-skatt / SNI) | Confirm correct SNI code for bemanningsföretag (SNI 78.20) | Founder |
| Collective agreement | Bemanningsavtalet via Almega Bemanningsföretagen + relevant transport/warehouse union | Founder |
| Fora insurance | Group accident insurance, non-occupational accident insurance (obligatory for Swedish employers) | Founder |
| Liability insurance | Employer liability and third-party liability during staffing assignments | Founder |
| Payroll system | Fortnox (already used for invoicing) or equivalent payroll module | Founder |
| Employment contract template | Standard assignment-based employment contract for logistics workers | Founder (AI can draft) |
| Work environment documentation | AML 3:2 responsibilities documented for staffing model | Founder (AI can draft) |
| DPA for client companies | Data agreement governing worker data sharing during staffing | Founder (AI can draft) |
| Client staffing agreement | Commercial agreement governing the tri-party staffing relationship | Founder (AI can draft) |

**None of these block the system from building supply, scoring candidates, or running market scans. They only gate the first live staffed mission.**

---

## Transition Plan

### Phase: Now (before first mission)

- Extend worker intake to all categories
- Extend market scan to detect warehouse/logistics demand signals
- Extend company need schema to support non-driver roles
- Extend scoring for non-driver workers
- Extend Logistikklubb/Facebook content to include all worker categories
- Build worker supply across all categories (organic registration via content + community)

### Phase: Before first live staffed mission

Founder completes operational prerequisites listed above.

System must be ready to:
- Track worker employment status (free / assigned / between assignments)
- Generate staffing quotes from registered worker profiles
- Log staffing assignment start/end
- Integration hook for invoicing (Fortnox)

### Phase: After first live staffed mission

- Adjust pricing based on actual margin data
- Build recurring client relationship tracking
- Automate capacity reporting (which workers are free, which assigned, when returning)
- Develop worker preference tracking (prefers temp, prefers permanent, prefers local)

---

## What Bemanning Does NOT Require (Misconceptions)

The earlier documentation overstated the capital barrier. Clarification:

- **500,000–750,000 SEK payroll float** — this applies to scale bemanning operations running dozens of simultaneous assignments. A first mission with 1–3 workers requires only the ability to pay workers before client invoice is settled (typically 30 days). This is a cash flow management decision, not a capital barrier.
- **Immediate Kollektivavtal** — required, but registering with Almega Bemanningsföretagen and signing the Bemanningsavtalet is a weeks-long process, not months. It is not a multi-year blocker.
- **New legal entity** — not required. DriverNord can operate bemanning under the existing legal entity with correct SNI registration.

The legal/insurance prerequisites are real but not insurmountable. They are sequenced, founder-executable tasks, not reasons to exclude bemanning from the commercial model.

---

## Agency Doctrine Reminder

Staffing/bemanning companies detected in market scans are NOT clients. They are:
- Market signal sources
- Hidden-client intelligence
- Potential partners (future, founder-approved only)
- Partial competitors

They are classified via `commercial_classification` in `agency_posting_signals` and blocked from the normal client pipeline via `hold_agency` draft status.

This doctrine does not change because DriverNord itself is preparing to offer bemanning. DriverNord competing in the bemanning market is compatible with treating external bemanningsföretag as signal sources rather than clients.

---

*Update this document when the scope expands further or when the first bemanning mission prerequisites are completed.*
