import type { Firma } from '../types';

interface FirmaCardProps {
  firma: Firma;
}

export function FirmaCard({ firma }: FirmaCardProps) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${firma.coordenadas.lat},${firma.coordenadas.lng}`;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        <div className="shrink-0 w-12 h-12 bg-rosa/10 rounded-lg flex items-center justify-center">
          <span className="text-rosa font-bold text-lg">
            {firma.autor.charAt(0)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{firma.autor}</h3>
          <p className="text-sm text-rosa font-medium truncate">{firma.libro}</p>
          <p className="text-xs text-gray-500 mt-0.5">{firma.editorial}</p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {firma.horaInicio} - {firma.horaFin}
            </span>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-gray-600 hover:text-rosa transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {firma.ubicacion}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
