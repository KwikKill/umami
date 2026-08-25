import { beforeEach, describe, expect, test, vi } from 'vitest';
import { generateApiKey } from '@/lib/apiKey';
import { hash } from '@/lib/crypto';
import { parseSecureToken } from '@/lib/jwt';
import redis from '@/lib/redis';
import { getApiKeyByHash, updateApiKeyLastUsed } from '@/queries/prisma/apiKey';
import { getUser } from '@/queries/prisma/user';
import { checkAuth } from './auth';

vi.mock('@/lib/jwt', () => ({
  parseSecureToken: vi.fn(),
  parseToken: vi.fn(() => null),
}));

vi.mock('@/queries/prisma/user', () => ({
  getUser: vi.fn(),
}));

vi.mock('@/queries/prisma/apiKey', () => ({
  getApiKeyByHash: vi.fn(),
  updateApiKeyLastUsed: vi.fn(),
}));

vi.mock('@/lib/redis', () => ({
  default: {
    enabled: false,
    client: {
      get: vi.fn(),
    },
  },
}));

const parseSecureTokenMock = vi.mocked(parseSecureToken);
const getUserMock = vi.mocked(getUser);
const getApiKeyByHashMock = vi.mocked(getApiKeyByHash);
const updateApiKeyLastUsedMock = vi.mocked(updateApiKeyLastUsed);
const redisMock = redis as unknown as {
  enabled: boolean;
  client: {
    get: ReturnType<typeof vi.fn>;
  };
};

const PASSWORD_HASH = '$2b$10$currentpasswordhashvalue';

function authedRequest() {
  return new Request('http://localhost/api/test', {
    headers: { authorization: 'Bearer secure-token' },
  });
}

function mockUser() {
  getUserMock.mockResolvedValue({
    id: 'user-1',
    username: 'bob',
    role: 'user',
    password: PASSWORD_HASH,
  } as any);
}

beforeEach(() => {
  parseSecureTokenMock.mockReset();
  getUserMock.mockReset();
  getApiKeyByHashMock.mockReset();
  updateApiKeyLastUsedMock.mockReset().mockResolvedValue(undefined as any);
  redisMock.enabled = false;
  redisMock.client.get.mockReset();
});

describe('checkAuth password fingerprint', () => {
  test('authorizes a stateless token whose fingerprint matches the current password', async () => {
    parseSecureTokenMock.mockReturnValue({ userId: 'user-1', pwd: hash(PASSWORD_HASH) } as any);
    mockUser();

    const result = await checkAuth(authedRequest());

    expect(result?.user?.id).toBe('user-1');
  });

  test('authorizes a legacy stateless token that does not include a password fingerprint', async () => {
    parseSecureTokenMock.mockReturnValue({ userId: 'user-1' } as any);
    mockUser();

    const result = await checkAuth(authedRequest());

    expect(result?.user?.id).toBe('user-1');
  });

  test('rejects a stateless token whose fingerprint predates a password change', async () => {
    // Token minted against the old password must stop working once the password changes.
    parseSecureTokenMock.mockReturnValue({
      userId: 'user-1',
      pwd: hash('old-password-hash'),
    } as any);
    mockUser();

    const result = await checkAuth(authedRequest());

    expect(result).toBeNull();
  });

  test('does not expose the password hash on the returned user', async () => {
    parseSecureTokenMock.mockReturnValue({ userId: 'user-1', pwd: hash(PASSWORD_HASH) } as any);
    mockUser();

    const result = await checkAuth(authedRequest());

    expect(result?.user).not.toHaveProperty('password');
  });

  test('authorizes a Redis session whose fingerprint matches the current password', async () => {
    redisMock.enabled = true;
    parseSecureTokenMock.mockReturnValue({ authKey: 'auth:session-key' } as any);
    redisMock.client.get.mockResolvedValue({ userId: 'user-1', pwd: hash(PASSWORD_HASH) });
    mockUser();

    const result = await checkAuth(authedRequest());

    expect(result?.user?.id).toBe('user-1');
  });

  test('rejects a Redis session whose fingerprint predates a password change', async () => {
    redisMock.enabled = true;
    parseSecureTokenMock.mockReturnValue({ authKey: 'auth:session-key' } as any);
    redisMock.client.get.mockResolvedValue({ userId: 'user-1', pwd: hash('old-password-hash') });
    mockUser();

    const result = await checkAuth(authedRequest());

    expect(result).toBeNull();
  });
});

describe('checkAuth API keys', () => {
  function apiKeyRequest(key: string) {
    return new Request('http://localhost/api/test', {
      headers: { authorization: `Bearer ${key}` },
    });
  }

  test('authorizes a valid API key and reports its permissions', async () => {
    const { key, keyHash, keyPrefix } = generateApiKey();

    getApiKeyByHashMock.mockResolvedValue({
      id: 'api-key-1',
      userId: 'user-1',
      name: 'CI key',
      keyHash,
      keyPrefix,
      permissions: ['read'],
      lastUsedAt: null,
      createdAt: new Date(),
    } as any);
    mockUser();

    const result = await checkAuth(apiKeyRequest(key));

    expect(result?.user?.id).toBe('user-1');
    expect(result?.apiKey).toEqual({ id: 'api-key-1', permissions: ['read'] });
    expect(updateApiKeyLastUsedMock).toHaveBeenCalledWith('api-key-1');
    expect(parseSecureTokenMock).not.toHaveBeenCalled();
  });

  test('rejects an API key that does not exist', async () => {
    getApiKeyByHashMock.mockResolvedValue(null);

    const result = await checkAuth(apiKeyRequest('umami_deadbeef'));

    expect(result).toBeNull();
  });

  test('rejects an API key whose owning user no longer exists', async () => {
    const { key, keyHash, keyPrefix } = generateApiKey();

    getApiKeyByHashMock.mockResolvedValue({
      id: 'api-key-1',
      userId: 'user-1',
      name: 'CI key',
      keyHash,
      keyPrefix,
      permissions: ['read'],
      lastUsedAt: null,
      createdAt: new Date(),
    } as any);
    getUserMock.mockResolvedValue(null);

    const result = await checkAuth(apiKeyRequest(key));

    expect(result).toBeNull();
  });

  test('does not expose the password hash on the API-key-authorized user', async () => {
    const { key, keyHash, keyPrefix } = generateApiKey();

    getApiKeyByHashMock.mockResolvedValue({
      id: 'api-key-1',
      userId: 'user-1',
      name: 'CI key',
      keyHash,
      keyPrefix,
      permissions: ['read', 'write'],
      lastUsedAt: null,
      createdAt: new Date(),
    } as any);
    mockUser();

    const result = await checkAuth(apiKeyRequest(key));

    expect(result?.user).not.toHaveProperty('password');
  });
});
