import type { Signing } from '../types';
import { SigningCard } from './SigningCard';
import { useI18n } from '../i18n/I18nContext';

interface SigningListProps {
  signings: Signing[];
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  emptyStateType?: 'noResults' | 'noFavorites';
}

export function SigningList({ signings, isFavorite, onToggleFavorite, emptyStateType = 'noResults' }: SigningListProps) {
  const { t } = useI18n();

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
    <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {signings.map((signing) => (
        <SigningCard
          key={signing.id}
          signing={signing}
          isFavorite={isFavorite(signing.id)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}
