import { NextResponse } from 'next/server';

const BASE_URL = 'https://base-piggy-bank.vercel.app';

// Farcaster Frame vNext style response
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const buttonIndex = body?.untrustedData?.buttonIndex ?? null;

    // Map button actions
    const actionMap: Record<number, string> = {
      1: `${BASE_URL}/`,
    };

    return NextResponse.json({
      image: `${BASE_URL}/og-image.png`,
      post_url: `${BASE_URL}/api/frame`,
      buttons: [{ label: 'Launch Piggy Bank', action: 'link', target: actionMap[1] }],
      state: { lastButton: buttonIndex },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'frame handler error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
