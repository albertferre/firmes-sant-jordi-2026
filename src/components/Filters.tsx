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
  const selectClass =
    'px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-rosa focus:border-transparent';

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={locationFilter}
        onChange={(e) => onLocationChange(e.target.value)}
        className={selectClass}
      >
        <option value="">{t('allLocations')}</option>
        {locations.map((loc) => (
          <option key={loc} value={loc}>
            {loc}
          </option>
        ))}
      </select>
      <select
        value={timeSlotFilter}
        onChange={(e) => onTimeSlotChange(e.target.value)}
        className={selectClass}
      >
        <option value="">{t('allTimes')}</option>
        {timeSlots.map((slot) => (
          <option key={slot.id} value={slot.id}>
            {slot.label}
          </option>
        ))}
      </select>
    </div>
  );
}
