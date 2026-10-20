import { useEffect, useState } from 'react';
import { ImageIcon, Share2 } from 'lucide-react';

function CategoryImage({ src, name }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => setHasError(false), [src]);

  if (!src || hasError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted" aria-label={`${name} image unavailable`}>
        <ImageIcon className="h-10 w-10 text-muted-foreground/60 sm:h-12 sm:w-12" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
}

export default function CategoryGrid({ categories, onCategoryClick, onShare }) {

  const handleShare = (category, e) => {
    e.stopPropagation();
    if (onShare) {
      onShare(category);
    }
  };

  const handleImageError = (e) => {
    e.currentTarget.src = 'https://via.placeholder.com/400x400/1e293b/ffffff?text=Image';
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
      {categories.map((category) => (
        <div
          key={category.id}
          onClick={() => onCategoryClick(category.id)}
          className="flex flex-col items-center cursor-pointer group"
        >
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 mb-2 sm:mb-3">
            <div className="w-full h-full rounded-full overflow-hidden border-4 border-border group-hover:border-primary transition-all duration-300 shadow-md dark:shadow-[0_0_20px_rgba(212,175,55,0.1)] dark:group-hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]">
              <CategoryImage src={category.image} name={category.name} />
            </div>
            {onShare && (
              <button
                onClick={(e) => handleShare(category, e)}
                className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-7 h-7 sm:w-8 sm:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-md hover:bg-primary/90 dark:shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                title="Share category"
              >
                <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
          <p className="text-center text-sm sm:text-base text-foreground group-hover:text-primary dark:group-hover:text-primary transition-colors duration-300">{category.name}</p>
        </div>
      ))}
    </div>
  );
}
