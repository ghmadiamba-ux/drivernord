# DriverNord — Tools and Software Recommendations

**Date:** 2026-05-16
**Status:** Recommendations only. No accounts created. No APIs connected. No production changes.
**Purpose:** Recommend the best available tool for each DriverNord function, with honest trade-offs and clear alternatives.

---

## Evaluation Criteria

Each recommendation is scored on:
- **Fit:** How well the tool matches DriverNord's specific use case
- **Cost:** Total cost at launch volume (target: 5–50 drivers/month, 1–5 company introductions/month)
- **Complexity:** How much setup, maintenance, and learning is required
- **Sweden-specificity:** How well the tool handles Swedish market requirements (language, law, compliance)

---

## 1. Core AI / LLM

### Primary: Claude API (Anthropic)

**Recommendation: USE**

**Why:**
- Claude is already the development environment (Claude Code) — consistent context and tooling
- Strongest at structured document generation, compliance-aware writing, and multi-step reasoning
- Haiku is cost-effective for classification tasks; Sonnet is best for generation; Opus for complex strategic analysis
- Tool use (function calling) works reliably for database queries and structured outputs
- Prompt caching reduces cost on repetitive system prompts (agent system prompts are long and static)

**Pricing (approximate, 2026):**
- Haiku: ~$0.25/M input tokens, ~$1.25/M output
- Sonnet: ~$3/M input, ~$15/M output
- At DriverNord's early volume: likely under $20/month for all agents combined

**Model selection guide:**
| Task | Model |
|------|-------|
| Intent classification, routing | Haiku |
| Copy generation, response drafting, match explanation | Sonnet |
| Strategic analysis, performance retrospectives | Sonnet or Opus |
| Simple data summarization | Haiku |

### Secondary: OpenAI GPT-4o

**Recommendation: OPTIONAL FALLBACK**

**Why not primary:** Adds API key management complexity, separate billing, and inconsistent behavior when switching between providers. At DriverNord's scale, Claude handles all tasks adequately.

**When to add:** If a specific task (image understanding for Canva brief generation, or voice transcription via Whisper) requires OpenAI capabilities not available via Anthropic.

---

## 2. Orchestration / Workflow Automation

### Primary: n8n

**Recommendation: USE (Phase 2)**

**Why n8n over Make (Integromat) or Zapier:**
- Self-hostable — no third-party holds your workflow data
- TypeScript-native and developer-friendly; Claude Code can write n8n workflow definitions
- Much cheaper at volume than Make or Zapier (self-hosted is free compute + VPS cost)
- Better for complex multi-step workflows with conditional logic
- Supports webhooks, cron, HTTP requests, Supabase, and 400+ other integrations natively
- Can be hosted on a $6/month Hetzner or DigitalOcean VPS

**Why not Zapier:**
- Zapier is designed for non-technical users and is expensive at any meaningful task volume
- Limited conditional logic; poor at multi-step loops
- Not appropriate for a developer-first project

**Why not Make (Integromat):**
- Better than Zapier for complexity, but still SaaS pricing and limited self-hosting
- Less developer-friendly than n8n
- n8n has overtaken Make for developer-led automation

**Phase 1 alternative:** For Phase 1, use Vercel Cron + custom API routes for scheduled tasks. This is simpler and already integrated. Switch to n8n in Phase 2 when workflow complexity exceeds what cron + API routes handle cleanly.

**Hosting recommendation:** Hetzner CX22 (~€4.51/month) or DigitalOcean Droplet ($6/month) running Docker + n8n.

---

## 3. Database

### Primary: Supabase

**Recommendation: KEEP (already in use)**

**Why:**
- Already in production with 13 migrations
- PostgreSQL — full SQL power, no ORM lock-in
- Real-time subscriptions for cockpit live updates
- Row-level security for multi-tenant access control
- Built-in auth, storage, and edge functions
- EU-region hosting available (required for GDPR Art. 44 compliance)

**What to add for agents:**
- Add `research_reports` table for Demand Intelligence Agent output
- Add `agent_outputs` table for structured agent results
- Add `creative_bank_metadata` table for tracking creative performance
- All agent reads should use a dedicated read-only service role key

**What NOT to do:**
- Do not give agents write access to `drivers`, `ingested_drivers`, or `shortlists` directly
- Agent writes go to purpose-built output tables; humans promote to operational tables

---

## 4. SMS

### Primary: 46elks

**Recommendation: USE (already selected)**

**Why:**
- Swedish company, supports Swedish phone numbers natively
- STIR/SHAKEN compliant for Swedish mobile networks
- Supports STOPP opt-out keyword detection (required for Swedish SMS marketing)
- Good inbound SMS webhook support
- Competitive pricing: ~0.45 SEK per SMS (outbound, Sweden)

**What needs to happen before activation:**
- Founder configures API credentials in Vercel environment variables
- Sender name (alphanumeric) must be registered — recommended: "DriverNord"
- STOPP handling must be implemented before any marketing SMS is sent (legally required)

**Alternative if 46elks is unavailable:** Twilio — more expensive in Sweden, but global fallback.

---

## 5. Email (Transactional and Automated)

### Primary: Resend

**Recommendation: USE**

**Why Resend over SendGrid, Mailgun, Postmark:**
- Modern API designed for developers; first-class TypeScript SDK
- Generous free tier (3,000 emails/month, 100/day)
- Excellent deliverability (SPF/DKIM/DMARC setup is guided and simple)
- React Email integration for HTML email templates
- Webhook support for delivery tracking
- At DriverNord's early volume: likely stays on free tier indefinitely

**Use for:**
- Weekly pipeline report to founder
- Driver registration confirmation (as backup to SMS)
- Internal alerts (new HIGH priority driver, new company need created)
- Any automated notification to `hej@drivernord.se`

**What NOT to use it for:**
- Cold outreach to companies (requires different legal basis and deliverability approach)
- Mass marketing emails (would require consent and unsubscribe management)

### Secondary for outbound sales: Gmail + direct SMTP

**Recommendation: USE for company introductions (Phase 2)**

Founder's Gmail account sends company introductions directly — personal, not from a no-reply domain. This is more credible at early stage than a transactional email platform.

---

## 6. Communication Monitoring (hej@drivernord.se)

### Primary: Gmail (with webhook or polling via n8n)

**Recommendation: USE**

**Why:** The founder already monitors `hej@drivernord.se`. The Communication Triage Agent reads incoming emails via Gmail API and routes/drafts responses. No new email infrastructure needed.

**Implementation:** n8n watches `hej@drivernord.se` via Gmail API trigger. On new email, sends to Communication Triage Agent (Claude API). Agent classifies and either drafts a response in Gmail draft or sends an auto-response for low-risk FAQ.

**Alternative:** Superhuman or Front (team email clients) — useful at scale, not needed now.

---

## 7. Browser Automation (Research Agent)

### Primary: Playwright MCP

**Recommendation: USE (Phase 2, for Demand Intelligence Agent)**

**Why Playwright MCP:**
- Claude Code's MCP protocol allows Claude to control a browser directly
- Can navigate to Arbetsförmedlingen, Blocket Jobb, and company websites
- Extracts structured data from public pages
- More reliable than regex-based scraping for complex HTML

**Alternative:** Bright Data or Apify — professional scraping infrastructure. Overkill at Phase 2 scale. Consider in Phase 3 if scraping volume increases.

**Legal note before activating:**
- Review robots.txt for each target site
- Only scrape publicly accessible pages (no login required)
- Do not circumvent rate limiting
- Swedish transport job boards are generally public — but confirm this holds for each source

---

## 8. Invoicing / Finance

### Primary: Fortnox

**Recommendation: USE**

**Why:**
- Fortnox is the dominant Swedish SME accounting platform (used by >500,000 Swedish companies)
- Swedish-first: Swedish VAT, BAS chart of accounts, Skatteverket integration
- API available for automated invoice creation and payment tracking
- Standard for Swedish enskild firma and AB
- Client companies will expect Swedish-format invoices (F-skatt number, Swedish VAT)

**Integration approach (Phase 2):**
- When founder approves an introduction delivery, the Performance Agent generates invoice data
- Invoice is created in Fortnox via API (founder reviews in Fortnox before sending)
- Fortnox tracks payment status; Performance Agent monitors for overdue

**Alternative:** Bokio — simpler, also Swedish, better for pure enskild firma. Less API capability than Fortnox. Use Bokio if Fortnox API integration is too complex for current phase.

**What NOT to use:** Stripe, QuickBooks, Xero — not Swedish-first, wrong VAT model, wrong invoicing format for Swedish B2B.

---

## 9. Error Monitoring

### Primary: Sentry

**Recommendation: KEEP (already in stack)**

**What to add:**
- Alert on any unhandled agent error
- Alert on CAPI event failures (when Pixel/CAPI is live)
- Alert on Supabase connection errors
- Alert on failed SMS deliveries via 46elks webhook

---

## 10. Scheduling

### Primary Phase 1: Vercel Cron

**Recommendation: USE for simple scheduled tasks**

Already configured (`/api/agent/follow-up` at `0 8 * * *`). Extend for:
- Performance report generation (weekly)
- YKB expiry monitoring (daily)
- Need expiry monitoring (daily)

**Primary Phase 2: n8n**

For multi-step workflows that involve multiple API calls, conditional logic, or inter-agent data passing. Vercel Cron triggers a webhook → n8n → workflow executes.

---

## 11. Vector Database (for agent memory)

### Recommendation: DO NOT USE YET

**Why not:**
- At DriverNord's early stage, all agent memory fits in structured Supabase tables
- Vector databases (Pinecone, Weaviate, pgvector) solve a semantic search problem that DriverNord does not yet have at scale
- Adding a vector database prematurely creates operational complexity and ongoing cost for zero benefit
- Creative bank, research reports, and agent outputs all fit in flat Markdown files or Supabase rows

**When to reconsider:** When the creative bank exceeds 200 entries, or when the communication agent needs to search historical driver conversations by topic. Supabase's `pgvector` extension provides vector search without adding a new service.

---

## 12. Meta Advertising Integration

### Primary: Meta Conversions API (CAPI) + Meta Pixel

**Recommendation: IMPLEMENT (Phase 3 — after cookie consent + lawyer approval)**

Already architected in `docs/business/meta-acquisition-integration/conversions-api-architecture.md`. Add after:
- Cookie consent banner is live
- Lawyer confirms GDPR basis for Pixel use
- Canonical domain (`drivernord.se`) is verified in Events Manager
- `META_PIXEL_ENABLED=true` is authorized by founder

### Meta Business API for reporting

**Recommendation: USE (Phase 2 when ads are running)**

The Meta Marketing API allows programmatic access to campaign performance data — eliminating the need for manual CSV exports for the Performance Agent. Requires:
- System User access token (different from CAPI token)
- `ads_read` permission

---

## 13. Public Web Research

### Primary: Brave Search API

**Recommendation: USE (Phase 2, for Demand Intelligence Agent)**

**Why Brave over Google Custom Search:**
- Programmatic API access without Google's rate limiting complexity
- Privacy-respecting (no user tracking)
- Competitive pricing: ~$3/1,000 queries on paid tier; 2,000 free queries/month
- Good Swedish language support

**Alternative:** Serper.dev (Google results via API) — slightly better results for Swedish queries, similar pricing.

---

## 14. Public Swedish Data Sources

### Jobtech API (Arbetsförmedlingen)

**Recommendation: USE**

Completely free, no authentication required. Provides structured data on all Swedish job postings including employer name, location, and job category. Directly queryable for CE/C/D driver postings.

API endpoint: `https://links.api.jobtechdev.se/joblinks`

### Bolagsverket

**Recommendation: USE (on-demand)**

Free public company search. Confirms F-skatt status, organization number, and company type. Use for company validation before outreach.

---

## 15. Content Production

### Canva (visual production)

**Recommendation: USE**

Founder produces all visual content. Claude Code can write detailed Canva production briefs. Canva's API exists but is not needed at Phase 1 — founder uses Canva manually.

### CapCut (video production)

**Recommendation: USE for Reels and Stories**

Simple mobile-first video editor. No API needed. Founder produces short videos; Claude Code scripts the content.

### HeyGen (AI avatar video)

**Recommendation: OPTIONAL — Phase 3 only**

Useful if the founder wants video content but does not want to appear on camera. Not needed before the first paid campaign. Legal note: AI-generated spokesperson must be disclosed under emerging AI Act provisions.

---

## 16. Cockpit and Internal Tools

### Current cockpit: Next.js `/recruiter` route

**Recommendation: KEEP AND EXTEND**

The existing cockpit is the right foundation. Add:
- Cockpit AI Assistant (text input + response pane)
- Agent output review queue (structured list of pending drafts)
- Communication log (all agent-sent messages)

**Do not migrate to Retool, Softr, or other internal tool platforms.** The existing Next.js cockpit is more controllable, already integrated with Supabase auth, and does not add vendor lock-in.

---

## Complete Tool Stack Summary

| Function | Tool | Phase | Cost estimate |
|----------|------|-------|---------------|
| AI backbone | Claude API (Anthropic) | 1 | <$20/month early |
| Orchestration | Vercel Cron → n8n | 1/2 | Free/~$6/month VPS |
| Database | Supabase | Now | Already in use |
| SMS | 46elks | 1 (after setup) | ~0.45 SEK/SMS |
| Email (transactional) | Resend | 1 | Free tier |
| Email (outbound sales) | Gmail | 2 | Free |
| Browser automation | Playwright MCP | 2 | Free (compute) |
| Invoicing | Fortnox | 2 | ~229 SEK/month |
| Error monitoring | Sentry | Now | Already in use |
| Meta advertising | Meta CAPI + Pixel | 3 | Free (ad budget separate) |
| Web research | Brave Search API | 2 | ~$3/1,000 queries |
| Swedish job data | Jobtech API | 2 | Free |
| Company data | Bolagsverket | 2 | Free |
| Visual content | Canva | 1 (manual) | ~$13/month Pro |
| Video content | CapCut | 1 (manual) | Free |
| AI video (optional) | HeyGen | 3 | ~$24/month |

**Total estimated monthly cost at Phase 1:** Under $60/month for all tools combined.

---

*Version 1.0 — 2026-05-16 — Recommendations only. No accounts created. No APIs connected. No production changes.*
