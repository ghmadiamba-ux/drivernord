import type { Translations } from './types'

export const translations: Translations = {
  sv: {
    'meta.title': 'DriverNord — AI-driven matchningsinfrastruktur för tunga transporter',
    'meta.description':
      'Autonoma agenter förvärvar, kvalificerar och matchar CE-förare mot åkeriföretagens krav. Koordinatorn supervisar via cockpit.',

    'nav.link.how': 'Systemet',
    'nav.link.drivers': 'Förare',
    'nav.link.companies': 'Åkeriföretag',
    'nav.cta': 'Boka pilot',

    // Hero
    'hero.eyebrow': 'AI-driven matchningsinfrastruktur · Tunga transporter',
    'hero.headline': 'Autonoma agenter kvalificerar och matchar förare. Ni beslutar.',
    'hero.subtext':
      'Systemet förvärvar, klassificerar och matchar CE-förare mot era krav — dygnet runt, utan CV-högar. En koordinator supervisar och godkänner placeringar via cockpit.',
    'hero.cta.primary': 'Boka pilot',
    'hero.cta.secondary': 'Registrera chaufför',
    'hero.cta.tertiary': 'Se hur det fungerar',

    // Problem
    'problem.eyebrow': 'Marknadsproblemet',
    'problem.headline': 'Manuell rekrytering är en strukturell flaskhals',
    'problem.subtext':
      'Alla svenska bemanningsföretag kvalificerar förare via telefon. Det sker under kontorstid. Det skalas med rekryterare. Det förlorar kvalificerade CE-förare till den aktör som svarar snabbast.',
    'problem.card1.title': 'Telefonscreening är flaskhalsen',
    'problem.card1.body':
      'Licensklass, YKB-status och tillgänglighet samlas in via röstsamtal — inte digitalt. Branschnormen: en rekryterare per 19 förare. Ingen förändring sedan 1990-talet.',
    'problem.card2.title': 'Sena svar förlorar förare',
    'problem.card2.body':
      'Kvalificerade CE-förare med flera alternativ väljer den aktör som kontaktar dem först. En fördröjning på 24–72 timmar är lika med ett förlorat lead.',
    'problem.card3.title': 'Pooler byggs manuellt',
    'problem.card3.body':
      'Den snabbaste aktören i Sverige levererar på 90 minuter — men bara med ett redan uppvärmt register. Utan snabbt digitalt intag kan ingen pool skalas.',

    // System (agent architecture)
    'system.eyebrow': 'Infrastrukturen',
    'system.headline': 'Autonoma agenter. Mänsklig kontroll.',
    'system.subtext':
      'Systemet opererar dygnet runt. Agenter förvärvar, kvalificerar, matchar, kontaktar och följer upp utan manuellt arbete. Koordinatorn supervisar och godkänner via cockpit.',
    'system.status': 'system_status: operational · agents: active · logs: system_actions',
    'system.step1.title': 'Förvärvsagent',
    'system.step1.body':
      'Förare registrerar sig via mobilanpassat chattflöde. Inga CV. Inga konton. Strukturerat intag på under 2 minuter.',
    'system.step2.title': 'Kvalificeringsagent',
    'system.step2.body':
      'Svar om körkort, YKB-status, förarkort, domän, tillgänglighet och skift klassificeras omedelbart som HIGH / MEDIUM / LOW. Ingen mänsklig tolkning behövs.',
    'system.step3.title': 'Matchningsagent',
    'system.step3.body':
      'Mot varje inkommande företagsbehov poängsätts förare i poolen på sex dimensioner: licens, domän, region, tillgänglighet, skift, lön. Shortlist genereras på sekunder.',
    'system.step4.title': 'Kontaktagent',
    'system.step4.body':
      'HIGH-prioriterade leads kontaktas inom definierade tidsfönster. Varje aktion loggas i system_actions med tidsstämpel och agent-ID.',
    'system.step5.title': 'Uppföljningsagent',
    'system.step5.body':
      'not_yet_available → trigger +30 dagar. YKB pågår → trigger +60 dagar. Ofullständiga leads → trigger +24 timmar. Inga manuella påminnelser.',
    'system.step6.title': 'Cockpit — mänsklig governor',
    'system.step6.body':
      'Koordinatorn observerar pipeline, validerar shortlists, åsidosätter vid behov och auditerar alla systemaktioner. Systemet shortlistar. Koordinatorn beslutar.',

    // Why transport
    'why.eyebrow': 'Varför tunga transporter',
    'why.headline': 'Generalist-plattformar fångar inte det som räknas',
    'why.subtext':
      'CE-förare är inte lagerarbetare. Credential-djupet som avgör en juridisk placering fångas inte av generella HR-system — det kräver ett specialiserat intag.',
    'why.card1.title': 'YKB — juridisk förutsättning',
    'why.card1.body':
      'Yrkeskompetensbeviset avgör om en förare lagligt kan köra kommersiellt. Status fångas i steg 3 av intaget: giltig / löper ut / pågår / saknas — före något samtal.',
    'why.card2.title': 'C, CE, D — licenshierarki',
    'why.card2.body':
      'CE täcker C och B. D är separat. Matchningslogiken respekterar hierarkin — en CE-förare kan täcka C-uppdrag. Ingen generalist-ATS hanterar detta automatiskt.',
    'why.card3.title': 'Förarkort — operativt krav',
    'why.card3.body':
      'Färdskrivaren kräver digitalt förarkort. Systemet fångar status vid registrering: ja / nej / ansökt — inte via ett samtal tre dagar senare.',
    'why.card4.title': 'Domän — uppdragstyp',
    'why.card4.body':
      'Långkörning, distribution, tankbil, kyltransport, avfallshantering, anläggning — 8 domäner. Matchning sker mot uppdragets specifika krav, inte en generell lastbilsprofil.',
    'why.card5.title': 'Tillgänglighet — tidskritisk',
    'why.card5.body':
      'Omedelbar / 1 vecka / 1 månad / senare. Systemet triggar automatisk uppföljning baserat på förarens svar. Inga manuella kalenderpåminnelser.',
    'why.card6.title': 'Geografi — Stockholm-first',
    'why.card6.body':
      'Förare klassificeras som Stockholmsregionen eller rörlig. Mobilitetssvar styr matchning mot regionala och nationella uppdrag.',

    // How it works (user-facing flow)
    'how.eyebrow': 'Systemflödet',
    'how.headline': 'Från registrering till shortlist',
    'how.step1.title': 'Föraren öppnar chattflödet på mobilen',
    'how.step1.body':
      'Inga konton. Inga CV. Strukturerade frågor om körkortsklass, YKB, förarkort, domän, tillgänglighet och skift. Under 2 minuter.',
    'how.step2.title': 'Systemet klassificerar omedelbart',
    'how.step2.body':
      'Leadet taggas HIGH / MEDIUM / LOW baserat på licens, YKB-status och tillgänglighet. Föraren ser sin klassificering direkt på bekräftelseskärmen.',
    'how.step3.title': 'Företagsbehovet registreras',
    'how.step3.body':
      'Transportföretaget anger licenskrav, domän, region, skifttyp och önskad tillgänglighet. Inga formulär att fylla i manuellt.',
    'how.step4.title': 'Matchningsagenten poängsätter',
    'how.step4.body':
      'Varje förare i poolen poängsätts mot behovet på sex dimensioner. Shortlistan med de bäst matchade förarna genereras på sekunder.',
    'how.step5.title': 'Kontakt- och uppföljningsagenter aktiveras',
    'how.step5.body':
      'HIGH-leads kontaktas inom definierade tidsfönster. Otillgängliga eller ofullständiga leads schemaläggs automatiskt för uppföljning.',
    'how.step6.title': 'Koordinatorn beslutar via cockpit',
    'how.step6.body':
      'Shortlistan presenteras med poäng, credential-flaggor och kontakthistorik. Koordinatorn validerar och bekräftar placering.',

    // Cockpit
    'cockpit.eyebrow': 'Cockpit',
    'cockpit.headline': 'Mänsklig supervision av ett autonomt system',
    'cockpit.subtext':
      'Cockpit är inte ett rekryteringsverktyg. Det är ett kontrollrum. Koordinatorn ser vad systemet gör — och kan när som helst ingripa.',
    'cockpit.badge': 'system_status: active',
    'cockpit.observe.title': 'Observera',
    'cockpit.observe.body':
      'Live-vy av leads i pipeline, deras klassificering och vilka agenter som är aktiva. Fullständig status utan att behöva ringa runt.',
    'cockpit.validate.title': 'Validera',
    'cockpit.validate.body':
      'Granska shortlists mot företagsbehov. Bekräfta att matchningen stämmer med den faktiska situationen innan kontakt eskaleras.',
    'cockpit.override.title': 'Åsidosätt',
    'cockpit.override.body':
      'Promota eller deprioritera leads manuellt. Justera klassificering om systemets bedömning inte stämmer med verkligheten.',
    'cockpit.audit.title': 'Auditera',
    'cockpit.audit.body':
      'Fullständig logg av alla system_actions — vilken agent gjorde vad, när och varför. Spårbarhet för varje beslut i systemet.',
    'cockpit.note':
      'Cockpit är inte ett rekryteringsdashboard. Det är ett supervisionsgränssnitt. Autonomin förblir hos systemet — beslutet om placering förblir hos koordinatorn.',

    // Differentiation
    'diff.eyebrow': 'Jämförelse',
    'diff.headline': 'Strukturell skillnad mot traditionell bemanning',
    'diff.subtext':
      'Inte en jobbsajt. Inte ett bemanningsföretag. Inte ett ATS. En autonom matchningsinfrastruktur för licensierade transportförare.',
    'diff.left.header': 'Traditionell bemanning',
    'diff.right.header': 'DriverNord',
    'diff.row1.label': 'Credential-insamling',
    'diff.row1.left': 'Telefonsamtal under kontorstid',
    'diff.row1.right': 'Digitalt strukturerat intag — 24/7, under 2 minuter',
    'diff.row2.label': 'YKB-klassificering',
    'diff.row2.left': 'Samlas in av rekryterare, manuellt, via telefon',
    'diff.row2.right': 'Fångas i steg 3 av chattflödet — 4 statusar, strukturerat',
    'diff.row3.label': 'Matchning',
    'diff.row3.left': 'Rekryterare söker manuellt i register',
    'diff.row3.right': 'Scoringsmotor — 6 dimensioner, shortlist på sekunder',
    'diff.row4.label': 'Uppföljning',
    'diff.row4.left': 'Manuella påminnelser, beroende av rekryterare',
    'diff.row4.right': 'Regelbaserade triggers — 24h, 30d, 60d — automatiskt',
    'diff.row5.label': 'Shortlist',
    'diff.row5.left': 'CV-högar att tolka subjektivt',
    'diff.row5.right': 'Rankade profiler med poäng, credential-flaggor, kontakthistorik',

    // Audience
    'audience.eyebrow': 'För vem',
    'audience.headline': 'Förare och transportföretag',
    'audience.driver.eyebrow': 'Förare',
    'audience.driver.title': 'Ingen CV. Inga konton. 2 minuter.',
    'audience.driver.body':
      'Öppna chattflödet på din telefon. Svara på frågor om licens, YKB och tillgänglighet. Vi kontaktar dig — du kontaktar inte oss.',
    'audience.driver.cta': 'Registrera dig nu',
    'audience.company.eyebrow': 'Åkeriföretag',
    'audience.company.title': 'Förkvalificerade förare. Direkt.',
    'audience.company.body':
      'Beskriv ditt uppdrag — licenskrav, YKB, domän, region och skifttyp. Systemet returnerar rankade CE-förare som uppfyller kraven. Koordinatorn bekräftar placering.',
    'audience.company.cta': 'Boka pilot',

    // Credibility
    'cred.eyebrow': 'Systemet i dag',
    'cred.stat1.label': 'Pilotmarknad',
    'cred.stat2.label': 'Stödda licensklasser',
    'cred.stat3.label': 'Primär kvalificeringsfaktor',
    'cred.disclaimer':
      'DriverNord är under uppbyggnad. Pilotåtkomst för utvalda transportföretag och åkeriföretag i Stockholmsregionen.',

    // Final CTA
    'cta.eyebrow': 'Kom igång',
    'cta.headline': 'Boka ett pilotsamtal',
    'cta.subtext':
      'Transportföretag och åkeriföretag i Stockholmsregionen är välkomna att testa systemet.',
    'cta.urgency': 'Pilotprogrammet är öppet för ett begränsat antal aktörer. Platserna fylls på.',
    'cta.primary': 'Boka pilot',
    'cta.secondary': 'Registrera chaufför',

    'footer.privacy': 'Integritetspolicy',
    'footer.contact': 'Kontakt',
  },

  en: {
    'meta.title': 'DriverNord — AI-driven matching infrastructure for heavy transport',
    'meta.description':
      'Autonomous agents acquire, qualify, and match CE drivers against carrier requirements. Coordinators supervise via cockpit.',

    'nav.link.how': 'The system',
    'nav.link.drivers': 'Drivers',
    'nav.link.companies': 'Carriers',
    'nav.cta': 'Book pilot',

    'hero.eyebrow': 'AI-driven matching infrastructure · Heavy transport',
    'hero.headline': 'Autonomous agents qualify and match drivers. You decide.',
    'hero.subtext':
      'The system acquires, classifies, and matches CE drivers against your requirements — around the clock, without CV stacks. A coordinator supervises and approves placements via cockpit.',
    'hero.cta.primary': 'Book pilot',
    'hero.cta.secondary': 'Register driver',
    'hero.cta.tertiary': 'See how it works',

    'problem.eyebrow': 'The market problem',
    'problem.headline': 'Manual recruitment is a structural bottleneck',
    'problem.subtext':
      'Every Swedish staffing agency qualifies drivers by phone. During office hours. Scaled by headcount. Losing qualified CE drivers to whoever responds first.',
    'problem.card1.title': 'Phone screening is the bottleneck',
    'problem.card1.body':
      'Licence class, professional competence status, and availability are collected by voice call — not digitally. Industry standard: one recruiter per 19 drivers.',
    'problem.card2.title': 'Slow responses lose drivers',
    'problem.card2.body':
      'Qualified CE drivers with multiple options choose whoever contacts them first. A 24–72 hour delay equals a lost lead.',
    'problem.card3.title': 'Pools are built manually',
    'problem.card3.body':
      'The fastest operator in Sweden delivers in 90 minutes — but only with a pre-warmed roster. Without fast digital intake, no pool can scale.',

    'system.eyebrow': 'The infrastructure',
    'system.headline': 'Autonomous agents. Human control.',
    'system.subtext':
      'The system operates around the clock. Agents acquire, qualify, match, contact, and follow up without manual work. The coordinator supervises and approves via cockpit.',
    'system.status': 'system_status: operational · agents: active · logs: system_actions',
    'system.step1.title': 'Acquisition agent',
    'system.step1.body':
      'Drivers register via a mobile-first chat flow. No CV. No account. Structured intake in under 2 minutes.',
    'system.step2.title': 'Qualification agent',
    'system.step2.body':
      'Answers on licence, professional competence status, tachograph card, domain, availability, and shift are classified immediately as HIGH / MEDIUM / LOW.',
    'system.step3.title': 'Matching agent',
    'system.step3.body':
      'Against each incoming company requirement, drivers in the pool are scored across six dimensions: licence, domain, region, availability, shift, salary. Shortlist generated in seconds.',
    'system.step4.title': 'Contact agent',
    'system.step4.body':
      'HIGH-priority leads are contacted within defined time windows. Every action is logged in system_actions with timestamp and agent ID.',
    'system.step5.title': 'Follow-up agent',
    'system.step5.body':
      'not_yet_available → trigger +30 days. Professional competence in progress → trigger +60 days. Incomplete leads → trigger +24 hours. No manual reminders.',
    'system.step6.title': 'Cockpit — human governor',
    'system.step6.body':
      'The coordinator observes the pipeline, validates shortlists, overrides when needed, and audits all system actions. The system shortlists. The coordinator decides.',

    'why.eyebrow': 'Why transport-only',
    'why.headline': 'Generalist platforms miss what matters',
    'why.subtext':
      'CE drivers are not warehouse operatives. The credential depth required for a legal placement is not captured by general HR systems — it requires specialised intake.',
    'why.card1.title': 'Professional competence — legal requirement',
    'why.card1.body':
      'The professional competence certificate determines whether a driver can legally operate commercially. Status captured at intake step 3: valid / expiring / in progress / absent.',
    'why.card2.title': 'C, CE, D — licence hierarchy',
    'why.card2.body':
      'CE covers C and B. D is separate. The matching logic respects the hierarchy — a CE driver can cover C assignments. No generalist ATS handles this automatically.',
    'why.card3.title': 'Tachograph card — operational requirement',
    'why.card3.body':
      'The tachograph requires a digital driver card. Status captured at registration: yes / no / applied — not via a call three days later.',
    'why.card4.title': 'Domain — assignment type',
    'why.card4.body':
      'Long-haul, distribution, tanker, refrigerated, waste, construction — 8 domains. Matching against specific assignment requirements, not a generic truck profile.',
    'why.card5.title': 'Availability — time-critical',
    'why.card5.body':
      'Immediate / 1 week / 1 month / later. The system triggers automatic follow-up based on the driver\'s answer. No manual calendar reminders.',
    'why.card6.title': 'Geography — Stockholm-first',
    'why.card6.body':
      'Drivers are classified as Stockholm region or mobile. Mobility answers drive matching against regional and national assignments.',

    'how.eyebrow': 'System flow',
    'how.headline': 'From registration to shortlist',
    'how.step1.title': 'Driver opens the chat flow on mobile',
    'how.step1.body':
      'No accounts. No CV. Structured questions on licence class, professional competence, tachograph card, domain, availability, and shift. Under 2 minutes.',
    'how.step2.title': 'System classifies immediately',
    'how.step2.body':
      'The lead is tagged HIGH / MEDIUM / LOW based on licence, professional competence status, and availability. The driver sees their classification immediately.',
    'how.step3.title': 'Company requirement is registered',
    'how.step3.body':
      'The carrier specifies licence requirement, domain, region, shift type, and availability window. No forms to fill manually.',
    'how.step4.title': 'Matching agent scores',
    'how.step4.body':
      'Every driver in the pool is scored against the requirement across six dimensions. The shortlist is generated in seconds.',
    'how.step5.title': 'Contact and follow-up agents activate',
    'how.step5.body':
      'HIGH leads are contacted within defined windows. Unavailable or incomplete leads are automatically scheduled for follow-up.',
    'how.step6.title': 'Coordinator decides via cockpit',
    'how.step6.body':
      'The shortlist is presented with scores, credential flags, and contact history. The coordinator validates and confirms placement.',

    'cockpit.eyebrow': 'Cockpit',
    'cockpit.headline': 'Human supervision of an autonomous system',
    'cockpit.subtext':
      'Cockpit is not a recruitment tool. It is a control room. The coordinator sees what the system is doing — and can intervene at any time.',
    'cockpit.badge': 'system_status: active',
    'cockpit.observe.title': 'Observe',
    'cockpit.observe.body':
      'Live view of leads in the pipeline, their classification, and which agents are active. Full status without making calls.',
    'cockpit.validate.title': 'Validate',
    'cockpit.validate.body':
      'Review shortlists against company requirements. Confirm the match reflects the actual situation before escalating contact.',
    'cockpit.override.title': 'Override',
    'cockpit.override.body':
      'Manually promote or deprioritise leads. Adjust classification if the system\'s assessment does not match reality.',
    'cockpit.audit.title': 'Audit',
    'cockpit.audit.body':
      'Full log of all system_actions — which agent did what, when, and why. Traceability for every decision in the system.',
    'cockpit.note':
      'Cockpit is not a recruitment dashboard. It is a supervision interface. Autonomy remains with the system — the placement decision remains with the coordinator.',

    'diff.eyebrow': 'Comparison',
    'diff.headline': 'Structural difference from traditional staffing',
    'diff.subtext':
      'Not a job board. Not an ATS. A staffing company for transport and logistics, built on a controlled digital intake and matching process.',
    'diff.left.header': 'Traditional staffing',
    'diff.right.header': 'DriverNord Bemanning',
    'diff.row1.label': 'Credential collection',
    'diff.row1.left': 'Phone call during office hours',
    'diff.row1.right': 'Digital structured intake — 24/7, under 2 minutes',
    'diff.row2.label': 'Professional competence classification',
    'diff.row2.left': 'Collected manually by recruiter via phone',
    'diff.row2.right': 'Captured at intake step 3 — 4 statuses, structured',
    'diff.row3.label': 'Matching',
    'diff.row3.left': 'Recruiter searches roster manually',
    'diff.row3.right': 'Scoring engine — 6 dimensions, shortlist in seconds',
    'diff.row4.label': 'Follow-up',
    'diff.row4.left': 'Manual reminders, dependent on recruiter',
    'diff.row4.right': 'Rule-based triggers — 24h, 30d, 60d — automatic',
    'diff.row5.label': 'Shortlist',
    'diff.row5.left': 'CV stacks to interpret subjectively',
    'diff.row5.right': 'Ranked profiles with scores, credential flags, contact history',

    'audience.eyebrow': 'Who it is for',
    'audience.headline': 'Drivers and transport companies',
    'audience.driver.eyebrow': 'Drivers',
    'audience.driver.title': 'No CV. No account. 2 minutes.',
    'audience.driver.body':
      'Open the chat flow on your phone. Answer questions about licence, professional competence, and availability. We contact you — you do not contact us.',
    'audience.driver.cta': 'Register now',
    'audience.company.eyebrow': 'Carriers',
    'audience.company.title': 'Pre-qualified drivers. Directly.',
    'audience.company.body':
      'Describe your requirement — licence class, professional competence, domain, region, and shift type. The system returns ranked CE drivers who meet the criteria.',
    'audience.company.cta': 'Book pilot',

    'cred.eyebrow': 'The system today',
    'cred.stat1.label': 'Pilot market',
    'cred.stat2.label': 'Supported licence classes',
    'cred.stat3.label': 'Primary qualification factor',
    'cred.disclaimer':
      'DriverNord is in development. Pilot access for selected transport operators in the Stockholm region.',

    'cta.eyebrow': 'Get started',
    'cta.headline': 'Book a pilot conversation',
    'cta.subtext':
      'Transport operators in the Stockholm region are welcome to test the system.',
    'cta.urgency': 'The pilot programme is open to a limited number of operators. Places are filling.',
    'cta.primary': 'Book pilot',
    'cta.secondary': 'Register driver',

    'footer.privacy': 'Privacy policy',
    'footer.contact': 'Contact',
  },

  fr: {
    'meta.title': 'DriverNord — Infrastructure de mise en relation IA pour le transport lourd',
    'meta.description':
      'Des agents autonomes acquièrent, qualifient et mettent en relation des chauffeurs CE avec les transporteurs. Le coordinateur supervise via cockpit.',

    'nav.link.how': 'Le système',
    'nav.link.drivers': 'Chauffeurs',
    'nav.link.companies': 'Transporteurs',
    'nav.cta': 'Réserver un pilote',

    'hero.eyebrow': 'Infrastructure IA de mise en relation · Transport lourd',
    'hero.headline': 'Des agents autonomes qualifient et mettent en relation les chauffeurs. Vous décidez.',
    'hero.subtext':
      'Le système acquiert, classe et met en relation des chauffeurs CE selon vos exigences — 24h/24, sans pile de CV. Un coordinateur supervise et valide les placements via cockpit.',
    'hero.cta.primary': 'Réserver un pilote',
    'hero.cta.secondary': 'Inscrire un chauffeur',
    'hero.cta.tertiary': 'Voir comment ça marche',

    'problem.eyebrow': 'Le problème du marché',
    'problem.headline': 'Le recrutement manuel est un goulot d\'étranglement structurel',
    'problem.subtext':
      'Toutes les agences suédoises qualifient les chauffeurs par téléphone. Pendant les heures de bureau. Scalé par effectif. En perdant les chauffeurs CE qualifiés au profit de celui qui répond en premier.',
    'problem.card1.title': 'Le tri téléphonique est le goulot',
    'problem.card1.body':
      'Le type de permis, le statut de qualification et la disponibilité sont collectés par appel vocal — pas numériquement. Norme : un recruteur pour 19 chauffeurs.',
    'problem.card2.title': 'Les réponses tardives font perdre les chauffeurs',
    'problem.card2.body':
      'Les chauffeurs CE qualifiés avec plusieurs options choisissent celui qui les contacte en premier. Un délai de 24 à 72 heures équivaut à un lead perdu.',
    'problem.card3.title': 'Les viviers se construisent manuellement',
    'problem.card3.body':
      'L\'acteur le plus rapide de Suède livre en 90 minutes — mais seulement avec un vivier déjà constitué. Sans intake numérique rapide, aucun vivier ne peut évoluer.',

    'system.eyebrow': 'L\'infrastructure',
    'system.headline': 'Agents autonomes. Contrôle humain.',
    'system.subtext':
      'Le système fonctionne 24h/24. Les agents acquièrent, qualifient, mettent en relation, contactent et assurent le suivi sans travail manuel. Le coordinateur supervise et valide via cockpit.',
    'system.status': 'system_status: operational · agents: active · logs: system_actions',
    'system.step1.title': 'Agent d\'acquisition',
    'system.step1.body':
      'Les chauffeurs s\'inscrivent via un flux de chat mobile. Pas de CV. Pas de compte. Intake structuré en moins de 2 minutes.',
    'system.step2.title': 'Agent de qualification',
    'system.step2.body':
      'Les réponses sur le permis, la qualification, la carte conducteur, le domaine, la disponibilité et le poste sont classées immédiatement : HIGH / MEDIUM / LOW.',
    'system.step3.title': 'Agent de mise en relation',
    'system.step3.body':
      'Pour chaque besoin entrant, les chauffeurs du vivier sont notés sur six dimensions. La shortlist est générée en secondes.',
    'system.step4.title': 'Agent de contact',
    'system.step4.body':
      'Les leads HIGH-prioritaires sont contactés dans des fenêtres de temps définies. Chaque action est enregistrée dans system_actions.',
    'system.step5.title': 'Agent de suivi',
    'system.step5.body':
      'not_yet_available → déclencheur +30 jours. Qualification en cours → +60 jours. Leads incomplets → +24 heures. Pas de rappels manuels.',
    'system.step6.title': 'Cockpit — gouverneur humain',
    'system.step6.body':
      'Le coordinateur observe le pipeline, valide les shortlists, remplace si nécessaire et audite toutes les actions système. Le système shortliste. Le coordinateur décide.',

    'why.eyebrow': 'Pourquoi le transport uniquement',
    'why.headline': 'Les plateformes généralistes ratent ce qui compte',
    'why.subtext':
      'Les chauffeurs CE ne sont pas des opérateurs d\'entrepôt. La profondeur des credentials nécessaires à un placement légal n\'est pas capturée par les systèmes RH généraux.',
    'why.card1.title': 'Qualification professionnelle — obligation légale',
    'why.card1.body':
      'La certification professionnelle détermine si un chauffeur peut légalement conduire commercialement. Statut capturé à l\'étape 3 : valide / expire / en cours / absent.',
    'why.card2.title': 'C, CE, D — hiérarchie de permis',
    'why.card2.body':
      'CE couvre C et B. D est séparé. La logique de mise en relation respecte la hiérarchie — un chauffeur CE peut couvrir des missions C.',
    'why.card3.title': 'Carte conducteur — exigence opérationnelle',
    'why.card3.body':
      'Le tachygraphe exige une carte conducteur numérique. Statut capturé à l\'inscription : oui / non / en cours — pas via un appel trois jours plus tard.',
    'why.card4.title': 'Domaine — type de mission',
    'why.card4.body':
      'Longue distance, distribution, citerne, frigorifique, déchets, chantier — 8 domaines. Mise en relation selon les exigences spécifiques de la mission.',
    'why.card5.title': 'Disponibilité — critique dans le temps',
    'why.card5.body':
      'Immédiat / 1 semaine / 1 mois / plus tard. Le système déclenche un suivi automatique selon la réponse du chauffeur.',
    'why.card6.title': 'Géographie — Stockholm en premier',
    'why.card6.body':
      'Les chauffeurs sont classés comme région de Stockholm ou mobiles. Les réponses de mobilité orientent la mise en relation vers les missions régionales et nationales.',

    'how.eyebrow': 'Flux du système',
    'how.headline': 'De l\'inscription à la shortlist',
    'how.step1.title': 'Le chauffeur ouvre le flux de chat sur mobile',
    'how.step1.body':
      'Pas de compte. Pas de CV. Questions structurées sur le permis, la qualification, la carte, le domaine, la disponibilité et le poste. Moins de 2 minutes.',
    'how.step2.title': 'Le système classe immédiatement',
    'how.step2.body':
      'Le lead est tagué HIGH / MEDIUM / LOW selon le permis, le statut de qualification et la disponibilité. Le chauffeur voit sa classification immédiatement.',
    'how.step3.title': 'Le besoin de l\'entreprise est enregistré',
    'how.step3.body':
      'Le transporteur indique le permis requis, le domaine, la région, le type de poste et la disponibilité souhaitée.',
    'how.step4.title': 'L\'agent de mise en relation note',
    'how.step4.body':
      'Chaque chauffeur du vivier est noté selon six dimensions. La shortlist est générée en secondes.',
    'how.step5.title': 'Les agents de contact et de suivi s\'activent',
    'how.step5.body':
      'Les leads HIGH sont contactés dans des fenêtres définies. Les leads indisponibles ou incomplets sont automatiquement programmés pour un suivi.',
    'how.step6.title': 'Le coordinateur décide via cockpit',
    'how.step6.body':
      'La shortlist est présentée avec les scores, les flags credentials et l\'historique de contact. Le coordinateur valide et confirme le placement.',

    'cockpit.eyebrow': 'Cockpit',
    'cockpit.headline': 'Supervision humaine d\'un système autonome',
    'cockpit.subtext':
      'Le cockpit n\'est pas un outil de recrutement. C\'est une salle de contrôle. Le coordinateur voit ce que fait le système — et peut intervenir à tout moment.',
    'cockpit.badge': 'system_status: active',
    'cockpit.observe.title': 'Observer',
    'cockpit.observe.body':
      'Vue en direct des leads dans le pipeline, leur classification et les agents actifs. Statut complet sans passer d\'appels.',
    'cockpit.validate.title': 'Valider',
    'cockpit.validate.body':
      'Examiner les shortlists par rapport aux besoins. Confirmer que la mise en relation correspond à la situation réelle avant d\'escalader le contact.',
    'cockpit.override.title': 'Remplacer',
    'cockpit.override.body':
      'Promouvoir ou déprioriser manuellement des leads. Ajuster la classification si l\'évaluation du système ne correspond pas à la réalité.',
    'cockpit.audit.title': 'Auditer',
    'cockpit.audit.body':
      'Journal complet de toutes les system_actions — quel agent a fait quoi, quand et pourquoi. Traçabilité de chaque décision.',
    'cockpit.note':
      'Le cockpit n\'est pas un dashboard de recrutement. C\'est une interface de supervision. L\'autonomie reste avec le système — la décision de placement reste avec le coordinateur.',

    'diff.eyebrow': 'Comparaison',
    'diff.headline': 'Différence structurelle avec le recrutement traditionnel',
    'diff.subtext':
      'Pas un site d\'emploi. Pas une agence d\'intérim. Pas un ATS. Une infrastructure de mise en relation autonome pour chauffeurs licenciés.',
    'diff.left.header': 'Recrutement traditionnel',
    'diff.right.header': 'DriverNord',
    'diff.row1.label': 'Collecte des credentials',
    'diff.row1.left': 'Appel téléphonique pendant les heures de bureau',
    'diff.row1.right': 'Intake numérique structuré — 24/7, moins de 2 minutes',
    'diff.row2.label': 'Classification de la qualification',
    'diff.row2.left': 'Collectée manuellement par le recruteur par téléphone',
    'diff.row2.right': 'Capturée à l\'étape 3 — 4 statuts, structuré',
    'diff.row3.label': 'Mise en relation',
    'diff.row3.left': 'Le recruteur cherche manuellement dans le vivier',
    'diff.row3.right': 'Moteur de scoring — 6 dimensions, shortlist en secondes',
    'diff.row4.label': 'Suivi',
    'diff.row4.left': 'Rappels manuels, dépendants du recruteur',
    'diff.row4.right': 'Déclencheurs basés sur des règles — 24h, 30j, 60j — automatique',
    'diff.row5.label': 'Shortlist',
    'diff.row5.left': 'Piles de CV à interpréter subjectivement',
    'diff.row5.right': 'Profils classés avec scores, flags credentials, historique de contact',

    'audience.eyebrow': 'Pour qui',
    'audience.headline': 'Chauffeurs et transporteurs',
    'audience.driver.eyebrow': 'Chauffeurs',
    'audience.driver.title': 'Pas de CV. Pas de compte. 2 minutes.',
    'audience.driver.body':
      'Ouvrez le flux de chat sur votre téléphone. Répondez aux questions sur le permis, la qualification et la disponibilité. Nous vous contactons — pas l\'inverse.',
    'audience.driver.cta': 'S\'inscrire maintenant',
    'audience.company.eyebrow': 'Transporteurs',
    'audience.company.title': 'Chauffeurs pré-qualifiés. Directement.',
    'audience.company.body':
      'Décrivez votre besoin — permis, qualification, domaine, région et type de poste. Le système retourne des chauffeurs CE classés répondant aux critères.',
    'audience.company.cta': 'Réserver un pilote',

    'cred.eyebrow': 'Le système aujourd\'hui',
    'cred.stat1.label': 'Marché pilote',
    'cred.stat2.label': 'Classes de permis prises en charge',
    'cred.stat3.label': 'Facteur de qualification principal',
    'cred.disclaimer':
      'DriverNord est en cours de développement. Accès pilote pour un nombre limité de transporteurs dans la région de Stockholm.',

    'cta.eyebrow': 'Commencer',
    'cta.headline': 'Réserver une conversation pilote',
    'cta.subtext':
      'Les transporteurs de la région de Stockholm sont invités à tester le système.',
    'cta.urgency': 'Le programme pilote est ouvert à un nombre limité d\'opérateurs. Les places se remplissent.',
    'cta.primary': 'Réserver un pilote',
    'cta.secondary': 'Inscrire un chauffeur',

    'footer.privacy': 'Politique de confidentialité',
    'footer.contact': 'Contact',
  },
}
