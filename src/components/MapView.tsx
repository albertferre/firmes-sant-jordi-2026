import { useState, useMemo, useCallback } from 'react';
import type { AuthorIndex, Signing } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { BarcelonaMap } from './BarcelonaMap';
import { TimeSlider } from './TimeSlider';
import { LocationPanel } from './LocationPanel';

export interface LocationMarker {
  location: string;
  address: string;
  coordinates: { lat: number; lng: number };
  signingCount: number;
  signings: Signing[];
}

interface MapViewProps {
  signings: Signing[];
  authorsData: Record<string, AuthorIndex>;
  onAuthorClick: (authorName: string) => void;
}

function extractHour(time: string): string {
  const [h] = time.split(':');
  return `${h}:00`;
}

function isEventDay(): boolean {
  const now = new Date();
  return now.getFullYear() === 2026 && now.getMonth() === 3 && now.getDate() === 23;
}

export function MapView({ signings, authorsData, onAuthorClick }: MapViewProps) {
  const [selectedHour, setSelectedHour] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const { t } = useI18n();

  const eventDay = isEventDay();

  // Extract unique sorted hours from all signings
  const hours = useMemo(() => {
    const hourSet = new Set<string>();
    for (const s of signings) {
      if (s.startTime) hourSet.add(extractHour(s.startTime));
    }
    return Array.from(hourSet).sort();
  }, [signings]);

  // Count signings per hour
  const signingsByHour = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const hour of hours) {
      counts[hour] = 0;
    }
    for (const s of signings) {
      if (s.startTime) {
        const hour = extractHour(s.startTime);
        if (counts[hour] !== undefined) counts[hour]++;
      }
    }
    return counts;
  }, [signings, hours]);

  // Filter signings by selected hour -- ALWAYS enabled, not just on event day
  const filteredSignings = useMemo(() => {
    if (selectedHour === null) return signings;
    return signings.filter((s) => {
      if (!s.startTime) return false;
      return extractHour(s.startTime) === selectedHour;
    });
  }, [signings, selectedHour]);

  // Group filtered signings by location to build markers
  // Filter out "Per confirmar" locations
  // Sort ascending by signingCount so small markers render on top (higher z-index)
  const locationMarkers = useMemo(() => {
    const grouped = new Map<string, Signing[]>();
    for (const s of filteredSignings) {
      if (!s.location || s.location === 'Per confirmar') continue;
      if (!grouped.has(s.location)) grouped.set(s.location, []);
      grouped.get(s.location)!.push(s);
    }

    const markers: LocationMarker[] = [];
    for (const [location, locSignings] of grouped) {
      const first = locSignings[0];
      markers.push({
        location,
        address: first.address,
        coordinates: first.coordinates,
        signingCount: locSignings.length,
        signings: locSignings,
      });
    }

    // Sort ascending by signingCount -- small markers on top in z-order
    markers.sort((a, b) => a.signingCount - b.signingCount);
    return markers;
  }, [filteredSignings]);

  // Signings for the selected location panel
  const selectedLocationSignings = useMemo(() => {
    if (!selectedLocation) return [];
    return filteredSignings.filter((s) => s.location === selectedLocation);
  }, [filteredSignings, selectedLocation]);

  const handleHourChange = useCallback((hour: string | null) => {
    setSelectedHour(hour);
    setSelectedLocation(null);
  }, []);

  const handleLocationSelect = useCallback((location: string) => {
    setSelectedLocation(location);
  }, []);

  const handleLocationClose = useCallback(() => {
    setSelectedLocation(null);
  }, []);

  const hasNoResults = selectedHour !== null && filteredSignings.length === 0;

  return (
    <div className="flex flex-col h-[calc(100dvh-72px-64px)] lg:h-[calc(100dvh-72px)]">
      <TimeSlider
        hours={hours}
        selectedHour={selectedHour}
        onHourChange={handleHourChange}
        signingsByHour={signingsByHour}
        isEventDay={eventDay}
      />
      <div className="relative flex-1 overflow-hidden">
        <BarcelonaMap
          locations={locationMarkers}
          onLocationClick={handleLocationSelect}
          selectedLocation={selectedLocation}
        />

        {/* Empty state overlay when time filter yields no results */}
        {hasNoResults && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
            <div className="bg-surface/90 dark:bg-on-surface/90 backdrop-blur-md rounded-2xl px-8 py-6 text-center shadow-xl pointer-events-auto max-w-xs">
              <span className="material-symbols-outlined text-4xl text-outline/30 mb-3 block">
                schedule
              </span>
              <p className="font-headline text-base italic text-on-surface dark:text-surface-highest">
                {t('noResults')}
              </p>
              <p className="font-body text-xs text-on-surface-variant dark:text-surface-highest/50 mt-1">
                {t('noResultsHint')}
              </p>
            </div>
          </div>
        )}

        {selectedLocation && (
          <LocationPanel
            location={selectedLocation}
            signings={selectedLocationSignings}
            authorsData={authorsData}
            onAuthorClick={onAuthorClick}
            onClose={handleLocationClose}
          />
        )}
      </div>
    </div>
  );
}
