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
    <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-6 px-6 pb-1">
      {/* Time slot chips */}
      {timeSlots.map((slot) => (
        <button
          key={slot.id}
          onClick={() => onTimeSlotChange(timeSlotFilter === slot.id ? '' : slot.id)}
          className={`${chipBase} ${timeSlotFilter === slot.id ? chipActive : chipInactive}`}
        >
          <span className="material-symbols-outlined text-[18px]">schedule</span>
          {slot.label}
        </button>
      ))}

      {/* Location dropdown as a styled select */}
      <div className="relative flex-shrink-0">
        <select
          value={locationFilter}
          onChange={(e) => onLocationChange(e.target.value)}
          className={`${chipBase} ${locationFilter ? chipActive : chipInactive} appearance-none pr-8 border-none focus:outline-none focus:ring-0`}
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
