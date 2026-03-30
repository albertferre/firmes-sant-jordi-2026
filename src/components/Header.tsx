import type { ActiveView } from '../types';
import { useI18n } from '../i18n/I18nContext';

interface HeaderProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  totalSignings: number;
  filteredCount: number;
}

export function Header({ activeView, onViewChange, totalSignings, filteredCount }: HeaderProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <header className="bg-rosa text-white shadow-lg">
      <div className="max-w-5xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t('title')}
            </h1>
            <p className="text-rose-100 text-sm mt-1">
              {t('subtitle')} &middot;{' '}
              {filteredCount === totalSignings
                ? `${totalSignings} ${t('signings')}`
                : `${filteredCount} ${t('of')} ${totalSignings} ${t('signings')}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocale(locale === 'ca' ? 'es' : 'ca')}
              className="px-2 py-1 rounded-md text-xs font-medium bg-rosa-dark hover:bg-white/10 transition-colors"
            >
              {locale === 'ca' ? 'ES' : 'CA'}
            </button>
            <div className="flex gap-1 bg-rosa-dark rounded-lg p-1">
              <button
                onClick={() => onViewChange('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'list'
                    ? 'bg-white text-rosa'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                {t('list')}
              </button>
              <button
                onClick={() => onViewChange('map')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'map'
                    ? 'bg-white text-rosa'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                {t('map')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
