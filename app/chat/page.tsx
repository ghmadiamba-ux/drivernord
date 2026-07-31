'use client';

import { useEffect, useRef } from 'react';
import { useChat } from '../../hooks/useChat';
import { STEP_CONFIG } from '../../lib/stepConfig';
import { getStepIndex } from '../../lib/conversation';
import { QuestionCard } from '../../components/QuestionCard';
import { OptionButton } from '../../components/OptionButton';
import { TextInputStep } from '../../components/TextInputStep';
import type { BilingualString } from '../../lib/stepConfig';
import { trackEvent } from '../../lib/analytics/metaPixel';

// ─── Shared dark-bg shell ─────────────────────────────────────────────────────

function ChatShell({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div className="min-h-screen bg-[#0b1d35] flex flex-col">
      <div className="flex-shrink-0 px-5 py-4">
        <span className="text-white/60 font-semibold text-sm">DriverNord</span>
      </div>
      <div className={`flex-1 flex flex-col justify-center px-4 ${compact ? 'pb-6' : 'pb-8'}`}>
        {children}
        <p className="text-center text-blue-300/30 text-[11px] mt-5 px-4">
          Dina uppgifter delas aldrig med företag utan ditt godkännande
        </p>
      </div>
    </div>
  );
}

function ChatCard({ children, progressFull = false }: { children: React.ReactNode; progressFull?: boolean }) {
  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className={`h-[3px] ${progressFull ? 'bg-blue-500' : 'bg-gray-100'} w-full`} />
      <div className="px-6 py-7">
        {children}
      </div>
    </div>
  );
}

// ─── Confirmation screen copy ─────────────────────────────────────────────────

type Lang = 'sv' | 'en';
type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

const PRIORITY_COPY: Record<Priority, Record<Lang, { badge: string; message: string; badgeColor: string }>> = {
  HIGH: {
    sv: {
      badge: 'Hög prioritet',
      message:
        'Din profil är starkt prioriterad. Vi kontaktar dig så snart en relevant matchning finns.',
      badgeColor: 'bg-green-50 text-green-700 border-green-200',
    },
    en: {
      badge: 'High priority',
      message:
        'Your profile is high priority. We will contact you as soon as a relevant match is found.',
      badgeColor: 'bg-green-50 text-green-700 border-green-200',
    },
  },
  MEDIUM: {
    sv: {
      badge: 'Matchning pågår',
      message:
        'Din profil är registrerad. Vi följer upp när din tillgänglighet eller YKB-status passar rätt uppdrag.',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    en: {
      badge: 'Matching in progress',
      message:
        'Your profile is registered. We will follow up when your availability or professional competence status matches the right assignment.',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    },
  },
  LOW: {
    sv: {
      badge: 'Profil sparad',
      message:
        'Din profil är sparad. Vi kontaktar dig när ett relevant uppdrag dyker upp.',
      badgeColor: 'bg-gray-100 text-gray-600 border-gray-200',
    },
    en: {
      badge: 'Profile saved',
      message:
        'Your profile is saved. We will contact you when a relevant assignment comes up.',
      badgeColor: 'bg-gray-100 text-gray-600 border-gray-200',
    },
  },
};

const GENERIC_MESSAGE: Record<Lang, string> = {
  sv: 'Vi har registrerat din profil och kontaktar dig när ett relevant uppdrag dyker upp.',
  en: 'We have registered your profile and will contact you when a relevant assignment comes up.',
};

const MATCHING_CONTEXT: Record<Lang, string> = {
  sv: 'Vi matchar baserat på körkortsklass, YKB-status och tillgänglighet. Inget CV krävdes.',
  en: 'Matching is based on licence class, professional competence status, and availability. No CV was required.',
};

const GDPR_NOTE: Record<Lang, string> = {
  sv: 'Dina uppgifter delas inte med tredje part. Du kan avregistrera dig när som helst.',
  en: 'Your information is not shared with third parties. You can withdraw at any time.',
};

// ─── Confirmation screen ──────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg
      className="w-5 h-5 text-blue-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

interface ConfirmationScreenProps {
  lang: Lang;
  leadPriority: Priority | null;
}

function ConfirmationScreen({ lang, leadPriority }: ConfirmationScreenProps) {
  const priorityCopy = leadPriority ? PRIORITY_COPY[leadPriority][lang] : null;

  return (
    <ChatShell>
      <ChatCard progressFull>
        {/* Check icon */}
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-5 flex-shrink-0">
          <CheckIcon />
        </div>

        {/* Eyebrow */}
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-500 mb-3">
          {lang === 'sv' ? 'Registrering klar' : 'Registration complete'}
        </p>

        {/* Headline */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4 leading-snug">
          {lang === 'sv' ? 'Tack!' : 'Thank you!'}
        </h1>

        {/* Priority badge */}
        {priorityCopy && (
          <span
            className={`inline-flex items-center self-start border rounded-full px-3 py-1 text-xs font-semibold mb-4 ${priorityCopy.badgeColor}`}
          >
            {priorityCopy.badge}
          </span>
        )}

        {/* Main message */}
        <p className="text-base text-gray-800 leading-relaxed mb-7">
          {priorityCopy ? priorityCopy.message : GENERIC_MESSAGE[lang]}
        </p>

        {/* Secondary context */}
        <div className="border-t border-gray-100 pt-5 flex flex-col gap-3">
          <p className="text-sm text-gray-500 leading-relaxed">
            {MATCHING_CONTEXT[lang]}
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">
            {GDPR_NOTE[lang]}
          </p>
        </div>

        {/* Logistikklubb community CTA */}
        <div className="border-t border-gray-100 pt-5">
          <p className="text-sm font-semibold text-gray-900 mb-1">
            {lang === 'sv'
              ? 'Vill du också gå med i DriverNord Logistikklubb?'
              : 'Want to join the DriverNord Logistikklubb community?'}
          </p>
          <p className="text-xs text-gray-500 leading-relaxed mb-4">
            {lang === 'sv'
              ? 'Gratis WhatsApp-nätverk för alla i transport, lager och logistik i Sverige.'
              : 'Free WhatsApp network for everyone in Swedish transport and logistics.'}
          </p>
          <a
            href={process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL ?? 'https://chat.whatsapp.com/HC2QY2W32CYIIXpxawXSOG'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('DriverCommunityCTAAfterIntakeClicked')}
            className="inline-block bg-green-600 hover:bg-green-500 active:bg-green-700
                       text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            {lang === 'sv' ? 'Gå med i Logistikklubben' : 'Join the Logistikklubb'}
          </a>
        </div>
      </ChatCard>
    </ChatShell>
  );
}

// ─── Consent screen ───────────────────────────────────────────────────────────

interface ConsentScreenProps {
  lang: Lang;
  consentText: string;
  heading: string;
  loading: boolean;
  error: string | null;
  onAccept: () => void;
}

function ConsentScreen({ lang, consentText, heading, loading, error, onAccept }: ConsentScreenProps) {
  return (
    <ChatShell>
      <ChatCard progressFull>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400 mb-4">
          Steg 7 av 7
        </p>

        <h1 className="text-xl font-bold text-gray-900 mb-5 leading-snug">
          {heading}
        </h1>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5">
          <p className="text-sm text-gray-700 leading-relaxed">{consentText}</p>
        </div>

        {error && (
          <p className="text-sm text-red-400 mb-4">
            {lang === 'sv'
              ? 'Något gick fel. Försök igen.'
              : 'Something went wrong. Please try again.'}
          </p>
        )}

        <button
          onClick={onAccept}
          disabled={loading}
          className="
            w-full py-4 px-6 rounded-xl
            bg-blue-600 text-white font-semibold text-base
            hover:bg-blue-700
            active:bg-blue-800 active:scale-[0.99]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-150
          "
        >
          {loading
            ? (lang === 'sv' ? 'Väntar…' : 'Please wait…')
            : (lang === 'sv' ? 'Jag samtycker' : 'I agree')}
        </button>

        <p className="text-xs text-gray-400 mt-4 leading-relaxed">
          {lang === 'sv'
            ? 'Du kan återkalla ditt samtycke när som helst genom att kontakta oss.'
            : 'You can withdraw your consent at any time by contacting us.'}
        </p>
      </ChatCard>
    </ChatShell>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { step, lang, loading, error, leadPriority, submitAnswer, confirmLead } = useChat();

  const config = STEP_CONFIG[step];

  const chatStartedFired = useRef(false);
  useEffect(() => {
    if (!chatStartedFired.current) {
      chatStartedFired.current = true;
      trackEvent('DriverChatStarted');
    }
  }, []);

  const registrationFired = useRef(false);
  useEffect(() => {
    if (step === 'confirmation') {
      confirmLead();
      if (!registrationFired.current) {
        registrationFired.current = true;
        trackEvent('DriverRegistrationCompleted');
      }
    }
  }, [step, confirmLead]);

  if (!config) return null;

  const t = (text: BilingualString) => (step === 'lang' ? text.sv : text[lang]);

  const progress = getStepIndex(step);

  // ── Consent step ──────────────────────────────────────────────────────────
  if (config.type === 'consent') {
    return (
      <ConsentScreen
        lang={lang}
        heading={t(config.question)}
        consentText={t(config.message ?? { sv: '', en: '' })}
        loading={loading}
        error={error}
        onAccept={() => submitAnswer('accepted')}
      />
    );
  }

  // ── Terminal steps ────────────────────────────────────────────────────────
  if (config.type === 'terminal') {
    if (step === 'confirmation') {
      return <ConfirmationScreen lang={lang} leadPriority={leadPriority} />;
    }

    return (
      <ChatShell>
        <ChatCard>
          <h1 className="text-2xl font-bold text-gray-900 mb-4 leading-snug">
            {t(config.question)}
          </h1>
          {config.message && (
            <p className="text-base text-gray-500 leading-relaxed">
              {t(config.message)}
            </p>
          )}
        </ChatCard>
      </ChatShell>
    );
  }

  // ── Regular question steps ────────────────────────────────────────────────
  return (
    <QuestionCard question={t(config.question)} progress={progress}>
      {/* Error state */}
      {error && (
        <p className="text-sm text-red-400 mb-4">
          {lang === 'sv'
            ? 'Något gick fel. Försök igen.'
            : 'Something went wrong. Please try again.'}
        </p>
      )}

      {/* Options */}
      {config.type === 'options' && (
        <>
          {/* Welcome step subtitle */}
          {step === 'lang' && (
            <p className="text-sm text-gray-500 leading-relaxed mb-5 -mt-1">
              Registrera din chaufförsprofil. Tar ca 3 minuter och kräver inget CV.
            </p>
          )}

          {config.options?.map((opt) => (
            <OptionButton
              key={opt.value}
              label={t(opt.label)}
              onClick={() => submitAnswer(opt.value)}
              disabled={loading}
            />
          ))}
        </>
      )}

      {/* Text / email inputs */}
      {(config.type === 'text' || config.type === 'email') && (
        <>
          {/* Phone step — address the fear of unwanted calls */}
          {step === 'phone' && (
            <p className="text-sm text-gray-500 leading-relaxed mb-3">
              {lang === 'sv'
                ? 'Vi hör av oss bara när vi har ett relevant uppdrag. Aldrig oönskat.'
                : 'We only get in touch when we have a relevant match. Never unsolicited.'}
            </p>
          )}

          <TextInputStep
            inputMode={config.inputMode ?? 'text'}
            placeholder={t(config.placeholder ?? { sv: '', en: '' })}
            submitLabel={lang === 'sv' ? 'Fortsätt' : 'Continue'}
            skipLabel={
              config.type === 'email'
                ? lang === 'sv'
                  ? 'Hoppa över'
                  : 'Skip'
                : undefined
            }
            onSubmit={(v) => submitAnswer(v)}
            onSkip={config.type === 'email' ? () => submitAnswer(null) : undefined}
            disabled={loading}
          />
        </>
      )}
    </QuestionCard>
  );
}
