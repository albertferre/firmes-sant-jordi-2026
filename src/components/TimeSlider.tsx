import { useRef, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';

interface TimeSliderProps {
  hours: string[];
  selectedHour: string | null;
  onHourChange: (hour: string | null) => void;
  signingsByHour: Record<string, number>;
  isEventDay: boolean;
}

export function TimeSlider({
  hours,
  selectedHour,
  onHourChange,
  signingsByHour,
  isEventDay,
}: TimeSliderProps) {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const totalSignings = Object.values(signingsByHour).reduce((sum, n) => sum + n, 0);

  // Scroll the selected pill into view when it changes
  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const pill = selectedRef.current;
      const pillLeft = pill.offsetLeft;
      const pillWidth = pill.offsetWidth;
      const containerWidth = container.offsetWidth;
      const scrollTarget = pillLeft - containerWidth / 2 + pillWidth / 2;
      container.scrollTo({ left: scrollTarget, behavior: 'smooth' });
    }
  }, [selectedHour]);

  if (!isEventDay) {
    return (
      <div className="sticky top-[72px] z-30 bg-surface/85 dark:bg-on-surface/85 backdrop-blur-md border-b border-outline-variant/10">
        <div className="px-4 py-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-secondary">auto_awesome</span>
          <span className="font-body text-sm font-medium text-on-surface-variant dark:text-surface-highest/70 tracking-wide">
            {t('featuredSignings')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-[72px] z-30 bg-surface/85 dark:bg-on-surface/85 backdrop-blur-md border-b border-outline-variant/10">
      <div
        ref={scrollRef}
        className="flex gap-2 px-4 py-3 overflow-x-auto hide-scrollbar"
        role="tablist"
        aria-label={t('allTimes')}
      >
        {/* "All" pill */}
        <button
          ref={selectedHour === null ? selectedRef : undefined}
          onClick={() => onHourChange(null)}
          role="tab"
          aria-selected={selectedHour === null}
          className={`flex flex-col items-center justify-center min-w-[56px] px-3 py-1.5 rounded-xl text-center transition-all duration-200 flex-shrink-0 ${
            selectedHour === null
              ? 'bg-primary text-on-primary scale-105 shadow-md'
              : 'bg-surface-lowest dark:bg-surface-highest/10 text-on-surface-variant dark:text-surface-highest/60 hover:bg-surface-highest/50 dark:hover:bg-surface-highest/15'
          }`}
        >
          <span className="text-xs font-body font-semibold leading-tight">Tots</span>
          <span className="text-[10px] font-body opacity-70 leading-tight mt-0.5">
            {totalSignings}
          </span>
        </button>

        {/* Hour pills */}
        {hours.map((hour) => {
          const isSelected = selectedHour === hour;
          const count = signingsByHour[hour] ?? 0;
          return (
            <button
              key={hour}
              ref={isSelected ? selectedRef : undefined}
              onClick={() => onHourChange(hour)}
              role="tab"
              aria-selected={isSelected}
              className={`flex flex-col items-center justify-center min-w-[56px] px-3 py-1.5 rounded-xl text-center transition-all duration-200 flex-shrink-0 ${
                isSelected
                  ? 'bg-primary text-on-primary scale-105 shadow-md'
                  : 'bg-surface-lowest dark:bg-surface-highest/10 text-on-surface-variant dark:text-surface-highest/60 hover:bg-surface-highest/50 dark:hover:bg-surface-highest/15'
              }`}
            >
              <span className="text-xs font-body font-semibold leading-tight">{hour}</span>
              <span className="text-[10px] font-body opacity-70 leading-tight mt-0.5">
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
