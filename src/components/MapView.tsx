import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Firma } from '../types';

// Fix default marker icon issue with bundlers
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
  firmes: Firma[];
}

export function MapView({ firmes }: MapViewProps) {
  const center: [number, number] = [41.3874, 2.1686];

  return (
    <div className="h-[calc(100vh-220px)] min-h-[400px] rounded-xl overflow-hidden shadow-sm border border-gray-100">
      <MapContainer center={center} zoom={14} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {firmes.map((firma) => (
          <Marker
            key={firma.id}
            position={[firma.coordenadas.lat, firma.coordenadas.lng]}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold">{firma.autor}</p>
                <p className="text-rosa">{firma.libro}</p>
                <p className="text-gray-500 text-xs">{firma.editorial}</p>
                <p className="mt-1">
                  {firma.horaInicio} - {firma.horaFin}
                </p>
                <p className="text-xs text-gray-600">{firma.ubicacion}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
