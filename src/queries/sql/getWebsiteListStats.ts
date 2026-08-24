import clickhouse from '@/lib/clickhouse';
import { EVENT_TYPE } from '@/lib/constants';
import { CLICKHOUSE, PRISMA, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';

const FUNCTION_NAME = 'getWebsiteListStats';

export const WEBSITE_LIST_STATS_TOTAL_KEY = '__all__';

export interface WebsiteListStatsData {
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
}

interface WebsiteListStatsRow extends WebsiteListStatsData {
  websiteId: string;
}

export async function getWebsiteListStats(
  websiteIds: string[],
  { startDate, endDate }: { startDate: Date; endDate: Date },
): Promise<Record<string, WebsiteListStatsData>> {
  if (!websiteIds.length) {
    return { [WEBSITE_LIST_STATS_TOTAL_KEY]: emptyStats() };
  }

  return runQuery({
    [PRISMA]: async () => {
      const rows = await relationalQuery(websiteIds, startDate, endDate);

      return formatResults(rows, websiteIds);
    },
    [CLICKHOUSE]: async () => {
      const rows = await clickhouseQuery(websiteIds, startDate, endDate);

      return formatResults(rows, websiteIds);
    },
  });
}

function emptyStats(): WebsiteListStatsData {
  return { pageviews: 0, visitors: 0, visits: 0, bounces: 0, totaltime: 0 };
}

async function relationalQuery(
  websiteIds: string[],
  startDate: Date,
  endDate: Date,
): Promise<WebsiteListStatsRow[]> {
  const { getTimestampDiffSQL, rawQuery } = prisma;

  return rawQuery(
    `
    select
      "websiteId",
      cast(coalesce(sum(t.c), 0) as bigint) as "pageviews",
      count(distinct t.session_id) as "visitors",
      count(distinct t.visit_id) as "visits",
      coalesce(sum(case when t.c = 1 and t.has_custom_event = 0 and t.has_heartbeat = 0 then 1 else 0 end), 0) as "bounces",
      cast(coalesce(sum(${getTimestampDiffSQL('t.min_time', 't.max_time')}), 0) as bigint) as "totaltime"
    from (
      select
        website_event.website_id as "websiteId",
        website_event.session_id,
        website_event.visit_id,
        sum(case when website_event.event_type NOT IN (2, 5, 6) then 1 else 0 end) as "c",
        min(case when website_event.event_type NOT IN (2, 5) then website_event.created_at end) as "min_time",
        max(case when website_event.event_type NOT IN (2, 5) then website_event.created_at end) as "max_time",
        max(case when website_event.event_type = ${EVENT_TYPE.customEvent} then 1 else 0 end) as "has_custom_event",
        max(case when website_event.event_type = ${EVENT_TYPE.heartbeat} then 1 else 0 end) as "has_heartbeat"
      from website_event
      where website_event.website_id = any({{websiteIds}}::uuid[])
        and website_event.created_at between {{startDate}} and {{endDate}}
        and website_event.event_type != ${EVENT_TYPE.performance}
      group by 1, 2, 3
      having sum(case when website_event.event_type NOT IN (2, 5, 6) then 1 else 0 end) > 0
    ) as t
    group by "websiteId"
    `,
    { websiteIds, startDate, endDate },
    FUNCTION_NAME,
  );
}

async function clickhouseQuery(
  websiteIds: string[],
  startDate: Date,
  endDate: Date,
): Promise<WebsiteListStatsRow[]> {
  const { rawQuery } = clickhouse;

  return rawQuery(
    `
    select
      website_id as "websiteId",
      sum(t.c) as "pageviews",
      uniq(t.session_id) as "visitors",
      uniq(t.visit_id) as "visits",
      sumIf(1, t.c = 1 and t.has_custom_event = 0 and t.has_heartbeat = 0) as "bounces",
      sum(t.max_time - t.min_time) as "totaltime"
    from (
      select
        website_id,
        session_id,
        visit_id,
        sumIf(views, event_type != ${EVENT_TYPE.heartbeat}) c,
        minIf(min_time, event_type NOT IN (2, 5)) min_time,
        maxIf(max_time, event_type NOT IN (2, 5)) max_time,
        max(if(event_type = ${EVENT_TYPE.customEvent} and length(event_name) > 0, 1, 0)) has_custom_event,
        max(if(event_type = ${EVENT_TYPE.heartbeat}, 1, 0)) has_heartbeat
      from website_event_stats_hourly
      where website_id in {websiteIds:Array(UUID)}
        and created_at between {startDate:DateTime64} and {endDate:DateTime64}
        and event_type != ${EVENT_TYPE.performance}
      group by website_id, session_id, visit_id
      having c > 0
    ) as t
    group by website_id
    `,
    { websiteIds, startDate, endDate },
    FUNCTION_NAME,
  );
}

function formatResults(rows: WebsiteListStatsRow[], websiteIds: string[]) {
  const perSite = websiteIds.reduce<Record<string, WebsiteListStatsData>>((result, websiteId) => {
    result[websiteId] = emptyStats();
    return result;
  }, {});

  rows.forEach(row => {
    if (!(row.websiteId in perSite)) {
      return;
    }

    perSite[row.websiteId] = {
      pageviews: Number(row.pageviews) || 0,
      visitors: Number(row.visitors) || 0,
      visits: Number(row.visits) || 0,
      bounces: Number(row.bounces) || 0,
      totaltime: Number(row.totaltime) || 0,
    };
  });

  const total = Object.values(perSite).reduce<WebsiteListStatsData>((acc, stats) => {
    acc.pageviews += stats.pageviews;
    acc.visitors += stats.visitors;
    acc.visits += stats.visits;
    acc.bounces += stats.bounces;
    acc.totaltime += stats.totaltime;
    return acc;
  }, emptyStats());

  return { ...perSite, [WEBSITE_LIST_STATS_TOTAL_KEY]: total };
}
