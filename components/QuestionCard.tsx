'use client';

import Link from 'next/link';

interface QuestionCardProps {
  question: string;
  progress: number;
  children: React.ReactNode;
}

export function QuestionCard({ question, progress, children }: QuestionCardProps) {
  const pct = Math.min(100, Math.max(0, (progress / 7) * 100));

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Brand strip */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-blue-900 font-bold text-sm flex-shrink-0">DriverNord</span>
          <span className="text-gray-400 text-xs truncate hidden sm:inline">
            Snabb registrering för yrkeschaufförer
          </span>
        </div>
        <Link
          href="/chaufforer"
          className="text-xs text-blue-500 hover:text-blue-700 flex-shrink-0 ml-3 transition-colors"
        >
          Läs mer
        </Link>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 w-full">
        <div
          className="h-1 bg-blue-500 transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col justify-center px-4 py-8 w-full max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8 leading-snug">
          {question}
        </h1>
        {children}
      </div>
    </div>
  );
}
