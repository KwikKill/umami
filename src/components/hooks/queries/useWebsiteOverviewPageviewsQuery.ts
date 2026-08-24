import { useDateParameters } from '@/components/hooks/useDateParameters';
import { useApi } from '../useApi';

export interface WebsiteOverviewPageviewPoint {
  websiteId: string;
  x: string;
  y: number;
}

export function useWebsiteOverviewPageviewsQuery({ teamId }: { teamId?: string } = {}) {
  const { get, useQuery } = useApi();
  const { startAt, endAt, unit, timezone } = useDateParameters();

  return useQuery<{ data: WebsiteOverviewPageviewPoint[] }>({
    queryKey: ['websites:overview:pageviews', { teamId, startAt, endAt, unit, timezone }],
    queryFn: () => get('/websites/overview/pageviews', { teamId, startAt, endAt, unit, timezone }),
  });
}
