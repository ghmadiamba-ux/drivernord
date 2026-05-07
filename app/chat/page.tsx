'use client';

import { useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { STEP_CONFIG } from '../../lib/stepConfig';
import { getStepIndex } from '../../lib/conversation';
import { QuestionCard } from '../../components/QuestionCard';
import { OptionButton } from '../../components/OptionButton';
import { TextInputStep } from '../../components/TextInputStep';
import type { BilingualString } from '../../lib/stepConfig';

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

// ─── Confirmation screen component ───────────────────────────────────────────

function CheckIcon() {
  return (
    <svg
      className="w-6 h-6 text-blue-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
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
    <div className="flex flex-col min-h-screen bg-white">
      {/* Full progress bar */}
      <div className="h-1 bg-blue-500 w-full" />

      <div className="flex-1 flex flex-col justify-center px-4 py-10 w-full max-w-md mx-auto">
        {/* Icon */}
        <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center mb-6 flex-shrink-0">
          <CheckIcon />
        </div>

        {/* Eyebrow */}
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-3">
          {lang === 'sv' ? 'Registrering klar' : 'Registration complete'}
        </p>

        {/* Headline */}
        <h1 className="text-2xl font-bold text-gray-900 mb-5 leading-snug">
          {lang === 'sv' ? 'Tack!' : 'Thank you!'}
        </h1>

        {/* Priority badge — shown only once priority is known */}
        {priorityCopy && (
          <span
            className={`inline-flex items-center self-start border rounded-full px-3 py-1 text-xs font-semibold mb-4 ${priorityCopy.badgeColor}`}
          >
            {priorityCopy.badge}
          </span>
        )}

        {/* Main message */}
        <p className="text-base text-gray-800 leading-relaxed mb-8">
          {priorityCopy ? priorityCopy.message : GENERIC_MESSAGE[lang]}
        </p>

        {/* Secondary context */}
        <div className="border-t border-gray-100 pt-6 flex flex-col gap-4">
          <p className="text-sm text-gray-500 leading-relaxed">
            {MATCHING_CONTEXT[lang]}
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">
            {GDPR_NOTE[lang]}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { step, lang, loading, error, leadPriority, submitAnswer, confirmLead } = useChat();

  const config = STEP_CONFIG[step];

  // Auto-submit the confirmation PATCH when the confirmation screen loads
  useEffect(() => {
    if (step === 'confirmation') {
      confirmLead();
    }
  }, [step, confirmLead]);

  if (!config) return null;

  // Before lang is selected, default to Swedish for the lang screen itself
  const t = (text: BilingualString) => (step === 'lang' ? text.sv : text[lang]);

  const progress = getStepIndex(step);

  if (config.type === 'terminal') {
    // Rich confirmation screen with priority feedback
    if (step === 'confirmation') {
      return <ConfirmationScreen lang={lang} leadPriority={leadPriority} />;
    }

    // Simple terminal for disqualified and any future terminal steps
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <div className="h-1 bg-blue-500 w-full" />
        <div className="flex-1 flex flex-col justify-center px-4 py-8 w-full max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t(config.question)}
          </h1>
          {config.message && (
            <p className="text-base text-gray-500 leading-relaxed">
              {t(config.message)}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <QuestionCard question={t(config.question)} progress={progress}>
      {error && (
        <p className="text-sm text-red-400 mb-4">
          {lang === 'sv'
            ? 'Något gick fel. Försök igen.'
            : 'Something went wrong. Please try again.'}
        </p>
      )}

      {config.type === 'options' &&
        config.options?.map((opt) => (
          <OptionButton
            key={opt.value}
            label={t(opt.label)}
            onClick={() => submitAnswer(opt.value)}
            disabled={loading}
          />
        ))}

      {(config.type === 'text' || config.type === 'email') && (
        <>
          {step === 'phone' && (
            <p className="text-sm text-gray-500 leading-relaxed mb-3">
              {lang === 'sv'
                ? 'Vi använder ditt nummer för att kontakta dig vid relevant matchning. Inget CV krävs.'
                : 'We use your number to contact you when a relevant match is found. No CV required.'}
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
