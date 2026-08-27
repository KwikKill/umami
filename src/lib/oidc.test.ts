import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { getOidcSettings, isOidcEnabled } from './oidc';

const ENV_KEYS = [
  'OIDC_ISSUER',
  'OIDC_CLIENT_ID',
  'OIDC_CLIENT_SECRET',
  'OIDC_SCOPES',
  'OIDC_BUTTON_LABEL',
  'OIDC_DISABLE_JIT',
  'OIDC_DEFAULT_ROLE',
] as const;

const originalEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    originalEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
});

describe('getOidcSettings', () => {
  test('is disabled when issuer/client id/secret are not all set', () => {
    expect(getOidcSettings()).toBeNull();
    expect(isOidcEnabled()).toBe(false);

    process.env.OIDC_ISSUER = 'https://auth.example.com/application/o/umami/';
    expect(getOidcSettings()).toBeNull();

    process.env.OIDC_CLIENT_ID = 'umami';
    expect(getOidcSettings()).toBeNull();
  });

  test('is enabled with sane defaults once fully configured', () => {
    process.env.OIDC_ISSUER = 'https://auth.example.com/application/o/umami/';
    process.env.OIDC_CLIENT_ID = 'umami';
    process.env.OIDC_CLIENT_SECRET = 'secret';

    const settings = getOidcSettings();

    expect(isOidcEnabled()).toBe(true);
    expect(settings).toMatchObject({
      issuer: 'https://auth.example.com/application/o/umami/',
      clientId: 'umami',
      clientSecret: 'secret',
      scope: 'openid profile email',
      buttonLabel: 'SSO',
      allowJitProvisioning: true,
      defaultRole: 'user',
    });
  });

  test('OIDC_DISABLE_JIT=true turns off JIT provisioning', () => {
    process.env.OIDC_ISSUER = 'https://auth.example.com/';
    process.env.OIDC_CLIENT_ID = 'umami';
    process.env.OIDC_CLIENT_SECRET = 'secret';
    process.env.OIDC_DISABLE_JIT = 'true';

    expect(getOidcSettings().allowJitProvisioning).toBe(false);
  });

  test('accepts a valid OIDC_DEFAULT_ROLE override', () => {
    process.env.OIDC_ISSUER = 'https://auth.example.com/';
    process.env.OIDC_CLIENT_ID = 'umami';
    process.env.OIDC_CLIENT_SECRET = 'secret';
    process.env.OIDC_DEFAULT_ROLE = 'view-only';

    expect(getOidcSettings().defaultRole).toBe('view-only');
  });

  test('falls back to "user" for an invalid OIDC_DEFAULT_ROLE rather than trusting it blindly', () => {
    process.env.OIDC_ISSUER = 'https://auth.example.com/';
    process.env.OIDC_CLIENT_ID = 'umami';
    process.env.OIDC_CLIENT_SECRET = 'secret';
    process.env.OIDC_DEFAULT_ROLE = 'super-admin-typo';

    expect(getOidcSettings().defaultRole).toBe('user');
  });

  test('custom button label and scopes are passed through', () => {
    process.env.OIDC_ISSUER = 'https://auth.example.com/';
    process.env.OIDC_CLIENT_ID = 'umami';
    process.env.OIDC_CLIENT_SECRET = 'secret';
    process.env.OIDC_BUTTON_LABEL = 'Authentik';
    process.env.OIDC_SCOPES = 'openid email';

    const settings = getOidcSettings();

    expect(settings.buttonLabel).toBe('Authentik');
    expect(settings.scope).toBe('openid email');
  });
});
