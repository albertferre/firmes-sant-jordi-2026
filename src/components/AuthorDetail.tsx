import type { AuthorInfo, Signing } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { isEventDay, isSigningLive } from '../hooks/useEventDay';

interface AuthorDetailProps {
  author: AuthorInfo | null;
  authorName: string;
  signings: Signing[];
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onBack: () => void;
}

export function AuthorDetail({ author, authorName, signings, isFavorite, onToggleFavorite, onBack }: AuthorDetailProps) {
  const { t } = useI18n();
  const authorSignings = signings.filter((s) => s.author === authorName);

  return (
    <div className="min-h-screen">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-jordi-green hover:text-jordi-green-dim font-body text-sm font-semibold mb-8 transition-colors group"
      >
        <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">arrow_back</span>
        {t('back')}
      </button>

      {/* Hero Section */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 mb-16 lg:mb-20 items-start">
        {/* Author portrait */}
        <div className="md:col-span-5 relative">
          <div className="absolute -top-3 -left-3 w-full h-full bg-jordi-green/10 rounded-xl -z-10" />
          {author?.photo ? (
            <img
              src={author.photo}
              alt={authorName}
              className="w-full aspect-[3/4] object-cover rounded-xl shadow-xl"
              loading="lazy"
            />
          ) : (
            <div className="w-full aspect-[3/4] rounded-xl bg-jordi-green-surface flex items-center justify-center">
              <span className="font-headline text-[12rem] text-jordi-green/20 font-bold italic select-none">
                {authorName.charAt(0)}
              </span>
            </div>
          )}

          {/* Rating badge */}
          {author?.rating && (
            <div className="absolute -bottom-4 -right-4 bg-surface-lowest dark:bg-on-surface/10 rounded-xl px-5 py-3 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined filled text-secondary-container text-xl">star</span>
                <span className="font-headline text-2xl text-on-surface dark:text-surface-highest font-bold">{author.rating}</span>
              </div>
              {author.ratingsCount && (
                <p className="text-[10px] font-body text-tertiary uppercase tracking-wider mt-0.5">
                  {Number(author.ratingsCount).toLocaleString()} {t('ratings')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Author info */}
        <div className="md:col-span-7 space-y-6 lg:space-y-8">
          <div>
            <span className="font-body text-jordi-green uppercase tracking-[0.2em] text-xs font-semibold mb-3 block">
              {t('authorDetail')}
            </span>
            <h1 className="font-headline text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-on-surface dark:text-surface-highest font-light leading-none">
              {authorName}
            </h1>
          </div>

          {/* Book being signed (from signings data) */}
          {authorSignings.length > 0 && authorSignings[0].book && (
            <h2 className="font-headline italic text-2xl lg:text-3xl text-primary-container">
              &ldquo;{authorSignings[0].book}&rdquo;
            </h2>
          )}

          {/* Bio */}
          {author?.bio && (
            <p className="text-lg text-tertiary leading-relaxed font-light max-w-2xl">
              {author.bio}
            </p>
          )}

          {/* Publisher */}
          {authorSignings.length > 0 && authorSignings[0].publisher && (
            <p className="text-sm font-body text-on-surface-variant uppercase tracking-widest">
              {authorSignings[0].publisher}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            {author?.goodreadsUrl && (
              <a
                href={author.goodreadsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-jordi-green text-on-primary px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:bg-jordi-green-dim transition-colors active:scale-95 text-sm"
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
                {t('viewOnGoodreads')}
              </a>
            )}
            {authorSignings.length > 0 && (
              <button
                onClick={() => onToggleFavorite(authorSignings[0].id)}
                className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors active:scale-95 text-sm ${
                  isFavorite(authorSignings[0].id)
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-highest dark:bg-on-surface/10 text-primary hover:bg-primary-fixed'
                }`}
              >
                <span className={`material-symbols-outlined ${isFavorite(authorSignings[0].id) ? 'filled' : ''}`}>favorite</span>
                {isFavorite(authorSignings[0].id) ? t('removeFavorite') : t('addFavorite')}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Schedule + Map Section */}
      {authorSignings.length > 0 && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-16 lg:mb-24">
          {/* Schedule Timeline */}
          <div className="lg:col-span-7 bg-surface-low dark:bg-on-surface/5 p-6 md:p-10 lg:p-12 rounded-xl">
            <div className="flex items-center justify-between mb-10">
              <h3 className="font-headline text-3xl lg:text-4xl font-light">{t('schedule')}</h3>
              <div className="bg-secondary-container/30 px-4 py-1.5 rounded-full text-on-secondary-container text-xs font-bold uppercase tracking-widest">
                {isEventDay() ? t('todayDate') : t('eventDate')}
              </div>
            </div>

            <div className="space-y-0">
              {authorSignings.map((signing, i) => {
                const hasTime = signing.startTime && signing.endTime;
                const isLast = i === authorSignings.length - 1;
                const live = hasTime && isSigningLive(signing.startTime, signing.endTime);
                return (
                  <div key={signing.id} className="relative pl-10 pb-10 last:pb-0 group">
                    {/* Timeline line */}
                    {!isLast && (
                      <div className="absolute left-0 top-0 w-[2px] h-full bg-outline-variant/30" />
                    )}
                    {/* Timeline dot */}
                    <div className={`absolute left-[-5px] top-1 w-3 h-3 rounded-full ${
                      live ? 'bg-primary ring-4 ring-primary/20 w-4 h-4 left-[-6px]' : 'bg-outline-variant'
                    }`} />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className={`text-sm font-bold block mb-1 ${live ? 'text-primary' : 'text-tertiary'}`}>
                          {hasTime ? `${signing.startTime} — ${signing.endTime}` : t('tbaTime')}
                        </span>
                        <h4 className={`text-xl lg:text-2xl font-headline font-normal ${live ? 'text-primary' : ''}`}>
                          {signing.location}
                        </h4>
                        {signing.address && (
                          <p className="text-tertiary/70 text-sm mt-0.5">{signing.address}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-start">
                        {live ? (
                          <div className="bg-primary-container text-on-primary px-3 py-1.5 rounded-full text-[11px] font-bold uppercase flex items-center gap-1.5 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            {t('signingNowLabel')}
                          </div>
                        ) : (
                          <div className="bg-surface-highest dark:bg-on-surface/10 text-tertiary/60 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase">
                            {t('upcoming')}
                          </div>
                        )}
                        <button
                          onClick={() => onToggleFavorite(signing.id)}
                          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-primary/5 transition-colors"
                          aria-label={isFavorite(signing.id) ? t('removeFavorite') : t('addFavorite')}
                        >
                          <span className={`material-symbols-outlined text-base ${isFavorite(signing.id) ? 'filled text-primary' : 'text-outline'}`}>
                            favorite
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Map + Directions */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-surface-lowest dark:bg-on-surface/5 rounded-xl overflow-hidden shadow-sm flex-1 relative min-h-[300px] lg:min-h-[400px]">
              {/* Simple map placeholder with first signing location */}
              <div className="absolute inset-0 bg-jordi-green/5 flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <div className="bg-primary text-white p-3 rounded-full shadow-lg ring-8 ring-primary/10">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                  </div>
                  <div className="mt-3 bg-surface-lowest dark:bg-on-surface/10 px-4 py-2 rounded-lg shadow-xl text-xs font-bold uppercase tracking-wider text-primary whitespace-nowrap">
                    {authorSignings[0].location}
                  </div>
                </div>
              </div>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${authorSignings[0].coordinates.lat},${authorSignings[0].coordinates.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-on-surface dark:bg-surface-highest text-surface dark:text-on-surface py-4 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:opacity-90 transition-all active:scale-[0.98] text-sm"
            >
              <span className="material-symbols-outlined">directions_walk</span>
              {t('howToGet')}
            </a>
          </div>
        </section>
      )}

      {/* Bibliography Section */}
      {author?.books && author.books.length > 0 && (
        <section className="mb-12">
          <div className="flex items-end justify-between mb-8 lg:mb-10">
            <div>
              <h3 className="font-headline text-4xl lg:text-5xl font-light mb-1">{t('bibliography')}</h3>
              <p className="text-tertiary/60 font-body uppercase tracking-widest text-xs">{t('essentialWorks')}</p>
            </div>
          </div>

          <div className="flex gap-5 lg:gap-8 overflow-x-auto hide-scrollbar pb-6 -mx-6 px-6 lg:mx-0 lg:px-0 snap-x">
            {author.books.map((book, i) => (
              <a
                key={i}
                href={book.url || '#'}
                target={book.url ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="min-w-[220px] lg:min-w-[280px] bg-surface-lowest dark:bg-on-surface/5 p-5 rounded-xl shadow-sm snap-start group border border-transparent hover:border-jordi-green/15 transition-all"
              >
                {/* Book cover placeholder */}
                <div className="relative aspect-[2/3] mb-4 overflow-hidden rounded-lg">
                  <div className={`w-full h-full flex items-center justify-center ${
                    i % 3 === 0 ? 'bg-primary/8' : i % 3 === 1 ? 'bg-jordi-green/8' : 'bg-secondary-container/20'
                  }`}>
                    <span className="material-symbols-outlined text-6xl text-on-surface/10">menu_book</span>
                  </div>
                </div>
                <h4 className="font-headline text-lg lg:text-xl mb-1 group-hover:text-jordi-green transition-colors leading-tight">
                  {book.title}
                </h4>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
