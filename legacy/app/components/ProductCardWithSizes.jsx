import { ImageIcon } from 'lucide-react';
import { Checkbox } from './ui/checkbox';

export default function ProductCardWithSizes({
  product,
  selectedSizes,
  onSizesChange,
  // share selection mode props
  shareMode,
  isSelectedForShare,
  onShareSelect,
}) {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL_IMG || '';

  const handleSizeToggle = (size) => {
    if (selectedSizes.includes(size)) {
      onSizesChange(selectedSizes.filter((s) => s !== size));
    } else {
      onSizesChange([...selectedSizes, size]);
    }
  };

  const isAnySizeSelected = selectedSizes.length > 0;

  return (
    <div
      className={`bg-card border rounded-lg shadow-md overflow-hidden transition-all relative ${
        shareMode
          ? isSelectedForShare
            ? 'border-green-500 dark:border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)] cursor-pointer'
            : 'border-border dark:border-primary/20 hover:border-green-400 cursor-pointer opacity-80'
          : isAnySizeSelected
          ? 'border-primary dark:border-primary dark:shadow-[0_0_20px_rgba(212,175,55,0.3)]'
          : 'border-border dark:border-primary/20 dark:hover:border-primary/40'
      }`}
      onClick={shareMode ? onShareSelect : undefined}
    >
      {/* ── Share mode overlay tick ───────────────────────────────────── */}
      {shareMode && (
        <div className={`absolute top-3 left-3 z-10 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
          isSelectedForShare
            ? 'bg-green-500 border-green-500 text-white'
            : 'bg-card/80 border-border'
        }`}>
          {isSelectedForShare && <span className="text-sm font-bold">✓</span>}
        </div>
      )}

      {/* ── Image ─────────────────────────────────────────────────────── */}
      <div className="relative">
        {
          product.image ?
            <img
              src={product.image ? `${BACKEND_URL}${product.image}` : '/placeholder.png'}
              alt={product.name}
              className="w-full h-48 object-cover"
              onError={(e) => { e.target.src = '/placeholder.png'; }}
            />
            :
            <div className="w-full h-48 bg-muted flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-muted-foreground opacity-40" />
            </div>
        }
      </div>

      {/* ── Details ───────────────────────────────────────────────────── */}
      <div className="p-4">
        <h3 className="mb-2 text-base font-semibold leading-snug text-foreground dark:text-primary break-words">{product.name}</h3>
        {product.description && (
          <p className="text-sm leading-relaxed text-muted-foreground mb-3 line-clamp-2">{product.description}</p>
        )}

        <div className="space-y-1.5 mb-4 text-sm leading-snug">
          {product.category?.name && <p className="text-muted-foreground break-words">Category: {product.category.name}</p>}
          {product.company?.name && <p className="text-muted-foreground break-words">Company: {product.company.name}</p>}
          {product.material && (
            <p className="text-muted-foreground break-words">Material: {product.material}</p>
          )}
          {product.hsnCode && (
            <p className="text-muted-foreground break-words">HSN: {product.hsnCode}</p>
          )}
          {product.gstPercentage != null && (
            <p className="text-muted-foreground break-words">GST: {product.gstPercentage}%</p>
          )}
        </div>

        {/* ── Size selection — hidden in share mode ─────────────────── */}
        {!shareMode && (
          <div className="border-t border-border pt-4 dark:border-primary/20">
            <p className="text-sm mb-2 font-medium text-foreground dark:text-primary">Select Sizes:</p>
            <div className="space-y-2">
              {(product.sizes || []).map((sizeObj) => (
                <div
                  key={sizeObj.size}
                  className={`flex flex-col p-2.5 sm:p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedSizes.includes(sizeObj.size)
                      ? 'bg-primary/10 border-primary dark:bg-primary/5 dark:border-primary'
                      : 'bg-muted border-border dark:border-primary/10 hover:border-primary/40'
                  }`}
                  onClick={() => handleSizeToggle(sizeObj.size)}
                >
                  <div className="flex items-start gap-2 mb-2 min-w-0">
                    <Checkbox
                      checked={selectedSizes.includes(sizeObj.size)}
                      onCheckedChange={() => handleSizeToggle(sizeObj.size)}
                      className="mt-0.5 shrink-0 dark:border-primary/40 dark:data-[state=checked]:bg-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="block text-sm text-foreground break-words">{sizeObj.size}</span>
                      <span className="mt-1 block text-sm text-foreground dark:text-primary">&#8377;{sizeObj.mrp}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 pl-6 text-xs text-muted-foreground">
                    <span className="min-w-0 break-words">Inner: {sizeObj.innerPack} pcs</span>
                    <span className="min-w-0 break-words">Master: {sizeObj.masterPack} pcs</span>
                  </div>
                </div>
              ))}
            </div>

            {isAnySizeSelected && (
              <div className="mt-3 p-2 bg-primary/10 rounded-lg text-center dark:bg-primary/5 dark:border dark:border-primary/20">
                <p className="text-sm text-primary">
                  {selectedSizes.length} size{selectedSizes.length > 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Share mode — show all sizes as info only ──────────────── */}
        {shareMode && (
          <div className="border-t border-border pt-3 dark:border-primary/20">
            <p className="text-xs text-muted-foreground mb-2">Sizes:</p>
            <div className="flex flex-wrap gap-1">
              {(product.sizes || []).map((s) => (
                <span key={s.size} className="text-xs px-2 py-0.5 bg-muted rounded text-foreground">
                  {s.size} — ₹{s.mrp}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
