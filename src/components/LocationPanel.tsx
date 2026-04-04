import { useEffect, useRef, useState } from 'react';
import type { AuthorIndex, Signing } from '../types';
import { useI18n } from '../i18n/I18nContext';

interface LocationPanelProps {
  location: string;
  signings: Signing[];
  authorsData: Record<string, AuthorIndex>;
  onAuthorClick: (authorName: string) => void;
  onClose: () => void;
}

export function LocationPanel({
  location,
  signings,
  authorsData,
  onAuthorClick,
  onClose,
}: LocationPanelProps) {
  const { t } = useI18n();
  const [isVisible, setIsVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Trigger enter animation on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    // Wait for exit animation before unmounting
    setTimeout(onClose, 200);
  };

  const sorted = [...signings].sort((a, b) => {
    if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
    if (a.startTime) return -1;
    if (b.startTime) return 1;
    return 0;
  });

  return (
    <>
      {/* Backdrop - mobile only */}
      <div
        className={`absolute inset-0 bg-on-surface/20 dark:bg-on-surface/40 z-10 transition-opacity duration-200 lg:hidden ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label={location}
        className={`
          absolute z-20 bg-surface dark:bg-on-surface/95 backdrop-blur-xl shadow-2xl overflow-hidden
          transition-transform duration-200 ease-out

          bottom-0 left-0 right-0 max-h-[60vh] rounded-t-2xl
          lg:bottom-auto lg:top-0 lg:left-auto lg:right-0 lg:w-[380px] lg:h-full lg:max-h-none lg:rounded-t-none lg:rounded-l-2xl
          lg:border-l lg:border-outline-variant/10

          ${isVisible
            ? 'translate-y-0 lg:translate-y-0 lg:translate-x-0'
            : 'translate-y-full lg:translate-y-0 lg:translate-x-full'
          }
        `}
      >
        {/* Drag handle - mobile only */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-outline-variant/30" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-outline-variant/10">
          <div className="flex-1 min-w-0">
            <h2 className="font-headline text-lg italic text-on-surface dark:text-surface-highest truncate leading-tight">
              {location}
            </h2>
            <p className="font-body text-xs text-on-surface-variant dark:text-surface-highest/50 mt-0.5">
              {signings.length} {t('signings')}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-highest/30 dark:hover:bg-surface-highest/10 transition-colors flex-shrink-0"
            aria-label={t('back')}
          >
            <span className="material-symbols-outlined text-lg text-on-surface-variant dark:text-surface-highest/60">
              close
            </span>
          </button>
        </div>

        {/* Signing list */}
        <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: 'calc(60vh - 100px)' }}>
          {sorted.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <span className="material-symbols-outlined text-3xl text-outline/30 mb-2">menu_book</span>
              <p className="font-body text-sm text-on-surface-variant/60">
                {t('noResults')}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-outline-variant/8">
              {sorted.map((signing) => {
                const author = authorsData[signing.author];
                const hasTime = signing.startTime && signing.endTime;
                return (
                  <li key={signing.id}>
                    <button
                      onClick={() => onAuthorClick(signing.author)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-highest/20 dark:hover:bg-surface-highest/5 transition-colors"
                    >
                      {/* Author photo */}
                      <div
                        className={`w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ${
                          author?.photo ? '' : 'bg-primary/8 dark:bg-primary/15'
                        }`}
                      >
                        {author?.photo ? (
                          <img
                            src={author.photo}
                            alt={signing.author}
                            className="w-full h-full object-cover object-top"
                            loading="lazy"
                            width={40}
                            height={40}
                          />
                        ) : (
                          <span className="font-headline text-lg text-primary font-bold italic flex items-center justify-center w-full h-full">
                            {signing.author.charAt(0)}
                          </span>
                        )}
                      </div>

                      {/* Signing info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-headline text-sm italic text-on-surface dark:text-surface-highest truncate leading-tight">
                          {signing.author}
                        </p>
                        {signing.book && (
                          <p className="text-xs font-body text-primary font-semibold truncate mt-0.5">
                            {signing.book}
                          </p>
                        )}
                      </div>

                      {/* Time */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="material-symbols-outlined text-[14px] text-on-surface-variant/60">
                          schedule
                        </span>
                        <span className="text-xs font-body text-on-surface-variant dark:text-surface-highest/50 whitespace-nowrap">
                          {hasTime ? `${signing.startTime}-${signing.endTime}` : t('tbaTime')}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
