'use client';

import { useState, useCallback, useRef } from 'react';
import { trackEvent } from '../lib/analytics/metaPixel';
import type { StepId } from '../lib/conversation';

interface ChatState {
  step: StepId;
  leadId: string | null;
  lang: 'sv' | 'en';
  loading: boolean;
  error: string | null;
  leadPriority: 'HIGH' | 'MEDIUM' | 'LOW' | null;
}

// ─── Attribution capture ──────────────────────────────────────────────────────

function readAttribution(): Record<string, string | null> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source:       params.get('utm_source'),
    utm_medium:       params.get('utm_medium'),
    utm_campaign:     params.get('utm_campaign'),
    utm_content:      params.get('utm_content'),
    utm_term:         params.get('utm_term'),
    landing_page_url: window.location.href   || null,
    referrer_url:     document.referrer       || null,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

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
    // Even if this fails, the lead is already captured up to 'consent'.
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

          // Fire lead-quality events post-consent (confirmLead is only reachable
          // after consent → confirmation in the step flow).
          if (priority === 'MEDIUM' || priority === 'HIGH') {
            trackEvent('QualifiedDriverLead');
          }
          if (priority === 'HIGH') {
            trackEvent('HighPriorityDriverLead');
          }
        }
      })
      .catch(() => undefined);
  }, []);

  const submitAnswer = useCallback(async (answer: string | null) => {
    const { step, leadId } = stateRef.current;
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      if (step === 'lang') {
        const attribution = readAttribution();
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lang: answer, ...attribution }),
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
        // Fire DriverConsentAccepted before the PATCH so the event is sent
        // even if the network request fails. Always post-user-action.
        if (step === 'consent' && answer === 'accepted') {
          trackEvent('DriverConsentAccepted');
        }

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
