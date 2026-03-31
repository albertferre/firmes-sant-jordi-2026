import type { Signing } from '../types';
import { useI18n } from '../i18n/I18nContext';

interface FeaturedCardsProps {
  signings: Signing[];
  onToggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

/** Color palette for author initials background */
const bgColors = [
  'bg-primary/12',
  'bg-secondary-container/40',
  'bg-primary-fixed/40',
  'bg-outline-variant/30',
  'bg-primary-fixed-dim/30',
  'bg-secondary/10',
];

export function FeaturedCards({ signings, onToggleFavorite, isFavorite }: FeaturedCardsProps) {
  const { t } = useI18n();

  // Pick first signings that have confirmed time + location
  const featured = signings
    .filter((s) => s.startTime && s.endTime && s.location !== 'Per confirmar')
    .slice(0, 6);

  if (featured.length === 0) return null;

  return (
    <section className="mb-10 lg:mb-14">
      <div className="flex justify-between items-end mb-6 lg:mb-8">
        <div>
          <h2 className="font-headline text-3xl lg:text-4xl text-on-surface dark:text-surface-highest">
            {t('signingNow')}
          </h2>
        </div>
        <div className="flex items-center gap-2 text-primary font-semibold uppercase tracking-widest text-xs">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          {t('liveNow')}
        </div>
      </div>

      {/* Mobile: horizontal scroll / Desktop: 3-column grid */}
      <div className="flex lg:grid lg:grid-cols-3 gap-5 overflow-x-auto lg:overflow-visible hide-scrollbar -mx-6 px-6 lg:mx-0 lg:px-0 snap-x lg:snap-none">
        {featured.map((signing, i) => {
          const fav = isFavorite(signing.id);
          const bgColor = bgColors[i % bgColors.length];
          return (
            <div
              key={signing.id}
              className="group relative flex-none w-64 lg:w-auto snap-start bg-surface-lowest dark:bg-on-surface/5 rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500"
            >
              {/* Author portrait placeholder */}
              <div className={`aspect-[4/5] ${bgColor} flex items-center justify-center relative`}>
                <span className="font-headline text-7xl lg:text-8xl text-primary/20 dark:text-primary/15 font-bold italic select-none">
                  {signing.author.charAt(0)}
                </span>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Favorite button */}
                <button
                  onClick={() => onToggleFavorite(signing.id)}
                  className="absolute top-3 right-3 w-10 h-10 rounded-full bg-surface-lowest/80 backdrop-blur-md flex items-center justify-center shadow-sm active:scale-95 transition-all"
                  aria-label={fav ? t('removeFavorite') : t('addFavorite')}
                >
                  <span className={`material-symbols-outlined text-lg ${fav ? 'filled text-primary' : 'text-primary'}`}>
                    favorite
                  </span>
                </button>

                {/* Location badge at bottom of image */}
                <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-primary/70 to-transparent">
                  <span className="flex items-center gap-1 text-[10px] font-body uppercase tracking-[0.2em] text-on-primary/90">
                    <span className="material-symbols-outlined text-[12px]">location_on</span>
                    {signing.location}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-5">
                <h3 className="font-headline text-2xl lg:text-3xl text-on-surface dark:text-surface-highest mb-1 leading-tight">
                  {signing.author}
                </h3>
                {signing.book && (
                  <p className="font-body text-tertiary text-sm italic mb-3">{signing.book}</p>
                )}
                <div className="flex items-center gap-2 text-primary-container text-sm font-medium">
                  <span className="material-symbols-outlined text-base">schedule</span>
                  {signing.startTime} - {signing.endTime}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
