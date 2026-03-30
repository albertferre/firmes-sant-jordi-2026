import { useMemo, useState } from 'react';
import type { ActiveView, Signing } from './types';
import signingsData from './data/signings.json';
import { useFilters } from './hooks/useFilters';
import { useFavorites } from './hooks/useFavorites';
import { useDarkMode } from './hooks/useDarkMode';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { Filters } from './components/Filters';
import { SigningList } from './components/SigningList';
import { MapView } from './components/MapView';

const signings: Signing[] = signingsData as Signing[];

function App() {
  const [activeView, setActiveView] = useState<ActiveView>('list');
  const { favoriteIds, toggleFavorite, isFavorite } = useFavorites();
  const { theme, toggleTheme } = useDarkMode();
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

  const favoriteSignings = useMemo(
    () => signings.filter((s) => favoriteIds.has(s.id)),
    [favoriteIds],
  );

  const displayedSignings = activeView === 'favorites' ? favoriteSignings : filtered;

  return (
    <div className="min-h-screen bg-[#faf5f0] dark:bg-[#1a1a2e] transition-colors">
      <Header
        activeView={activeView}
        onViewChange={setActiveView}
        totalSignings={signings.length}
        filteredCount={filtered.length}
        favoritesCount={favoriteIds.size}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        {activeView !== 'favorites' && (
          <>
            <SearchBar value={searchText} onChange={setSearchText} />
            <Filters
              locations={locations}
              locationFilter={locationFilter}
              onLocationChange={setLocationFilter}
              timeSlots={timeSlots}
              timeSlotFilter={timeSlotFilter}
              onTimeSlotChange={setTimeSlotFilter}
            />
          </>
        )}
        {activeView === 'map' ? (
          <MapView signings={displayedSignings} />
        ) : (
          <SigningList
            signings={displayedSignings}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
            emptyStateType={activeView === 'favorites' ? 'noFavorites' : 'noResults'}
          />
        )}
      </main>
    </div>
  );
}

export default App;
