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
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p className="text-lg">{title}</p>
        <p className="text-sm mt-1">{hint}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
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
