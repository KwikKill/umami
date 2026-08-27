import { z } from 'zod';
import { getCompareDate } from '@/lib/date';
import { getRequestDateRange, parseRequest, resolvePeriodDateRange } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { withDateRange } from '@/lib/schema';
import { canViewTeam } from '@/permissions';
import { getTeamWebsites, getUserWebsites } from '@/queries/prisma';
import { getWebsiteListStats, WEBSITE_LIST_STATS_TOTAL_KEY } from '@/queries/sql';

// Fork: cross-site stats for the global dashboard. Takes startAt+endAt or an
// upstream `period` (e.g. ?period=7d), like the sibling overview routes.
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

  const { startDate, endDate } = getRequestDateRange(resolvePeriodDateRange(query));

  const { startDate: compareStartDate, endDate: compareEndDate } = getCompareDate(
    'prev',
    startDate,
    endDate,
  );

  const websiteIds = websites.map(website => website.id);
  const [stats, compareStats] = await Promise.all([
    getWebsiteListStats(websiteIds, { startDate, endDate }),
    getWebsiteListStats(websiteIds, { startDate: compareStartDate, endDate: compareEndDate }),
  ]);

  return json({
    websites: websites.map(website => ({
      id: website.id,
      name: website.name,
      domain: website.domain,
      ...stats[website.id],
      comparison: compareStats[website.id],
    })),
    totals: stats[WEBSITE_LIST_STATS_TOTAL_KEY],
    totalsComparison: compareStats[WEBSITE_LIST_STATS_TOTAL_KEY],
  });
}
