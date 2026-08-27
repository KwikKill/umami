import { z } from 'zod';
import { getCompareDate } from '@/lib/date';
import { getRequestDateRange, parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { withDateRange } from '@/lib/schema';
import { canViewTeam } from '@/permissions';
import { getTeamWebsites, getUserWebsites } from '@/queries/prisma';
import { getWebsiteListStats, WEBSITE_LIST_STATS_TOTAL_KEY } from '@/queries/sql';

// Was previously its own hand-rolled schema (startAt/endAt only, defaulting
// to a hardcoded 7 days when absent) instead of the shared withDateRange -
// meaning it silently ignored sinceMs/startDate/endDate rather than
// rejecting or honoring them. Switched to match the sibling
// overview/pageviews and overview/top-pages routes, which already used
// withDateRange. The dashboard frontend (useWebsiteOverviewQuery) always
// sends startAt+endAt explicitly, so making the range mandatory here does
// not change its behavior.
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

  const { startDate, endDate } = getRequestDateRange(query);

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
