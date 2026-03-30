import { useState, useMemo } from 'react';
import type { Signing } from '../types';
import { useI18n } from '../i18n/I18nContext';

export interface TimeSlot {
  id: string;
  label: string;
  start: string;
  end: string;
}

const TIME_SLOT_RANGES = [
  { id: 'morning', start: '09:00', end: '13:00' },
  { id: 'midday', start: '13:00', end: '16:00' },
  { id: 'afternoon', start: '16:00', end: '20:00' },
] as const;

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
    () =>
      TIME_SLOT_RANGES.map((slot) => ({
        ...slot,
        label: t(slot.id),
      })),
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
          const slot = TIME_SLOT_RANGES.find((ts) => ts.id === timeSlotFilter);
          if (!slot) return true;
          return s.startTime >= slot.start && s.startTime < slot.end;
        })();

      return matchesSearch && matchesLocation && matchesTimeSlot;
    });
  }, [signings, searchText, locationFilter, timeSlotFilter]);

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
