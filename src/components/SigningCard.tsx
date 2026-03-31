import type { AuthorInfo, Signing } from '../types';
import { useI18n } from '../i18n/I18nContext';

interface SigningCardProps {
  signing: Signing;
  authorInfo?: AuthorInfo;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onAuthorClick?: (authorName: string) => void;
}

export function SigningCard({ signing, authorInfo, isFavorite, onToggleFavorite, onAuthorClick }: SigningCardProps) {
  const { t } = useI18n();
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${signing.coordinates.lat},${signing.coordinates.lng}`;
  const hasTime = signing.startTime && signing.endTime;
  const hasLocation = signing.location && signing.location !== 'Per confirmar';

  const handleShare = () => {
    const time = hasTime ? `${signing.startTime}-${signing.endTime}` : t('tbaTime');
    const text = t('shareText')
      .replace('{author}', signing.author)
      .replace('{location}', hasLocation ? signing.location : t('tbaLocation'))
      .replace('{time}', time);

    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
    }
  };

  return (
    <div className={`bg-surface-lowest dark:bg-surface-highest/8 p-4 rounded-xl flex items-center gap-4 relative shadow-[0_4px_20px_rgba(28,28,24,0.03)] ${hasTime ? 'border-l-4 border-primary' : 'border-l-4 border-outline-variant/30'}`}>
      {/* Author photo */}
      <div
        className={`relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 ${onAuthorClick ? 'cursor-pointer' : ''} ${authorInfo?.photo ? '' : 'bg-primary/8 dark:bg-primary/15'}`}
        onClick={onAuthorClick ? () => onAuthorClick(signing.author) : undefined}
        onKeyDown={onAuthorClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAuthorClick(signing.author); } } : undefined}
        role={onAuthorClick ? 'button' : undefined}
        tabIndex={onAuthorClick ? 0 : undefined}
      >
        {authorInfo?.photo ? (
          <img
            src={authorInfo.photo}
            alt={signing.author}
            className="w-full h-full object-cover object-top"
            loading="lazy"
          />
        ) : (
          <span className="font-headline text-2xl text-primary font-bold italic flex items-center justify-center w-full h-full">
            {signing.author.charAt(0)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3
          className={`font-headline text-lg italic text-on-surface dark:text-surface-highest truncate leading-tight ${onAuthorClick ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
          onClick={onAuthorClick ? () => onAuthorClick(signing.author) : undefined}
          onKeyDown={onAuthorClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAuthorClick(signing.author); } } : undefined}
          role={onAuthorClick ? 'button' : undefined}
          tabIndex={onAuthorClick ? 0 : undefined}
        >
          {signing.author}
        </h3>

        {signing.book && (
          <p className="text-xs font-body text-primary font-semibold truncate mt-0.5">
            {signing.book}
          </p>
        )}

        {signing.publisher && (
          <p className="text-[11px] font-body text-tertiary uppercase tracking-wider mt-0.5">
            {signing.publisher}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-2">
          {/* Time */}
          <span className="flex items-center gap-1 text-xs font-body text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            {hasTime ? `${signing.startTime} - ${signing.endTime}` : t('tbaTime')}
          </span>

          {/* Location */}
          {hasLocation ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${signing.location} — ${t('openInMaps')}`}
              className="flex items-center gap-1 text-xs font-body text-on-surface-variant hover:text-jordi-green transition-colors truncate"
            >
              <span className="material-symbols-outlined text-[14px] text-jordi-green-light">location_on</span>
              {signing.location}
            </a>
          ) : (
            <span className="flex items-center gap-1 text-xs font-body text-tertiary/50 italic">
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              {t('tbaLocation')}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-1 flex-shrink-0">
        <button
          onClick={() => onToggleFavorite(signing.id)}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-primary/5 transition-colors"
          aria-label={isFavorite ? t('removeFavorite') : t('addFavorite')}
          title={isFavorite ? t('removeFavorite') : t('addFavorite')}
        >
          <span
            className={`material-symbols-outlined text-lg ${
              isFavorite ? 'filled text-primary' : 'text-outline'
            }`}
          >
            favorite
          </span>
        </button>
        <button
          onClick={handleShare}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-primary/5 transition-colors"
          aria-label={t('share')}
          title={t('share')}
        >
          <span className="material-symbols-outlined text-lg text-outline">share</span>
        </button>
      </div>
    </div>
  );
}
