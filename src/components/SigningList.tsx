import type { Signing } from '../types';
import { SigningCard } from './SigningCard';
import { useI18n } from '../i18n/I18nContext';

interface SigningListProps {
  signings: Signing[];
}

export function SigningList({ signings }: SigningListProps) {
  const { t } = useI18n();

  if (signings.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">{t('noResults')}</p>
        <p className="text-sm mt-1">{t('noResultsHint')}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {signings.map((signing) => (
        <SigningCard key={signing.id} signing={signing} />
      ))}
    </div>
  );
}
