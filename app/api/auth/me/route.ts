import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE = 'bpb_fc_session';

function getHostFromRequest(req: Request) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  return host.split(',')[0].trim().replace(/:\d+$/, '');
}

function getOriginFromRequest(req: Request) {
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const h = host.split(',')[0].trim();
  return `${proto}://${h}`;
}

function getSessionSecret() {
  const secret = process.env.FARCASTER_SESSION_SECRET;
  if (!secret) throw new Error('Missing FARCASTER_SESSION_SECRET');
  return new TextEncoder().encode(secret);
}

function parseCookie(req: Request, name: string) {
  const cookie = req.headers.get('cookie') || '';
  const parts = cookie.split(';').map((p) => p.trim());
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx === -1) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    if (k === name) return decodeURIComponent(v);
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const token = parseCookie(req, SESSION_COOKIE);
    if (!token) return NextResponse.json({ user: null }, { status: 200 });

    const { payload } = await jwtVerify(token, getSessionSecret(), {
      issuer: getOriginFromRequest(req),
      audience: getHostFromRequest(req),
    });

    const fidRaw = payload?.fid;
    const fid = typeof fidRaw === 'number' ? fidRaw : typeof fidRaw === 'string' ? Number(fidRaw) : NaN;
    if (!Number.isFinite(fid) || fid <= 0) return NextResponse.json({ user: null }, { status: 200 });

    return NextResponse.json({ user: { fid } }, { status: 200 });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}

export const dynamic = 'force-dynamic';


