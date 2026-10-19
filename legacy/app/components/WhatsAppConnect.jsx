import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, LogOut, QrCode, Wifi, WifiOff, RefreshCw, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { useWhatsAppStatus, useWhatsAppQR, useConnectWhatsApp, useDisconnectWhatsApp, useResetWhatsApp } from '../../hooks/useWhatsApp';

export default function WhatsAppConnect() {
  const queryClient               = useQueryClient();
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // ── Poll status every 4s ──────────────────────────────────────────────
  const { data: statusRes, isLoading: statusLoading } = useWhatsAppStatus({ refetchInterval: 4_000, retry: false });

  const status     = statusRes?.data?.status || 'not_initialized';
  const errorMsg   = statusRes?.data?.error  || null;
  const isReady    = status === 'ready';
  const isQRPending = status === 'qr_pending';
  const hasError   = status === 'disconnected' && !!errorMsg;

  // ── Poll QR every 10s when pending ───────────────────────────────────
  const { data: qrRes } = useWhatsAppQR({ enabled: isQRPending, refetchInterval: 10_000, retry: false });

  useEffect(() => {
    const qrString = qrRes?.data?.qr;
    if (!qrString) return;
    QRCode.toDataURL(qrString, { width: 256, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(null));
  }, [qrRes]);

  useEffect(() => {
    if (isQRPending) setShowModal(true);
    if (isReady)     { setShowModal(false); setQrDataUrl(null); }
  }, [isQRPending, isReady]);

  // ── Connect ───────────────────────────────────────────────────────────
  const { mutate: connect, isPending: connecting } = useConnectWhatsApp({
    showErrorToast: false,
    onSuccess : (res) => {
      queryClient.invalidateQueries({ queryKey: ['WhatsAppStatus'] });
      if (res?.data?.message?.includes('Already connected')) {
        toast.success('WhatsApp already connected ✅');
      } else {
        toast.info('Checking for saved session…');
      }
    },
    onError: () => toast.error('Failed to start WhatsApp. Try again.'),
  });

  // ── Disconnect ────────────────────────────────────────────────────────
  const { mutate: disconnect, isPending: disconnecting } = useDisconnectWhatsApp({
    showErrorToast: false,
    onSuccess : () => {
      toast.success('WhatsApp disconnected');
      setShowModal(false);
      setQrDataUrl(null);
      queryClient.invalidateQueries({ queryKey: ['WhatsAppStatus'] });
      queryClient.invalidateQueries({ queryKey: ['WhatsAppQR'] });
    },
    onError: () => toast.error('Failed to disconnect.'),
  });

  // ── Reset (clears stale/broken session folder) ────────────────────────
  const { mutate: reset, isPending: resetting } = useResetWhatsApp({
    showErrorToast: false,
    onSuccess : () => {
      toast.success('Session reset. Click Connect to get a fresh QR.');
      queryClient.invalidateQueries({ queryKey: ['WhatsAppStatus'] });
      queryClient.invalidateQueries({ queryKey: ['WhatsAppQR'] });
    },
    onError: () => toast.error('Reset failed. Try restarting the server.'),
  });

  const refreshQR = () => queryClient.invalidateQueries({ queryKey: ['WhatsAppQR'] });

  // ── Status config ─────────────────────────────────────────────────────
  const STATUS = {
    ready          : { label: 'Connected',     dot: 'bg-green-500',                   text: 'text-green-600'          },
    qr_pending     : { label: 'Scan Required', dot: 'bg-yellow-500',                  text: 'text-yellow-600'         },
    initializing   : { label: 'Connecting…',   dot: 'bg-blue-500 animate-pulse',      text: 'text-blue-600'           },
    authenticated  : { label: 'Authenticated', dot: 'bg-blue-500 animate-pulse',      text: 'text-blue-600'           },
    disconnected   : { label: hasError ? 'Error' : 'Disconnected',
                       dot : hasError ? 'bg-red-500 animate-pulse' : 'bg-red-500',
                       text: 'text-red-600'                                                                            },
    not_initialized: { label: 'Not set up',    dot: 'bg-gray-400',                    text: 'text-muted-foreground'   },
  };
  const cfg = STATUS[status] || STATUS.not_initialized;

  const isBusy = connecting || disconnecting || resetting
    || status === 'initializing' || status === 'authenticated';

  return (
    <>
      {/* ── Widget card ─────────────────────────────────────────────── */}
      <div className="bg-card border border-border dark:border-primary/20 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground">WhatsApp</h3>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
          </div>
        </div>

        {/* Error message */}
        {hasError && (
          <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Connection failed</p>
            <p className="text-xs text-red-500 dark:text-red-400 break-all">
              {errorMsg.includes('ERR_NAME_NOT_RESOLVED')
                ? 'Could not reach WhatsApp servers. The saved session is stale — click Reset to clear it, then reconnect.'
                : errorMsg}
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground mb-4">
          {isReady
            ? 'Your WhatsApp is connected. Quotations will be sent from your number.'
            : hasError
              ? 'Click Reset to clear the broken session, then Connect to scan a fresh QR code.'
              : 'Connect your WhatsApp to send quotations directly to clients.'}
        </p>

        <div className="flex flex-wrap gap-2">
          {/* Connect — when not active */}
          {!isReady && !isBusy && (
            <button
              onClick={() => connect()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
            >
              <Wifi className="w-4 h-4" /> Connect
            </button>
          )}

          {/* Reset — when there's an error or disconnected with stale session */}
          {(hasError || status === 'disconnected') && !isBusy && (
            <button
              onClick={() => reset()}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Reset Session
            </button>
          )}

          {/* Show QR button */}
          {isQRPending && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm transition-colors"
            >
              <QrCode className="w-4 h-4" /> Show QR
            </button>
          )}

          {/* Connecting spinner */}
          {(status === 'initializing' || status === 'authenticated' || connecting || resetting) && (
            <button disabled className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              {resetting ? 'Resetting…' : 'Connecting…'}
            </button>
          )}

          {/* Disconnect */}
          {isReady && (
            <button
              onClick={() => disconnect()}
              disabled={disconnecting}
              className="flex items-center gap-2 px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg text-sm transition-colors disabled:opacity-60"
            >
              {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          )}
        </div>
      </div>

      {/* ── QR Modal ────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground font-semibold text-base">Scan QR Code</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Open WhatsApp on your phone →{' '}
              <span className="font-medium text-foreground">Settings → Linked Devices → Link a Device</span>
            </p>
            <div className="flex items-center justify-center mb-4">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="WhatsApp QR Code" className="w-56 h-56 rounded-xl border-4 border-white shadow-md" />
              ) : (
                <div className="w-56 h-56 rounded-xl border border-border bg-muted flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Loading QR...</p>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-4">QR code expires every 20 seconds. It auto-refreshes.</p>
            <div className="flex gap-2">
              <button onClick={refreshQR} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-muted transition-colors">
                <RefreshCw className="w-4 h-4" /> Refresh QR
              </button>
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg text-sm hover:bg-muted/80 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
