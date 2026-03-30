import { useState, useMemo } from 'react';
import type { Signing } from '../types';
import { useI18n } from '../i18n/I18nContext';

export interface TimeSlot {
  label: string;
  start: string;
  end: string;
}

export function useFilters(signings: Signing[]) {
  const { t } = useI18n();
  const [searchText, setSearchText] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [timeSlotFilter, setTimeSlotFilter] = useState('');

  const locations = useMemo(() => {
    const set = new Set(signings.map((s) => s.location));
    return Array.from(set).sort();
  }, [signings]);

  const timeSlots: TimeSlot[] = useMemo(
    () => [
      { label: t('morning'), start: '09:00', end: '13:00' },
      { label: t('midday'), start: '13:00', end: '16:00' },
      { label: t('afternoon'), start: '16:00', end: '20:00' },
    ],
    [t],
  );

  const filtered = useMemo(() => {
    return signings.filter((s) => {
      const query = searchText.toLowerCase();
      const matchesSearch =
        !searchText ||
        s.author.toLowerCase().includes(query) ||
        s.book.toLowerCase().includes(query) ||
        s.publisher.toLowerCase().includes(query);

      const matchesLocation = !locationFilter || s.location === locationFilter;

      const matchesTimeSlot =
        !timeSlotFilter ||
        (() => {
          const slot = timeSlots.find((ts) => ts.label === timeSlotFilter);
          if (!slot) return true;
          return s.startTime >= slot.start && s.startTime < slot.end;
        })();

      return matchesSearch && matchesLocation && matchesTimeSlot;
    });
  }, [signings, searchText, locationFilter, timeSlotFilter, timeSlots]);

  return {
    searchText,
    setSearchText,
    locationFilter,
    setLocationFilter,
    timeSlotFilter,
    setTimeSlotFilter,
    locations,
    timeSlots,
    filtered,
  };
}
