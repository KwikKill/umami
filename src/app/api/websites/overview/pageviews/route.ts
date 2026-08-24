import { z } from 'zod';
import { getRequestDateRange, parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { withDateRange } from '@/lib/schema';
import { canViewTeam } from '@/permissions';
import { getTeamWebsites, getUserWebsites } from '@/queries/prisma';
import { getWebsiteListPageviews } from '@/queries/sql';

const schema = withDateRange({
  teamId: z.uuid().optional(),
});

export async function GET(request: Request) {
  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { teamId } = query;

  if (teamId && !(await canViewTeam(auth, teamId))) {
    return unauthorized();
  }

  const { data: websites } = teamId
    ? await getTeamWebsites(teamId, { pageSize: -1 })
    : await getUserWebsites(auth.user.id, { pageSize: -1 });

  const { startDate, endDate, timezone, unit } = getRequestDateRange(query);

  const websiteIds = websites.map(website => website.id);
  const data = await getWebsiteListPageviews(websiteIds, { startDate, endDate, timezone, unit });

  return json({ data });
}
