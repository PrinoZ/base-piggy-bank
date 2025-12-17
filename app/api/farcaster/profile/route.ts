import { NextResponse } from 'next/server';

// Optional: set NEYNAR_API_KEY in Vercel to enable profile lookup by fid.
// If not set, this endpoint returns null and the UI falls back to identicon.
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const fidStr = url.searchParams.get('fid') || '';
    const debug = url.searchParams.get('debug') === '1';
    const fid = Number(fidStr);
    if (!Number.isFinite(fid) || fid <= 0) {
      return NextResponse.json({ user: null, reason: 'invalid_fid' }, { status: 200 });
    }

    if (!NEYNAR_API_KEY) {
      return NextResponse.json({ user: null, reason: 'missing_neynar_api_key' }, { status: 200 });
    }

    // Neynar bulk user endpoint (v2)
    const r = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${encodeURIComponent(String(fid))}`, {
      headers: {
        accept: 'application/json',
        api_key: NEYNAR_API_KEY,
      } as any,
      // Keep it dynamic; don't cache user identity too aggressively
      cache: 'no-store',
    });

    if (!r.ok) {
      const text = debug ? await r.text().catch(() => '') : '';
      return NextResponse.json(
        { user: null, reason: 'neynar_not_ok', status: r.status, body: debug ? text : undefined },
        { status: 200 }
      );
    }

    const j: any = await r.json().catch(() => ({}));
    const u = Array.isArray(j?.users) ? j.users[0] : null;
    if (!u) return NextResponse.json({ user: null, reason: 'no_user' }, { status: 200 });

    return NextResponse.json(
      {
        user: {
          fid: typeof u?.fid === 'number' ? u.fid : fid,
          username: typeof u?.username === 'string' ? u.username : undefined,
          displayName:
            typeof u?.display_name === 'string'
              ? u.display_name
              : typeof u?.displayName === 'string'
                ? u.displayName
                : undefined,
          pfpUrl:
            typeof u?.pfp_url === 'string'
              ? u.pfp_url
              : typeof u?.pfpUrl === 'string'
                ? u.pfpUrl
                : undefined,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ user: null, reason: 'exception' }, { status: 200 });
  }
}

export const dynamic = 'force-dynamic';


