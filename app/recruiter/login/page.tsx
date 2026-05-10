'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LegalFooter } from '@/components/LegalFooter';

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const next         = searchParams.get('next') ?? '/recruiter';

  const [key, setKey]         = useState('');
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/recruiter/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ key }),
      });

      if (res.ok) {
        router.push(next);
      } else {
        setError('Invalid key.');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">
          Recruiter key
        </label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2
                     text-slate-100 text-sm font-mono placeholder-slate-700
                     focus:outline-none focus:border-slate-500"
          placeholder="••••••••••••••••••••"
          autoComplete="current-password"
          required
        />
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !key}
        className="w-full py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-100
                   text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed
                   transition-colors"
      >
        {loading ? 'Checking…' : 'Enter'}
      </button>
    </form>
  );
}

export default function RecruiterLoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h1 className="text-slate-100 text-lg font-bold mb-6 tracking-tight">DriverNord</h1>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
      <LegalFooter />
    </div>
  );
}
