import { generateApiKey } from '@/lib/apiKey';
import { parseRequest } from '@/lib/request';
import { forbidden, json, notFound } from '@/lib/response';
import { getUserApiKey, rotateApiKey } from '@/queries/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ apiKeyId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  // API keys can't be used to create or manage other API keys.
  if (auth.apiKey) {
    return forbidden();
  }

  const { apiKeyId } = await params;

  const apiKey = await getUserApiKey(auth.user.id, apiKeyId);

  if (!apiKey) {
    return notFound();
  }

  const { key, keyHash, keyPrefix } = generateApiKey();

  const result = await rotateApiKey(apiKeyId, { keyHash, keyPrefix });

  return json({
    id: result.id,
    name: result.name,
    keyPrefix: result.keyPrefix,
    permissions: result.permissions,
    createdAt: result.createdAt,
    key,
  });
}
