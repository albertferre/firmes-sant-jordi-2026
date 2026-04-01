import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import type { AuthorInfo, Signing } from '../types';
import { SigningCard } from './SigningCard';
import { useI18n } from '../i18n/I18nContext';

const INITIAL_BATCH = 30;
const LOAD_MORE = 20;

interface SigningListProps {
  signings: Signing[];
  authorsData: Record<string, AuthorInfo>;
  favoriteIds: Set<string>;
  onToggleFavorite: (id: string) => void;
  onAuthorClick?: (authorName: string) => void;
  emptyStateType?: 'noResults' | 'noFavorites';
}

/** Group signings by author, preserving order of first appearance */
function groupByAuthor(signings: Signing[]): { primary: Signing; extra: Signing[] }[] {
  const map = new Map<string, Signing[]>();
  for (const s of signings) {
    const list = map.get(s.author);
    if (list) list.push(s);
    else map.set(s.author, [s]);
  }
  return Array.from(map.values()).map(([first, ...rest]) => ({ primary: first, extra: rest }));
}

export function SigningList({ signings, authorsData, favoriteIds, onToggleFavorite, onAuthorClick, emptyStateType = 'noResults' }: SigningListProps) {
  const { t } = useI18n();
  const grouped = useMemo(() => groupByAuthor(signings), [signings]);
  const [visible, setVisible] = useState(INITIAL_BATCH);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset visible count when signings change (e.g. filter)
  useEffect(() => { setVisible(INITIAL_BATCH); }, [signings]);

  const loadMore = useCallback(() => {
    setVisible((v) => Math.min(v + LOAD_MORE, grouped.length));
  }, [grouped.length]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visible >= grouped.length) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, grouped.length, loadMore]);

  if (signings.length === 0) {
    const title = emptyStateType === 'noFavorites' ? t('noFavorites') : t('noResults');
    const hint = emptyStateType === 'noFavorites' ? t('noFavoritesHint') : t('noResultsHint');
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="material-symbols-outlined text-5xl text-outline-variant/40 mb-4">
          {emptyStateType === 'noFavorites' ? 'auto_stories' : 'search_off'}
        </span>
        <p className="font-headline text-xl italic text-on-surface-variant">{title}</p>
        <p className="text-sm font-body text-tertiary mt-2 max-w-xs">{hint}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {grouped.slice(0, visible).map(({ primary, extra }) => (
          <SigningCard
            key={primary.id}
            signing={primary}
            extraSignings={extra.length > 0 ? extra : undefined}
            authorInfo={authorsData[primary.author]}
            favoriteIds={favoriteIds}
            onToggleFavorite={onToggleFavorite}
            onAuthorClick={onAuthorClick}
          />
        ))}
      </div>
      {visible < grouped.length && <div ref={sentinelRef} className="h-1" />}
    </>
  );
}
