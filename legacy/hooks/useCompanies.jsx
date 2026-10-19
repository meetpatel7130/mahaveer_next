import { useApiMutation } from './useApiMutation';
import { useApiQuery } from './useApiQuery';
import http from '../apiServices/http.service';

const COMPANIES_KEY = ['GetAllCompany'];
const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

export function useCompanies(options = {}) {
  return useApiQuery({ queryKey: COMPANIES_KEY, path: '/company/getallcompany', ...options });
}
export function useAddCompany(options = {}) {
  return useApiMutation({ ...options, mutationFn: (data) => http.post('/company/addcompany', data, multipart), invalidateKeys: [COMPANIES_KEY] });
}
export function useCreateCompany(options = {}) {
  return useApiMutation({ url: '/company/createcompany', method: 'post', invalidateKeys: [COMPANIES_KEY], ...options });
}
export function useUpdateCompany(options = {}) {
  return useApiMutation({ ...options, mutationFn: ({ id, data }) => http.put(`/company/editcompany/${id}`, data, multipart), invalidateKeys: [COMPANIES_KEY] });
}
export function useDeleteCompany(options = {}) {
  return useApiMutation({ url: (id) => `/company/deletecompany/${id}`, method: 'delete', invalidateKeys: [COMPANIES_KEY], ...options });
}
