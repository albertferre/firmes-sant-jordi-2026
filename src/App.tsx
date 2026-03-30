import { useState } from 'react';
import type { VistaActiva } from './types';
import type { Firma } from './types';
import firmesData from './data/firmes.json';
import { useFilters } from './hooks/useFilters';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { Filters } from './components/Filters';
import { FirmaList } from './components/FirmaList';
import { MapView } from './components/MapView';

const firmes: Firma[] = firmesData as Firma[];

function App() {
  const [vista, setVista] = useState<VistaActiva>('lista');
  const {
    searchText,
    setSearchText,
    ubicacionFilter,
    setUbicacionFilter,
    franjaFilter,
    setFranjaFilter,
    ubicacions,
    franjes,
    filtered,
  } = useFilters(firmes);

  return (
    <div className="min-h-screen">
      <Header
        vista={vista}
        onCanviVista={setVista}
        totalFirmes={firmes.length}
        filtrades={filtered.length}
      />
      <main className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        <SearchBar value={searchText} onChange={setSearchText} />
        <Filters
          ubicacions={ubicacions}
          ubicacionFilter={ubicacionFilter}
          onUbicacioChange={setUbicacionFilter}
          franjes={franjes}
          franjaFilter={franjaFilter}
          onFranjaChange={setFranjaFilter}
        />
        {vista === 'lista' ? (
          <FirmaList firmes={filtered} />
        ) : (
          <MapView firmes={filtered} />
        )}
      </main>
    </div>
  );
}

export default App;
