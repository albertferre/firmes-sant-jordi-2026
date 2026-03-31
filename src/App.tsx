import { useMemo, useState } from 'react';
import type { ActiveView, Signing } from './types';
import signingsData from './data/signings.json';
import { useFilters } from './hooks/useFilters';
import { useFavorites } from './hooks/useFavorites';
import { useDarkMode } from './hooks/useDarkMode';
import { useI18n } from './i18n/I18nContext';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { Filters } from './components/Filters';
import { SigningList } from './components/SigningList';
import { MapView } from './components/MapView';
import { BottomNav } from './components/BottomNav';

const signings: Signing[] = signingsData as Signing[];

function App() {
  const [activeView, setActiveView] = useState<ActiveView>('list');
  const { favoriteIds, toggleFavorite, isFavorite } = useFavorites();
  const { theme, toggleTheme } = useDarkMode();
  const { t } = useI18n();
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
    <div className="min-h-screen bg-surface dark:bg-on-surface transition-colors">
      {/* Noise texture */}
      <div className="fixed inset-0 noise-overlay z-0" />

      <Header
        totalSignings={signings.length}
        filteredCount={filtered.length}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="relative z-10 pt-[72px] pb-24 px-6 max-w-2xl mx-auto">
        {activeView === 'favorites' && (
          <section className="mb-8 mt-4">
            <h2 className="font-headline text-4xl italic text-primary leading-tight">
              {t('myAgenda')}
            </h2>
            <p className="font-body text-sm text-tertiary mt-1 tracking-wide">
              {t('myAgendaHint')}
            </p>
          </section>
        )}

        {activeView !== 'favorites' && activeView !== 'map' && (
          <section className="space-y-4 mt-4 mb-6">
            <SearchBar value={searchText} onChange={setSearchText} />
            <Filters
              locations={locations}
              locationFilter={locationFilter}
              onLocationChange={setLocationFilter}
              timeSlots={timeSlots}
              timeSlotFilter={timeSlotFilter}
              onTimeSlotChange={setTimeSlotFilter}
            />
          </section>
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

      <BottomNav
        activeView={activeView}
        onViewChange={setActiveView}
        favoritesCount={favoriteIds.size}
      />
    </div>
  );
}

export default App;
