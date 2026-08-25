import { parseRequest } from '@/lib/request';
import { forbidden, notFound, ok } from '@/lib/response';
import { deleteApiKey, getUserApiKey } from '@/queries/prisma';

export async function DELETE(
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

  await deleteApiKey(apiKeyId);

  return ok();
}
