'use client';

interface QuestionCardProps {
  question: string;
  progress: number;
  children: React.ReactNode;
}

export function QuestionCard({ question, progress, children }: QuestionCardProps) {
  const pct = Math.min(100, Math.max(0, (progress / 7) * 100));

  return (
    <div className="flex flex-col min-h-screen bg-white">
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
