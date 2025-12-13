'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
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

