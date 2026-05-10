'use client';

import { useState, useCallback, useRef } from 'react';
import type { StepId } from '../lib/conversation';

interface ChatState {
  step: StepId;
  leadId: string | null;
  lang: 'sv' | 'en';
  loading: boolean;
  error: string | null;
  leadPriority: 'HIGH' | 'MEDIUM' | 'LOW' | null;
}

export function useChat() {
  const [state, setState] = useState<ChatState>({
    step: 'lang',
    leadId: null,
    lang: 'sv',
    loading: false,
    error: null,
    leadPriority: null,
  });

  // Always-current reference used inside stable callbacks to avoid stale closures
  const stateRef = useRef(state);
  stateRef.current = state;

  // Guard against firing the confirmation PATCH more than once
  const confirmedRef = useRef(false);

  const confirmLead = useCallback(() => {
    const { leadId } = stateRef.current;
    if (confirmedRef.current || !leadId) return;
    confirmedRef.current = true;

    // Capture lead_priority from the confirmation PATCH response.
    // Even if this fails, the lead is already captured up to 'name'.
    fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'confirmation', answer: null }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const priority = data?.lead_priority as 'HIGH' | 'MEDIUM' | 'LOW' | undefined;
        if (priority) {
          setState((s) => ({ ...s, leadPriority: priority }));
        }
      })
      .catch(() => undefined);
  }, []);

  const submitAnswer = useCallback(async (answer: string | null) => {
    const { step, leadId } = stateRef.current;
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      if (step === 'lang') {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lang: answer }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setState((s) => ({
          ...s,
          leadId: data.id,
          lang: answer as 'sv' | 'en',
          step: data.next_step as StepId,
          loading: false,
        }));
      } else {
        const res = await fetch(`/api/leads/${leadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step, answer }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setState((s) => ({
          ...s,
          // next_step is null at terminal steps — stay on current step
          step: (data.next_step ?? s.step) as StepId,
          loading: false,
        }));
      }
    } catch {
      setState((s) => ({ ...s, loading: false, error: 'network_error' }));
    }
  }, []);

  return {
    step: state.step,
    lang: state.lang,
    loading: state.loading,
    error: state.error,
    leadPriority: state.leadPriority,
    submitAnswer,
    confirmLead,
  };
}
