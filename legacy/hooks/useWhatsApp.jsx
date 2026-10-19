import { useApiMutation } from './useApiMutation';
import { useApiQuery } from './useApiQuery';

const STATUS_KEY = ['WhatsAppStatus'];
const QR_KEY = ['WhatsAppQR'];

export function useWhatsAppStatus(options = {}) {
  return useApiQuery({ queryKey: STATUS_KEY, path: '/whatsapp/status', ...options });
}
export function useWhatsAppQR(options = {}) {
  return useApiQuery({ queryKey: QR_KEY, path: '/whatsapp/qr', ...options });
}
export function useConnectWhatsApp(options = {}) {
  return useApiMutation({ url: '/whatsapp/connect', invalidateKeys: [STATUS_KEY], ...options });
}
export function useDisconnectWhatsApp(options = {}) {
  return useApiMutation({ url: '/whatsapp/disconnect', invalidateKeys: [STATUS_KEY, QR_KEY], ...options });
}
export function useResetWhatsApp(options = {}) {
  return useApiMutation({ url: '/whatsapp/reset', invalidateKeys: [STATUS_KEY, QR_KEY], ...options });
}
export function useSendWhatsAppQuotation(options = {}) {
  return useApiMutation({ url: '/whatsapp/send-quotation', invalidateKeys: [], ...options });
}
export function useWhatsAppSessions(options = {}) {
  return useApiQuery({ queryKey: ['WhatsAppSessions'], path: '/whatsapp/sessions', ...options });
}
