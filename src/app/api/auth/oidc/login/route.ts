import { NextResponse } from 'next/server';
import {
  buildAuthorizationUrl,
  calculatePKCECodeChallenge,
  randomNonce,
  randomPKCECodeVerifier,
  randomState,
} from 'openid-client';
import { secret } from '@/lib/crypto';
import { createSecureToken } from '@/lib/jwt';
import {
  getAppUrl,
  getOidcClientConfig,
  getOidcSettings,
  OIDC_STATE_COOKIE,
  OIDC_STATE_COOKIE_PATH,
} from '@/lib/oidc';

export async function GET(request: Request) {
  const settings = getOidcSettings();

  if (!settings) {
    return NextResponse.json({ error: 'SSO is not configured' }, { status: 404 });
  }

  let config;

  try {
    config = await getOidcClientConfig();
  } catch {
    return NextResponse.redirect(getAppUrl(request, '/login#sso-error=provider-unreachable'));
  }

  const codeVerifier = randomPKCECodeVerifier();
  const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);
  const state = randomState();
  const nonce = randomNonce();

  const redirectUri = getAppUrl(request, '/api/auth/oidc/callback');

  const authorizationUrl = buildAuthorizationUrl(config, {
    redirect_uri: redirectUri,
    scope: settings.scope,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  });

  // Short-lived, httpOnly cookie carrying what the callback needs to verify
  // the response - avoids requiring Redis just for this handshake.
  const stateToken = createSecureToken({ codeVerifier, state, nonce }, secret(), {
    expiresIn: '10m',
  });

  const response = NextResponse.redirect(authorizationUrl.href);

  response.cookies.set(OIDC_STATE_COOKIE, stateToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: OIDC_STATE_COOKIE_PATH,
    maxAge: 600,
  });

  return response;
}
