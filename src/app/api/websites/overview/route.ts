import { fromZonedTime } from 'date-fns-tz';
import { z } from 'zod';
import { getCompareDate, parseDateRange } from '@/lib/date';
import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { timezoneParam } from '@/lib/schema';
import { canViewTeam } from '@/permissions';
import { getTeamWebsites, getUserWebsites } from '@/queries/prisma';
import { getWebsiteListStats, WEBSITE_LIST_STATS_TOTAL_KEY } from '@/queries/sql';

const schema = z.object({
  teamId: z.uuid().optional(),
  startAt: z.coerce.number().int().optional(),
  endAt: z.coerce.number().int().optional(),
  timezone: timezoneParam.optional(),
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

  const timezone = query.timezone || 'UTC';
  const defaultRange = parseDateRange('7day', undefined, undefined, timezone);
  const hasDateRange = query.startAt != null && query.endAt != null;
  const startDate = hasDateRange
    ? new Date(query.startAt)
    : fromZonedTime(defaultRange.startDate, timezone);
  const endDate = hasDateRange
    ? new Date(query.endAt)
    : fromZonedTime(defaultRange.endDate, timezone);

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
