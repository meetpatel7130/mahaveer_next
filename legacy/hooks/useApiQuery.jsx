import { keepPreviousData, useQuery } from '@tanstack/react-query';
import http from '../apiServices/http.service';

export function useApiQuery({
  queryKey,
  path,
  queryFn: customQueryFn,
  params,
  enabled,
  keepPrevious,
  staleTime,
  refetchInterval,
  ...queryOptions
}) {
  return useQuery({
    ...queryOptions,
    queryKey,
    queryFn: customQueryFn ?? (() => http.get(path, { params })),
    enabled,
    staleTime,
    refetchInterval,
    placeholderData: keepPrevious ? keepPreviousData : undefined,
  });
}
