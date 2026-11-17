import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { authorizationCodeGrant } from 'openid-client';
import { saveAuth } from '@/lib/auth';
import { PARTIAL_AUTH_TOKEN_TYPE } from '@/lib/constants';
import { hash, secret, uuid } from '@/lib/crypto';
import { createSecureToken, parseSecureToken } from '@/lib/jwt';
import {
  getAppUrl,
  getOidcClientConfig,
  getOidcSettings,
  OIDC_STATE_COOKIE,
  OIDC_STATE_COOKIE_PATH,
} from '@/lib/oidc';
import { hashPassword } from '@/lib/password';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import { isTwoFactorConfigured } from '@/lib/two-factor/crypto';
import { getTwoFactorRequiredReason } from '@/lib/two-factor/policy';
import { createUser, getUserBySsoSubject, getUserByUsername } from '@/queries/prisma';

interface OidcStatePayload {
  codeVerifier: string;
  state: string;
  nonce: string;
}

// The result is handed back to the login page in the URL fragment, which the
// browser never sends to the server, so tokens stay out of access logs.
function redirectToLogin(request: Request, fragment: Record<string, string>) {
  const response = NextResponse.redirect(
    getAppUrl(request, `/login#${new URLSearchParams(fragment).toString()}`),
  );

  response.cookies.set(OIDC_STATE_COOKIE, '', { path: OIDC_STATE_COOKIE_PATH, maxAge: 0 });

  return response;
}

function redirectWithError(request: Request, code: string) {
  return redirectToLogin(request, { 'sso-error': code });
}

// Finds a free username for a freshly-provisioned SSO account, in case the
// preferred value already belongs to a pre-existing (non-SSO) account.
async function findAvailableUsername(preferred: string) {
  if (!(await getUserByUsername(preferred))) {
    return preferred;
  }

  for (let i = 2; i < 100; i++) {
    const candidate = `${preferred}-${i}`;

    if (!(await getUserByUsername(candidate))) {
      return candidate;
    }
  }

  return `${preferred}-${uuid()}`;
}

export async function GET(request: NextRequest) {
  const settings = getOidcSettings();

  if (!settings) {
    return NextResponse.json({ error: 'SSO is not configured' }, { status: 404 });
  }

  const cookieValue = request.cookies.get(OIDC_STATE_COOKIE)?.value;

  if (!cookieValue) {
    return redirectWithError(request, 'missing-state');
  }

  const statePayload = parseSecureToken(cookieValue, secret()) as OidcStatePayload | null;

  if (!statePayload) {
    return redirectWithError(request, 'expired-state');
  }

  let config;

  try {
    config = await getOidcClientConfig();
  } catch {
    return redirectWithError(request, 'provider-unreachable');
  }

  let tokens;

  try {
    // request.url is the internal URL behind the reverse proxy: rebuild the
    // public one so it matches the redirect_uri sent by /api/auth/oidc/login.
    const callbackUrl = new URL(getAppUrl(request, '/api/auth/oidc/callback'));
    callbackUrl.search = new URL(request.url).search;

    tokens = await authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: statePayload.codeVerifier,
      expectedState: statePayload.state,
      expectedNonce: statePayload.nonce,
    });
  } catch {
    return redirectWithError(request, 'invalid-response');
  }

  const claims = tokens.claims();
  const subject = claims?.sub as string | undefined;

  if (!subject) {
    return redirectWithError(request, 'missing-subject');
  }

  const existingUser = await getUserBySsoSubject(subject, { includePassword: true });

  let userId: string;
  let userRole: string;
  let passwordHash: string;

  if (existingUser) {
    userId = existingUser.id;
    userRole = existingUser.role;
    passwordHash = existingUser.password;
  } else {
    if (!settings.allowJitProvisioning) {
      return redirectWithError(request, 'no-linked-account');
    }

    const email = claims?.email as string | undefined;
    const preferredUsername = claims?.preferred_username as string | undefined;
    const usernameSeed = (email || preferredUsername || subject).toString().toLowerCase();
    const username = await findAvailableUsername(usernameSeed);

    // SSO accounts have no local password - a random, unknowable hash keeps
    // the NOT NULL column satisfied without creating a usable credential.
    passwordHash = hashPassword(uuid());

    const created = await createUser({
      id: uuid(),
      username,
      password: passwordHash,
      role: settings.defaultRole,
      ssoSubject: subject,
    });

    userId = created.id;
    userRole = created.role;
  }

  // Same 2FA rules as the password login (src/app/api/auth/login/route.ts):
  // an enrolled user still has to pass the TOTP challenge, and a user required
  // to enroll gets a session limited to the setup routes.
  const cloudMode = !!process.env.CLOUD_MODE;
  const twoFactor = !cloudMode
    ? await prisma.client.twoFactorAuth.findUnique({ where: { userId } })
    : null;

  if (twoFactor?.isEnabled) {
    if (!isTwoFactorConfigured()) {
      return redirectWithError(request, 'two-factor-unavailable');
    }

    const partialToken = createSecureToken({ userId, type: PARTIAL_AUTH_TOKEN_TYPE }, secret(), {
      expiresIn: '5m',
    });

    return redirectToLogin(request, { 'sso-2fa': partialToken });
  }

  const twoFactorSetup =
    !cloudMode && isTwoFactorConfigured() && !!(await getTwoFactorRequiredReason(userId));

  // Bind the token to the password hash, same as the password login flow, so
  // it can't be replayed after the (unusable) local password is rotated.
  const session = {
    userId,
    role: userRole,
    pwd: hash(passwordHash),
    ...(twoFactorSetup && { twoFactorSetup }),
  };

  const token = redis.enabled ? await saveAuth(session) : createSecureToken(session, secret());

  return redirectToLogin(request, { 'sso-token': token });
}
