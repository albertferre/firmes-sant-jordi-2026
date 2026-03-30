import { useState, useCallback } from 'react';

const STORAGE_KEY = 'favorites';

function loadFavorites(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch { /* ignore */ }
  return new Set();
}

function saveFavorites(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(loadFavorites);

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (id: string) => favoriteIds.has(id),
    [favoriteIds],
  );

  return { favoriteIds, toggleFavorite, isFavorite };
}
