import { z } from 'zod';
import { getCompareDate } from '@/lib/date';
import { getRequestDateRange, parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { withDateRange } from '@/lib/schema';
import { canViewTeam } from '@/permissions';
import { getTeamWebsites, getUserWebsites } from '@/queries/prisma';
import { getWebsiteListTopPages } from '@/queries/sql';

const schema = withDateRange({
  teamId: z.uuid().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export async function GET(request: Request) {
  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { teamId, limit } = query;

  if (teamId && !(await canViewTeam(auth, teamId))) {
    return unauthorized();
  }

  const { data: websites } = teamId
    ? await getTeamWebsites(teamId, { pageSize: -1 })
    : await getUserWebsites(auth.user.id, { pageSize: -1 });

  const { startDate, endDate } = getRequestDateRange(query);
  const { startDate: compareStartDate, endDate: compareEndDate } = getCompareDate(
    'prev',
    startDate,
    endDate,
  );

  const websiteById = new Map(websites.map(website => [website.id, website]));
  const websiteIds = websites.map(website => website.id);

  const pages = await getWebsiteListTopPages(websiteIds, {
    startDate,
    endDate,
    compareStartDate,
    compareEndDate,
    limit,
  });

  return json({
    data: pages.map(page => ({
      ...page,
      websiteName: websiteById.get(page.websiteId)?.name,
      websiteDomain: websiteById.get(page.websiteId)?.domain,
    })),
  });
}
