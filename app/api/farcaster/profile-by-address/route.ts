import { NextResponse } from 'next/server';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

async function fetchJson(url: string, headers: Record<string, string>) {
  const r = await fetch(url, { headers: headers as any, cache: 'no-store' });
  if (!r.ok) return null;
  return await r.json().catch(() => null);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const address = (url.searchParams.get('address') || '').toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(address)) {
      return NextResponse.json({ user: null, reason: 'invalid_address' }, { status: 200 });
    }

    if (!NEYNAR_API_KEY) {
      return NextResponse.json({ user: null, reason: 'missing_neynar_api_key' }, { status: 200 });
    }

    const headers = { accept: 'application/json', api_key: NEYNAR_API_KEY };

    // Neynar has shipped a few variants over time; try a small set of likely endpoints.
    const candidates = [
      // Commonly documented name
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${encodeURIComponent(address)}`,
      // Some deployments used "bulk-by-address" under "user"
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${encodeURIComponent(address)}&address_types=verified_addresses`,
      // Alternate naming in some clients
      `https://api.neynar.com/v2/farcaster/user/by_verification?address=${encodeURIComponent(address)}`,
    ];

    let data: any = null;
    for (const u of candidates) {
      data = await fetchJson(u, headers);
      if (data) break;
    }

    if (!data) return NextResponse.json({ user: null, reason: 'neynar_not_ok' }, { status: 200 });

    // Normalize possible shapes
    const user =
      (Array.isArray(data?.users) && data.users[0]) ||
      (Array.isArray(data?.result?.users) && data.result.users[0]) ||
      data?.user ||
      null;

    if (!user) return NextResponse.json({ user: null, reason: 'no_user' }, { status: 200 });

    return NextResponse.json(
      {
        user: {
          fid: typeof user?.fid === 'number' ? user.fid : undefined,
          username: typeof user?.username === 'string' ? user.username : undefined,
          displayName:
            typeof user?.display_name === 'string'
              ? user.display_name
              : typeof user?.displayName === 'string'
                ? user.displayName
                : undefined,
          pfpUrl:
            typeof user?.pfp_url === 'string'
              ? user.pfp_url
              : typeof user?.pfpUrl === 'string'
                ? user.pfpUrl
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


