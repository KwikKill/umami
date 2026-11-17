import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';

process.env.APP_SECRET = 'oidc-callback-test-secret';

const mocks = vi.hoisted(() => ({
  authorizationCodeGrant: vi.fn(),
  getOidcClientConfig: vi.fn(),
  getUserBySsoSubject: vi.fn(),
  getUserByUsername: vi.fn(),
  createUser: vi.fn(),
  findTwoFactorAuth: vi.fn(),
  isTwoFactorConfigured: vi.fn(),
  getTwoFactorRequiredReason: vi.fn(),
  saveAuth: vi.fn(),
}));

vi.mock('openid-client', () => ({
  authorizationCodeGrant: mocks.authorizationCodeGrant,
  allowInsecureRequests: vi.fn(),
  discovery: vi.fn(),
}));

vi.mock('@/lib/oidc', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/oidc')>()),
  getOidcClientConfig: mocks.getOidcClientConfig,
}));

vi.mock('@/queries/prisma', () => ({
  getUserBySsoSubject: mocks.getUserBySsoSubject,
  getUserByUsername: mocks.getUserByUsername,
  createUser: mocks.createUser,
}));

vi.mock('@/lib/prisma', () => ({
  default: { client: { twoFactorAuth: { findUnique: mocks.findTwoFactorAuth } } },
}));

vi.mock('@/lib/two-factor/crypto', () => ({
  isTwoFactorConfigured: mocks.isTwoFactorConfigured,
}));

vi.mock('@/lib/two-factor/policy', () => ({
  getTwoFactorRequiredReason: mocks.getTwoFactorRequiredReason,
}));

vi.mock('@/lib/redis', () => ({ default: { enabled: false } }));

vi.mock('@/lib/auth', () => ({ saveAuth: mocks.saveAuth }));

import { PARTIAL_AUTH_TOKEN_TYPE } from '@/lib/constants';
import { secret } from '@/lib/crypto';
import { createSecureToken, parseSecureToken } from '@/lib/jwt';
import { OIDC_STATE_COOKIE } from '@/lib/oidc';
import { GET } from './route';

const SUBJECT = 'authentik-sub-1';

function callback({ withState = true } = {}) {
  const headers = new Headers({
    host: 'umami:3000',
    'x-forwarded-host': 'umami.example.com',
    'x-forwarded-proto': 'https',
  });

  if (withState) {
    const state = createSecureToken(
      { codeVerifier: 'verifier', state: 'state', nonce: 'nonce' },
      secret(),
    );
    headers.set('cookie', `${OIDC_STATE_COOKIE}=${state}`);
  }

  return GET(
    new NextRequest('http://umami:3000/api/auth/oidc/callback?code=abc&state=state', { headers }),
  );
}

function getFragment(response: Response) {
  const location = new URL(response.headers.get('location'));

  return { location, params: new URLSearchParams(location.hash.slice(1)) };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OIDC_ISSUER = 'https://auth.example.com/application/o/umami/';
  process.env.OIDC_CLIENT_ID = 'umami';
  process.env.OIDC_CLIENT_SECRET = 'secret';
  delete process.env.OIDC_DISABLE_JIT;
  delete process.env.CLOUD_MODE;

  mocks.getOidcClientConfig.mockResolvedValue({});
  mocks.authorizationCodeGrant.mockResolvedValue({ claims: () => ({ sub: SUBJECT }) });
  mocks.getUserBySsoSubject.mockResolvedValue({
    id: 'user-1',
    role: 'admin',
    password: 'password-hash',
  });
  mocks.findTwoFactorAuth.mockResolvedValue(null);
  mocks.isTwoFactorConfigured.mockReturnValue(true);
  mocks.getTwoFactorRequiredReason.mockResolvedValue(null);
});

describe('OIDC callback', () => {
  test('exchanges the code against the public callback URL and returns a session token', async () => {
    const response = await callback();
    const { location, params } = getFragment(response);

    expect(mocks.authorizationCodeGrant.mock.calls[0][1].href).toBe(
      'https://umami.example.com/api/auth/oidc/callback?code=abc&state=state',
    );
    expect(location.origin + location.pathname).toBe('https://umami.example.com/login');
    expect(location.search).toBe('');

    const session = parseSecureToken(params.get('sso-token'), secret()) as any;

    expect(session).toMatchObject({ userId: 'user-1', role: 'admin' });
    expect(session.twoFactorSetup).toBeUndefined();
  });

  test('sends a user with 2FA enabled to the TOTP challenge instead of signing in', async () => {
    mocks.findTwoFactorAuth.mockResolvedValue({ isEnabled: true });

    const { params } = getFragment(await callback());
    const partial = parseSecureToken(params.get('sso-2fa'), secret()) as any;

    expect(params.get('sso-token')).toBeNull();
    expect(partial).toMatchObject({ userId: 'user-1', type: PARTIAL_AUTH_TOKEN_TYPE });
  });

  test('limits the session to 2FA setup when 2FA is required but not enrolled', async () => {
    mocks.getTwoFactorRequiredReason.mockResolvedValue('global');

    const { params } = getFragment(await callback());
    const session = parseSecureToken(params.get('sso-token'), secret()) as any;

    expect(session.twoFactorSetup).toBe(true);
  });

  test('rejects an unknown subject when just-in-time provisioning is disabled', async () => {
    process.env.OIDC_DISABLE_JIT = 'true';
    mocks.getUserBySsoSubject.mockResolvedValue(null);

    const { params } = getFragment(await callback());

    expect(params.get('sso-error')).toBe('no-linked-account');
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  test('provisions an unknown subject with the default role', async () => {
    mocks.getUserBySsoSubject.mockResolvedValue(null);
    mocks.authorizationCodeGrant.mockResolvedValue({
      claims: () => ({ sub: SUBJECT, email: 'Kwik@Example.com' }),
    });
    mocks.getUserByUsername.mockResolvedValue(null);
    mocks.createUser.mockResolvedValue({ id: 'user-2', role: 'user' });

    const { params } = getFragment(await callback());

    expect(mocks.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'kwik@example.com', role: 'user', ssoSubject: SUBJECT }),
    );
    expect(parseSecureToken(params.get('sso-token'), secret())).toMatchObject({
      userId: 'user-2',
    });
  });

  test('fails without the state cookie', async () => {
    const { params } = getFragment(await callback({ withState: false }));

    expect(params.get('sso-error')).toBe('missing-state');
    expect(mocks.authorizationCodeGrant).not.toHaveBeenCalled();
  });
});
