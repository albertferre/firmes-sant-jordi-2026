import { useState } from 'react';
import type { ActiveView, Signing } from './types';
import signingsData from './data/signings.json';
import { useFilters } from './hooks/useFilters';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { Filters } from './components/Filters';
import { SigningList } from './components/SigningList';
import { MapView } from './components/MapView';

const signings: Signing[] = signingsData as Signing[];

function App() {
  const [activeView, setActiveView] = useState<ActiveView>('list');
  const {
    searchText,
    setSearchText,
    locationFilter,
    setLocationFilter,
    timeSlotFilter,
    setTimeSlotFilter,
    locations,
    timeSlots,
    filtered,
  } = useFilters(signings);

  return (
    <div className="min-h-screen">
      <Header
        activeView={activeView}
        onViewChange={setActiveView}
        totalSignings={signings.length}
        filteredCount={filtered.length}
      />
      <main className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        <SearchBar value={searchText} onChange={setSearchText} />
        <Filters
          locations={locations}
          locationFilter={locationFilter}
          onLocationChange={setLocationFilter}
          timeSlots={timeSlots}
          timeSlotFilter={timeSlotFilter}
          onTimeSlotChange={setTimeSlotFilter}
        />
        {activeView === 'list' ? (
          <SigningList signings={filtered} />
        ) : (
          <MapView signings={filtered} />
        )}
      </main>
    </div>
  );
}

export default App;
