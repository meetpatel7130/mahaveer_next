import { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { FileText, Download, Share2, Search, ChevronLeft, ChevronRight, Loader2, Wifi, WifiOff } from 'lucide-react';
import { generateQuotationPDF, generateQuotationPDFAsBase64 } from '../utils/pdfGenerator';
import { useWhatsAppStatus, useSendWhatsAppQuotation } from '../../hooks/useWhatsApp';
import { useFetchProductsByIds } from '../../hooks/useProducts';
import { toast } from 'sonner';

const defaultColumns = {
  product: true, size: true, innerPack: true, masterCarton: true,
  quantity: true, totalPieces: true, mrp: true, discount: true,
  finalPrice: true, gst: true, total: true,
};

const getProductId = (quotationProduct) => {
  const product = quotationProduct.product_id?._id
    || quotationProduct.product_id
    || quotationProduct.productId;

  return typeof product === 'object' ? product?._id?.toString() : product?.toString();
};

export default function QuotationsList() {
  const { user } = useAuth();
  const {
    quotations,
    quotationsLoading,
    quotationTotal,
    quotationPages,
    quotationParams,
    setQuotationFilter,
  } = useData();

  const isAdmin = user?.userType === 'admin';
  const fetchProductsByIds = useFetchProductsByIds();
  const fetchProductsByIdsAsync = fetchProductsByIds.mutateAsync;
  const sendWhatsAppQuotation = useSendWhatsAppQuotation({ showErrorToast: false });

  const [search,       setSearch]       = useState('');
  const [clientName,   setClientName]   = useState('');
  const [firmName,     setFirmName]     = useState('');
  const [from,         setFrom]         = useState('');
  const [to,           setTo]           = useState('');
  const [sharingId,    setSharingId]    = useState(null); // tracks which quotation is being shared
  const [expandedQuotationIds, setExpandedQuotationIds] = useState(() => new Set());
  const [productNamesById, setProductNamesById] = useState({});

  const toggleProducts = (quotationId) => {
    setExpandedQuotationIds((previous) => {
      const next = new Set(previous);
      if (next.has(quotationId)) next.delete(quotationId);
      else next.add(quotationId);
      return next;
    });
  };

  // Quotations store product IDs. Load their current names once per visible page.
  useEffect(() => {
    const ids = [...new Set(
      quotations.flatMap((quotation) => (quotation.products || []).map(getProductId).filter(Boolean))
    )];

    if (ids.length === 0) {
      setProductNamesById({});
      return undefined;
    }

    let cancelled = false;
    fetchProductsByIdsAsync(ids)
      .then((response) => {
        if (cancelled) return;
        const productMap = response?.productMap || response?.data?.productMap || {};
        setProductNamesById(Object.fromEntries(
          Object.entries(productMap).map(([id, product]) => [id, product.name])
        ));
      })
      .catch(() => {
        if (!cancelled) setProductNamesById({});
      });

    return () => { cancelled = true; };
  }, [quotations, fetchProductsByIdsAsync]);

  // ── WhatsApp status check ─────────────────────────────────────────────────
  const { data: wpStatusData } = useWhatsAppStatus({ refetchInterval: 30_000, retry: false });
  const wpReady = wpStatusData?.data?.ready === true;

  // ── Filters ───────────────────────────────────────────────────────────────
  const applyFilters = () => {
    setQuotationFilter({ search, clientName, firmName, from, to, page: 1 });
  };

  const clearFilters = () => {
    setSearch(''); setClientName(''); setFirmName(''); setFrom(''); setTo('');
    setQuotationFilter({ search: '', clientName: '', firmName: '', from: '', to: '', page: 1 });
  };

  // ── Fetch product details and attach to quotation products ──────────────
  const enrichQuotationWithProducts = async (quotation) => {
    const ids = [...new Set(
      quotation.products
        .map(getProductId)
        .filter(Boolean)
    )];
    if (ids.length === 0) return quotation;
    const res        = await fetchProductsByIds.mutateAsync(ids);
    const productMap = res?.productMap || res?.data?.productMap || {};
    return {
      ...quotation,
      products: quotation.products.map((qp) => ({
        ...qp,
        productDetails: productMap[getProductId(qp)] || {},
      })),
    };
  };

  // ── Download PDF ──────────────────────────────────────────────────────────
  const handleDownload = async (quotation) => {
    const toastId = toast.loading('Generating PDF...');
    try {
      const enriched = await enrichQuotationWithProducts(quotation);
      await generateQuotationPDF(enriched, defaultColumns, 'download');
      toast.success('PDF downloaded successfully', { id: toastId });
    } catch (err) {
      console.error('[DOWNLOAD ERROR]', err);
      toast.error('Failed to generate PDF', { id: toastId });
    }
  };

  // ── Share via WhatsApp backend ─────────────────────────────────────────────
  const handleShare = async (quotation) => {
    if (!wpReady) {
      toast.error('WhatsApp is not connected. Please check server status.');
      return;
    }

    const mobile = quotation.mobile || quotation.contact;
    if (!mobile) {
      toast.error('No mobile number found on this quotation.');
      return;
    }

    setSharingId(quotation._id);

    const toastId = toast.loading('Generating & sending PDF...');
    try {
      const enriched   = await enrichQuotationWithProducts(quotation);
      const base64PDF  = await generateQuotationPDFAsBase64(enriched, defaultColumns);
      const formatted  = String(mobile).replace(/\D/g, '');
      const withCountry = formatted.startsWith('91') ? formatted : `91${formatted}`;
      const caption =
        `*Quotation ${quotation.q_id}*\n\n` +
        `Client : ${quotation.clientName}\n` +
        `Firm   : ${quotation.firmName}\n` +
        `Total  : ₹${quotation.grandtotal?.toFixed(2)}\n\n` +
        `Please find your quotation PDF attached.\n\n- Mahavir Hospitality`;
      await sendWhatsAppQuotation.mutateAsync({ to: withCountry, caption, pdf: base64PDF });
      toast.success(`Quotation sent to ${quotation.clientName} on WhatsApp ✅`, { id: toastId });
    } catch (err) {
      console.error('[SHARE ERROR]', err);
      const msg = err?.response?.data?.message || 'Failed to send quotation on WhatsApp.';
      toast.error(msg, { id: toastId });
    } finally {
      setSharingId(null);
    }
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!quotationsLoading && quotations.length === 0 && !isAdmin) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-muted mx-auto mb-4" />
        <h3 className="mb-2 text-muted-foreground text-base sm:text-lg">No Quotations Yet</h3>
        <p className="text-muted-foreground text-sm">Create your first quotation from the catalog</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header with WhatsApp status indicator ──────────────────────────── */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-foreground text-lg sm:text-xl">Quotations</h2>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
          wpReady
            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
            : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
        }`}>
          {wpReady
            ? <><Wifi className="w-3 h-3" /> WhatsApp Connected</>
            : <><WifiOff className="w-3 h-3" /> WhatsApp Offline</>
          }
        </div>
      </div>

      {/* ── Filters — admin only ───────────────────────────────────────────── */}
      {isAdmin && (
        <div className="bg-card border border-border dark:border-primary/20 rounded-lg p-4 mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="relative lg:col-span-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text" value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                placeholder="Search by ID, client, firm, email, mobile..."
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground dark:border-primary/20"
              />
            </div>
            <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Filter by client name"
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground dark:border-primary/20" />
            <input type="text" value={firmName} onChange={(e) => setFirmName(e.target.value)} placeholder="Filter by firm name"
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground dark:border-primary/20" />
            <div className="flex gap-2">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground dark:border-primary/20" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground dark:border-primary/20" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={clearFilters} className="px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-muted transition-all">Clear</button>
            <button onClick={applyFilters} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-all">Search</button>
          </div>
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────────────────── */}
      {quotationsLoading && (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading quotations...</div>
      )}

      {/* ── Empty ────────────────────────────────────────────────────────────── */}
      {!quotationsLoading && quotations.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-muted mx-auto mb-4" />
          <h3 className="mb-2 text-muted-foreground">No Quotations Found</h3>
          <p className="text-muted-foreground text-sm">Try adjusting your filters</p>
        </div>
      )}

      {/* ── Quotation cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {quotations.map((quotation) => {
          const isSharing = sharingId === quotation._id;
          const mobile    = quotation.mobile || quotation.contact;
          const quotationId = quotation._id || quotation.q_id;
          const products = quotation.products || [];
          const productsExpanded = expandedQuotationIds.has(quotationId);
          const visibleProducts = productsExpanded ? products : products.slice(0, 3);

          return (
            <div
              key={quotation._id}
              className="bg-card border border-border rounded-lg shadow-md p-4 sm:p-6 dark:border-primary/20"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                    <h3 className="text-foreground dark:text-primary text-base sm:text-lg truncate">{quotation.q_id}</h3>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p className="truncate"><span className="font-medium">Client :</span> {quotation.clientName}</p>
                    <p className="truncate"><span className="font-medium">Firm   :</span> {quotation.firmName}</p>
                    {mobile && (
                      <p><span className="font-medium">Mobile :</span> {mobile}</p>
                    )}
                    <p><span className="font-medium">Date   :</span> {new Date(quotation.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-2">
                  <div className="text-base sm:text-lg text-foreground dark:text-primary">
                    <span className="text-sm text-muted-foreground">Total: </span>
                    <span className="font-medium">₹{quotation.grandtotal?.toFixed(2)}</span>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    {/* Download */}
                    <button
                      onClick={() => handleDownload(quotation)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Download</span>
                    </button>

                    {/* Share via WhatsApp */}
                    <button
                      onClick={() => handleShare(quotation)}
                      disabled={isSharing || !wpReady || !mobile}
                      title={
                        !mobile    ? 'No mobile number on this quotation' :
                        !wpReady   ? 'WhatsApp not connected' :
                        'Send PDF on WhatsApp'
                      }
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all text-sm border ${
                        wpReady && mobile && !isSharing
                          ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                          : 'bg-muted text-muted-foreground border-border cursor-not-allowed opacity-60'
                      }`}
                    >
                      {isSharing
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Share2 className="w-4 h-4" />
                      }
                      <span className="hidden sm:inline">
                        {isSharing ? 'Sending...' : 'Share'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Products preview */}
              <div className="border-t border-border dark:border-primary/20 pt-3 sm:pt-4">
                <p className="text-sm text-muted-foreground mb-2">Products: {products.length} item(s)</p>
                <div className={`space-y-2 ${productsExpanded ? '' : 'max-h-48 overflow-y-auto'}`}>
                  {visibleProducts.map((qp, index) => (
                    <div key={index} className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground truncate">
                          Product: {productNamesById[getProductId(qp)] || qp.productDetails?.name || qp.product_id?.name || qp.productName || 'Product unavailable'}
                        </p>
                        <p className="text-muted-foreground">
                          {qp.size} • Qty: {qp.quatity} • ₹{qp.finalPrice?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {products.length > 3 && (
                    <button
                      type="button"
                      onClick={() => toggleProducts(quotationId)}
                      aria-expanded={productsExpanded}
                      className="w-full pt-2 text-center text-xs text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                    >
                      {productsExpanded ? 'Show fewer items' : `+${products.length - 3} more items`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────────── */}
      {isAdmin && quotationPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted-foreground">
            Total: {quotationTotal} quotation{quotationTotal !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuotationFilter({ page: quotationParams.page - 1 })}
              disabled={quotationParams.page <= 1}
              className="p-2 border border-border rounded-lg text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all dark:border-primary/20"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-foreground px-2">
              {quotationParams.page} / {quotationPages}
            </span>
            <button
              onClick={() => setQuotationFilter({ page: quotationParams.page + 1 })}
              disabled={quotationParams.page >= quotationPages}
              className="p-2 border border-border rounded-lg text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all dark:border-primary/20"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
