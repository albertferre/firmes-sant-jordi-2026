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

  const navItems: { view: 'list' | 'map' | 'favorites'; label: string }[] = [
    { view: 'list', label: t('list') },
    { view: 'map', label: t('map') },
    { view: 'favorites', label: `${t('favorites')}${favoritesCount > 0 ? ` (${favoritesCount})` : ''}` },
  ];

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/80 dark:bg-on-surface/80 backdrop-blur-md lg:backdrop-blur-xl shadow-[0_8px_32px_rgba(28,28,24,0.05)]">
      <div className="flex justify-between items-center px-6 lg:px-12 py-4 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="text-2xl font-headline italic text-primary dark:text-primary-fixed-dim tracking-tight">
              {t('title')}
            </h1>
            <p className="text-xs font-body text-tertiary mt-0.5 lg:hidden">
              {t('subtitle')} &middot;{' '}
              {filteredCount === totalSignings
                ? `${totalSignings} ${t('signings')}`
                : `${filteredCount} ${t('of')} ${totalSignings}`}
            </p>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden lg:flex items-center gap-6" aria-label="Main navigation">
            {navItems.map(({ view, label }) => (
              <button
                key={view}
                onClick={() => onViewChange(view)}
                aria-current={activeView === view ? 'page' : undefined}
                className={`font-headline text-sm tracking-wide transition-colors duration-300 ${
                  activeView === view
                    ? 'text-primary font-semibold'
                    : 'text-tertiary hover:text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Signing count - desktop */}
          <span className="hidden lg:block text-xs font-body text-tertiary mr-4">
            {filteredCount === totalSignings
              ? `${totalSignings} ${t('signings')}`
              : `${filteredCount} ${t('of')} ${totalSignings}`}
          </span>
          <button
            onClick={onToggleTheme}
            className="w-9 h-9 rounded-full flex items-center justify-center text-primary hover:bg-surface-high transition-colors"
            aria-label={theme === 'dark' ? t('lightMode') : t('darkMode')}
            title={theme === 'dark' ? t('lightMode') : t('darkMode')}
          >
            <span className="material-symbols-outlined text-lg">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <button
            onClick={() => setLocale(locale === 'ca' ? 'es' : 'ca')}
            className="px-2.5 py-1.5 rounded-full text-[11px] font-bold font-body uppercase tracking-wider bg-surface-high text-on-surface-variant hover:bg-surface-highest transition-colors"
            aria-label={t('changeLanguage')}
            title={t('changeLanguage')}
          >
            {locale === 'ca' ? 'ES' : 'CA'}
          </button>
        </div>
      </div>
    </header>
  );
}
