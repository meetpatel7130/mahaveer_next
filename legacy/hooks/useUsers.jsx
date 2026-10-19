import { useApiMutation } from './useApiMutation';
import { useApiQuery } from './useApiQuery';
import http from '../apiServices/http.service';

const USERS_KEY = ['GetAllUsers'];

export function useUsers(options = {}) {
  return useApiQuery({ queryKey: USERS_KEY, path: '/users/getalluser', ...options });
}
export function useAddUser(options = {}) {
  return useApiMutation({ url: '/users/adduser', invalidateKeys: [USERS_KEY], ...options });
}
export function useUpdateUser(options = {}) {
  return useApiMutation({ mutationFn: ({ id, data }) => http.put(`/users/edituser/${id}`, data), invalidateKeys: [USERS_KEY], ...options });
}
export function useDeleteUser(options = {}) {
  return useApiMutation({ url: (input) => `/users/deleteuser/${typeof input === 'object' ? input.id : input}`, method: 'delete', invalidateKeys: [USERS_KEY], ...options });
}
