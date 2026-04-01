import type { AuthorInfo, Signing } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { isEventDay } from '../hooks/useEventDay';

interface FeaturedCardsProps {
  signings: Signing[];
  authorsData: Record<string, AuthorInfo>;
  onToggleFavorite: (id: string) => void;
  favoriteIds: Set<string>;
  onAuthorClick?: (authorName: string) => void;
}

/** Color palette for author initials background — Sant Jordi red + green */
const bgColors = [
  'bg-primary/12',
  'bg-jordi-green/10',
  'bg-secondary-container/40',
  'bg-jordi-green-light/12',
  'bg-primary-fixed/40',
  'bg-jordi-green-surface',
];

export function FeaturedCards({ signings, authorsData, onToggleFavorite, favoriteIds, onAuthorClick }: FeaturedCardsProps) {
  const { t } = useI18n();
  const live = isEventDay();

  // Pick first signings that have confirmed time + location, one per author
  const seen = new Set<string>();
  const featured = signings
    .filter((s) => {
      if (!s.startTime || !s.endTime || s.location === 'Per confirmar') return false;
      if (seen.has(s.author)) return false;
      seen.add(s.author);
      return true;
    })
    .slice(0, 6);

  if (featured.length === 0) return null;

  return (
    <section className="mb-10 lg:mb-14">
      <div className="flex justify-between items-end mb-6 lg:mb-8">
        <div>
          <h2 className="font-headline text-3xl lg:text-4xl text-on-surface dark:text-surface-highest">
            {live ? t('signingNow') : t('featuredSignings')}
          </h2>
        </div>
        {live && (
          <div className="flex items-center gap-2 text-jordi-green font-semibold uppercase tracking-widest text-xs">
            <span className="w-2 h-2 rounded-full bg-jordi-green-light animate-pulse" />
            {t('liveNow')}
          </div>
        )}
      </div>

      {/* Mobile: horizontal scroll / Desktop: 3-column grid */}
      <div className="flex lg:grid lg:grid-cols-3 gap-5 overflow-x-auto lg:overflow-visible hide-scrollbar -mx-6 px-6 lg:mx-0 lg:px-0 snap-x lg:snap-none">
        {featured.map((signing, i) => {
          const fav = favoriteIds.has(signing.id);
          const bgColor = bgColors[i % bgColors.length];
          const authorInfo = authorsData[signing.author];
          const authorPhoto = authorInfo?.photo;
          const bookTitle = signing.book || authorInfo?.presentingBook || authorInfo?.books?.[0]?.title || '';
          return (
            <div
              key={signing.id}
              className="group relative flex-none w-72 lg:w-auto snap-start bg-surface-lowest dark:bg-on-surface/5 rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500"
            >
              <div className="flex gap-4 p-4">
                {/* Author photo - compact square */}
                <div
                  className={`w-24 h-28 lg:w-28 lg:h-32 rounded-lg ${bgColor} flex-shrink-0 relative overflow-hidden ${onAuthorClick ? 'cursor-pointer' : ''}`}
                  onClick={onAuthorClick ? () => onAuthorClick(signing.author) : undefined}
                  onKeyDown={onAuthorClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAuthorClick(signing.author); } } : undefined}
                  role={onAuthorClick ? 'button' : undefined}
                  tabIndex={onAuthorClick ? 0 : undefined}
                >
                  {authorPhoto ? (
                    <img
                      src={authorPhoto}
                      alt={signing.author}
                      className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <span className="font-headline text-5xl text-primary/20 dark:text-primary/15 font-bold italic select-none absolute inset-0 flex items-center justify-center">
                      {signing.author.charAt(0)}
                    </span>
                  )}
                </div>

                {/* Info - right side */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <h3
                      className={`font-headline text-xl lg:text-2xl text-on-surface dark:text-surface-highest leading-tight mb-1 ${onAuthorClick ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
                      onClick={onAuthorClick ? () => onAuthorClick(signing.author) : undefined}
                      onKeyDown={onAuthorClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAuthorClick(signing.author); } } : undefined}
                      role={onAuthorClick ? 'button' : undefined}
                      tabIndex={onAuthorClick ? 0 : undefined}
                    >
                      {signing.author}
                    </h3>
                    {bookTitle && (
                      <p className="font-headline text-primary-container text-sm italic line-clamp-2">
                        &ldquo;{bookTitle}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1 text-xs font-body text-tertiary">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        {signing.startTime} - {signing.endTime}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-body text-jordi-green-light truncate">
                        <span className="material-symbols-outlined text-[13px]">location_on</span>
                        {signing.location}
                      </span>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite(signing.id); }}
                      className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-primary/5 transition-colors flex-shrink-0"
                      aria-label={fav ? t('removeFavorite') : t('addFavorite')}
                    >
                      <span className={`material-symbols-outlined text-lg ${fav ? 'filled text-primary' : 'text-outline'}`}>
                        favorite
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
