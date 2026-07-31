'use client';

import Link from 'next/link';

interface QuestionCardProps {
  question: string;
  progress: number;
  children: React.ReactNode;
}

export function QuestionCard({ question, progress, children }: QuestionCardProps) {
  const pct = Math.min(100, Math.max(0, (progress / 7) * 100));
  const isWelcome = progress === 0;

  return (
    <div className="min-h-screen bg-[#0b1d35] flex flex-col">

      {/* ── Top zone ─────────────────────────────────────────────────────── */}
      {isWelcome ? (
        <div className="flex-shrink-0 text-center px-6 pt-10 pb-5">
          <p className="text-white/50 text-[10px] uppercase tracking-[0.25em] mb-3 font-medium">
            DriverNord
          </p>
          <p className="text-white text-[22px] font-semibold leading-snug mb-3">
            Du kör.<br />Vi hjälper dig hitta rätt uppdrag.
          </p>
          <p className="text-blue-300/60 text-xs">
            ca 3 minuter&nbsp;&nbsp;·&nbsp;&nbsp;inget CV&nbsp;&nbsp;·&nbsp;&nbsp;direkt matchning
          </p>
        </div>
      ) : (
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4">
          <span className="text-white/60 font-semibold text-sm">DriverNord</span>
          <Link
            href="/chaufforer"
            className="text-blue-300/50 text-xs hover:text-blue-200 transition-colors"
          >
            Läs mer
          </Link>
        </div>
      )}

      {/* ── Card ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-4 pb-8">
        <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Progress bar */}
          <div className="h-[3px] bg-gray-100">
            <div
              className="h-[3px] bg-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={7}
            />
          </div>

          <div className="px-6 py-7">
            {/* Step counter */}
            {progress > 0 && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400 mb-4">
                Steg {progress} av 7
              </p>
            )}

            <h1 className="text-xl font-bold text-gray-900 mb-6 leading-snug">
              {question}
            </h1>

            {children}
          </div>
        </div>

        {/* Trust footer */}
        <p className="text-center text-blue-300/30 text-[11px] mt-5 px-4">
          Dina uppgifter delas aldrig med företag utan ditt godkännande
        </p>
      </div>

    </div>
  );
}
