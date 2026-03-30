import type { VistaActiva } from '../types';

interface HeaderProps {
  vista: VistaActiva;
  onCanviVista: (vista: VistaActiva) => void;
  totalFirmes: number;
  filtrades: number;
}

export function Header({ vista, onCanviVista, totalFirmes, filtrades }: HeaderProps) {
  return (
    <header className="bg-rosa text-white shadow-lg">
      <div className="max-w-5xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Firmes Sant Jordi 2026
            </h1>
            <p className="text-rose-100 text-sm mt-1">
              Barcelona &middot; 23 d'abril &middot;{' '}
              {filtrades === totalFirmes
                ? `${totalFirmes} firmes`
                : `${filtrades} de ${totalFirmes} firmes`}
            </p>
          </div>
          <div className="flex gap-1 bg-rosa-dark rounded-lg p-1">
            <button
              onClick={() => onCanviVista('lista')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                vista === 'lista'
                  ? 'bg-white text-rosa'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Llista
            </button>
            <button
              onClick={() => onCanviVista('mapa')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                vista === 'mapa'
                  ? 'bg-white text-rosa'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Mapa
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
