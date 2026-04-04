import { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LocationMarker } from './MapView';

interface BarcelonaMapProps {
  locations: LocationMarker[];
  selectedLocation: string | null;
  onLocationClick: (locationName: string) => void;
}

// Barcelona center and default zoom
const MAP_CENTER: L.LatLngExpression = [41.390, 2.166];
const MAP_ZOOM = 15;

// CartoDB Positron tiles -- clean, muted basemap
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>';

/**
 * Compute marker pixel radius from signing count using sqrt scale.
 * Range: 12px (1 signing) to 28px (large count). Zero signings = 5px grey dot.
 */
function markerRadius(count: number): number {
  if (count === 0) return 5;
  const min = 12;
  const max = 28;
  // sqrt scale: grows fast for small counts, plateaus for large
  const scaled = Math.sqrt(count) / Math.sqrt(50);
  return Math.min(max, min + scaled * (max - min));
}

/**
 * Build a Leaflet DivIcon for a location marker.
 * - Circle with signing count, primary color (#86001b), size scales with count
 * - Markers with 0 signings: small grey dot
 * - Selected marker: animated ring
 */
function createMarkerIcon(count: number, isSelected: boolean): L.DivIcon {
  const r = markerRadius(count);
  const size = Math.round(r * 2);
  const isEmpty = count === 0;

  if (isEmpty) {
    return L.divIcon({
      className: '',
      iconSize: [10, 10],
      iconAnchor: [5, 5],
      html: `<div style="
        width:10px;height:10px;border-radius:50%;
        background:rgba(160,160,160,0.5);
      "></div>`,
    });
  }

  // Font size scales with radius
  const fontSize = r < 14 ? 9 : r < 18 ? 11 : 13;

  // Selected ring animation via CSS keyframes
  const ringHtml = isSelected
    ? `<div style="
        position:absolute;inset:-6px;border-radius:50%;
        border:2.5px solid #86001b;
        animation:marker-pulse 1.6s ease-out infinite;
      "></div>
      <div style="
        position:absolute;inset:-10px;border-radius:50%;
        border:1.5px solid #86001b;
        animation:marker-pulse 1.6s ease-out 0.4s infinite;
      "></div>`
    : '';

  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="
      position:relative;width:${size}px;height:${size}px;
      cursor:pointer;
    ">
      ${ringHtml}
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:#86001b;
        opacity:${Math.min(1, 0.6 + (count / 50) * 0.4)};
        border:2.5px solid rgba(255,255,255,0.9);
        box-shadow:0 2px 8px rgba(134,0,27,0.3);
        display:flex;align-items:center;justify-content:center;
        transition:transform 0.2s ease;
      ">
        <span style="
          color:#fff;font-size:${fontSize}px;
          font-family:'Manrope',sans-serif;font-weight:700;
          line-height:1;pointer-events:none;
        ">${count}</span>
      </div>
    </div>`,
  });
}

/**
 * Inner component that manages Leaflet markers imperatively.
 * Using useMap() from react-leaflet to access the map instance
 * and creating markers via L.marker for full control.
 */
function MapMarkers({
  locations,
  selectedLocation,
  onLocationClick,
}: BarcelonaMapProps) {
  const map = useMap();

  // Build and manage markers imperatively for performance
  useEffect(() => {
    const markers: L.Marker[] = [];

    for (const loc of locations) {
      const isSelected = selectedLocation === loc.location;
      const icon = createMarkerIcon(loc.signingCount, isSelected);

      const marker = L.marker(
        [loc.coordinates.lat, loc.coordinates.lng],
        {
          icon,
          // z-index: selected on top, then by count (smaller count = higher z)
          zIndexOffset: isSelected ? 1000 : 0,
          alt: `${loc.location}: ${loc.signingCount} firmes`,
        },
      );

      marker.on('click', () => {
        onLocationClick(loc.location);
      });

      // Tooltip on hover
      marker.bindTooltip(loc.location, {
        direction: 'top',
        offset: [0, -markerRadius(loc.signingCount) - 4],
        className: 'map-marker-tooltip',
      });

      marker.addTo(map);
      markers.push(marker);
    }

    return () => {
      for (const m of markers) {
        m.remove();
      }
    };
  }, [locations, selectedLocation, onLocationClick, map]);

  // Pan to selected location
  useEffect(() => {
    if (!selectedLocation) return;
    const loc = locations.find((l) => l.location === selectedLocation);
    if (loc) {
      map.panTo([loc.coordinates.lat, loc.coordinates.lng], { animate: true });
    }
  }, [selectedLocation, locations, map]);

  return null;
}

export function BarcelonaMap({ locations, selectedLocation, onLocationClick }: BarcelonaMapProps) {
  // Inject the pulse keyframe animation once
  useMemo(() => {
    if (typeof document === 'undefined') return;
    const styleId = 'marker-pulse-style';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes marker-pulse {
        0% { transform: scale(1); opacity: 0.6; }
        100% { transform: scale(1.8); opacity: 0; }
      }
      .map-marker-tooltip {
        font-family: 'Manrope', sans-serif !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        padding: 6px 12px !important;
        border-radius: 8px !important;
        background: rgba(28, 28, 24, 0.9) !important;
        color: #fff !important;
        border: none !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
      }
      .map-marker-tooltip::before {
        border-top-color: rgba(28, 28, 24, 0.9) !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      className="h-full w-full"
      zoomControl={false}
      attributionControl={true}
    >
      <TileLayer
        url={TILE_URL}
        attribution={TILE_ATTRIBUTION}
        maxZoom={19}
      />
      <MapMarkers
        locations={locations}
        selectedLocation={selectedLocation}
        onLocationClick={onLocationClick}
      />
    </MapContainer>
  );
}
