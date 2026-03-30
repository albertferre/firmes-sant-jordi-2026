import type { Signing } from '../types';
import { useI18n } from '../i18n/I18nContext';

interface SigningCardProps {
  signing: Signing;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

export function SigningCard({ signing, isFavorite, onToggleFavorite }: SigningCardProps) {
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        <div className="shrink-0 w-12 h-12 bg-rosa/10 rounded-lg flex items-center justify-center">
          <span className="text-rosa font-bold text-lg">
            {signing.author.charAt(0)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{signing.author}</h3>
              {signing.book && <p className="text-sm text-rosa font-medium truncate">{signing.book}</p>}
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                onClick={handleShare}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={t('share')}
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
              <button
                onClick={() => onToggleFavorite(signing.id)}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg
                  className={`w-4 h-4 transition-colors ${isFavorite ? 'text-vermell fill-vermell' : 'text-gray-300 dark:text-gray-600'}`}
                  fill={isFavorite ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>
          </div>
          {signing.publisher && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{signing.publisher}</p>}

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {hasTime ? `${signing.startTime} - ${signing.endTime}` : t('tbaTime')}
            </span>
            {hasLocation ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-rosa transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {signing.location}
              </a>
            ) : (
              <span className="flex items-center gap-1 italic">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {t('tbaLocation')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
