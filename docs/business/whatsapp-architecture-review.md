# DriverNord — WhatsApp Architecture Review

**Created:** 2026-06-17
**Status:** Updated to reflect company number (+46 70 938 52 67) now having a WhatsApp account
**No outreach has been made. No messages sent.**

---

## Context

The official DriverNord company phone number — **070-938 52 67 / +46 70 938 52 67** — is now confirmed to have an active WhatsApp account. This changes the WhatsApp architecture options significantly: DriverNord has a real business identity number that can anchor either a WhatsApp Business app account or a WhatsApp Cloud API sender, without touching the founder's personal number.

The existing Logistikklubb page already has a WhatsApp CTA pointing to this number. This review documents the safe path forward.

---

## Q1 — Can +46 70 938 52 67 be used as the WhatsApp Cloud API sender number?

**Yes — technically. But not instantly, and not without preparation.**

Any phone number that can receive SMS or a voice call can be registered as a WhatsApp Cloud API sender. The company number meets this technical requirement.

The critical constraint: **a phone number can only be on one WhatsApp account at any given time.** If +46 70 938 52 67 is currently registered in a WhatsApp app (personal or Business app), it cannot simultaneously be a Cloud API sender. It must be migrated — meaning disconnected from the current app — before it can be added to the API.

**Conclusion:** Yes, the number can be a Cloud API sender, but the migration process must happen first. See Q2 and Q4 for what that involves.

---

## Q2 — What must be done before using it with Meta WhatsApp Cloud API?

If the number is currently active in the WhatsApp app or WhatsApp Business app, the following steps are required before Cloud API onboarding can begin.

### Step 1 — Back up existing chat history (before anything else)
Chat history does NOT migrate to Cloud API. Once the number is unregistered from the app, conversations are gone from the app side.
- In WhatsApp (personal): Settings → Chats → Chat Backup
- In WhatsApp Business app: Settings → Chats → Chat Backup

This is a one-time, irreversible action. Do not skip it if any conversation history matters.

### Step 2 — Unregister the number from the current app
- **WhatsApp personal app:** Settings → Account → Delete Account → enter +46 70 938 52 67 → confirm
- **WhatsApp Business app:** Settings → Account → Delete Account → confirm

After deletion, Meta's systems take **up to 24 hours** to fully clear the number's registration. Do not attempt Cloud API onboarding immediately after deleting.

### Step 3 — Meta Business Account setup
- Go to business.facebook.com
- Create or use an existing Meta Business Account for DriverNord
- The existing DriverNord Facebook Page can be linked here

### Step 4 — Create WhatsApp Business Account (WABA)
- Inside Meta Business Suite: Add product → WhatsApp → Create new WhatsApp Business Account
- Name it: DriverNord AB (or DriverNord)

### Step 5 — Add and verify the phone number
- Add +46 70 938 52 67 as the sender number
- Meta will send an OTP via SMS or voice call to this number
- **The SIM must be physically accessible at this moment to receive the OTP**
- Enter OTP to verify

### Step 6 — Message template creation and approval
- Before sending to anyone, message templates must be submitted and approved by Meta
- Templates are pre-defined formats for transactional or notification messages (e.g., driver registration confirmation, follow-up, shortlist notification)
- Marketing/sales templates require a higher tier and more scrutiny

### Step 7 — Meta Business Verification (for production limits)
- Unverified accounts can only send to ~250 contacts per day
- Business Verification (uploading org documents to Meta) unlocks higher tiers
- Documents typically required: Swedish company registration (Bolagsverket extract), proof of address, business description

### Step 8 — Connect to DriverNord system
- Set webhook URL in Meta Dashboard (pointing to a new `/api/whatsapp/webhook` endpoint)
- Store WABA credentials and phone number ID as env vars
- Implement message templates in code

**This is a multi-week process if done carefully and correctly. It cannot happen in a day.**

---

## Q3 — What is the best use for the company number?

Three options evaluated:

### Option A — WhatsApp Business App (recommended for now)
Keep the number in the **WhatsApp Business app** — not connected to Cloud API.

What this enables:
- The number appears as an official Business account in WhatsApp (displays DriverNord name, website, description)
- The Logistikklubb CTA (wa.me/46709385267) works immediately and professionally
- Drivers and clients who click the link reach DriverNord's business identity, not a personal account
- Founder can reply manually from the Business app
- Zero API infrastructure required

What this does not enable:
- Automated messaging from the DriverNord platform
- Template-based follow-ups or notifications
- Integration with the contact agent

**Best for:** Now. Until API infrastructure (templates, webhook, env vars, legal compliance) is ready.

### Option B — WhatsApp Cloud API sender (future, recommended when ready)
Migrate the number to Cloud API when the automation phase is authorized.

What this enables:
- Automated driver follow-ups and confirmations from the DriverNord system
- Template-based WhatsApp messages alongside or instead of SMS (46elks)
- Full audit trail via `system_actions`

What this requires:
- Migration from current WhatsApp Business app (see Q2)
- Message template approval by Meta
- Meta Business Verification
- Code implementation: webhook, template renderer, send function
- Full alignment with existing 46elks/SMS architecture

**Best for:** The automation phase — same timeline as activating the contact agent with real SMS.

### Option C — Separate API number, keep company number for community/manual
Buy a new SIM or virtual number for Cloud API, and keep +46 70 938 52 67 in the Business app.

What this enables:
- No disruption to the existing company WhatsApp identity
- Clean separation between automated messaging number and public business contact

What this costs:
- An additional phone number (cost, SIM management)
- DriverNord's public number and API sender would be different — confusing to recipients

**Best for:** Not recommended for DriverNord at this stage. Adds overhead without proportional benefit.

### Verdict

| Use case | Recommended number | When |
|----------|--------------------|------|
| Public business identity / Logistikklubb CTA | +46 70 938 52 67 (Business app) | Now |
| Automated driver contact (Cloud API) | +46 70 938 52 67 (after migration to Cloud API) | Future automation phase |
| Founder private notification | Email (hej@drivernord.com via Zoho) | Preferred over WhatsApp |
| Community contact number | +46 70 938 52 67 | Now — it already functions as this via Logistikklubb |

---

## Q4 — Risks of migrating to Cloud API

These risks apply to the migration of +46 70 938 52 67 from the WhatsApp Business app to Cloud API.

| Risk | Severity | Notes |
|------|----------|-------|
| Chat history is permanently lost | Medium | Accept before migrating — back up first |
| Downtime during migration | Medium | Number unreachable via WhatsApp for up to 24h while registering with API |
| Number becomes API-only | High | Once on Cloud API, the regular WhatsApp Business app CANNOT be used simultaneously with this number — all replies must go through the system or a Cloud API inbox tool (e.g., Respond.io, Meta Inbox) |
| Meta account restriction risk | High | If Meta flags or restricts the Business Account, the company's main public number loses WhatsApp capability entirely — with no simple fallback |
| Quality rating degradation | Medium | If drivers block or report messages, Meta lowers the number's quality rating and may temporarily cap or disable sending |
| Template approval delays | Medium | Meta can take days to approve templates; automated messaging cannot start until at least one template is approved |
| OTP dependency | Low | The SIM must be physically accessible to receive the OTP during registration; plan accordingly |

**The most important risk:** if +46 70 938 52 67 is connected to Cloud API and the Meta Business Account is later restricted for any reason (policy violation, reported messages, non-compliance), the company's primary public WhatsApp number becomes inactive. There is no instant recovery path.

**Mitigation:** Do not connect the company number to Cloud API until the message quality and compliance framework is in place — template discipline, opt-in tracking, and a clear sending policy.

---

## Q5 — Can the company number reduce risk to the founder's personal number?

**Yes — completely and immediately.**

With +46 70 938 52 67 established as the DriverNord business WhatsApp identity (Business app now; Cloud API later), the founder's personal number:
- Never needs to appear on the DriverNord website, Facebook page, or Logistikklubb
- Never receives unsolicited messages from drivers or prospects
- Is never exposed to API automation risk
- Remains fully private

The existing Logistikklubb CTA already links to the company number — this is already correct. No change needed there.

**The founder's personal number should never be used as a public-facing DriverNord contact channel.** If it currently appears anywhere publicly (Facebook page, website, printed materials), it should be replaced with 070-938 52 67.

---

## Q6 — Should the founder's personal number still receive private control notifications?

**Recommendation: No. Use email instead.**

### Why not personal WhatsApp for notifications:
- Creates a dependency on WhatsApp Cloud API to reach the founder's personal number — requires opt-in setup, template approval, and a separate contact registration
- The personal number is the last private line; exposing it to any system increases risk of leakage
- WhatsApp is not the right channel for system alerts — it is a human communication channel

### What to use for internal notifications:
- **Zoho email to hej@drivernord.com** — already configured; appropriate for system alerts, daily digests, batch reports
- If immediate mobile alerts are needed: set up email-to-phone notifications via Zoho's mobile app
- Future option: a separate internal Slack/Discord channel for system events (low priority)

### If WhatsApp notifications are ever genuinely needed:
The company number on Cloud API can receive inbound messages. Webhook events can be routed to an internal inbox. The founder's personal number is not required in this setup.

---

## Q7 — Exact Meta setup steps using +46 70 938 52 67

### Phase 1 — NOW (no migration, no API)

These steps require no migration and can be done immediately:

1. **Confirm the number is in WhatsApp Business app** (not personal WhatsApp)
   - If it's in personal WhatsApp: migrate to WhatsApp Business app first (in-app: Settings → Account → Switch to Business Account — this does NOT unregister the number, it upgrades the account type)
   - WhatsApp Business app download: available on Android and iOS from official app stores

2. **Set up the Business profile for DriverNord:**
   - Business name: DriverNord
   - Category: Transportation
   - Description: Matchning av yrkesförare och logistikpersonal för svenska transport- och logistikföretag.
   - Website: https://drivernord.com
   - Email: hej@drivernord.com
   - Hours: set to business hours or "Always available" depending on founder preference

3. **Set an Away message** for when the founder is unavailable:
   > *"Tack för ditt meddelande! Vi återkommer så snart vi kan. Besök gärna drivernord.com för mer information."*

4. **Verify the Logistikklubb CTA** is pointing to wa.me/46709385267 — confirm the link opens a WhatsApp conversation to this number correctly.

**This is the entire Phase 1. No Meta API credentials needed. No migrations. Takes 30 minutes.**

---

### Phase 2 — FUTURE (Cloud API migration, when automation is ready)

Only begin Phase 2 when the following are true:
- The 46elks SMS contact agent is authorized and active (the automation infrastructure exists)
- Message templates are drafted and reviewed
- Consent framework covers WhatsApp contact (check current privacy policy and driver consent text)
- Meta Business Account is set up and verified

**Phase 2 steps (overview):**

| Step | Action | Time required |
|------|--------|---------------|
| 1 | Back up WhatsApp Business app chat history | 15 min |
| 2 | Delete WhatsApp Business app account for +46 70 938 52 67 | 5 min |
| 3 | Wait for Meta to clear the number registration | Up to 24h |
| 4 | Create or verify Meta Business Account at business.facebook.com | 30 min |
| 5 | Add WhatsApp product → Create WABA (DriverNord) | 20 min |
| 6 | Add +46 70 938 52 67 to WABA — receive and enter OTP (have SIM ready) | 10 min |
| 7 | Create message templates for driver contact, follow-up, confirmation | 1–2 days (Meta review time) |
| 8 | Submit Meta Business Verification documents | 1–5 business days (Meta review) |
| 9 | Implement webhook endpoint + message send function in DriverNord system | 1 developer session |
| 10 | Set WABA credentials as env vars in Vercel | 15 min |
| 11 | Test in sandbox (send to verified test numbers only) | 1 session |
| 12 | Activate for real sending — same authorization gate as 46elks SMS | Per AGENT_CONTACT_MODE settings |

**Total Phase 2 elapsed time: approximately 1–2 weeks due to Meta review processes.**

---

## Summary Decision Table

| Question | Answer |
|----------|--------|
| Can company number be Cloud API sender? | Yes — after migration from current WhatsApp app |
| Is migration instant? | No — requires unregistration + up to 24h wait + Meta setup process |
| Best use of company number now | WhatsApp Business app — manual, community contact, Logistikklubb CTA |
| Best use of company number in automation phase | Migrate to Cloud API as the API sender number |
| Risk of migration | Loss of chat history; downtime; API-only after migration; Meta account risk |
| Does it protect founder personal number? | Yes — completely. Personal number should never be public-facing. |
| Should personal number get system notifications? | No — use Zoho email instead |
| Phase 1 setup time | ~30 minutes (Business app profile only) |
| Phase 2 setup time | ~1–2 weeks (Cloud API migration + Meta verification + code) |
| Should the founder proceed with Phase 2 now? | NO — wait until automation phase is authorized alongside 46elks SMS activation |

---

## Current WhatsApp Status

| Component | Status |
|-----------|--------|
| Company number on WhatsApp | ACTIVE (+46 70 938 52 67) |
| WhatsApp Business app setup | RECOMMENDED for Phase 1 (30 min task) |
| WhatsApp Cloud API | NOT CONNECTED — reserved for future automation phase |
| Logistikklubb CTA | CORRECT — already points to company number |
| Founder personal number exposed publicly | Must verify — should NOT appear anywhere public |
| System notifications via WhatsApp | NOT IN USE — use Zoho email |
| Automated WhatsApp send | BLOCKED — same gate as 46elks SMS activation |

---

## Validated Relay Architecture (2026-06-17)

During session 2026-06-17, a specific relay pattern was designed and built into the DriverNord codebase. This section documents what was actually implemented and why.

### Architecture: Separate-Sender Relay

```
[Cron / Admin trigger]
       │
       ▼
notifyFounderWhatsApp()          (lib/founderNotifier.ts)
       │
       ▼
sendWhatsAppTemplate()           (lib/whatsappClient.ts)
       │
       ▼ SENDER: Meta Cloud API registered number
         (WHATSAPP_PHONE_NUMBER_ID = a separate number, NOT the company number)
       │
       ▼ RECIPIENT: Company WhatsApp number (46709385267)
         (WHATSAPP_FOUNDER_PHONE = 46709385267, stays in WhatsApp Business app)
       │
       ▼
Founder reads message in WhatsApp Business app
       │
       ▼
Founder manually copies post text and posts to Logistikklubben group
```

### Key design decisions validated in this session

| Decision | Verdict | Reason |
|----------|---------|--------|
| Cloud API sender = company number (46709385267) | REJECTED for now | Migration required; breaks Business app access; risks downtime |
| Cloud API sender = SEPARATE registered number | ACCEPTED | Company number stays in Business app as recipient; no migration needed |
| WHATSAPP_FOUNDER_PHONE = 46709385267 | ACCEPTED | Relay target is company number; founder reads it in Business app |
| Direct group posting (Cloud API → group) | REJECTED | Meta Cloud API does not support group messaging |
| WhatsApp Web/QR/Baileys automation | REJECTED | Unofficial; violates Meta TOS; fragile |
| Founder personal number as relay recipient | REJECTED | Personal number must remain private; not in any env var for notifications |
| Relay via Zoho email | ACCEPTED (preferred for now) | Already built; activates with 3 env vars; no Meta credentials needed |

### What this means for env vars

```
# To activate WhatsApp relay (future phase — requires separate Meta Cloud API number):
FOUNDER_WHATSAPP_ENABLED=true
WHATSAPP_FOUNDER_PHONE=46709385267        # ← company number as RECIPIENT
WHATSAPP_PHONE_NUMBER_ID=<separate-number-id>  # ← Cloud API sender number (NOT company number)
WHATSAPP_ACCESS_TOKEN=<meta-system-token>

# To activate email relay (available now — no new numbers needed):
FOUNDER_NOTIFICATIONS_ENABLED=true
FOUNDER_NOTIFICATION_EMAIL=hej@drivernord.com
ZOHO_SMTP_PASSWORD=<zoho-app-password>
```

### What was built in code (2026-06-17)

- `lib/whatsappClient.ts` — `sendWhatsAppTemplate()` with allowlist guard, token redaction, rate guard query, `message_id` return
- `lib/founderNotifier.ts` — `notifyFounderWhatsApp()` with gate chain + `FounderNotifyResult` including `message_id: string | null`
- `app/api/admin/whatsapp-test/route.ts` — `POST /api/admin/whatsapp-test` — recruiter-auth + confirm gate; calls `notifyFounderWhatsApp()` with sample post; returns `{ ok, dry_run, error, message_id, whatsapp_enabled, recipient }`; logs to `system_actions`
- `tests/whatsappTestRoute.test.ts` — full test coverage for the test route
- `tests/founderNotifier.test.ts` — added `message_id` propagation tests for both email and WhatsApp paths
- `tests/whatsappClient.test.ts` — tests for company number as relay recipient (46709385267)

### What is NOT yet done (required before live WhatsApp relay)

1. Register a separate Meta Cloud API sender number (NOT the company number)
2. Create WhatsApp Business Account (WABA) under Meta Business Account for DriverNord
3. Submit `logistikklubb_post_due` template for Meta approval
4. Set `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` in Vercel env
5. Set `FOUNDER_WHATSAPP_ENABLED=true` in Vercel env (explicit founder authorization required)

The email relay path (Option D) is fully operational and should be activated first via Zoho SMTP.

---

*No outreach has been made. No messages sent. Documentation only.*
