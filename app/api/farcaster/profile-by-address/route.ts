import { NextResponse } from 'next/server';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

async function fetchJson(url: string, headers: Record<string, string>) {
  const r = await fetch(url, { headers: headers as any, cache: 'no-store' });
  const text = await r.text().catch(() => '');
  if (!r.ok) return { __ok: false, __status: r.status, __body: text, __url: url };
  const json = (() => {
    try { return text ? JSON.parse(text) : null; } catch { return null; }
  })();
  return { __ok: true, __status: r.status, __json: json, __url: url };
}

function pickFirstUser(data: any) {
  return (
    (Array.isArray(data?.users) && data.users[0]) ||
    (Array.isArray(data?.result?.users) && data.result.users[0]) ||
    data?.user ||
    null
  );
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const address = (url.searchParams.get('address') || '').toLowerCase();
    const debug = url.searchParams.get('debug') === '1';
    if (!/^0x[0-9a-f]{40}$/.test(address)) {
      return NextResponse.json({ user: null, reason: 'invalid_address' }, { status: 200 });
    }

    if (!NEYNAR_API_KEY) {
      return NextResponse.json({ user: null, reason: 'missing_neynar_api_key' }, { status: 200 });
    }

    const headers = { accept: 'application/json', api_key: NEYNAR_API_KEY };

    // Neynar has shipped a few variants over time; try a small set of likely endpoints.
    const candidates = [
      // Bulk by address (try multiple address_types variants)
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${encodeURIComponent(address)}`,
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${encodeURIComponent(address)}&address_types=verified_addresses`,
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${encodeURIComponent(address)}&address_types=verified_address`,
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${encodeURIComponent(address)}&address_types=custody_address`,
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${encodeURIComponent(address)}&address_types=all`,
      // Alternate naming in some clients
      `https://api.neynar.com/v2/farcaster/user/by_verification?address=${encodeURIComponent(address)}`,
    ];

    let data: any = null;
    let user: any = null;
    let sawOkJson = false;
    const tries: any[] = [];
    for (const u of candidates) {
      const res = await fetchJson(u, headers);
      tries.push({ url: res?.__url, ok: res?.__ok, status: res?.__status });
      if (res?.__ok && res?.__json) {
        sawOkJson = true;
        const candidateData = res.__json;
        const foundUser = pickFirstUser(candidateData);
        if (foundUser) {
          data = candidateData;
          user = foundUser;
          break;
        }
      }
    }

    // If we got OK JSON responses but never found a user, return "no_user" (not "neynar_not_ok").
    if (!data && sawOkJson) {
      return NextResponse.json(
        { user: null, reason: 'no_user', tries: debug ? tries : undefined },
        { status: 200 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { user: null, reason: 'neynar_not_ok', tries: debug ? tries : undefined },
        { status: 200 }
      );
    }

    // If we got JSON responses but no user across candidates, treat as "no_user".
    if (!user) {
      return NextResponse.json(
        { user: null, reason: 'no_user', tries: debug ? tries : undefined },
        { status: 200 }
      );
    }

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


