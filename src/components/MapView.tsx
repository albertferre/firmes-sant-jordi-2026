import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Signing } from '../types';

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
  const center: [number, number] = [41.3874, 2.1686];

  return (
    <div className="h-[calc(100vh-220px)] min-h-[400px] rounded-xl overflow-hidden shadow-sm border border-gray-100">
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
              <div className="text-sm">
                <p className="font-bold">{signing.author}</p>
                <p className="text-rosa">{signing.book}</p>
                <p className="text-gray-500 text-xs">{signing.publisher}</p>
                <p className="mt-1">
                  {signing.startTime} - {signing.endTime}
                </p>
                <p className="text-xs text-gray-600">{signing.location}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
