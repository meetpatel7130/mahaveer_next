import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import CategoryGrid from './CategoryGrid';
import ProductCardWithSizes from './ProductCardWithSizes';
import QuotationBuilder from './QuotationBuilder';
import QuotationsList from './QuotationsList';
import ThemeToggle from './ThemeToggle';
import WhatsAppConnect from './WhatsAppConnect';
import { generateProductSharePDF, generateProductSharePDFAsBase64 } from '../utils/Productsharepdf';
import { useWhatsAppStatus, useSendWhatsAppQuotation } from '../../hooks/useWhatsApp';
import { useFetchProductsByIds } from '../../hooks/useProducts';
import {
  ArrowLeft, LogOut, ShoppingCart, FileText, Grid3x3,
  ChevronLeft, ChevronRight, Share2, X, Download, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL_IMG || '';

export default function SalespersonDashboard() {
  const { user, logout } = useAuth();
  const {
    companies, categories, products,
    productsLoading, productTotal, productPages, productParams, setProductFilter,
  } = useData();

  const [selectedCompanyId, setSelectedCompanyId]                 = useState(null);
  const [selectedCategoryId, setSelectedCategoryId]               = useState(null);
  const [selectedProductsWithSizes, setSelectedProductsWithSizes] = useState([]);
  const [view, setView]                                           = useState('categories');

  // ── Share mode state ──────────────────────────────────────────────────
  const [shareMode, setShareMode]                     = useState(false);
  const [shareSelectedIds, setShareSelectedIds]       = useState([]);   // product._id list
  const [sharePdfBlob, setSharePdfBlob]               = useState(null); // generated blob
  const [shareStep, setShareStep]                     = useState('select'); // 'select' | 'preview'
  const [isGeneratingPDF, setIsGeneratingPDF]         = useState(false);
  const [isSendingWP, setIsSendingWP]                 = useState(false);

  // ── WhatsApp status ───────────────────────────────────────────────────
  const { data: wpStatusRes } = useWhatsAppStatus({ refetchInterval: 10_000, retry: false });
  const fetchProductsByIds = useFetchProductsByIds();
  const sendWhatsAppQuotation = useSendWhatsAppQuotation({ showErrorToast: false });
  const wpReady = wpStatusRes?.data?.ready === true;

  // ── Product filter helpers ────────────────────────────────────────────
  const filteredProducts = products.filter((p) => {
    const cid = p.company?._id  || p.company;
    const kid = p.category?._id || p.category;
    if (selectedCompanyId && selectedCategoryId) return cid === selectedCompanyId && kid === selectedCategoryId;
    if (selectedCompanyId)  return cid === selectedCompanyId;
    if (selectedCategoryId) return kid === selectedCategoryId;
    return true;
  });

  const availableCategories = selectedCompanyId
    ? categories.filter((cat) =>
        products.some((p) =>
          (p.company?._id || p.company) === selectedCompanyId &&
          (p.category?._id || p.category) === cat._id
        )
      )
    : [];

  // ── Navigation ────────────────────────────────────────────────────────
  const handleCompanyClick = (companyId) => {
    setSelectedCompanyId(companyId);
    setSelectedCategoryId(null);
    setProductFilter({ company: companyId, category: '', page: 1 });
    setView('products');
  };

  const handleCategoryClick = (categoryId) => {
    setSelectedCategoryId(categoryId);
    setSelectedCompanyId(null);
    setProductFilter({ category: categoryId, company: '', page: 1 });
    setView('products');
  };

  const handleBack = () => {
    if (view === 'products' || view === 'companies') {
      if (view === 'products' && selectedCompanyId) {
        setView('companies');
      } else {
        setView('categories');
        setSelectedCompanyId(null);
        setSelectedCategoryId(null);
        setProductFilter({ company: '', category: '', search: '', page: 1 });
      }
    } else if (view === 'quotation-builder') {
      setView('products');
    } else if (view === 'quotations' || view === 'whatsapp') {
      setView('categories');
    }
  };

  // ── Quotation selection ───────────────────────────────────────────────
  const handleProductSizesChange = (product, selectedSizes) => {
    setSelectedProductsWithSizes((prev) => {
      if (selectedSizes.length === 0) return prev.filter((p) => p.product._id !== product._id);
      const idx = prev.findIndex((p) => p.product._id === product._id);
      if (idx >= 0) { const u = [...prev]; u[idx] = { product, selectedSizes }; return u; }
      return [...prev, { product, selectedSizes }];
    });
  };

  const handleMakeQuotation = () => {
    if (selectedProductsWithSizes.length === 0) {
      toast.error('Please select at least one product with sizes');
      return;
    }
    setView('quotation-builder');
  };

  const handleQuotationComplete = () => {
    setSelectedProductsWithSizes([]);
    setView('categories');
    toast.success('Quotation saved successfully');
  };

  // ── Share mode ────────────────────────────────────────────────────────
  const enterShareMode = () => {
    setShareMode(true);
    setShareSelectedIds([]);
    setShareStep('select');
    setSharePdfBlob(null);
  };

  const exitShareMode = () => {
    setShareMode(false);
    setShareSelectedIds([]);
    setShareStep('select');
    setSharePdfBlob(null);
  };

  const toggleShareProduct = (productId) => {
    setShareSelectedIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  // ── Generate share PDF ────────────────────────────────────────────────
  const handleGenerateSharePDF = async () => {
    if (shareSelectedIds.length === 0) {
      toast.error('Select at least one product to share.');
      return;
    }

    setIsGeneratingPDF(true);
    const toastId = toast.loading('Generating product catalog PDF...');

    try {
      const res = await fetchProductsByIds.mutateAsync(shareSelectedIds);
      // Support both the API payload and an Axios-style data wrapper.
      const response = res?.productMap || res?.products ? res : (res?.data || {});
      const fetchedProducts = response?.products || [];
      const productMap = response?.productMap || Object.fromEntries(
        fetchedProducts.map((product) => [String(product._id), product]),
      );
      // The selected cards are already loaded, so use them as a fallback if
      // the bulk lookup response omits a product or returns a differently shaped map.
      const loadedProductMap = new Map(
        [...products, ...fetchedProducts].map((product) => [String(product._id), product]),
      );

      const enriched = shareSelectedIds
        .map((id) => productMap[String(id)] || loadedProductMap.get(String(id)))
        .filter(Boolean)
        .map((product) => ({ ...product, image: product.img || product.image }));

      if (enriched.length < shareSelectedIds.length) {
        toast.error(`${shareSelectedIds.length - enriched.length} selected product(s) couldn't be found and were skipped.`);
      }
      if (enriched.length === 0) {
        toast.error('Could not load the selected products.', { id: toastId });
        return;
      }

      // generateProductSharePDF now takes ONLY the products array and
      // returns a jsPDF instance — convert to blob here
      const pdf  = await generateProductSharePDF(enriched);
      const blob = pdf.output('blob');

      setSharePdfBlob({ blob, enriched });
      setShareStep('preview');
      toast.success('PDF ready!', { id: toastId });

    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF.', { id: toastId });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // ── Download share PDF ────────────────────────────────────────────────
  const handleDownloadSharePDF = () => {
    if (!sharePdfBlob) return;
    const url = URL.createObjectURL(sharePdfBlob.blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `Product_Catalog_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('PDF downloaded!');
  };

  // ── Send share PDF to self on WhatsApp ────────────────────────────────
  const handleSendSharePDFtoSelf = async () => {
    if (!wpReady) {
      toast.error('WhatsApp not connected. Go to WhatsApp settings first.');
      return;
    }
    if (!user?.mobile) {
      toast.error('No mobile number found on your account.');
      return;
    }
    if (!sharePdfBlob) return;

    setIsSendingWP(true);
    const toastId = toast.loading('Sending catalog to your WhatsApp...');

    try {
      // convert blob to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror  = reject;
        reader.readAsDataURL(sharePdfBlob.blob);
      });

      const mobile      = String(user.mobile).replace(/\D/g, '');
      const withCountry = mobile.startsWith('91') ? mobile : `91${mobile}`;

      await sendWhatsAppQuotation.mutateAsync({
        to     : withCountry,
        caption: `*Product Catalog*\n\nHere is the product catalog you requested.\n\n- Mahaveer Hospitality`,
        pdf    : base64,
      });

      toast.success(`Catalog sent to your number (${user.mobile}) ✅`, { id: toastId });
      exitShareMode();

    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || 'Failed to send on WhatsApp.';
      toast.error(msg, { id: toastId });
    } finally {
      setIsSendingWP(false);
    }
  };

  const totalSelectedItems = selectedProductsWithSizes.reduce((s, i) => s + i.selectedSizes.length, 0);

  // ── Pagination ────────────────────────────────────────────────────────
  const PaginationBar = () => {
    if (!productTotal) return null;
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Page <span className="font-medium text-foreground">{productParams.page}</span> of{' '}
          <span className="font-medium text-foreground">{productPages}</span>
          {' '}— {productTotal} product{productTotal !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-1">
          <button disabled={productParams.page <= 1} onClick={() => setProductFilter({ page: productParams.page - 1 })}
            className="p-2 border border-border rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          {(() => {
            const total = productPages; const cur = productParams.page; let pages = [];
            if (total <= 5) { pages = Array.from({ length: total }, (_, i) => i + 1); }
            else {
              pages = [1];
              if (cur > 3) pages.push('...');
              for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) pages.push(p);
              if (cur < total - 2) pages.push('...');
              pages.push(total);
            }
            return pages.map((p, i) => p === '...'
              ? <span key={`e-${i}`} className="px-2 text-muted-foreground">…</span>
              : <button key={p} onClick={() => setProductFilter({ page: p })}
                  className={`min-w-[36px] px-3 py-1.5 text-sm rounded-md border transition-colors ${p === cur ? 'bg-primary text-primary-foreground border-primary font-medium' : 'border-border hover:bg-muted text-foreground'}`}>
                  {p}
                </button>
            );
          })()}
          <button disabled={productParams.page >= productPages} onClick={() => setProductFilter({ page: productParams.page + 1 })}
            className="p-2 border border-border rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-card shadow-sm border-b border-border dark:border-primary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              {view !== 'categories' && (
                <button onClick={handleBack} className="p-2 hover:bg-muted rounded-lg transition-all">
                  <ArrowLeft className="w-5 h-5 text-foreground" />
                </button>
              )}
              <div>
                <h1 className="text-base sm:text-lg md:text-xl text-foreground dark:text-primary">Mahaveer Hospitality</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Welcome, {user?.fullName}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <button onClick={() => {
                if (view === 'companies' || selectedCompanyId) {
                  setView('categories');
                  setSelectedCompanyId(null);
                  setSelectedCategoryId(null);
                  setProductFilter({ company: '', category: '', search: '', page: 1 });
                } else {
                  setView('companies');
                  setSelectedCategoryId(null);
                }
              }}
                className={`flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg transition-all ${view === 'companies' || selectedCompanyId ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80 dark:border dark:border-primary/20'}`}>
                <Grid3x3 className="w-4 h-4" />
                <span className="hidden md:inline">Catalog</span>
              </button>
              <button onClick={() => { setView('quotations'); exitShareMode(); }}
                className={`flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg transition-all ${view === 'quotations' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80 dark:border dark:border-primary/20'}`}>
                <FileText className="w-4 h-4" />
                <span className="hidden md:inline">Quotations</span>
              </button>
              <button onClick={() => { setView('whatsapp'); exitShareMode(); }}
                className={`flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg transition-all ${view === 'whatsapp' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80 dark:border dark:border-primary/20'}`}>
                <Share2 className="w-4 h-4" />
                <span className="hidden md:inline">WhatsApp</span>
              </button>
              {/* <ThemeToggle /> */}
              <button onClick={logout} className="flex items-center gap-2 px-2 sm:px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-all dark:border dark:border-primary/20">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">

        {/* Categories */}
        {view === 'categories' && (
          <div>
            <div className="mb-4 sm:mb-6">
              <h2 className="mb-2 text-foreground text-lg sm:text-xl">Product Categories</h2>
            </div>
            <CategoryGrid
              categories={categories.map((c) => ({ ...c, id: c._id, image: c.img ? `${BACKEND_URL}${c.img}` : null }))}
              onCategoryClick={handleCategoryClick}
            />
          </div>
        )}

        {/* Companies */}
        {view === 'companies' && (
          <div>
            <div className="mb-4 sm:mb-6">
              <h2 className="mb-2 text-foreground text-lg sm:text-xl">Our Companies</h2>
            </div>
            <CategoryGrid
              categories={companies.map((c) => ({ ...c, id: c._id, image: c.image ? `${BACKEND_URL}${c.image}` : null }))}
              onCategoryClick={handleCompanyClick}
            />
          </div>
        )}

        {/* Products */}
        {view === 'products' && (
          <div>
            {/* ── Top bar ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <div>
                <h2 className="mb-1 text-foreground text-lg sm:text-xl">
                  {selectedCompanyId ? companies.find((c) => c._id === selectedCompanyId)?.name
                    : selectedCategoryId ? categories.find((c) => c._id === selectedCategoryId)?.name
                    : 'All Products'}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {shareMode
                    ? `${shareSelectedIds.length} product${shareSelectedIds.length !== 1 ? 's' : ''} selected for sharing`
                    : `${totalSelectedItems} item(s) selected`}
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                {!shareMode && (
                  <input type="text" placeholder="Search products..."
                    value={productParams.search}
                    onChange={(e) => setProductFilter({ search: e.target.value, page: 1 })}
                    className="flex-1 sm:w-48 px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                )}

                {/* Share mode off → show "Share Products" button */}
                {!shareMode && (
                  <button onClick={enterShareMode}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors whitespace-nowrap">
                    <Share2 className="w-4 h-4" /> Share Products
                  </button>
                )}

                {/* Share mode on → show Generate PDF or Cancel */}
                {shareMode && shareStep === 'select' && (
                  <>
                    <button onClick={exitShareMode}
                      className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-muted transition-colors">
                      <X className="w-4 h-4" /> Cancel
                    </button>
                    <button onClick={handleGenerateSharePDF} disabled={isGeneratingPDF || shareSelectedIds.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors disabled:opacity-60 whitespace-nowrap">
                      {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                      {isGeneratingPDF ? 'Generating...' : `Generate PDF (${shareSelectedIds.length})`}
                    </button>
                  </>
                )}

                {/* Make Quotation button */}
                {!shareMode && totalSelectedItems > 0 && (
                  <button onClick={handleMakeQuotation}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all whitespace-nowrap">
                    <ShoppingCart className="w-4 h-4" />
                    <span>Quotation ({totalSelectedItems})</span>
                  </button>
                )}
              </div>
            </div>

            {/* ── Share mode preview step ──────────────────────────────── */}
            {shareMode && shareStep === 'preview' && sharePdfBlob && (
              <div className="mb-6 p-5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-green-800 dark:text-green-400 font-semibold mb-1">
                      ✅ PDF Ready — {shareSelectedIds.length} product{shareSelectedIds.length !== 1 ? 's' : ''}
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-500">
                      Choose how to share the catalog:
                    </p>
                  </div>
                  <button onClick={exitShareMode} className="text-green-600 hover:text-green-800">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                  {/* Download */}
                  <button onClick={handleDownloadSharePDF}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                    <Download className="w-4 h-4" /> Download PDF
                  </button>

                  {/* Send to self on WP */}
                  <button onClick={handleSendSharePDFtoSelf} disabled={isSendingWP || !wpReady}
                    title={!wpReady ? 'WhatsApp not connected' : `Send to your number: ${user?.mobile}`}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      wpReady ? 'bg-green-700 hover:bg-green-800 text-white' : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                    }`}>
                    {isSendingWP
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Share2 className="w-4 h-4" />}
                    {isSendingWP
                      ? 'Sending...'
                      : wpReady
                      ? `Send to my WhatsApp (${user?.mobile || '—'})`
                      : 'WhatsApp not connected'}
                  </button>

                  {/* Go back to re-select */}
                  <button onClick={() => setShareStep('select')}
                    className="flex items-center gap-2 px-4 py-2.5 border border-green-300 text-green-700 dark:text-green-400 rounded-lg text-sm hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                    ← Re-select
                  </button>
                </div>
              </div>
            )}

            {/* ── Share mode hint ─────────────────────────────────────── */}
            {shareMode && shareStep === 'select' && (
              <div className="mb-4 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-sm text-green-700 dark:text-green-400">
                👆 Tap on product cards to select them for the catalog PDF
              </div>
            )}

            {/* Category filter chips */}
            {availableCategories.length > 0 && !shareMode && (
              <div className="mb-5">
                <p className="text-sm text-foreground mb-2">Filter by Category:</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setSelectedCategoryId(null)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${!selectedCategoryId ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:border-primary/40'}`}>
                    All
                  </button>
                  {availableCategories.map((cat) => (
                    <button key={cat._id} onClick={() => setSelectedCategoryId(cat._id)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${selectedCategoryId === cat._id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:border-primary/40'}`}>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Product grid */}
            {productsLoading ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Loading products...</p>
            ) : filteredProducts.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No products found.</p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {filteredProducts.map((product) => {
                  const selectedItem = selectedProductsWithSizes.find((p) => p.product._id === product._id);
                  return (
                    <ProductCardWithSizes
                      key={product._id}
                      product={{
                        ...product,
                        id   : product._id,
                        image: product.img,
                        sizes: product.sku || [],
                      }}
                      selectedSizes={selectedItem?.selectedSizes || []}
                      onSizesChange={(sizes) => handleProductSizesChange(product, sizes)}
                      shareMode={shareMode}
                      isSelectedForShare={shareSelectedIds.includes(product._id)}
                      onShareSelect={() => toggleShareProduct(product._id)}
                    />
                  );
                })}
              </div>
            )}

            <PaginationBar />
          </div>
        )}

        {/* Other views */}
        {view === 'quotation-builder' && (
          <QuotationBuilder selectedProductsWithSizes={selectedProductsWithSizes}
            onComplete={handleQuotationComplete} onCancel={() => setView('products')} />
        )}
        {view === 'quotations' && <QuotationsList />}
        {view === 'whatsapp'   && <WhatsAppConnect />}
      </main>
    </div>
  );
}
