// lib/content/assetStrategySelector.ts
//
// Deterministic asset strategy selector.
// Maps Campaign Card pillar/angle/risk to the correct visual production strategy.
//
// BOUNDARIES:
//   ✓ Pure function — no DB imports, no side effects
//   ✗ Does NOT connect to any image API or external service
//   ✗ Does NOT generate images

import type { ContentPillar, CreativeAngle, PostFormat, RiskLevel } from './types';
import type { AssetStrategy } from './visualTypes';

// ─── Strategy rules per angle ─────────────────────────────────────────────────

interface StrategyRule {
  strategy: AssetStrategy;
  reason_sv: string;
}

const ANGLE_STRATEGY: Partial<Record<CreativeAngle, StrategyRule>> = {
  practical_advice: {
    strategy: 'branded_graphic',
    reason_sv: 'Praktiska råd kommuniceras bäst via tydlig infografik — branded graphic kan produceras omedelbart.',
  },
  market_education: {
    strategy: 'branded_graphic',
    reason_sv: 'Marknadsutbildning kräver strukturerad visuell förklaring — branded graphic är rätt format.',
  },
  driver_recognition: {
    strategy: 'real_asset',
    reason_sv: 'Chaufförsigenkänning kräver autentisk transportbild — en verklig bild skapar förtroende och igenkänning.',
  },
  community_question: {
    strategy: 'branded_graphic',
    reason_sv: 'Diskussionsfrågor fungerar bäst som enkla textbaserade grafik i varmt community-format.',
  },
  myth_vs_reality: {
    strategy: 'branded_graphic',
    reason_sv: 'Myt vs verklighet är idealisk för delad infografik (split-layout) — branded graphic.',
  },
  operational_insight: {
    strategy: 'real_asset',
    reason_sv: 'Operationell insikt kräver trovärdig verklighetsbild — autenticitet är central för engagemang.',
  },
  relatable_work_moment: {
    strategy: 'future_ai_generated',
    reason_sv: 'Relaterbart ögonblick kräver fotorealistisk scen — köad för framtida AI-bildgenerering.',
  },
  career_confidence: {
    strategy: 'future_ai_generated',
    reason_sv: 'Karriärsförtroende kräver professionellt porträtt — köad för framtida AI-bildgenerering.',
  },
  safe_light_humor: {
    strategy: 'branded_graphic',
    reason_sv: 'Mild humor fungerar bäst som textbaserad grafik utan fotorealistiska element.',
  },
  low_freq_acquisition_cta: {
    strategy: 'branded_graphic',
    reason_sv: 'Anskaffnings-CTA kräver kontrollerat brand-forward format utan beroende av extern bild.',
  },
};

const PILLAR_FALLBACK: Record<ContentPillar, StrategyRule> = {
  practical: {
    strategy: 'branded_graphic',
    reason_sv: 'Praktisk information levereras bäst via branded infografik — omedelbara produktionsmöjligheter.',
  },
  recognition: {
    strategy: 'real_asset',
    reason_sv: 'Igenkänningsinnehåll kräver autentisk bild för trovärdighet.',
  },
  community: {
    strategy: 'branded_graphic',
    reason_sv: 'Community-innehåll fungerar bäst som text-ledda branded graphics.',
  },
  acquisition: {
    strategy: 'branded_graphic',
    reason_sv: 'CTA-innehåll måste kontrolleras strikt — branded graphic utan externa bildkrav.',
  },
};

// ─── Main selector ────────────────────────────────────────────────────────────

export interface StrategySelection {
  strategy: AssetStrategy;
  reason_sv: string;
}

export function selectAssetStrategy(
  pillar: ContentPillar,
  angle: CreativeAngle,
  riskLevel: RiskLevel,
): StrategySelection {
  if (riskLevel === 'high') {
    return {
      strategy: 'no_visual_needed',
      reason_sv:
        'Hög riskklassificering — inget visuellt val görs automatiskt. ' +
        'Grundaren granskar textutkastet manuellt innan visuell produktion påbörjas.',
    };
  }

  const angleRule = ANGLE_STRATEGY[angle];
  if (angleRule) return angleRule;

  return PILLAR_FALLBACK[pillar];
}

export function shouldSuppressVisual(format: PostFormat): boolean {
  // Poll and plain question formats rarely benefit from accompanying visuals
  return format === 'poll' || format === 'question';
}

export function getStrategyLabel(strategy: AssetStrategy): string {
  const labels: Record<AssetStrategy, string> = {
    real_asset:            'Verklig bild krävs',
    branded_graphic:       'Branded grafik (kan produceras nu)',
    future_ai_generated:   'Framtida AI-bild (köad)',
    no_visual_needed:      'Ingen bild behövs',
  };
  return labels[strategy];
}

export function isImmediatelyProducible(strategy: AssetStrategy): boolean {
  return strategy === 'branded_graphic' || strategy === 'no_visual_needed';
}
