import { useApiMutation } from './useApiMutation';
import { useApiQuery } from './useApiQuery';
import http from '../apiServices/http.service';

export const QUOTATIONS_KEY = ['GetAllQuotations'];

export function useQuotations({ params = {}, ...options } = {}) {
  return useApiQuery({ queryKey: [...QUOTATIONS_KEY, params], path: '/quotations/getallquotations', params, keepPrevious: true, ...options });
}
export function useAddQuotation(options = {}) {
  return useApiMutation({ url: '/quotations/addquotation', method: 'post', invalidateKeys: [QUOTATIONS_KEY], ...options });
}
export function useUpdateQuotation(options = {}) {
  return useApiMutation({
    mutationFn: ({ id, data }) => http.put(`/quotations/editquotation/${id}`, data),
    invalidateKeys: [QUOTATIONS_KEY],
    ...options,
  });
}
