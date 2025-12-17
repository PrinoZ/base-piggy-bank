'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  // Even on error, dismiss the Farcaster/Base splash screen so the user sees the error UI.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      try {
        // @ts-ignore
        const baseReadyFn = window?.base?.actions?.ready || window?.base?.miniapp?.actions?.ready;
        if (typeof baseReadyFn === 'function') {
          await Promise.resolve(baseReadyFn());
          return;
        }
      } catch {}
      try {
        const mod: any = await import('@farcaster/frame-sdk');
        const sdk = mod?.sdk || mod?.default?.sdk || mod?.default || mod;
        const readyFn = sdk?.actions?.ready;
        if (typeof readyFn === 'function') await Promise.resolve(readyFn());
      } catch {}
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <div className="max-w-md w-full bg-white shadow-lg border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="text-2xl font-black">Something went wrong</div>
          <p className="text-sm text-slate-600 break-all">{error.message}</p>
          <button
            onClick={() => reset()}
            className="w-full rounded-lg bg-blue-600 text-white font-semibold py-2 hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
