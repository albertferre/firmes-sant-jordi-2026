import type { ActiveView } from '../types';
import { useI18n } from '../i18n/I18nContext';

interface HeaderProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  totalSignings: number;
  filteredCount: number;
  favoritesCount: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function Header({ activeView, onViewChange, totalSignings, filteredCount, favoritesCount, theme, onToggleTheme }: HeaderProps) {
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
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleTheme}
              className="p-1.5 rounded-md bg-rosa-dark hover:bg-white/10 transition-colors"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
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
                onClick={() => onViewChange('favorites')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeView === 'favorites'
                    ? 'bg-white text-rosa'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {favoritesCount > 0 && favoritesCount}
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
