import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import http from '../apiServices/http.service';

const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export function useApiMutation({
  url,
  method = 'post',
  mutationFn: customMutationFn,
  invalidateKeys,
  showErrorToast = true,
  successMessage,
  redirectTo,
  onSuccess,
  onError,
  ...options
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutationFn = customMutationFn ?? ((variables) => {
    const resolvedUrl = typeof url === 'function' ? url(variables) : url;
    if (method === 'delete') {
      const body = variables !== null && typeof variables === 'object' ? variables : undefined;
      return http.del(resolvedUrl, body);
    }
    return http[method](resolvedUrl, variables);
  });

  return useMutation({
    ...options,
    mutationFn,
    onSuccess: async (data, variables, context) => {
      if (successMessage) toast.success(successMessage);
      if (invalidateKeys?.length) {
        await Promise.all(invalidateKeys.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey, refetchType: 'active' }),
        ));
      }
      await onSuccess?.(data, variables, context, queryClient);
      if (redirectTo) navigate(redirectTo, { replace: true });
    },
    onError: (error, variables, context) => {
      if (showErrorToast) {
        toast.error(error?.response?.data?.message || error?.message || DEFAULT_ERROR_MESSAGE);
      }
      onError?.(error, variables, context);
    },
  });
}
