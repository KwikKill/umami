import { allowInsecureRequests, discovery } from 'openid-client';
import type { Configuration } from 'openid-client';
import { ROLES } from '@/lib/constants';
import type { Role } from '@/lib/types';

const VALID_DEFAULT_ROLES: string[] = [ROLES.admin, ROLES.user, ROLES.viewOnly];

// Short-lived, httpOnly cookie carrying the PKCE verifier/state/nonce between
// the /api/auth/oidc/login redirect and the /api/auth/oidc/callback request.
export const OIDC_STATE_COOKIE = 'umami.oidc-state';

export interface OidcSettings {
  issuer: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  buttonLabel: string;
  allowJitProvisioning: boolean;
  defaultRole: Role;
}

export function getOidcSettings(): OidcSettings | null {
  const issuer = process.env.OIDC_ISSUER;
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;

  if (!issuer || !clientId || !clientSecret) {
    return null;
  }

  const requestedRole = process.env.OIDC_DEFAULT_ROLE;
  const defaultRole = (
    VALID_DEFAULT_ROLES.includes(requestedRole) ? requestedRole : ROLES.user
  ) as Role;

  return {
    issuer,
    clientId,
    clientSecret,
    scope: process.env.OIDC_SCOPES || 'openid profile email',
    buttonLabel: process.env.OIDC_BUTTON_LABEL || 'SSO',
    allowJitProvisioning: process.env.OIDC_DISABLE_JIT !== 'true',
    defaultRole,
  };
}

export function isOidcEnabled() {
  return !!getOidcSettings();
}

// Authorization Server Metadata discovery involves a network round-trip, so
// the resolved configuration is cached for the lifetime of the process.
// Cleared on failure so the next attempt retries instead of failing forever.
let configPromise: Promise<Configuration> | null = null;

export async function getOidcClientConfig(): Promise<Configuration> {
  const settings = getOidcSettings();

  if (!settings) {
    throw new Error('OIDC is not configured');
  }

  if (!configPromise) {
    // OIDC_ALLOW_INSECURE permits a plain-HTTP issuer - only ever useful when
    // testing against a local provider. Never enable this in production.
    const execute =
      process.env.OIDC_ALLOW_INSECURE === 'true' ? [allowInsecureRequests] : undefined;

    configPromise = discovery(
      new URL(settings.issuer),
      settings.clientId,
      settings.clientSecret,
      undefined,
      execute ? { execute } : undefined,
    ).catch(err => {
      configPromise = null;
      throw err;
    });
  }

  return configPromise;
}
