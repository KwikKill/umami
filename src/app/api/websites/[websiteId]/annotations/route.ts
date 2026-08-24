import { z } from 'zod';
import { uuid } from '@/lib/crypto';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { withDateRange } from '@/lib/schema';
import { canUpdateWebsite, canViewWebsiteSection } from '@/permissions';
import { createAnnotation, getWebsiteAnnotations } from '@/queries/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = withDateRange();

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canViewWebsiteSection(auth, websiteId, ['overview', 'compare']))) {
    return unauthorized();
  }

  const { startDate, endDate } = await getQueryFilters(query, websiteId);

  const annotations = await getWebsiteAnnotations(websiteId, { startDate, endDate });

  return json(annotations);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = z.object({
    date: z.coerce.date(),
    text: z.string().trim().min(1).max(500),
  });

  const { auth, body, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;
  const { date, text } = body;

  if (!(await canUpdateWebsite(auth, websiteId))) {
    return unauthorized();
  }

  const result = await createAnnotation({
    id: uuid(),
    websiteId,
    date,
    text,
    createdBy: auth.user.id,
  });

  return json(result);
}
