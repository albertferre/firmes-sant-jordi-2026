import { useMemo, useState, useCallback, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import type { ActiveView, AuthorIndex, AuthorInfo, Signing } from './types';
import signingsData from './data/signings.json';
import authorsIndexRaw from './data/authors-index.json';
import { useFilters } from './hooks/useFilters';
import { useFavorites } from './hooks/useFavorites';
import { useDarkMode } from './hooks/useDarkMode';
import { useI18n } from './i18n/I18nContext';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { Filters } from './components/Filters';
import { SigningList } from './components/SigningList';
import { BottomNav } from './components/BottomNav';
import { FeaturedCards } from './components/FeaturedCards';
import { AuthorDetail } from './components/AuthorDetail';

const signings: Signing[] = signingsData as Signing[];
const authorsIndex: Record<string, AuthorIndex> = authorsIndexRaw as unknown as Record<string, AuthorIndex>;

function App() {
  const [activeView, setActiveView] = useState<ActiveView>('list');
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [authorsDetail, setAuthorsDetail] = useState<Record<string, AuthorInfo>>({});
  const detailLoadedRef = useRef(false);
  const { favoriteIds, toggleFavorite } = useFavorites();
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

  const loadAuthorsDetail = useCallback(async () => {
    if (detailLoadedRef.current) return;
    detailLoadedRef.current = true;
    try {
      const res = await fetch('/data/authors.json');
      const data = await res.json();
      setAuthorsDetail(data as Record<string, AuthorInfo>);
    } catch (err) {
      console.error('Failed to load author details:', err);
      detailLoadedRef.current = false;
    }
  }, []);

  const handleAuthorClick = useCallback((authorName: string) => {
    setSelectedAuthor(authorName);
    setActiveView('author');
    loadAuthorsDetail();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [loadAuthorsDetail]);

  const handleBackFromAuthor = useCallback(() => {
    setSelectedAuthor(null);
    setActiveView('list');
  }, []);

  const handleViewChange = useCallback((view: ActiveView) => {
    if (view !== 'author') {
      setSelectedAuthor(null);
    }
    if (view !== 'list') {
      setSearchText('');
    }
    setActiveView(view);
  }, [setSearchText]);

  const favoriteSignings = useMemo(
    () => signings.filter((s) => favoriteIds.has(s.id)),
    [favoriteIds],
  );

  const displayedSignings = activeView === 'favorites' ? favoriteSignings : filtered;

  const authorInfo = selectedAuthor ? authorsDetail[selectedAuthor] ?? null : null;

  return (
    <div className="min-h-screen transition-colors overflow-x-hidden">
      {/* Noise texture */}
      <div className="fixed inset-0 noise-overlay z-0" />

      {/* Bookmark ribbon - desktop only */}
      <div className="hidden lg:block fixed top-0 left-3 w-8 h-32 z-[60] shadow-xl bookmark-ribbon" aria-hidden="true">
        <div className="flex flex-col items-center pt-6 text-on-primary">
          <span className="material-symbols-outlined text-sm">local_florist</span>
          <div className="w-[1px] h-16 bg-on-primary/30" />
        </div>
      </div>

      <Header
        activeView={activeView}
        onViewChange={handleViewChange}
        totalSignings={signings.length}
        filteredCount={filtered.length}
        favoritesCount={favoriteIds.size}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="relative z-10 pt-[72px] pb-24 lg:pb-8">
        {/* Hero Section - only on list view */}
        {activeView === 'list' && (
          <section className="relative overflow-hidden mb-8 lg:mb-12">
            <div className="absolute inset-0 hero-gradient" />
            <div className="relative px-6 lg:px-12 py-10 lg:py-20 max-w-screen-2xl mx-auto">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 bg-jordi-green/10 text-jordi-green px-4 py-1.5 rounded-full text-xs font-body font-medium tracking-tight uppercase">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  {t('subtitle')}
                </div>
                <h2 className="font-headline text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-on-surface dark:text-surface-highest mb-6 leading-[1.1] tracking-tight italic">
                  La Diada de <br />
                  <span className="text-primary font-bold not-italic">Sant Jordi</span>
                </h2>
                <div className="max-w-xl">
                  <SearchBar value={searchText} onChange={setSearchText} />
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="px-6 lg:px-12 max-w-screen-2xl mx-auto">
          {/* Author detail view */}
          {activeView === 'author' && selectedAuthor && (
            <AuthorDetail
              author={authorInfo}
              authorName={selectedAuthor}
              signings={signings}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              onBack={handleBackFromAuthor}
            />
          )}

          {/* Favorites header */}
          {activeView === 'favorites' && (
            <section className="mb-8 mt-4">
              <h2 className="font-headline text-4xl lg:text-5xl italic text-primary leading-tight">
                {t('myAgenda')}
              </h2>
              <p className="font-body text-sm text-tertiary mt-1 tracking-wide">
                {t('myAgendaHint')}
              </p>
            </section>
          )}

          {/* Filters - below hero on list view */}
          {activeView === 'list' && (
            <section className="mb-6">
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

          {/* Content */}
          {activeView !== 'author' ? (
            <>
              {/* Featured cards - on list view, dynamic with filters */}
              {activeView === 'list' && !searchText && (
                <FeaturedCards
                  signings={filtered}
                  authorsData={authorsIndex}
                  onToggleFavorite={toggleFavorite}
                  favoriteIds={favoriteIds}
                  onAuthorClick={handleAuthorClick}
                />
              )}

              {/* Section header for upcoming signings */}
              {activeView === 'list' && (
                <h2 className="font-headline text-3xl lg:text-4xl text-on-surface dark:text-surface-highest mb-6">
                  <span className="text-jordi-green mr-1">&mdash;</span> {t('upcomingSignings')}
                </h2>
              )}

              <SigningList
                signings={displayedSignings}
                authorsData={authorsIndex}
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
                onAuthorClick={handleAuthorClick}
                emptyStateType={activeView === 'favorites' ? 'noFavorites' : 'noResults'}
              />
            </>
          ) : null}
        </div>
      </main>

      {/* Footer - desktop only */}
      <footer className="hidden lg:block relative z-10 w-full py-12 border-t border-jordi-green/15">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 gap-6 max-w-screen-2xl mx-auto">
          <div className="text-primary opacity-40 font-headline italic text-xl">
            Sant Jordi 2026
          </div>
          <div className="text-tertiary/40 font-body text-[10px] tracking-widest uppercase text-center md:text-right">
            Barcelona &middot; 23 d&apos;abril &middot; UNESCO City of Literature
          </div>
        </div>
      </footer>

      {/* Bottom nav - mobile only */}
      <BottomNav
        activeView={activeView}
        onViewChange={handleViewChange}
        favoritesCount={favoriteIds.size}
      />
      <Analytics />
    </div>
  );
}

export default App;
