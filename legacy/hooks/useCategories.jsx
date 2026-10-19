import { useApiMutation } from './useApiMutation';
import { useApiQuery } from './useApiQuery';
import http from '../apiServices/http.service';

const CATEGORIES_KEY = ['GetAllCategory'];
const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

export function useCategories(options = {}) {
  return useApiQuery({ queryKey: CATEGORIES_KEY, path: '/category/getall', ...options });
}
export function useAddCategory(options = {}) {
  return useApiMutation({ ...options, mutationFn: (data) => http.post('/category/addcategory', data, multipart), invalidateKeys: [CATEGORIES_KEY] });
}
export function useUpdateCategory(options = {}) {
  return useApiMutation({ ...options, mutationFn: ({ id, data }) => http.put(`/category/editcategory/${id}`, data, multipart), invalidateKeys: [CATEGORIES_KEY] });
}
export function useDeleteCategory(options = {}) {
  return useApiMutation({ url: (id) => `/category/deletecategory/${id}`, method: 'delete', invalidateKeys: [CATEGORIES_KEY], ...options });
}
