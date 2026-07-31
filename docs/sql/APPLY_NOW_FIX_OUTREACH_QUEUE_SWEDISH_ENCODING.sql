BEGIN;

DELETE FROM public.outreach_email_queue
WHERE send_mode = 'dry_run'
  AND status = 'draft'
  AND approved_by_founder = false
  AND automation_used = false
  AND recipient_email IN (
    'david.sjolund@enskedebilexpress.se',
    'gabriel@fmbcentral.se',
    'alexis.transport@hotmail.com',
    'info@sjolander.se',
    'tf@canoil.se',
    'info@kof.se',
    'joachim@ytterstene.se'
  );

INSERT INTO public.outreach_email_queue (
  company_name_snapshot, recipient_email, recipient_name, subject, body,
  readiness_category, safe_claim_used, risk_notes,
  status, provider, provider_message_id, scheduled_send_at,
  sent_at, reply_detected_at, reply_classification,
  created_by_agent, approved_by_founder, automation_used, send_mode
) VALUES (
  'Enskede Bilexpress',
  'david.sjolund@enskedebilexpress.se',
  'David Sjölund',
  'Uppföljning: CE-chaufförer för Enskede Bilexpress',
  'Hej David,

Följer upp mitt mejl från förra veckan angående CE-chaufförer för Enskede Bilexpress.

Det är en typ av rekrytering där det inte räcker att hitta ''en chaufför''. Det måste vara rätt behörighet, rätt tillgänglighet och en förare med dokumenterad erfarenhet av distribution.

DriverNord arbetar med matchning av yrkesförare inom transport.

Vi är varken bemanning eller en traditionell jobbtavla. Vår modell bygger på det som redan fungerar på mer mogna transportmarknader: att leverera en kvalitetssäkrad kortlist med förare som matchar ett konkret transportbehov.

I vår nuvarande pool finns redan förare som matchar den typen av behov.

Erbjudandet om en första matchningsleverans utan startkostnad gäller fortfarande — men platsen är reserverad för ett fåtal utvalda transportföretag.

Om behovet av CE-chaufförer för distribution fortfarande är aktuellt hos er, skriv gärna tillbaka här eller ring mig direkt.

Med vänliga hälsningar,

Ghislain Alexander Mad
DriverNord
Matchning av yrkesförare för svenska transportföretag

Webb: https://drivernord.com
E-post: hej@drivernord.com
Tel: 070-938 52 67',
  'READY',
  'I vår nuvarande pool finns redan förare som matchar den typen av behov.',
  'Uppföljning på mejl sänt 2026-05-21. READY — 2 bekräftade CE/distribution-förare i pool.',
  'draft', 'zoho', NULL, '2026-05-27T06:30:00+00:00',
  NULL, NULL, NULL, true, false, false, 'dry_run'
);

INSERT INTO public.outreach_email_queue (
  company_name_snapshot, recipient_email, recipient_name, subject, body,
  readiness_category, safe_claim_used, risk_notes,
  status, provider, provider_message_id, scheduled_send_at,
  sent_at, reply_detected_at, reply_classification,
  created_by_agent, approved_by_founder, automation_used, send_mode
) VALUES (
  'Edvardssons / FMB Central',
  'gabriel@fmbcentral.se',
  'Gabriel',
  'Uppföljning: CE-chaufförer för schakt och transport',
  'Hej Gabriel,

Följer upp mitt mejl från förra veckan angående CE-chaufförer för schakt och transport.

Det är en typ av rekrytering där det inte räcker att hitta ''en chaufför''. Det måste vara rätt CE-behörighet, rätt maskinvana och en förare med dokumenterad erfarenhet av schaktarbeten och tunga transporter.

DriverNord arbetar med matchning av yrkesförare inom transport.

Vi är varken bemanning eller en traditionell jobbtavla. Vår modell bygger på det som redan fungerar på mer mogna transportmarknader: att leverera en kvalitetssäkrad kortlist med förare som matchar ett konkret transportbehov.

I vår nuvarande pool finns redan förare som matchar den typen av behov.

Erbjudandet om en första matchningsleverans utan startkostnad gäller fortfarande — men platsen är reserverad för ett fåtal utvalda transportföretag.

Om behovet av CE-chaufförer inom schakt och transport fortfarande är aktuellt hos er, skriv gärna tillbaka här eller ring mig direkt.

Med vänliga hälsningar,

Ghislain Alexander Mad
DriverNord
Matchning av yrkesförare för svenska transportföretag

Webb: https://drivernord.com
E-post: hej@drivernord.com
Tel: 070-938 52 67',
  'READY',
  'I vår nuvarande pool finns redan förare som matchar den typen av behov.',
  'Uppföljning på mejl sänt 2026-05-21. READY — 3 bekräftade CE/schakt-förare i pool.',
  'draft', 'zoho', NULL, '2026-05-27T07:00:00+00:00',
  NULL, NULL, NULL, true, false, false, 'dry_run'
);

INSERT INTO public.outreach_email_queue (
  company_name_snapshot, recipient_email, recipient_name, subject, body,
  readiness_category, safe_claim_used, risk_notes,
  status, provider, provider_message_id, scheduled_send_at,
  sent_at, reply_detected_at, reply_classification,
  created_by_agent, approved_by_founder, automation_used, send_mode
) VALUES (
  'Alexis Bud & Transport AB',
  'alexis.transport@hotmail.com',
  'Josef Markus',
  'C/CE-chaufförer för schakt och markarbete — Alexis Bud & Transport AB',
  'Hej Josef,

Vi har uppmärksammat att Alexis Bud & Transport AB har ett behov av chaufförer för schakt och markarbete.

Det är en typ av rekrytering där det inte räcker att hitta ''en chaufför''. Det måste vara rätt behörighet, rätt maskinvana och en förare med dokumenterad erfarenhet av schakt och markarbete.

DriverNord arbetar med matchning av yrkesförare inom transport.

Vi är varken bemanning eller en traditionell jobbtavla. Vår modell bygger på det som redan fungerar på mer mogna transportmarknader: att leverera en kvalitetssäkrad kortlist med förare som matchar ett konkret transportbehov.

Vi har valt ut Alexis Bud & Transport AB eftersom ert behov matchar de C/CE-profiler inom schakt och markarbete som vi arbetar med i Stockholmsregionen. I vår nuvarande pool finns förare som kan vara relevanta för den typen av behov.

Därför vill vi ge er ett särskilt erbjudande: en första matchningsleverans utan startkostnad.

Det innebär att vi, om behovet fortfarande är aktuellt, kan ta fram en kortlist med relevanta C/CE-chaufförer för schakt och markarbete.

Erbjudandet går endast till ett fåtal utvalda transportföretag. När dessa platser är fyllda går DriverNord vidare till ordinarie kommersiella villkor.

Som del av upplägget förväntar vi oss snabb återkoppling på matchningen och att samarbetet kan nämnas anonymt som en del av DriverNords referensarbete.

Om behovet av C/CE-förare inom schakt och markarbete fortfarande är aktuellt hos er, skriv gärna tillbaka här eller ring mig direkt.

Med vänliga hälsningar,

Ghislain Alexander Mad
DriverNord
Matchning av yrkesförare för svenska transportföretag

Webb: https://drivernord.com
E-post: hej@drivernord.com
Tel: 070-938 52 67',
  'THIN_BUT_USABLE',
  'I vår nuvarande pool finns förare som kan vara relevanta för den typen av behov.',
  'Första kontakt. THIN_BUT_USABLE — 2 rena C/schakt_bygg-förare (1 tillgänglig nu).',
  'draft', 'zoho', NULL, '2026-05-27T07:30:00+00:00',
  NULL, NULL, NULL, true, false, false, 'dry_run'
);

INSERT INTO public.outreach_email_queue (
  company_name_snapshot, recipient_email, recipient_name, subject, body,
  readiness_category, safe_claim_used, risk_notes,
  status, provider, provider_message_id, scheduled_send_at,
  sent_at, reply_detected_at, reply_classification,
  created_by_agent, approved_by_founder, automation_used, send_mode
) VALUES (
  'Sjölander Maskintransport AB',
  'info@sjolander.se',
  'Magnus Sjölander',
  'CE-chaufförer för maskintransport — Sjölander Maskintransport AB',
  'Hej Magnus,

Vi har uppmärksammat att Sjölander Maskintransport AB har ett behov kopplat till CE-chaufförer för tunga transporter och maskintransporter.

Det är en typ av rekrytering där det inte räcker att hitta ''en chaufför''. Det måste vara rätt CE-behörighet, rätt fordonstyp och dokumenterad erfarenhet av tunga transporter med specialfordon.

DriverNord arbetar med matchning av yrkesförare inom transport.

Vi är varken bemanning eller en traditionell jobbtavla. Vår modell bygger på det som redan fungerar på mer mogna transportmarknader: att leverera en kvalitetssäkrad kortlist med förare som matchar ett konkret transportbehov.

Vi har valt ut Sjölander Maskintransport AB eftersom er verksamhet kräver CE-kompetens för tunga transporter — en typ vi rekryterar aktivt. Vi arbetar med att kartlägga förare och behov inom detta område.

Om behovet av CE-förare för tunga transporter fortfarande är aktuellt hos er, skriv gärna tillbaka här eller ring mig direkt.

Med vänliga hälsningar,

Ghislain Alexander Mad
DriverNord
Matchning av yrkesförare för svenska transportföretag

Webb: https://drivernord.com
E-post: hej@drivernord.com
Tel: 070-938 52 67',
  'QUESTION_BASED',
  'Vi arbetar med att kartlägga förare och behov inom detta område.',
  'Första kontakt. QUESTION_BASED — CE angränsande, ingen direkt matchning. Inga steg 9–12.',
  'draft', 'zoho', NULL, '2026-05-27T08:00:00+00:00',
  NULL, NULL, NULL, true, false, false, 'dry_run'
);

INSERT INTO public.outreach_email_queue (
  company_name_snapshot, recipient_email, recipient_name, subject, body,
  readiness_category, safe_claim_used, risk_notes,
  status, provider, provider_message_id, scheduled_send_at,
  sent_at, reply_detected_at, reply_classification,
  created_by_agent, approved_by_founder, automation_used, send_mode
) VALUES (
  'Canoil Transport',
  'tf@canoil.se',
  NULL,
  'Uppföljning: CE-förare för tank- och transportuppdrag',
  'Hej,

Följer upp mitt mejl från förra veckan angående CE-förare för tank- och transportuppdrag.

Det är en typ av rekrytering där det inte räcker att hitta ''en chaufför''. Det måste vara rätt behörighet, rätt erfarenhet och en förare med dokumenterad vana av tank- och transportuppdrag.

DriverNord arbetar med matchning av yrkesförare inom transport.

Vi är varken bemanning eller en traditionell jobbtavla. Vår modell bygger på det som redan fungerar på mer mogna transportmarknader: att leverera en kvalitetssäkrad kortlist med förare som matchar ett konkret transportbehov.

Vi kartlägger just nu förare inom detta område och vill förstå om behovet är återkommande hos er.

Om behovet av CE-förare för tank- och transportuppdrag är aktuellt hos er, skriv gärna tillbaka här eller ring mig direkt.

Med vänliga hälsningar,

Ghislain Alexander Mad
DriverNord
Matchning av yrkesförare för svenska transportföretag

Webb: https://drivernord.com
E-post: hej@drivernord.com
Tel: 070-938 52 67',
  'SUPPLY_GAP',
  'Vi kartlägger just nu förare inom detta område och vill förstå om behovet är återkommande hos er.',
  'Uppföljning på mejl sänt 2026-05-22. SUPPLY_GAP — 0 tank/ADR-förare i pool. Inga steg 9–12.',
  'draft', 'zoho', NULL, '2026-05-27T12:00:00+00:00',
  NULL, NULL, NULL, true, false, false, 'dry_run'
);

INSERT INTO public.outreach_email_queue (
  company_name_snapshot, recipient_email, recipient_name, subject, body,
  readiness_category, safe_claim_used, risk_notes,
  status, provider, provider_message_id, scheduled_send_at,
  sent_at, reply_detected_at, reply_classification,
  created_by_agent, approved_by_founder, automation_used, send_mode
) VALUES (
  'Kyl- och Frysexpressen',
  'info@kof.se',
  NULL,
  'Uppföljning: C/CE-förare för kyl- och frystransporter',
  'Hej,

Följer upp mitt mejl från förra veckan angående C/CE-förare för kyl- och frystransporter.

Det är en typ av rekrytering där det inte räcker att hitta ''en chaufför''. Det måste vara rätt behörighet, rätt tillgänglighet och en förare med dokumenterad erfarenhet av temperaturkänsliga transportuppdrag.

DriverNord arbetar med matchning av yrkesförare inom transport.

Vi är varken bemanning eller en traditionell jobbtavla. Vår modell bygger på det som redan fungerar på mer mogna transportmarknader: att leverera en kvalitetssäkrad kortlist med förare som matchar ett konkret transportbehov.

Vi kartlägger just nu förare inom detta område och vill förstå om behovet är återkommande hos er.

Om behovet av C/CE-förare inom kyl- och frystransporter fortfarande är aktuellt hos er, skriv gärna tillbaka här eller ring mig direkt.

Med vänliga hälsningar,

Ghislain Alexander Mad
DriverNord
Matchning av yrkesförare för svenska transportföretag

Webb: https://drivernord.com
E-post: hej@drivernord.com
Tel: 070-938 52 67',
  'SUPPLY_GAP',
  'Vi kartlägger just nu förare inom detta område och vill förstå om behovet är återkommande hos er.',
  'Uppföljning på mejl sänt 2026-05-22. SUPPLY_GAP — 0 kylfrys-förare i pool. Inga steg 9–12.',
  'draft', 'zoho', NULL, '2026-05-27T12:30:00+00:00',
  NULL, NULL, NULL, true, false, false, 'dry_run'
);

INSERT INTO public.outreach_email_queue (
  company_name_snapshot, recipient_email, recipient_name, subject, body,
  readiness_category, safe_claim_used, risk_notes,
  status, provider, provider_message_id, scheduled_send_at,
  sent_at, reply_detected_at, reply_classification,
  created_by_agent, approved_by_founder, automation_used, send_mode
) VALUES (
  'Haninge Åkeri AB',
  'joachim@ytterstene.se',
  'Joachim Ytterstene',
  'CE-chaufförer för maskintransport — Haninge Åkeri AB',
  'Hej Joachim,

Vi har uppmärksammat att Haninge Åkeri AB har ett behov kopplat till CE-chaufförer för tunga transporter och maskintransporter.

Det är en typ av rekrytering där det inte räcker att hitta ''en chaufför''. Det måste vara rätt CE-behörighet, rätt fordonstyp och dokumenterad erfarenhet av tunga transporter med specialfordon.

DriverNord arbetar med matchning av yrkesförare inom transport.

Vi är varken bemanning eller en traditionell jobbtavla. Vår modell bygger på det som redan fungerar på mer mogna transportmarknader: att leverera en kvalitetssäkrad kortlist med förare som matchar ett konkret transportbehov.

Vi har valt ut Haninge Åkeri AB eftersom er verksamhet kräver CE-kompetens för tunga transporter — en typ vi rekryterar aktivt. Vi arbetar med att kartlägga förare och behov inom detta område.

Om behovet av CE-förare för tunga transporter fortfarande är aktuellt hos er, skriv gärna tillbaka här eller ring mig direkt.

Med vänliga hälsningar,

Ghislain Alexander Mad
DriverNord
Matchning av yrkesförare för svenska transportföretag

Webb: https://drivernord.com
E-post: hej@drivernord.com
Tel: 070-938 52 67',
  'QUESTION_BASED',
  'Vi arbetar med att kartlägga förare och behov inom detta område.',
  'Första kontakt. QUESTION_BASED — CE angränsande. Positivt svar → uppgradera till THIN vid uppföljning.',
  'draft', 'zoho', NULL, '2026-05-28T06:30:00+00:00',
  NULL, NULL, NULL, true, false, false, 'dry_run'
);

COMMIT;

SELECT
  company_name_snapshot,
  recipient_email,
  readiness_category,
  status,
  send_mode,
  approved_by_founder,
  automation_used,
  scheduled_send_at AT TIME ZONE 'Europe/Stockholm' AS scheduled_cest
FROM public.outreach_email_queue
ORDER BY scheduled_send_at ASC;

SELECT id, company_name_snapshot, subject
FROM public.outreach_email_queue
WHERE company_name_snapshot LIKE '%Ã%'
   OR subject LIKE '%Ã%'
   OR body LIKE '%Ã%'
   OR company_name_snapshot LIKE '%Â%'
   OR subject LIKE '%Â%'
   OR body LIKE '%Â%';
