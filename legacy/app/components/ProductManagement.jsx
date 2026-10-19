import { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Edit2, Trash2, X, Upload, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL_IMG || '';

const EMPTY_FORM = {
  company      : '',
  category     : '',
  name         : '',
  img          : null,
  description  : '',
  material     : '',
  hsnCode      : '',
  gstPercentage: 18,
  sku          : [{ size: '', mrp: 0, innerPack: 1, masterPack: 1 }],
};

export default function ProductManagement() {
  const { companies, categories, products, productsLoading, productTotal, productPages, productParams, addProduct, updateProduct, deleteProduct, setProductFilter } = useData();
  const [isAdding, setIsAdding]         = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [formData, setFormData]         = useState(EMPTY_FORM);
  const [preview, setPreview]           = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const setField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB.'); return; }
    setField('img', file);
    setPreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setField('img', null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── SKU helpers ───────────────────────────────────────────────────────────
  const addSku = () =>
    setField('sku', [...formData.sku, { size: '', mrp: 0, innerPack: 1, masterPack: 1 }]);

  const removeSku = (i) =>
    setField('sku', formData.sku.filter((_, idx) => idx !== i));

  const updateSku = (i, key, value) => {
    const updated = [...formData.sku];
    updated[i] = { ...updated[i], [key]: value };
    setField('sku', updated);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.company || !formData.category || !formData.name.trim()) {
      toast.error('Company, category and product name are required.');
      return;
    }
    if (formData.sku.some((s) => !s.size || s.mrp <= 0)) {
      toast.error('Each SKU must have a size and MRP > 0.');
      return;
    }

    const payload = new FormData();
    payload.append('name',          formData.name.trim());
    payload.append('company',       formData.company);
    payload.append('category',      formData.category);
    payload.append('material',      formData.material);
    payload.append('hsnCode',       formData.hsnCode);
    payload.append('gstPercentage', formData.gstPercentage);
    payload.append('description',   formData.description);
    payload.append('sku',           JSON.stringify(formData.sku));
    if (formData.img instanceof File) payload.append('img', formData.img);

    setIsSubmitting(true);

    if (editingId) {
      updateProduct(editingId, payload, {
        onSuccess: () => { toast.success('Product updated successfully'); handleCancel(); },
        onError  : () => { toast.error('Failed to update product.'); setIsSubmitting(false); },
      });
    } else {
      addProduct(payload, {
        onSuccess: () => { toast.success('Product added successfully'); handleCancel(); },
        onError  : () => { toast.error('Failed to add product.'); setIsSubmitting(false); },
      });
    }
  };

  // ── Cancel ────────────────────────────────────────────────────────────────
  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setPreview(null);
    setIsSubmitting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleEdit = (product) => {
    setFormData({
      company      : product.company?._id   || product.company  || '',
      category     : product.category?._id  || product.category || '',
      name         : product.name           || '',
      img          : null,
      description  : product.description   || '',
      material     : product.material      || '',
      hsnCode      : product.hsnCode       || '',
      gstPercentage: product.gstPercentage || 18,
      sku          : product.sku?.length
        ? product.sku
        : [{ size: '', mrp: 0, innerPack: 1, masterPack: 1 }],
    });
    setPreview(product.img ? `${BACKEND_URL}${product.img}` : null);
    setEditingId(product._id);
    setIsAdding(true);
    setIsSubmitting(false);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    deleteProduct(id, {
      onSuccess: () => toast.success('Product deleted successfully'),
      onError  : () => toast.error('Failed to delete product.'),
    });
  };

  // ── Input class ───────────────────────────────────────────────────────────
  const inputCls = 'w-full px-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground';

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-foreground">Product Management</h2>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        )}
      </div>

      {/* ── Form ─────────────────────────────────────────────────────────────── */}
      <Dialog open={isAdding} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        {isAdding && (
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto bg-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-foreground">{editingId ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <button type="button" onClick={handleCancel} className="p-1 hover:bg-muted rounded">
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Row 1 — Company + Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-foreground mb-2">Company <span className="text-destructive">*</span></label>
                <select value={formData.company} onChange={(e) => setField('company', e.target.value)} className={inputCls}>
                  <option value="">Select Company</option>
                  {companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-foreground mb-2">Category <span className="text-destructive">*</span></label>
                <select value={formData.category} onChange={(e) => setField('category', e.target.value)} className={inputCls}>
                  <option value="">Select Category</option>
                  {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* Row 2 — Name + Material */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-foreground mb-2">Product Name <span className="text-destructive">*</span></label>
                <input type="text" value={formData.name} onChange={(e) => setField('name', e.target.value)} className={inputCls} placeholder="e.g., Dinner Plate" />
              </div>
              <div>
                <label className="block text-foreground mb-2">Material</label>
                <input type="text" value={formData.material} onChange={(e) => setField('material', e.target.value)} className={inputCls} placeholder="e.g., Ceramic" />
              </div>
            </div>

            {/* Row 3 — HSN + GST */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-foreground mb-2">HSN Code</label>
                <input type="text" value={formData.hsnCode} onChange={(e) => setField('hsnCode', e.target.value)} className={inputCls} placeholder="e.g., 6911" />
              </div>
              <div>
                <label className="block text-foreground mb-2">GST %</label>
                <input
                  type="number"
                  value={formData.gstPercentage}
                  onChange={(e) => {
                    const value = e.target.value;
                    setField('gstPercentage', value === '' ? '' : Number(value));
                  }}
                  onFocus={(e) => {
                    if (e.target.value === '0') {
                      e.target.select();
                    }
                  }}
                  className={inputCls}
                  min="0"
                  max="100"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-foreground mb-2">Description</label>
              <textarea value={formData.description} onChange={(e) => setField('description', e.target.value)} className={inputCls} rows={3} placeholder="Product description" />
            </div>

            {/* Image */}
            <div>
              <label className="block text-foreground mb-2">
                Product Image
                {editingId && <span className="text-xs text-muted-foreground ml-2">(leave empty to keep existing)</span>}
              </label>

              {/* hidden input — triggered by button via ref */}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageChange} className="hidden" />

              {preview ? (
                <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                  <img src={preview} alt="preview" className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-lg border border-border" />
                  <button type="button" onClick={removeImage} className="absolute -top-2 -right-2 p-1 bg-destructive text-white rounded-full hover:bg-destructive/90">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload image</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP — max 2MB</p>
                </button>
              )}
            </div>

            {/* SKU */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-foreground">Sizes & MRP <span className="text-destructive">*</span></label>
                <button type="button" onClick={addSku} className="text-sm px-3 py-1 bg-muted text-foreground rounded hover:bg-muted/80">
                  + Add Size
                </button>
              </div>

              {/* header row — hidden on mobile since each SKU row wraps to 2 columns there */}
              <div className="hidden sm:grid sm:grid-cols-4 gap-2 mb-1 px-1 text-xs text-muted-foreground">
                <span>Size</span><span>MRP (₹)</span><span>Inner Pack</span><span>Master Pack</span>
              </div>

              <div className="space-y-2">
                <div className="space-y-2">
                  {formData.sku.map((sku, i) => (
                    <div key={i} className="flex flex-wrap gap-2 items-end border border-border rounded-md p-2 sm:border-0 sm:p-0 sm:items-center">
                      <div className="flex-1 min-w-[100px]">
                        <label className="block text-xs text-muted-foreground mb-1 sm:hidden">Size</label>
                        <input
                          type="text"
                          value={sku.size}
                          onChange={(e) => updateSku(i, 'size', e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-sm"
                          placeholder="10 inch"
                        />
                      </div>

                      <div className="flex-1 min-w-[90px]">
                        <label className="block text-xs text-muted-foreground mb-1 sm:hidden">MRP (₹)</label>
                        <input
                          type="number"
                          value={sku.mrp}
                          onChange={(e) => {
                            const value = e.target.value;
                            updateSku(
                              i,
                              'mrp',
                              value === '' ? '' : Number(value)
                            );
                          }}
                          onFocus={(e) => {
                            if (e.target.value === '0') {
                              e.target.select();
                            }
                          }}
                          className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-sm"
                          min="0"
                        />
                      </div>

                      <div className="flex-1 min-w-[90px]">
                        <label className="block text-xs text-muted-foreground mb-1 sm:hidden">Inner Pack</label>
                        <input
                          type="number"
                          value={sku.innerPack}
                          onChange={(e) => {
                            const value = e.target.value;

                            updateSku(
                              i,
                              'innerPack',
                              value === '' ? '' : Number(value)
                            );
                          }}
                          onFocus={(e) => {
                            if (e.target.value === '0') {
                              e.target.select();
                            }
                          }}
                          className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-sm"
                          min="1"
                        />
                      </div>

                      <div className="flex-1 min-w-[90px]">
                        <label className="block text-xs text-muted-foreground mb-1 sm:hidden">Master Pack</label>
                        <input
                          type="number"
                          value={sku.masterPack}
                          onChange={(e) => {
                            const value = e.target.value;
                            updateSku(
                              i,
                              'masterPack',
                              value === '' ? '' : Number(value)
                            );
                          }}
                          onFocus={(e) => {
                            if (e.target.value === '0') {
                              e.target.select();
                            }
                          }}
                          className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-sm"
                          min="1"
                        />
                      </div>

                      {formData.sku.length > 1 && (
                        <button type="button" onClick={() => removeSku(i)} className="p-2 text-destructive hover:bg-destructive/10 rounded flex-shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60">
                {isSubmitting ? 'Saving...' : editingId ? 'Update Product' : 'Add Product'}
              </button>
              <button type="button" onClick={handleCancel} className="px-6 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </DialogContent>
      )}
      </Dialog>


      {/* ── Search & Filters ─────────────────────────────────────────────── */}
      {!isAdding && (
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            placeholder="Search products..."
            value={productParams.search}
            onChange={(e) => setProductFilter({ search: e.target.value, page: 1 })}
            className="w-full sm:flex-1 sm:min-w-[180px] px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          />
          <select
            value={productParams.category}
            onChange={(e) => setProductFilter({ category: e.target.value, page: 1 })}
            className="flex-1 sm:flex-none px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select
            value={productParams.company}
            onChange={(e) => setProductFilter({ company: e.target.value, page: 1 })}
            className="flex-1 sm:flex-none px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Companies</option>
            {companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          {(productParams.search || productParams.category || productParams.company) && (
            <button
              onClick={() => setProductFilter({ search: '', category: '', company: '', page: 1 })}
              className="px-3 py-2 text-sm border border-border rounded-md hover:bg-muted text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* ── Cards ──────────────────────────────────────────────────────────── */}
      {productsLoading ? (
        <p className="text-muted-foreground text-sm">Loading products...</p>
      ) : products.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No products yet. Add your first one.</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {products.map((product) => (
            <div key={product._id} className="min-w-0 bg-card border border-border rounded-lg shadow-md overflow-hidden">
              {product.img ? (
                <img src={`${BACKEND_URL}${product.img}`} alt={product.name} className="aspect-[4/3] w-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <div className="aspect-[4/3] w-full bg-muted flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-muted-foreground opacity-40" />
                </div>
              )}

              <div className="flex justify-end gap-1 border-y border-white/30 px-2 py-1">
                <button onClick={() => handleEdit(product)} aria-label={`Edit ${product.name}`} className="rounded-lg p-1.5 transition-colors hover:bg-muted">
                  <Edit2 className="h-4 w-4 text-foreground" />
                </button>
                <button onClick={() => handleDelete(product._id)} aria-label={`Delete ${product.name}`} className="rounded-lg p-1.5 transition-colors hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>

              <div className="min-w-0 p-2.5 sm:p-4">
                <div className="mb-2 min-w-0">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-medium text-foreground mb-1 line-clamp-2 break-words">{product.name}</h3>
                    {product.description && <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2 break-words">{product.description}</p>}
                    <p className="text-sm text-muted-foreground">Category: {product.category?.name || '—'}</p>
                    <p className="text-sm text-muted-foreground">Company: {product.company?.name  || '—'}</p>
                    {product.material  && <p className="text-sm text-muted-foreground">Material: {product.material}</p>}
                    {product.hsnCode   && <p className="text-sm text-muted-foreground">HSN: {product.hsnCode}</p>}
                    {product.gstPercentage != null && <p className="text-sm text-muted-foreground">GST: {product.gstPercentage}%</p>}
                  </div>
                </div>

                {product.sku?.length > 0 && (
                  <div className="border-t border-border pt-2 sm:pt-3 mt-2 sm:mt-3">
                    <p className="text-xs sm:text-sm mb-2 text-foreground font-medium">Sizes:</p>
                    <div className="space-y-1">
                      {product.sku.map((s, i) => (
                        <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1 p-2 bg-muted rounded text-xs sm:text-sm">
                          <span className="min-w-0 break-words text-muted-foreground">{s.size}</span>
                          <span className="text-foreground font-medium">₹{s.mrp}</span>
                          <span className="col-span-2 text-[10px] sm:text-xs text-muted-foreground">In:{s.innerPack} / Ms:{s.masterPack}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {/* {!productsLoading && productPages > 0 && ( */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-border">

          {/* info */}
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            Page <span className="font-medium text-foreground">{productParams.page}</span> of{' '}
            <span className="font-medium text-foreground">{productPages}</span>
            {' '}— {productTotal} product{productTotal !== 1 ? 's' : ''} total
          </p>

          {/* controls */}
          <div className="flex w-full max-w-full items-center justify-center gap-1 sm:w-auto sm:justify-end">

            {/* Prev */}
            <button
              disabled={productParams.page <= 1}
              onClick={() => setProductFilter({ page: productParams.page - 1 })}
              className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-foreground transition-colors flex-shrink-0"
            >
              ← Prev
            </button>

            {/* page numbers — show max 5, with ellipsis */}
            <div className="hidden items-center gap-1 sm:flex">
            {(() => {
              const total = productPages;
              const cur   = productParams.page;
              let pages   = [];

              if (total <= 5) {
                pages = Array.from({ length: total }, (_, i) => i + 1);
              } else {
                pages = [1];
                if (cur > 3) pages.push('...');
                for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) pages.push(p);
                if (cur < total - 2) pages.push('...');
                pages.push(total);
              }

              return pages.map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-sm text-muted-foreground flex-shrink-0">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setProductFilter({ page: p })}
                    className={`min-w-[36px] px-3 py-1.5 text-sm rounded-md border transition-colors flex-shrink-0 ${
                      p === cur
                        ? 'bg-primary text-primary-foreground border-primary font-medium'
                        : 'border-border hover:bg-muted text-foreground'
                    }`}
                  >
                    {p}
                  </button>
                )
              );
            })()}
            </div>

            <span className="whitespace-nowrap px-2 text-sm text-muted-foreground sm:hidden">
              {productParams.page} / {productPages}
            </span>

            {/* Next */}
            <button
              disabled={productParams.page >= productPages}
              onClick={() => setProductFilter({ page: productParams.page + 1 })}
              className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-foreground transition-colors flex-shrink-0"
            >
              Next →
            </button>
          </div>
        </div>
      {/* )} */}
    </div>
  );
}
