import { useRef, useCallback } from 'react';
import type { AuthorBook, AuthorInfo, Signing } from '../types';
import type { TranslationKey } from '../i18n/translations';
import { useI18n } from '../i18n/I18nContext';
import { isEventDay, isSigningLive } from '../hooks/useEventDay';

function getAuthorBio(author: AuthorInfo | null, locale: string): string {
  if (!author) return '';
  if (locale === 'ca') return author.generatedBioCa || author.bioCa || author.bioEs || '';
  return author.generatedBioEs || author.bioEs || author.bioCa || '';
}

function BibliographyCarousel({ books, t }: { books: AuthorBook[]; t: (key: TranslationKey) => string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = useCallback((dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = dir === 'left' ? -260 : 260;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  }, []);

  return (
    <section className="mb-12">
      <div className="flex items-end justify-between mb-8 lg:mb-10">
        <div>
          <h3 className="font-headline text-4xl lg:text-5xl font-light mb-1">{t('bibliography')}</h3>
          <p className="text-tertiary/60 font-body uppercase tracking-widest text-xs">{t('essentialWorks')}</p>
        </div>
        {books.length > 2 && (
          <div className="flex gap-2">
            <button
              onClick={() => scroll('left')}
              className="w-10 h-10 rounded-full bg-surface-highest dark:bg-on-surface/10 flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-colors"
              aria-label={t('previous')}
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-10 h-10 rounded-full bg-surface-highest dark:bg-on-surface/10 flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-colors"
              aria-label={t('next')}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex gap-5 lg:gap-8 overflow-x-auto hide-scrollbar pb-6 -mx-6 px-6 lg:mx-0 lg:px-0 snap-x scroll-smooth">
        {books.map((book, i) => {
          const bookUrl = book.isbn
            ? `https://www.goodreads.com/search?q=${book.isbn}`
            : `https://www.goodreads.com/search?q=${encodeURIComponent(book.title)}`;
          const Tag = bookUrl ? 'a' : 'div';
          const linkProps = bookUrl ? { href: bookUrl, target: '_blank' as const, rel: 'noopener noreferrer' } : {};
          return (
            <Tag
              key={i}
              {...linkProps}
              className="w-[220px] lg:w-[280px] flex-none bg-surface-lowest dark:bg-on-surface/5 p-5 rounded-xl shadow-sm snap-start group border border-transparent hover:border-jordi-green/15 transition-all"
            >
              <div className="relative aspect-[2/3] mb-4 overflow-hidden rounded-lg">
                {book.cover ? (
                  <img src={book.cover} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${
                    i % 3 === 0 ? 'bg-primary/8' : i % 3 === 1 ? 'bg-jordi-green/8' : 'bg-secondary-container/20'
                  }`}>
                    <span className="material-symbols-outlined text-6xl text-on-surface/10">menu_book</span>
                  </div>
                )}
              </div>
              <h4 className="font-headline text-lg lg:text-xl mb-1 group-hover:text-jordi-green transition-colors leading-tight">
                {book.title}
              </h4>
              <div className="flex items-center gap-2 text-[11px] font-body text-tertiary uppercase tracking-wider">
                {book.publishedDate && <span>{book.publishedDate.slice(0, 4)}</span>}
                {book.publishedDate && book.publisher && <span>&middot;</span>}
                {book.publisher && <span>{book.publisher}</span>}
              </div>
              {book.description && (
                <p className="text-xs font-body text-tertiary/70 mt-2 line-clamp-3">{book.description}</p>
              )}
            </Tag>
          );
        })}
      </div>
    </section>
  );
}

interface AuthorDetailProps {
  author: AuthorInfo | null;
  authorName: string;
  signings: Signing[];
  favoriteIds: Set<string>;
  onToggleFavorite: (id: string) => void;
  onBack: () => void;
}

export function AuthorDetail({ author, authorName, signings, favoriteIds, onToggleFavorite, onBack }: AuthorDetailProps) {
  const { t, locale } = useI18n();
  const bio = getAuthorBio(author, locale);
  const authorSignings = signings
    .filter((s) => s.author === authorName)
    .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));

  return (
    <div className="min-h-screen">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-jordi-green hover:text-jordi-green-dim font-body text-sm font-semibold mt-4 mb-8 transition-colors group"
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

          {/* Book being presented */}
          {author?.presentingBook && (
            <h2 className="font-headline italic text-2xl lg:text-3xl text-primary-container">
              &ldquo;{author.presentingBook}&rdquo;
            </h2>
          )}

          {/* Bio */}
          {bio && (
            <p className="text-lg text-tertiary leading-relaxed font-light max-w-2xl">
              {bio}
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
                Goodreads
              </a>
            )}
            {author?.wikiUrl && (
              <a
                href={author.wikiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface-highest dark:bg-on-surface/10 text-on-surface px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:bg-surface-high transition-colors active:scale-95 text-sm"
              >
                <span className="material-symbols-outlined">public</span>
                Wikipedia
              </a>
            )}
            {/* Social links */}
            {(author?.links?.twitter || author?.links?.instagram) && (
              <div className="flex items-center gap-2">
                {author.links.twitter && (
                  <a href={author.links.twitter} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-surface-highest dark:bg-on-surface/10 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-high transition-colors"
                    aria-label="Twitter / X">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </a>
                )}
                {author.links.instagram && (
                  <a href={author.links.instagram} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-surface-highest dark:bg-on-surface/10 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-high transition-colors"
                    aria-label="Instagram">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  </a>
                )}
              </div>
            )}
            {authorSignings.length > 0 && (
              <button
                onClick={() => onToggleFavorite(authorSignings[0].id)}
                className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors active:scale-95 text-sm ${
                  favoriteIds.has(authorSignings[0].id)
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-highest dark:bg-on-surface/10 text-primary hover:bg-primary-fixed'
                }`}
              >
                <span className={`material-symbols-outlined ${favoriteIds.has(authorSignings[0].id) ? 'filled' : ''}`}>favorite</span>
                {favoriteIds.has(authorSignings[0].id) ? t('removeFavorite') : t('addFavorite')}
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
                          aria-label={favoriteIds.has(signing.id) ? t('removeFavorite') : t('addFavorite')}
                        >
                          <span className={`material-symbols-outlined text-base ${favoriteIds.has(signing.id) ? 'filled text-primary' : 'text-outline'}`}>
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

          {/* Locations & Directions */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Unique locations as direction cards */}
            {[...new Map(authorSignings.map((s) => [s.location, s])).values()].map((signing) => (
              <a
                key={signing.id}
                href={`https://www.google.com/maps/search/?api=1&query=${signing.coordinates.lat},${signing.coordinates.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface-lowest dark:bg-on-surface/5 rounded-xl p-5 flex items-center gap-4 hover:shadow-lg transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-jordi-green/10 flex items-center justify-center flex-shrink-0 group-hover:bg-jordi-green/20 transition-colors">
                  <span className="material-symbols-outlined text-jordi-green text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-headline text-lg text-on-surface dark:text-surface-highest leading-tight">{signing.location}</p>
                  {signing.address && (
                    <p className="text-xs font-body text-tertiary mt-0.5 truncate">{signing.address}</p>
                  )}
                </div>
                <span className="material-symbols-outlined text-tertiary/40 group-hover:text-jordi-green transition-colors">open_in_new</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Bibliography Section */}
      {author?.books && author.books.length > 0 && (
        <BibliographyCarousel books={author.books} t={t} />
      )}
    </div>
  );
}
