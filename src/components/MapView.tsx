import { useState, useMemo, useCallback } from 'react';
import type { AuthorIndex, Signing } from '../types';
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
  // "10:30" -> "10:00", "14:00" -> "14:00"
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

  // Filter signings by selected hour (on event day only)
  const filteredSignings = useMemo(() => {
    if (!eventDay || selectedHour === null) return signings;
    return signings.filter((s) => {
      if (!s.startTime) return false;
      return extractHour(s.startTime) === selectedHour;
    });
  }, [signings, selectedHour, eventDay]);

  // Group filtered signings by location to build markers
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

    // Sort by signing count descending so the busiest locations are prominent
    markers.sort((a, b) => b.signingCount - a.signingCount);
    return markers;
  }, [filteredSignings]);

  // Signings for the selected location panel
  const selectedLocationSignings = useMemo(() => {
    if (!selectedLocation) return [];
    return filteredSignings.filter((s) => s.location === selectedLocation);
  }, [filteredSignings, selectedLocation]);

  const handleHourChange = useCallback((hour: string | null) => {
    setSelectedHour(hour);
    // Clear location selection when changing time to avoid stale data
    setSelectedLocation(null);
  }, []);

  const handleLocationSelect = useCallback((location: string) => {
    setSelectedLocation(location);
  }, []);

  const handleLocationClose = useCallback(() => {
    setSelectedLocation(null);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-72px-64px)] lg:h-[calc(100vh-72px)]">
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
