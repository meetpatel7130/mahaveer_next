import { Share2, Check } from 'lucide-react';

export default function ProductCard({ product, onShare, onSelect, isSelected }) {
  const handleShare = (e) => {
    e.stopPropagation();
    if (onShare) {
      onShare(product);
    }
  };

  const handleClick = () => {
    if (onSelect) {
      onSelect(product);
    }
  };

  const handleImageError = (e) => {
    e.currentTarget.src = 'https://via.placeholder.com/600x400/1e293b/ffffff?text=Product+Image';
  };

  return (
    <div
      onClick={handleClick}
      className={`bg-card border border-border rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 ${onSelect ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-primary dark:shadow-[0_0_25px_rgba(212,175,55,0.3)]' : ''} dark:hover:shadow-[0_0_20px_rgba(212,175,55,0.15)] dark:hover:border-primary/30`}
    >
      <div className="relative">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-48 object-contain"
          onError={handleImageError}
          loading="lazy"
        />
        {isSelected && (
          <div className="absolute top-2 left-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg dark:shadow-[0_0_10px_rgba(212,175,55,0.6)]">
            <Check className="w-4 h-4" />
          </div>
        )}
        {onShare && (
          <button
            onClick={handleShare}
            className="absolute top-2 right-2 w-8 h-8 bg-card text-foreground border border-border rounded-full flex items-center justify-center shadow-md hover:bg-accent hover:text-primary dark:hover:border-primary/50 dark:hover:shadow-[0_0_10px_rgba(212,175,55,0.3)] transition-all duration-300"
            title="Share product"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4">
        <h3 className="mb-2 text-foreground dark:text-foreground">{product.name}</h3>
        <p className="text-sm text-muted-foreground mb-3">{product.description}</p>

        <div className="mb-3">
          <p className="text-sm text-muted-foreground mb-1">Material: <span className="dark:text-accent-foreground">{product.material}</span></p>
        </div>

        <div className="border-t border-border pt-3">
          <p className="text-sm mb-2 text-foreground dark:text-accent-foreground">Available Sizes & MRP:</p>
          <div className="space-y-2">
            {product.sizes.map((size, index) => (
              <div key={index} className="flex flex-col gap-1 p-2 bg-muted rounded dark:bg-secondary">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{size.size}</span>
                  <span className="text-foreground dark:text-primary">₹{size.mrp}</span>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Inner: {size.innerPack} pcs</span>
                  <span>Master: {size.masterPack} pcs</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}