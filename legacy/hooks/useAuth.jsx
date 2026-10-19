import { useApiMutation } from './useApiMutation';
import { useApiQuery } from './useApiQuery';
import http from '../apiServices/http.service';

export const CURRENT_USER_QUERY_KEY = ['authMe'];

export function useLogin(options = {}) {
  return useApiMutation({ url: '/auth/login', method: 'post', showErrorToast: false, ...options });
}

export function useGetLoggedUser(options = {}) {
  return useApiQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    path: '/auth/me',
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    ...options,
  });
}

export function useLogout(options = {}) {
  return useApiMutation({
    mutationFn: () => http.post('/auth/logout'),
    showErrorToast: false,
    ...options,
  });
}

export function useSignup(options = {}) {
  return useApiMutation({ url: '/auth/signup', method: 'post', ...options });
}
