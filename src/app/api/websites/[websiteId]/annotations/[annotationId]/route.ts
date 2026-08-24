import { z } from 'zod';
import { parseRequest } from '@/lib/request';
import { json, notFound, ok, unauthorized } from '@/lib/response';
import { canUpdateWebsite } from '@/permissions';
import { deleteAnnotation, getWebsiteAnnotation, updateAnnotation } from '@/queries/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string; annotationId: string }> },
) {
  const schema = z.object({
    date: z.coerce.date(),
    text: z.string().trim().min(1).max(500),
  });

  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId, annotationId } = await params;
  const { date, text } = body;

  if (!(await canUpdateWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const annotation = await getWebsiteAnnotation(websiteId, annotationId);

  if (!annotation) {
    return notFound();
  }

  const result = await updateAnnotation(annotationId, { date, text });

  return json(result);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ websiteId: string; annotationId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { websiteId, annotationId } = await params;

  if (!(await canUpdateWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const annotation = await getWebsiteAnnotation(websiteId, annotationId);

  if (!annotation) {
    return notFound();
  }

  await deleteAnnotation(annotationId);

  return ok();
}
