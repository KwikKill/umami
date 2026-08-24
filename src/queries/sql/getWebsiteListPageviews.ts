import clickhouse from '@/lib/clickhouse';
import { CLICKHOUSE, PRISMA, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';

const FUNCTION_NAME = 'getWebsiteListPageviews';

export interface WebsiteListPageviewPoint {
  websiteId: string;
  x: string;
  y: number;
}

export async function getWebsiteListPageviews(
  websiteIds: string[],
  {
    startDate,
    endDate,
    timezone = 'UTC',
    unit = 'day',
  }: { startDate: Date; endDate: Date; timezone?: string; unit?: string },
): Promise<WebsiteListPageviewPoint[]> {
  if (!websiteIds.length) {
    return [];
  }

  return runQuery({
    [PRISMA]: () => relationalQuery(websiteIds, startDate, endDate, timezone, unit),
    [CLICKHOUSE]: () => clickhouseQuery(websiteIds, startDate, endDate, timezone, unit),
  });
}

async function relationalQuery(
  websiteIds: string[],
  startDate: Date,
  endDate: Date,
  timezone: string,
  unit: string,
): Promise<WebsiteListPageviewPoint[]> {
  const { getDateSQL, rawQuery } = prisma;

  return rawQuery(
    `
    select
      website_event.website_id as "websiteId",
      ${getDateSQL('website_event.created_at', unit, timezone)} as x,
      count(*) as y
    from website_event
    where website_event.website_id = any({{websiteIds}}::uuid[])
      and website_event.created_at between {{startDate}} and {{endDate}}
      and website_event.event_type NOT IN (2, 5)
    group by 1, 2
    order by 1, 2
    `,
    { websiteIds, startDate, endDate },
    FUNCTION_NAME,
  );
}

async function clickhouseQuery(
  websiteIds: string[],
  startDate: Date,
  endDate: Date,
  timezone: string,
  unit: string,
): Promise<WebsiteListPageviewPoint[]> {
  const { getDateSQL, rawQuery } = clickhouse;

  return rawQuery(
    `
    select
      g.websiteId as "websiteId",
      g.t as x,
      g.y as y
    from (
      select
        website_id as websiteId,
        ${getDateSQL('website_event.created_at', unit, timezone)} as t,
        sum(views) as y
      from website_event_stats_hourly as website_event
      where website_id in {websiteIds:Array(UUID)}
        and created_at between {startDate:DateTime64} and {endDate:DateTime64}
        and event_type NOT IN (2, 5)
      group by website_id, t
    ) as g
    order by g.websiteId, g.t
    `,
    { websiteIds, startDate, endDate },
    FUNCTION_NAME,
  );
}
