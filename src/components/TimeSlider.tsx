import { useRef, useEffect, useState } from 'react';
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
  const { t, locale } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const [showFade, setShowFade] = useState(true);

  const totalSignings = Object.values(signingsByHour).reduce((sum, n) => sum + n, 0);

  // "All" label -- 'all' key does not exist in translations, use locale fallback
  const allLabel = locale === 'es' ? 'Todos' : 'Tots';

  // Preview badge text for non-event-day
  const previewLabel = locale === 'es' ? 'Vista previa' : 'Vista previa';

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

  // Track scroll position to show/hide right-edge fade
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    function handleScroll() {
      if (!container) return;
      const atEnd = container.scrollLeft + container.offsetWidth >= container.scrollWidth - 8;
      setShowFade(!atEnd);
    }

    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hours]);

  // Shared pill classes
  const basePillClass =
    'flex flex-col items-center justify-center min-w-[56px] px-3 py-2.5 min-h-[44px] rounded-xl text-center transition-all duration-200 flex-shrink-0';

  const selectedPillClass =
    'bg-primary text-on-primary scale-105 shadow-md';

  const unselectedPillClass =
    'bg-surface-lowest dark:bg-surface-highest/10 text-on-surface-variant dark:text-surface-highest/60 hover:bg-surface-highest/50 dark:hover:bg-surface-highest/15';

  return (
    <div className="sticky top-[72px] z-30 bg-surface/85 dark:bg-on-surface/85 backdrop-blur-md border-b border-outline-variant/10">
      <div className="relative">
        {/* Preview badge when not event day */}
        {!isEventDay && (
          <div className="absolute top-1 right-3 z-10">
            <span className="inline-flex items-center gap-1 bg-secondary-container/60 text-on-secondary-container px-2 py-0.5 rounded-full text-[10px] font-body font-medium tracking-wide">
              <span className="material-symbols-outlined text-[11px]">visibility</span>
              {previewLabel}
            </span>
          </div>
        )}

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
            className={`${basePillClass} ${
              selectedHour === null ? selectedPillClass : unselectedPillClass
            }`}
          >
            <span className="text-xs font-body font-semibold leading-tight">
              {allLabel}
            </span>
            <span className="text-[10px] font-body opacity-70 leading-tight mt-0.5">
              {totalSignings} <span className="text-[9px]">{t('signings')}</span>
            </span>
          </button>

          {/* Hour pills */}
          {hours.map((hour) => {
            const isSelected = selectedHour === hour;
            const count = signingsByHour[hour] ?? 0;
            const displayHour = hour.replace(':00', 'h');
            return (
              <button
                key={hour}
                ref={isSelected ? selectedRef : undefined}
                onClick={() => onHourChange(hour)}
                role="tab"
                aria-selected={isSelected}
                className={`${basePillClass} ${
                  isSelected ? selectedPillClass : unselectedPillClass
                }`}
              >
                <span className="text-xs font-body font-semibold leading-tight">
                  {displayHour}
                </span>
                <span className="text-[10px] font-body opacity-70 leading-tight mt-0.5">
                  {count} <span className="text-[9px]">{t('signings')}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Right-edge gradient fade to hint horizontal scroll */}
        {showFade && (
          <div
            className="absolute right-0 top-0 bottom-0 w-10 pointer-events-none bg-gradient-to-l from-surface/90 dark:from-on-surface/90 to-transparent"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
