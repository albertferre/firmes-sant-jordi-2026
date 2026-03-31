import { useI18n } from '../i18n/I18nContext';

interface HeaderProps {
  totalSignings: number;
  filteredCount: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function Header({ totalSignings, filteredCount, theme, onToggleTheme }: HeaderProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/80 dark:bg-on-surface/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(28,28,24,0.05)]">
      <div className="flex justify-between items-center px-6 py-4 max-w-screen-2xl mx-auto">
        <div>
          <h1 className="text-2xl font-headline italic text-primary dark:text-primary-fixed-dim tracking-tight">
            {t('title')}
          </h1>
          <p className="text-xs font-body text-tertiary mt-0.5">
            {t('subtitle')} &middot;{' '}
            {filteredCount === totalSignings
              ? `${totalSignings} ${t('signings')}`
              : `${filteredCount} ${t('of')} ${totalSignings}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="w-9 h-9 rounded-full flex items-center justify-center text-primary hover:bg-surface-high transition-colors"
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            <span className="material-symbols-outlined text-lg">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <button
            onClick={() => setLocale(locale === 'ca' ? 'es' : 'ca')}
            className="px-2.5 py-1.5 rounded-full text-[11px] font-bold font-body uppercase tracking-wider bg-surface-high text-on-surface-variant hover:bg-surface-highest transition-colors"
          >
            {locale === 'ca' ? 'ES' : 'CA'}
          </button>
        </div>
      </div>
    </header>
  );
}
