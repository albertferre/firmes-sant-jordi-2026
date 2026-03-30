import type { Firma } from '../types';
import { FirmaCard } from './FirmaCard';

interface FirmaListProps {
  firmes: Firma[];
}

export function FirmaList({ firmes }: FirmaListProps) {
  if (firmes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No s'han trobat firmes</p>
        <p className="text-sm mt-1">Prova a canviar els filtres de cerca</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {firmes.map((firma) => (
        <FirmaCard key={firma.id} firma={firma} />
      ))}
    </div>
  );
}
