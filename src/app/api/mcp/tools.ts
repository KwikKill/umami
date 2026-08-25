import { McpServer } from '@modelcontextprotocol/server';
import { subDays } from 'date-fns';
import { z } from 'zod';
import { type ApiKeyPermission, hasApiKeyPermission } from '@/lib/apiKey';
import { DOMAIN_REGEX } from '@/lib/constants';
import { uuid } from '@/lib/crypto';
import { getCompareDate } from '@/lib/date';
import type { Auth } from '@/lib/types';
import { canCreateTeamWebsite, canCreateWebsite, canViewTeam, canViewWebsiteSection } from '@/permissions';
import { createWebsite, getTeamWebsites, getUserWebsites } from '@/queries/prisma';
import {
  getWebsiteListStats,
  getWebsiteListTopPages,
  getWebsiteStats,
  WEBSITE_LIST_STATS_TOTAL_KEY,
} from '@/queries/sql';

function jsonResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true };
}

// When called via an API key, MCP tools go through a single HTTP endpoint
// (all POST), so the read/write scope can't be inferred from the HTTP
// method the way it is for the REST API - each tool checks it explicitly.
function checkScope(auth: Auth, permission: ApiKeyPermission) {
  if (auth.apiKey && !hasApiKeyPermission(auth.apiKey.permissions, permission)) {
    return errorResult(`This API key does not have "${permission}" permission.`);
  }

  return null;
}

function getDateRange(days: number) {
  const endDate = new Date();
  const startDate = subDays(endDate, days);

  return { startDate, endDate };
}

async function resolveWebsiteIds(auth: Auth, teamId?: string): Promise<string[] | null> {
  if (teamId && !(await canViewTeam(auth, teamId))) {
    return null;
  }

  const { data } = teamId
    ? await getTeamWebsites(teamId, { pageSize: -1 })
    : await getUserWebsites(auth.user.id, { pageSize: -1 });

  return data.map(website => website.id);
}

function buildTrackingCode(websiteId: string, baseUrl: string) {
  const basePath = process.env.BASE_PATH || '';

  return `<script defer src="${baseUrl}${basePath}/script.js" data-website-id="${websiteId}"></script>`;
}

export function buildMcpServer(auth: Auth, baseUrl: string) {
  const server = new McpServer({ name: 'umami', version: '1.0.0' });

  server.registerTool(
    'list_websites',
    {
      description:
        'List the websites the current user can access, optionally scoped to a team. Returns id, name, domain, and creation date for each.',
      inputSchema: z.object({
        teamId: z.uuid().optional().describe('Only list websites belonging to this team'),
      }),
    },
    async ({ teamId }) => {
      const scopeError = checkScope(auth, 'read');
      if (scopeError) return scopeError;

      if (teamId && !(await canViewTeam(auth, teamId))) {
        return errorResult(`Not authorized to view team ${teamId}.`);
      }

      const { data } = teamId
        ? await getTeamWebsites(teamId, { pageSize: -1 })
        : await getUserWebsites(auth.user.id, { pageSize: -1 });

      return jsonResult(
        data.map(website => ({
          id: website.id,
          name: website.name,
          domain: website.domain,
          createdAt: website.createdAt,
        })),
      );
    },
  );

  server.registerTool(
    'create_website',
    {
      description:
        'Register a new website in Umami so it can start collecting analytics. Returns the new website id and the <script> tracking snippet to paste on the site.',
      inputSchema: z.object({
        name: z.string().trim().min(1).max(100).describe('Display name for the website'),
        domain: z
          .string()
          .trim()
          .regex(DOMAIN_REGEX)
          .max(500)
          .describe('Domain the website will be tracked on, e.g. example.com'),
        teamId: z.uuid().optional().describe('Create the website under this team instead of the current user'),
      }),
    },
    async ({ name, domain, teamId }) => {
      const scopeError = checkScope(auth, 'write');
      if (scopeError) return scopeError;

      if (teamId && !(await canCreateTeamWebsite(auth, teamId))) {
        return errorResult(`Not authorized to create websites for team ${teamId}.`);
      }

      if (!(await canCreateWebsite(auth))) {
        return errorResult('Not authorized to create websites.');
      }

      const data: Record<string, unknown> = {
        id: uuid(),
        createdBy: auth.user.id,
        name,
        domain,
        teamId,
      };

      if (!teamId) {
        data.userId = auth.user.id;
      }

      const website = await createWebsite(data as any);

      return jsonResult({
        id: website.id,
        name: website.name,
        domain: website.domain,
        trackingCode: buildTrackingCode(website.id, baseUrl),
      });
    },
  );

  server.registerTool(
    'get_tracking_code',
    {
      description: 'Get the <script> tracking snippet to paste on a website that is already registered.',
      inputSchema: z.object({
        websiteId: z.uuid(),
      }),
    },
    async ({ websiteId }) => {
      const scopeError = checkScope(auth, 'read');
      if (scopeError) return scopeError;

      if (!(await canViewWebsiteSection(auth, websiteId, ['overview']))) {
        return errorResult(`Not authorized to view website ${websiteId}.`);
      }

      return jsonResult({ websiteId, trackingCode: buildTrackingCode(websiteId, baseUrl) });
    },
  );

  server.registerTool(
    'get_website_stats',
    {
      description:
        'Get pageviews, visitors, visits, bounce rate, and average visit duration for one website over the last N days, plus the same figures for the equivalent previous period for comparison.',
      inputSchema: z.object({
        websiteId: z.uuid(),
        days: z.coerce.number().int().positive().max(365).optional().default(7),
      }),
    },
    async ({ websiteId, days }) => {
      const scopeError = checkScope(auth, 'read');
      if (scopeError) return scopeError;

      if (!(await canViewWebsiteSection(auth, websiteId, ['overview', 'compare']))) {
        return errorResult(`Not authorized to view website ${websiteId}.`);
      }

      const { startDate, endDate } = getDateRange(days);
      const { startDate: compareStartDate, endDate: compareEndDate } = getCompareDate(
        'prev',
        startDate,
        endDate,
      );

      const [stats, comparison] = await Promise.all([
        getWebsiteStats(websiteId, { startDate, endDate } as any),
        getWebsiteStats(websiteId, { startDate: compareStartDate, endDate: compareEndDate } as any),
      ]);

      return jsonResult({ websiteId, days, ...stats, comparison });
    },
  );

  server.registerTool(
    'get_overview_stats',
    {
      description:
        'Get aggregated pageviews, visitors, visits, and bounce rate across ALL accessible websites (or all websites in a team) over the last N days, broken down per site plus a grand total, each with a comparison to the previous equivalent period.',
      inputSchema: z.object({
        teamId: z.uuid().optional().describe('Scope to this team instead of the current user'),
        days: z.coerce.number().int().positive().max(365).optional().default(7),
      }),
    },
    async ({ teamId, days }) => {
      const scopeError = checkScope(auth, 'read');
      if (scopeError) return scopeError;

      const websiteIds = await resolveWebsiteIds(auth, teamId);

      if (websiteIds === null) {
        return errorResult(`Not authorized to view team ${teamId}.`);
      }

      const { startDate, endDate } = getDateRange(days);
      const { startDate: compareStartDate, endDate: compareEndDate } = getCompareDate(
        'prev',
        startDate,
        endDate,
      );

      const [stats, compareStats] = await Promise.all([
        getWebsiteListStats(websiteIds, { startDate, endDate }),
        getWebsiteListStats(websiteIds, { startDate: compareStartDate, endDate: compareEndDate }),
      ]);

      return jsonResult({
        days,
        websites: websiteIds.map(id => ({ websiteId: id, ...stats[id], comparison: compareStats[id] })),
        totals: stats[WEBSITE_LIST_STATS_TOTAL_KEY],
        totalsComparison: compareStats[WEBSITE_LIST_STATS_TOTAL_KEY],
      });
    },
  );

  server.registerTool(
    'get_top_pages',
    {
      description:
        'Get the top pages by pageviews across ALL accessible websites (or all websites in a team) over the last N days, each with visitors/pageviews and a comparison to the previous equivalent period.',
      inputSchema: z.object({
        teamId: z.uuid().optional().describe('Scope to this team instead of the current user'),
        days: z.coerce.number().int().positive().max(365).optional().default(7),
        limit: z.coerce.number().int().positive().max(100).optional().default(20),
      }),
    },
    async ({ teamId, days, limit }) => {
      const scopeError = checkScope(auth, 'read');
      if (scopeError) return scopeError;

      const websiteIds = await resolveWebsiteIds(auth, teamId);

      if (websiteIds === null) {
        return errorResult(`Not authorized to view team ${teamId}.`);
      }

      const { startDate, endDate } = getDateRange(days);
      const { startDate: compareStartDate, endDate: compareEndDate } = getCompareDate(
        'prev',
        startDate,
        endDate,
      );

      const pages = await getWebsiteListTopPages(websiteIds, {
        startDate,
        endDate,
        compareStartDate,
        compareEndDate,
        limit,
      });

      return jsonResult({ days, pages });
    },
  );

  return server;
}
