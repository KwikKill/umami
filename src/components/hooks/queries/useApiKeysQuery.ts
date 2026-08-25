import { keepPreviousData } from '@tanstack/react-query';
import type { ReactQueryOptions } from '@/lib/types';
import { useApi } from '../useApi';
import { useModified } from '../useModified';

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export function useApiKeysQuery(options?: ReactQueryOptions<ApiKey[]>) {
  const { get, useQuery } = useApi();
  const { modified } = useModified('api-keys');

  return useQuery<ApiKey[]>({
    queryKey: ['me:api-keys', { modified }],
    queryFn: () => get('/me/api-keys'),
    placeholderData: keepPreviousData,
    ...options,
  });
}
