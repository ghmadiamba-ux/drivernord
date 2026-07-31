# DriverNord — Model Classification Analysis

**Status:** Analysis complete — 2026-05-14
**Syfte:** Classify DriverNord's V1 commercial model under Swedish law categories. Determine which regulatory frameworks apply, which do not, and what classification risk exists if DriverNord is misclassified.
**Varning:** This is an AI-generated analysis based on publicly available Swedish law and market research. It is not legal advice. The classification conclusion must be confirmed by a Swedish labor law and commercial law attorney before DriverNord begins commercial operations.

---

## The DriverNord V1 Model — What It Is

DriverNord operates as follows in V1:

1. **Drivers self-register** via a chat-based registration flow at drivernord.se/chaufförer
2. **Drivers self-declare** their license class (CE/C/D), YKB status, availability, and region
3. **DriverNord's AI system matches** driver profiles against transport company needs
4. **DriverNord sends an SMS** to a matched driver asking if they consent to being introduced to a named company
5. **Only on JA-response**, DriverNord shares the driver's profile (name, phone, self-declared credentials, availability) with the transport company
6. **The transport company contacts the driver directly** — DriverNord is not involved in the hiring process after introduction
7. **DriverNord bills the transport company** a flat fee (8,000–10,000 SEK for urgent, 15,000 SEK for shortlist)
8. **DriverNord never employs the driver** at any point
9. **DriverNord never directs the driver's work** at any point

---

## Classification Analysis — Swedish Law Categories

### Category A: Bemanningsföretag (Staffing / Agency Work)

**Applicable law:** Lag (2012:854) om uthyrning av arbetstagare (uthyrningslagen)

**Definition:** A company that employs workers for the purpose of hiring them out to client companies where the client directs the work.

**Key test:** Does the intermediary employ the worker? Does the client direct the worker's labor?

| Test | DriverNord V1 | Conclusion |
|------|---------------|-----------|
| Does DriverNord employ the driver? | NO — never | FAILS test |
| Does DriverNord pay the driver salary? | NO | FAILS test |
| Does DriverNord direct the driver's work? | NO | FAILS test |
| Is the driver deployed to a client company by DriverNord? | NO — driver is introduced, then hired directly | FAILS test |
| Does DriverNord have employer obligations (arbetsgivaravgift, LAS)? | NO | FAILS test |

**Verdict: DriverNord V1 is NOT a bemanningsföretag.**

Uthyrningslagen does not apply. No bemanningsföretag license, no Kompetensföretagen membership, no Bemanningsavtalet compliance required for V1.

**Label:** VERIFIED PUBLIC SOURCE (uthyrningslagen §1 and §5 definitions confirm this)

**Residual risk:** If DriverNord evolves to employ drivers on any basis (even short-term) and deploy them to clients, classification would shift immediately to bemanning. This is a governance guardrail to document: V1 must never employ drivers.

---

### Category B: Rekryteringsbyrå (Permanent Placement Recruitment)

**Definition:** A company that finds and presents candidates for permanent employment at client companies, charging a placement/finder's fee. The client employs the candidate directly.

**Key test:** Does the intermediary facilitate permanent employment at the client? Is the client the ultimate employer?

| Test | DriverNord V1 | Conclusion |
|------|---------------|-----------|
| Does DriverNord present candidates to clients? | YES | PASSES test |
| Does the client employ the driver directly? | YES (intended — client-driver relationship) | PASSES test |
| Does DriverNord charge a fee to the client? | YES | PASSES test |
| Does DriverNord guarantee permanent employment? | NO — DriverNord guarantees introduction only | PARTIAL PASS |
| Is the placement permanent (fast tjänst)? | NOT SPECIFIED — can be any employment form | UNCERTAIN |

**Verdict: DriverNord V1 has characteristics of a rekryteringsbyrå, but is not fully one.**

The key difference is that DriverNord does not guarantee placement and does not participate in the employment negotiation. The result of the introduction can be any employment form — permanent, fixed-term, or short-term contract. This makes DriverNord more precisely a "matchningstjänst" than a rekryteringsbyrå.

**Practical implication:** Rekryteringsbyråer are not subject to special licensing in Sweden beyond standard business registration. The Lag (1993:440) om privat arbetsförmedling (which historically restricted fee-charging in job placement) was repealed and replaced with a liberalized framework. **No special license is required to operate as a rekryteringsbyrå in Sweden as of the current regulatory environment.** [STRONG INFERENCE — confirm with lawyer]

---

### Category C: Matchningstjänst / Introduktionstjänst (Matching / Introduction Service)

**Definition:** A service that connects parties (here: drivers and transport companies) on a one-time or transactional basis, charges a fee for the connection, but does not participate in the ongoing relationship.

**Key test:** Does the intermediary facilitate a connection and step back, or does it maintain ongoing involvement?

| Test | DriverNord V1 | Conclusion |
|------|---------------|-----------|
| Does DriverNord connect two parties? | YES | PASSES test |
| Does DriverNord step back after introduction? | YES — once profile is shared, DriverNord is not involved | PASSES test |
| Does DriverNord maintain ongoing relationship with driver? | YES — for repeat matches, availability updates | PARTIAL |
| Does DriverNord charge per-introduction fee? | YES | PASSES test |
| Is DriverNord's commercial model "introduction fee"? | YES | PASSES test |

**Verdict: DriverNord V1 is a Matchningstjänst / Introduktionstjänst.**

This is the most accurate classification. The model is legally recognized in Sweden and does not require a special license beyond standard business registration (F-skatt, moms-registration).

**Label:** STRONG INFERENCE (no specific Swedish law defines "matchningstjänst" as a regulated category — which is precisely why no license is required)

---

### Category D: Privat arbetsförmedling (Private Employment Agency)

**Historical context:** Sweden historically required licensing for private employment agencies under Lag (1993:440) om privat arbetsförmedling. This law was repealed as Sweden liberalized its labor market.

**Current status:** Private employment mediation is NOT a licensed activity in Sweden for domestic operations as of the current legal framework.

**EU framework:** Directive 2008/104/EC on temporary agency work regulates agency work (bemanning) but not placement services (rekrytering) in the same way.

**Verdict: No private arbetsförmedling license required for DriverNord V1.** [STRONG INFERENCE — confirm with lawyer as a formality]

---

## Comparative Classification Table

| Classification | Applies to DriverNord V1 | Regulatory consequence |
|----------------|--------------------------|----------------------|
| Bemanningsföretag | NO | No uthyrningslagen compliance, no Kompetensföretagen membership, no Bemanningsavtalet |
| Rekryteringsbyrå | PARTIAL (no guarantee of placement) | No special licensing; standard MFL and commercial law apply |
| Matchningstjänst / Introduktionstjänst | YES — best fit | No special licensing; GDPR, MFL, and avtalslagen apply |
| Privat arbetsförmedling | NOT APPLICABLE (law repealed) | No licensing |
| E-handelstjänst / Digital platform | YES (supplementary) | E-handelslagen / Digital Services Act considerations; GDPR |

---

## Classification Risk — What Could Go Wrong

### Risk 1: Transport company misclassifies DriverNord as bemanning
**Probability:** HIGH (transport companies habitually default to bemanning framing for driver intermediaries)
**Legal consequence:** None by itself — misclassification by a counterparty creates commercial confusion, not legal liability
**Mitigation:** Service agreement §2 explicitly states DriverNord is NOT a bemanningsföretag. Sales materials must reinforce this. Confirmed by b2b-agent-architecture-v1.md.

### Risk 2: Tax authority (Skatteverket) reclassifies DriverNord's fee as employment-related
**Probability:** LOW (DriverNord never employs drivers)
**Legal consequence:** Potential employer contribution (arbetsgivaravgift) liability if reclassified
**Mitigation:** Never employ drivers. Ensure service agreement clearly states introduction only. [REQUIRES FOUNDER DECISION — if any driver is paid or compensated by DriverNord for any reason, get immediate legal advice]

### Risk 3: Arbetsförmedlingen classifies Platsbanken posting as misleading
**Probability:** MEDIUM (matchningstjänst posting on a job board requires care)
**Legal consequence:** Removal of ad; potentially MFL complaint
**Mitigation:** Platsbanken posting draft correctly states DriverNord is a matchningstjänst. Lawyer should confirm this framing before publication.

### Risk 4: IMY determines GDPR consent is insufficient
**Probability:** MEDIUM (untested consent architecture for this specific model)
**Legal consequence:** Order to stop processing; administrative fine (up to 4% of global turnover or 20M EUR)
**Mitigation:** Lawyer review of consent architecture before /chat goes live.

---

## Final Classification

**DriverNord V1 is a Matchningstjänst / Introduktionstjänst under Swedish commercial law.**

- No special license required
- No uthyrningslagen application
- Standard GDPR, MFL, avtalslagen, and Swedish commercial law apply
- Classification is consistent with DriverNord's service agreement §2 and privacy policy language
- REQUIRES LAWYER CONFIRMATION before first commercial transaction

---

*Version 1.0 — 2026-05-14 — AI analysis based on public law sources. Not legal advice. Requires Swedish labor law and commercial law attorney confirmation.*
