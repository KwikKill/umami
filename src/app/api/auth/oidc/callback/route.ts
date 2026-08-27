import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { authorizationCodeGrant } from 'openid-client';
import { saveAuth } from '@/lib/auth';
import { hash, secret, uuid } from '@/lib/crypto';
import { createSecureToken, parseSecureToken } from '@/lib/jwt';
import { getOidcClientConfig, getOidcSettings, OIDC_STATE_COOKIE } from '@/lib/oidc';
import { hashPassword } from '@/lib/password';
import redis from '@/lib/redis';
import { getBaseUrl } from '@/lib/url';
import { createUser, getUserBySsoSubject, getUserByUsername } from '@/queries/prisma';

interface OidcStatePayload {
  codeVerifier: string;
  state: string;
  nonce: string;
}

function redirectWithError(request: Request, code: string) {
  const response = NextResponse.redirect(`${getBaseUrl(request)}/login?ssoError=${code}`);

  response.cookies.delete(OIDC_STATE_COOKIE);

  return response;
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
    tokens = await authorizationCodeGrant(config, new URL(request.url), {
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

  // Bind the token to the password hash, same as the password login flow, so
  // it can't be replayed after the (unusable) local password is rotated.
  const pwd = hash(passwordHash);

  let token: string;

  if (redis.enabled) {
    token = await saveAuth({ userId, role: userRole, pwd });
  } else {
    token = createSecureToken({ userId, role: userRole, pwd }, secret());
  }

  // Reuses the existing SSO landing page (src/app/sso), which sets the
  // client auth token and navigates to `url`.
  const response = NextResponse.redirect(
    `${getBaseUrl(request)}/sso?token=${encodeURIComponent(token)}&url=%2F`,
  );

  response.cookies.delete(OIDC_STATE_COOKIE);

  return response;
}
