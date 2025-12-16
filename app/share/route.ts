import { NextResponse } from 'next/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://base-piggy-bank.vercel.app';

// A dedicated share URL that renders only Frame metadata (no fc:miniapp),
// so clients like Base App can show a Frame-style card with a controllable button label.
export async function GET() {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Base Piggy Bank</title>

    <!-- OpenGraph (fallback for non-frame clients) -->
    <meta property="og:title" content="Base Piggy Bank" />
    <meta property="og:description" content="Auto-invest USDC to cbBTC on Base. Non-custodial DCA." />
    <meta property="og:image" content="${APP_URL}/og-image.png" />
    <meta property="og:url" content="${APP_URL}/share" />
    <meta property="og:type" content="website" />

    <!-- Farcaster Frame (single colon to avoid Next.js serialization issues) -->
    <meta name="fc:frame" content="vNext" />
    <meta name="fc:frame:image" content="${APP_URL}/og-image.png" />
    <meta name="fc:frame:image:aspect_ratio" content="1.91:1" />
    <meta name="fc:frame:post_url" content="${APP_URL}/api/frame" />
    <meta name="fc:frame:button:1" content="Launch Piggy Bank" />
    <meta name="fc:frame:button:1:action" content="link" />
    <meta name="fc:frame:button:1:target" content="${APP_URL}" />
  </head>
  <body style="margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; background: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh;">
    <div style="max-width: 28rem; width: 100%; background: white; border-radius: 1rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); padding: 2rem; text-align: center;">
      <h1 style="font-size: 1.5rem; font-weight: 900; color: #0f172a; margin: 0 0 0.5rem 0;">Base Piggy Bank</h1>
      <p style="color: #475569; margin: 0 0 1.5rem 0;">Auto-invest USDC to cbBTC on Base</p>
      <a href="${APP_URL}" style="display: inline-block; padding: 0.75rem 1.5rem; background: #2563eb; color: white; font-weight: 700; border-radius: 0.75rem; text-decoration: none; transition: background 0.2s;">Launch App →</a>
    </div>
  </body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=300, must-revalidate',
    },
  });
}

// Ensure this route is always dynamically rendered (not statically generated)
export const dynamic = 'force-dynamic';

