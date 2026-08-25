import { keepPreviousData } from '@tanstack/react-query';
import type { ReactQueryOptions } from '@/lib/types';
import { useApi } from '../useApi';
import { useDateParameters } from '../useDateParameters';
import { useModified } from '../useModified';

export interface WebsiteAnnotation {
  id: string;
  websiteId: string;
  date: string;
  text: string;
}

export function useWebsiteAnnotationsQuery(
  websiteId: string,
  options?: ReactQueryOptions<WebsiteAnnotation[]>,
) {
  const { get, useQuery } = useApi();
  const { startAt, endAt } = useDateParameters();
  const { modified } = useModified('annotations');

  return useQuery<WebsiteAnnotation[]>({
    queryKey: ['website:annotations', { websiteId, startAt, endAt, modified }],
    queryFn: () => get(`/websites/${websiteId}/annotations`, { startAt, endAt }),
    enabled: !!websiteId,
    placeholderData: keepPreviousData,
    ...options,
  });
}
