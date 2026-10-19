import { useApiMutation } from './useApiMutation';
import { useApiQuery } from './useApiQuery';
import http from '../apiServices/http.service';

export const PRODUCTS_KEY = ['GetAllProduct'];
const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

export function useProducts({ params, ...options } = {}) {
  return useApiQuery({ queryKey: [...PRODUCTS_KEY, params], path: '/products/getallproducts', params, keepPrevious: true, ...options });
}
export function useAddProduct(options = {}) {
  return useApiMutation({ url: '/products/addproduct', method: 'post', ...options, mutationFn: (data) => http.post('/products/addproduct', data, multipart), invalidateKeys: [PRODUCTS_KEY] });
}
export function useUpdateProduct(options = {}) {
  return useApiMutation({ ...options, mutationFn: ({ id, data }) => http.put(`/products/editproduct/${id}`, data, multipart), invalidateKeys: [PRODUCTS_KEY] });
}
export function useDeleteProduct(options = {}) {
  return useApiMutation({ ...options, mutationFn: (input) => http.del(`/products/deleteproduct/${typeof input === 'object' ? input.id : input}`, typeof input === 'object' ? input : undefined), invalidateKeys: [PRODUCTS_KEY] });
}
export function useProductsByIds(ids, options = {}) {
  return useApiQuery({ queryKey: ['ProductsByIds', ids], queryFn: () => http.post('/products/getbyids', { ids }), enabled: Boolean(ids?.length), ...options });
}
export function useFetchProductsByIds(options = {}) {
  return useApiMutation({ mutationFn: (ids) => http.post('/products/getbyids', { ids }), showErrorToast: false, ...options });
}
