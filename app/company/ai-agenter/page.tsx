import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicHeader } from '@/components/PublicHeader'
import { LegalFooter } from '@/components/LegalFooter'

export const metadata: Metadata = {
  metadataBase: new URL('https://drivernord.com'),
  title: 'AI-agenter för chaufförsmatchning — DriverNord',
  description:
    'Teknisk arkitektur bakom DriverNords automatiserade pipeline: fem AI-agenter klassificerar, shortlistar och loggar CE-förare i realtid — med mänsklig supervision via cockpit.',
  openGraph: {
    title: 'AI-agenter för chaufförsmatchning — DriverNord',
    description: 'Fem autonoma agenter klassificerar och matchar CE-chaufförer i realtid. Koordinatorn behåller full kontroll via cockpit.',
    url: 'https://drivernord.com/company/ai-agenter',
    siteName: 'DriverNord',
    locale: 'sv_SE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI-agenter för chaufförsmatchning — DriverNord',
    description: 'Fem autonoma agenter klassificerar och matchar CE-chaufförer i realtid. Koordinatorn behåller full kontroll via cockpit.',
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────



interface AgentCardProps {
  number: string
  name: string
  trigger: string
  action: string
  output: string
}

function AgentCard({ number, name, trigger, action, output }: AgentCardProps) {
  return (
    <div className="bg-white rounded-xl border border-blue-100 p-6">
      <div className="flex items-start gap-4">
        <span className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm flex-shrink-0">
          {number}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-3">{name}</h3>
          <dl className="space-y-1.5 text-sm">
            <div className="flex gap-2">
              <dt className="text-gray-400 flex-shrink-0 w-16">Trigger</dt>
              <dd className="text-gray-700">{trigger}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-400 flex-shrink-0 w-16">Utför</dt>
              <dd className="text-gray-700">{action}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-400 flex-shrink-0 w-16">Returnerar</dt>
              <dd className="text-gray-700">{output}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}

interface FlowStepProps {
  number: number
  title: string
  body: string
  isLast?: boolean
  tag?: string
}

function FlowStep({ number, title, body, isLast, tag }: FlowStepProps) {
  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm z-10 ring-2 ring-blue-200">
          {number}
        </div>
        {!isLast && <div className="w-px flex-1 min-h-8 bg-blue-200 mt-2" />}
      </div>
      <div className="pb-8">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {tag && (
            <span className="text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
              {tag}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
      </div>
    </div>
  )
}

interface RuleRowProps {
  rule: string
  description: string
}

function RuleRow({ rule, description }: RuleRowProps) {
  return (
    <div className="flex gap-4 py-4 border-b border-gray-100 last:border-0">
      <div className="flex-shrink-0">
        <svg
          className="w-5 h-5 text-blue-500 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div>
        <p className="font-medium text-gray-900 text-sm">{rule}</p>
        <p className="text-sm text-gray-500 leading-relaxed mt-0.5">{description}</p>
      </div>
    </div>
  )
}

interface SupervisionCardProps {
  icon: React.ReactNode
  title: string
  body: string
}

function SupervisionCard({ icon, title, body }: SupervisionCardProps) {
  return (
    <div className="bg-blue-800 rounded-xl p-6">
      <div className="w-10 h-10 rounded-lg bg-blue-700 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-blue-200 leading-relaxed">{body}</p>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function EyeIcon() {
  return (
    <svg className="w-5 h-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg className="w-5 h-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg className="w-5 h-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg className="w-5 h-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AiAgenterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader />

      <main className="flex-1">

        {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
        <section className="bg-white pt-16 pb-14 px-5">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-4">
              Teknisk arkitektur
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-5 max-w-2xl">
              AI-agenter för chaufförsmatchning inom tung transport
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mb-8">
              DriverNord driver ett pipeline av autonoma agenter som klassificerar, shortlistar och loggar
              CE-förare — utan manuella mellansteg. En koordinator övervakar varje beslut via cockpit.
            </p>
            <div className="flex flex-wrap gap-2">
              {['CE · C · D', 'YKB-klassificering', 'Poängsättning', 'Deduplering', 'Loggning'].map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1"
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-6 max-w-2xl">
              Det här beskriver den tekniska matchningsmotorn för chaufförsspåret (CE/C/D).
              Lagerspåret (plock, pack, lastning/lossning, enklare terminalarbete) hanteras idag
              manuellt — se{' '}
              <Link href="/lagerlucka" className="text-blue-600 hover:underline">
                DriverNord Lagerlucka
              </Link>
              .
            </p>
          </div>
        </section>

        {/* ── 2. Agent overview ───────────────────────────────────────────── */}
        <section className="bg-blue-50 py-16 px-5">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-3">
              Systemöversikt
            </p>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Fem agenter. En pipeline.</h2>
            <p className="text-gray-500 mb-10 max-w-xl">
              Varje agent har ett avgränsat ansvar. De kommunicerar via databasen — ingen direkt koppling sinsemellan.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <AgentCard
                number="1"
                name="Inmatningsagent (API)"
                trigger="Förare skickar svar via /chat-flödet"
                action="Validerar svar, klassificerar profil (HIGH / MEDIUM / LOW), sparar lead i databasen"
                output="lead_id + lead_priority returneras omedelbart"
              />
              <AgentCard
                number="2"
                name="Matchningsagent"
                trigger="Ny company_need skapas eller körs manuellt av koordinator"
                action="Söker tillgängliga förare, poängsätter mot uppdragets krav (körkortsklass, YKB, domän, plats), shortlistar de bästa kandidaterna"
                output="Shortlist med rankade förarprofiler"
              />
              <AgentCard
                number="3"
                name="Kontaktagent"
                trigger="Matchningsagenten avslutar — fire-and-forget"
                action="Filtrerar shortlist (poäng ≥ 60, YKB-status, tillgänglighet, deduplering 14 d / 3 d nödläge), loggar varje beslut"
                output="Kontaktförslag till cockpit (standardläge: suggest)"
              />
              <AgentCard
                number="4"
                name="Uppföljningsagent"
                trigger="Schemalagd follow_up_at-tidsstämpel i databasen"
                action="Skickar påminnelsemeddelanden till förare vars tillgänglighet eller YKB-status förändrats, respekterar 7 d deduplering"
                output="Uppföljningslogg i system_actions"
              />
              <AgentCard
                number="5"
                name="Cockpit-observatör"
                trigger="Koordinatorn öppnar cockpit (uppdateras var 15:e sekund)"
                action="Hämtar pipeline-statistik, varningar, väntande åtgärder och revisionslogg"
                output="Realtidsöversikt — ingen agent, ingen automat"
              />
            </div>
          </div>
        </section>

        {/* ── 3. Step-by-step flow ────────────────────────────────────────── */}
        <section className="bg-white py-16 px-5">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-3">
              Flöde steg för steg
            </p>
            <h2 className="text-2xl font-bold text-gray-900 mb-10">Från registrering till kontaktförslag</h2>

            <div className="max-w-2xl">
              <FlowStep
                number={1}
                title="Föraren registrerar sig via /chat"
                body="Svarar på 8–10 frågor: körkortsklass, YKB-status, domän (distribution, bygg, bulk), plats, tillgänglighet och kontaktuppgifter. Inget CV krävs."
              />
              <FlowStep
                number={2}
                title="Omedelbar klassificering"
                body="Inmatningsagenten beräknar ett poäng baserat på plats, licens, YKB och tillgänglighet. Profilen märks HIGH, MEDIUM eller LOW. Resultatet visas direkt på bekräftelseskärmen."
              />
              <FlowStep
                number={3}
                title="Matchning mot aktiva uppdrag"
                body="Matchningsagenten jämför förarens profil mot varje öppet company_need. Sex faktorer poängsätts: körkortsklass, YKB, domänmatch, plats, tillgänglighet och erfarenhet."
              />
              <FlowStep
                number={4}
                title="Kontaktfiltrering"
                body="Kontaktagenten kontrollerar fyra villkor innan den föreslår kontakt: poäng ≥ 60, YKB inte 'pågående', tillgänglighet inte 'ännu ej', och ingen kontakt inom deduplieringsfönstret."
              />
              <FlowStep
                number={5}
                title="Kontaktförslag loggas"
                body="Varje godkänt eller avvisat beslut skrivs till system_actions med action_type, status, indata och utdata. Inget försvinner ur historiken."
                tag="Kontakt är för närvarande simulerad"
              />
              <FlowStep
                number={6}
                title="Uppföljning schemaläggs"
                body="Om en förare är otillgänglig nu men förväntas bli det — eller håller på med YKB — sätts en follow_up_at-tidsstämpel. Uppföljningsagenten återkommer automatiskt."
                isLast
              />
            </div>

            <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-5 max-w-2xl">
              <p className="text-sm text-amber-800 leading-relaxed">
                <span className="font-semibold">Kontaktautomation är för närvarande simulerad.</span>{' '}
                Systemet beräknar och loggar alla kontaktbeslut, men skickar inga verkliga SMS eller e-postmeddelanden
                i detta skede. Koordinatorn ser kontaktförslagen i cockpit och agerar manuellt.
              </p>
            </div>
          </div>
        </section>

        {/* ── 4. Human supervision ────────────────────────────────────────── */}
        <section className="bg-blue-900 py-16 px-5">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-3">
              Mänsklig supervision
            </p>
            <h2 className="text-2xl font-bold text-white mb-3">Koordinatorn styr. Agenten föreslår.</h2>
            <p className="text-blue-300 mb-10 max-w-xl">
              Autonomi och kontroll är inte motsatser. Cockpit ger koordinatorn fullständig insyn och
              rätt att godkänna, avbryta eller åsidosätta varje agentbeslut.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <SupervisionCard
                icon={<EyeIcon />}
                title="Observera"
                body="Realtidsöversikt av pipeline: pool, shortlistade, kontaktade och intresserade förare. Uppdateras var 15:e sekund."
              />
              <SupervisionCard
                icon={<CheckCircleIcon />}
                title="Validera"
                body="Väntande kontaktförslag visas i cockpit. Koordinatorn godkänner eller avfärdar varje förslag innan det verkställs."
              />
              <SupervisionCard
                icon={<ShieldIcon />}
                title="Åsidosätt"
                body="Koordinatorn kan pausa agenter, ändra kontaktläge (suggest / auto / hybrid) eller manuellt trigga matchning för ett specifikt uppdrag."
              />
              <SupervisionCard
                icon={<ListIcon />}
                title="Granska"
                body="Fullständig revisionslogg i system_actions: vilken agent agerade, mot vem, med vilket resultat — och exakt tidsstämpel."
              />
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {['Standardläge: suggest', '15 s polling', 'Fullständig loggning', 'Manuell override'].map((item) => (
                <span key={item} className="text-xs font-medium bg-blue-800 text-blue-300 border border-blue-700 rounded-full px-3 py-1">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. Safety rules ─────────────────────────────────────────────── */}
        <section className="bg-white py-16 px-5">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-3">
              Skyddsregler
            </p>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Inbyggda gränser</h2>
            <p className="text-gray-500 mb-10 max-w-xl">
              Agenterna är byggda med hårda stoppregler som inte kan åsidosättas — varken av koordinatorn eller av systemet självt.
            </p>

            <div className="max-w-2xl">
              <RuleRow
                rule="Poänsgräns ≥ 60"
                description="Förare med ett matchningspoäng under 60 föreslås aldrig för kontakt, oavsett hur brådskande uppdraget är."
              />
              <RuleRow
                rule="YKB 'pågående' — hoppas över"
                description="Om föraren har angett att YKB-utbildningen pågår blockeras kontaktförslaget tills statusen uppdateras."
              />
              <RuleRow
                rule="Tillgänglighet 'ännu ej' — hoppas över"
                description="Förare som inte är tillgängliga nu kontaktas inte — de schemaläggs för uppföljning via follow_up_at istället."
              />
              <RuleRow
                rule="Deduplering 14 dagar (standard)"
                description="Samma förare kontaktas inte inom 14 dagar för ett standarduppdrag, oavsett hur många uppdrag som är aktiva."
              />
              <RuleRow
                rule="Deduplering 3 dagar (nödläge)"
                description="Vid ett company_need märkt som emergency kortas deduplieringsfönstret till 3 dagar — men gränsen kvarstår."
              />
              <RuleRow
                rule="Alla beslut loggas"
                description="Varje agentbeslut — godkänt, avvisat eller felat — skrivs till system_actions med fullständigt sammanhang. Ingenting raderas."
              />
            </div>
          </div>
        </section>

        {/* ── 6. CTA ──────────────────────────────────────────────────────── */}
        <section className="bg-blue-50 py-16 px-5">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Redo att se systemet i praktiken?</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Registrera din förarprofil och se hur klassificeringen fungerar — direkt i bekräftelseskärmen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/chat"
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Registrera förarprofil
              </Link>
              <Link
                href="/company"
                className="bg-white text-blue-700 border border-blue-200 px-8 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
              >
                Tillbaka till start
              </Link>
            </div>
          </div>
        </section>

      </main>

      <LegalFooter />
    </div>
  )
}
