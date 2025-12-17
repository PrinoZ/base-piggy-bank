import { NextResponse } from 'next/server';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const fidStr = url.searchParams.get('fid') || '';
    const fid = Number(fidStr);
    if (!Number.isFinite(fid) || fid <= 0) {
      return new NextResponse('bad fid', { status: 400 });
    }

    if (!NEYNAR_API_KEY) {
      return new NextResponse('missing neynar key', { status: 404 });
    }

    // Lookup profile (to get pfpUrl)
    const r = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${encodeURIComponent(String(fid))}`, {
      headers: {
        accept: 'application/json',
        api_key: NEYNAR_API_KEY,
      } as any,
      cache: 'no-store',
    });
    if (!r.ok) return new NextResponse('no profile', { status: 404 });

    const j: any = await r.json().catch(() => ({}));
    const u = Array.isArray(j?.users) ? j.users[0] : null;
    const pfpUrl: string | undefined = u?.pfp_url || u?.pfpUrl;
    if (!pfpUrl) return new NextResponse('no avatar', { status: 404 });

    // Fetch the actual image and proxy through our domain (helps embedded webviews that block 3rd-party image hosts)
    const imgRes = await fetch(pfpUrl, { cache: 'no-store' });
    if (!imgRes.ok) return new NextResponse('avatar fetch failed', { status: 404 });

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const buf = await imgRes.arrayBuffer();

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Cache a bit at the edge; avatars rarely change
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return new NextResponse('error', { status: 500 });
  }
}

export const dynamic = 'force-dynamic';


