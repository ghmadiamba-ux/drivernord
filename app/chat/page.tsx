'use client';

import { useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { STEP_CONFIG } from '../../lib/stepConfig';
import { getStepIndex } from '../../lib/conversation';
import { QuestionCard } from '../../components/QuestionCard';
import { OptionButton } from '../../components/OptionButton';
import { TextInputStep } from '../../components/TextInputStep';
import type { BilingualString } from '../../lib/stepConfig';

export default function ChatPage() {
  const { step, lang, loading, error, submitAnswer, confirmLead } = useChat();

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
      )}
    </QuestionCard>
  );
}
