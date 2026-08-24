import { useDateParameters } from '@/components/hooks/useDateParameters';
import { useApi } from '../useApi';
import { useModified } from '../useModified';

export interface WebsiteOverviewData {
  id: string;
  name: string;
  domain: string;
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
}

export interface WebsiteOverviewResponse {
  websites: WebsiteOverviewData[];
  totals: {
    pageviews: number;
    visitors: number;
    visits: number;
    bounces: number;
    totaltime: number;
  };
}

export function useWebsiteOverviewQuery({ teamId }: { teamId?: string } = {}) {
  const { get, useQuery } = useApi();
  const { startAt, endAt, timezone } = useDateParameters();
  const { modified } = useModified('websites');

  return useQuery<WebsiteOverviewResponse>({
    queryKey: ['websites:overview', { teamId, startAt, endAt, timezone, modified }],
    queryFn: () => get('/websites/overview', { teamId, startAt, endAt, timezone }),
  });
}
