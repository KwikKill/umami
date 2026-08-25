import { z } from 'zod';
import { API_KEY_PERMISSIONS, generateApiKey } from '@/lib/apiKey';
import { uuid } from '@/lib/crypto';
import { parseRequest } from '@/lib/request';
import { forbidden, json } from '@/lib/response';
import { createApiKey, getUserApiKeys } from '@/queries/prisma';

export async function GET(request: Request) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const apiKeys = await getUserApiKeys(auth.user.id);

  return json(
    apiKeys.map(({ id, name, keyPrefix, permissions, lastUsedAt, createdAt }) => ({
      id,
      name,
      keyPrefix,
      permissions,
      lastUsedAt,
      createdAt,
    })),
  );
}

export async function POST(request: Request) {
  const schema = z.object({
    name: z.string().trim().min(1).max(200),
    permissions: z.array(z.enum(API_KEY_PERMISSIONS)).min(1),
  });

  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  // API keys can't be used to create or manage other API keys.
  if (auth.apiKey) {
    return forbidden();
  }

  const { name, permissions } = body;
  const { key, keyHash, keyPrefix } = generateApiKey();

  const apiKey = await createApiKey({
    id: uuid(),
    userId: auth.user.id,
    name,
    keyHash,
    keyPrefix,
    permissions,
  });

  return json({
    id: apiKey.id,
    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix,
    permissions: apiKey.permissions,
    createdAt: apiKey.createdAt,
    key,
  });
}
