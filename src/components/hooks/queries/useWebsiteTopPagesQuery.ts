import { useDateParameters } from '@/components/hooks/useDateParameters';
import { useApi } from '../useApi';

export interface WebsiteTopPage {
  websiteId: string;
  websiteName?: string;
  websiteDomain?: string;
  urlPath: string;
  pageviews: number;
  visitors: number;
  previousPageviews: number;
  previousVisitors: number;
}

export function useWebsiteTopPagesQuery({
  teamId,
  limit = 20,
}: { teamId?: string; limit?: number } = {}) {
  const { get, useQuery } = useApi();
  const { startAt, endAt, timezone } = useDateParameters();

  return useQuery<{ data: WebsiteTopPage[] }>({
    queryKey: ['websites:overview:top-pages', { teamId, limit, startAt, endAt, timezone }],
    queryFn: () => get('/websites/overview/top-pages', { teamId, limit, startAt, endAt, timezone }),
  });
}
