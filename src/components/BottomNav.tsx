import type { ActiveView } from '../types';
import { useI18n } from '../i18n/I18nContext';

interface BottomNavProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  favoritesCount: number;
}

const tabs: { view: ActiveView; icon: string; labelKey: 'list' | 'map' | 'favorites' }[] = [
  { view: 'list', icon: 'explore', labelKey: 'list' },
  { view: 'map', icon: 'map', labelKey: 'map' },
  { view: 'favorites', icon: 'auto_stories', labelKey: 'favorites' },
];

export function BottomNav({ activeView, onViewChange, favoritesCount }: BottomNavProps) {
  const { t } = useI18n();

  return (
    <nav className="fixed bottom-0 left-0 w-full h-20 bg-surface/90 dark:bg-on-surface/90 backdrop-blur-md border-t border-outline-variant/10 shadow-[0_-4px_24px_rgba(28,28,24,0.03)] z-50 flex justify-around items-center px-4 rounded-t-2xl lg:hidden" aria-label="Main navigation">
      {tabs.map(({ view, icon, labelKey }) => {
        const isActive = activeView === view;
        return (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex flex-col items-center justify-center transition-colors relative ${
              isActive
                ? 'text-primary dark:text-secondary-container font-bold'
                : 'text-tertiary/40 dark:text-surface-highest/40 hover:text-primary-container'
            }`}
          >
            <span
              className={`material-symbols-outlined text-2xl mb-1 ${isActive ? 'filled' : ''}`}
            >
              {icon}
            </span>
            <span className="text-[11px] font-body tracking-wide uppercase">
              {t(labelKey)}
            </span>
            {view === 'favorites' && favoritesCount > 0 && (
              <span className="absolute -top-1 right-0 min-w-[18px] h-[18px] bg-primary text-on-primary text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {favoritesCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
