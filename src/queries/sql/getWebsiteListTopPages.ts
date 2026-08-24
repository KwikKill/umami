import clickhouse from '@/lib/clickhouse';
import { CLICKHOUSE, PRISMA, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';

const FUNCTION_NAME = 'getWebsiteListTopPages';

export interface WebsiteListTopPage {
  websiteId: string;
  urlPath: string;
  pageviews: number;
  visitors: number;
  previousPageviews: number;
  previousVisitors: number;
}

export async function getWebsiteListTopPages(
  websiteIds: string[],
  {
    startDate,
    endDate,
    compareStartDate,
    compareEndDate,
    limit = 20,
  }: {
    startDate: Date;
    endDate: Date;
    compareStartDate: Date;
    compareEndDate: Date;
    limit?: number;
  },
): Promise<WebsiteListTopPage[]> {
  if (!websiteIds.length) {
    return [];
  }

  return runQuery({
    [PRISMA]: () =>
      relationalQuery(websiteIds, startDate, endDate, compareStartDate, compareEndDate, limit),
    [CLICKHOUSE]: () =>
      clickhouseQuery(websiteIds, startDate, endDate, compareStartDate, compareEndDate, limit),
  });
}

async function relationalQuery(
  websiteIds: string[],
  startDate: Date,
  endDate: Date,
  compareStartDate: Date,
  compareEndDate: Date,
  limit: number,
): Promise<WebsiteListTopPage[]> {
  const { rawQuery } = prisma;

  return rawQuery(
    `
    select
      website_event.website_id as "websiteId",
      website_event.url_path as "urlPath",
      count(*) filter (where website_event.created_at between {{startDate}} and {{endDate}}) as "pageviews",
      count(distinct website_event.session_id) filter (where website_event.created_at between {{startDate}} and {{endDate}}) as "visitors",
      count(*) filter (where website_event.created_at between {{compareStartDate}} and {{compareEndDate}}) as "previousPageviews",
      count(distinct website_event.session_id) filter (where website_event.created_at between {{compareStartDate}} and {{compareEndDate}}) as "previousVisitors"
    from website_event
    where website_event.website_id = any({{websiteIds}}::uuid[])
      and website_event.created_at between {{compareStartDate}} and {{endDate}}
      and website_event.event_type NOT IN (2, 5, 6)
      and website_event.url_path != ''
    group by 1, 2
    having count(*) filter (where website_event.created_at between {{startDate}} and {{endDate}}) > 0
    order by "pageviews" desc
    limit ${+limit}
    `,
    { websiteIds, startDate, endDate, compareStartDate, compareEndDate },
    FUNCTION_NAME,
  );
}

async function clickhouseQuery(
  websiteIds: string[],
  startDate: Date,
  endDate: Date,
  compareStartDate: Date,
  compareEndDate: Date,
  limit: number,
): Promise<WebsiteListTopPage[]> {
  const { rawQuery } = clickhouse;

  return rawQuery(
    `
    select
      website_id as "websiteId",
      url_path as "urlPath",
      countIf(created_at between {startDate:DateTime64} and {endDate:DateTime64}) as "pageviews",
      uniqIf(session_id, created_at between {startDate:DateTime64} and {endDate:DateTime64}) as "visitors",
      countIf(created_at between {compareStartDate:DateTime64} and {compareEndDate:DateTime64}) as "previousPageviews",
      uniqIf(session_id, created_at between {compareStartDate:DateTime64} and {compareEndDate:DateTime64}) as "previousVisitors"
    from website_event
    where website_id in {websiteIds:Array(UUID)}
      and created_at between {compareStartDate:DateTime64} and {endDate:DateTime64}
      and event_type NOT IN (2, 5, 6)
      and url_path != ''
    group by website_id, url_path
    having pageviews > 0
    order by pageviews desc
    limit ${+limit}
    `,
    { websiteIds, startDate, endDate, compareStartDate, compareEndDate },
    FUNCTION_NAME,
  );
}
