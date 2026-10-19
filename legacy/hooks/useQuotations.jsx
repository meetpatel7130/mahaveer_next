import { useApiMutation } from './useApiMutation';
import { useApiQuery } from './useApiQuery';

export const QUOTATIONS_KEY = ['GetAllQuotations'];

export function useQuotations({ params = {}, ...options } = {}) {
  return useApiQuery({ queryKey: [...QUOTATIONS_KEY, params], path: '/quotations/getallquotations', params, keepPrevious: true, ...options });
}
export function useAddQuotation(options = {}) {
  return useApiMutation({ url: '/quotations/addquotation', method: 'post', invalidateKeys: [QUOTATIONS_KEY], ...options });
}
