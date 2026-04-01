import type { TimeSlot } from '../hooks/useFilters';
import { useI18n } from '../i18n/I18nContext';

interface FiltersProps {
  locations: string[];
  locationFilter: string;
  onLocationChange: (val: string) => void;
  timeSlots: TimeSlot[];
  timeSlotFilter: string;
  onTimeSlotChange: (val: string) => void;
}

export function Filters({
  locations,
  locationFilter,
  onLocationChange,
  timeSlots,
  timeSlotFilter,
  onTimeSlotChange,
}: FiltersProps) {
  const { t } = useI18n();

  const chipBase =
    'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-body tracking-wide whitespace-nowrap transition-colors cursor-pointer';
  const chipInactive =
    'bg-surface-highest dark:bg-on-surface/10 text-on-surface-variant hover:bg-secondary-container';
  const chipActive =
    'bg-primary text-on-primary';

  return (
    <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
      {/* Time slot chips */}
      {timeSlots.map((slot) => {
        const isActive = timeSlotFilter === slot.id;
        return (
          <button
            key={slot.id}
            onClick={() => onTimeSlotChange(isActive ? '' : slot.id)}
            aria-pressed={isActive}
            className={`${chipBase} ${isActive ? chipActive : chipInactive}`}
          >
            <span className="material-symbols-outlined text-[18px]">schedule</span>
            {slot.label}
          </button>
        );
      })}

      {/* Location dropdown */}
      <div className="relative flex-shrink-0">
        <select
          value={locationFilter}
          onChange={(e) => onLocationChange(e.target.value)}
          aria-label={t('allLocations')}
          className={`${chipBase} ${locationFilter ? 'bg-jordi-green text-on-primary' : chipInactive} appearance-none pr-8 border-none`}
        >
          <option value="">{t('allLocations')}</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
        <span className="material-symbols-outlined text-[16px] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          expand_more
        </span>
      </div>
    </div>
  );
}
