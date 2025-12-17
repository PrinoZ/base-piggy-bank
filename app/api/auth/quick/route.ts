import { NextResponse } from 'next/server';
import { jwtVerify, SignJWT, decodeJwt } from 'jose';
import { createRemoteJWKSet } from 'jose';

const SESSION_COOKIE = 'bpb_fc_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

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

export async function POST(req: Request) {
  try {
    const { token } = await req.json().catch(() => ({}));
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    // Quick Auth token payload docs:
    // - sub: number (FID)
    // - iss: quick auth server origin (default https://auth.farcaster.xyz)
    // - aud: domain token was issued to
    // - exp/iat: standard JWT fields
    const decoded = decodeJwt(token);
    const iss = typeof decoded?.iss === 'string' ? decoded.iss : 'https://auth.farcaster.xyz';
    const aud = typeof decoded?.aud === 'string' ? decoded.aud : getHostFromRequest(req);

    // Verify JWT signature using Quick Auth server JWKS.
    // Convention: <iss>/.well-known/jwks.json
    const jwksUrl = new URL(`${iss.replace(/\/$/, '')}/.well-known/jwks.json`);
    const JWKS = createRemoteJWKSet(jwksUrl);

    const expectedAud = getHostFromRequest(req) || aud;
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: iss,
      audience: expectedAud,
    });

    const fidRaw = payload?.sub;
    const fid = typeof fidRaw === 'string' ? Number(fidRaw) : typeof fidRaw === 'number' ? fidRaw : NaN;
    if (!Number.isFinite(fid) || fid <= 0) {
      return NextResponse.json({ error: 'Invalid fid in token' }, { status: 401 });
    }

    // Mint our own session JWT (HttpOnly cookie) so the frontend can be "logged in" without storing the Quick Auth JWT.
    const now = Math.floor(Date.now() / 1000);
    const sessionJwt = await new SignJWT({ fid })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer(getOriginFromRequest(req))
      .setAudience(getHostFromRequest(req))
      .setIssuedAt(now)
      .setExpirationTime(now + SESSION_MAX_AGE_SECONDS)
      .sign(getSessionSecret());

    const res = NextResponse.json({
      ok: true,
      user: { fid },
    });

    res.cookies.set({
      name: SESSION_COOKIE,
      value: sessionJwt,
      httpOnly: true,
      secure: true,
      // In embedded webviews/miniapp shells, cookies can be treated as "third-party".
      // SameSite=None improves the chance the cookie is sent back on subsequent requests.
      // (Some clients may still block cookies entirely; the frontend also has a localStorage fallback.)
      sameSite: 'none',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Auth failed' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';


