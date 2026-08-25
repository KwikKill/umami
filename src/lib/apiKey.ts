import crypto from 'node:crypto';
import { hash } from '@/lib/crypto';

export const API_KEY_PREFIX = 'umami_';

export const API_KEY_PERMISSIONS = ['read', 'write'] as const;

export type ApiKeyPermission = (typeof API_KEY_PERMISSIONS)[number];

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

export function isApiKeyToken(token?: string) {
  return !!token && token.startsWith(API_KEY_PREFIX);
}

export function hashApiKey(key: string) {
  return hash(key);
}

export function generateApiKey() {
  const key = `${API_KEY_PREFIX}${crypto.randomBytes(24).toString('hex')}`;

  return {
    key,
    keyHash: hashApiKey(key),
    keyPrefix: key.slice(0, API_KEY_PREFIX.length + 8),
  };
}

export function requiresWriteScope(method: string) {
  return WRITE_METHODS.includes(method);
}

export function hasApiKeyPermission(permissions: unknown, permission: ApiKeyPermission) {
  return Array.isArray(permissions) && permissions.includes(permission);
}
