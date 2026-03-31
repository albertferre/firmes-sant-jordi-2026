import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Signing } from '../types';
import { useI18n } from '../i18n/I18nContext';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

interface MapViewProps {
  signings: Signing[];
}

export function MapView({ signings }: MapViewProps) {
  const { t } = useI18n();
  const center: [number, number] = [41.3874, 2.1686];

  return (
    <div className="h-[calc(100vh-180px)] min-h-[400px] overflow-hidden">
      <MapContainer center={center} zoom={14} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {signings.map((signing) => (
          <Marker
            key={signing.id}
            position={[signing.coordinates.lat, signing.coordinates.lng]}
          >
            <Popup>
              <div className="font-body text-sm min-w-[180px]">
                <p className="font-headline text-base font-bold italic text-on-surface">{signing.author}</p>
                {signing.book && <p className="text-primary text-xs font-semibold mt-0.5">{signing.book}</p>}
                {signing.publisher && <p className="text-tertiary text-[11px] uppercase tracking-wider">{signing.publisher}</p>}
                <div className="mt-2 pt-2 border-t border-outline-variant/20 space-y-1">
                  <p className="flex items-center gap-1 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    {signing.startTime && signing.endTime
                      ? `${signing.startTime} - ${signing.endTime}`
                      : t('tbaTime')}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    {signing.location || t('tbaLocation')}
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
