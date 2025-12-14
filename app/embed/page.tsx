export const dynamic = 'force-static';

export const metadata = {
  title: 'Base Piggy Bank Preview',
  description: 'Preview card for Base Piggy Bank mini app.',
  openGraph: {
    title: 'Base Piggy Bank Preview',
    description: 'Auto-invest USDC to cbBTC on Base.',
    images: ['/og-image.png'],
  },
};

export default function EmbedPage() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 text-slate-900">
      <div className="max-w-md w-full bg-white border border-slate-200 shadow-xl rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg">
            🐷
          </div>
          <div>
            <div className="text-lg font-extrabold">Base Piggy Bank</div>
            <div className="text-xs text-slate-500 font-semibold">
              Auto-invest USDC to cbBTC on Base
            </div>
          </div>
        </div>
        <div className="text-sm text-slate-700 leading-relaxed">
          Set a DCA plan in minutes, stay on Base, and let the smart wallet-friendly flow
          handle approvals and execution.
        </div>
        <div className="mt-4 flex gap-2">
          <a
            href="/"
            className="flex-1 inline-flex items-center justify-center rounded-lg bg-blue-600 text-white font-semibold py-2 hover:bg-blue-700 transition-colors"
          >
            Launch
          </a>
          <a
            href="https://docs.base.org/mini-apps/quickstart/migrate-existing-apps"
            className="flex-1 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-700 font-semibold py-2 hover:bg-slate-50 transition-colors"
          >
            Docs
          </a>
        </div>
      </div>
    </div>
  );
}
