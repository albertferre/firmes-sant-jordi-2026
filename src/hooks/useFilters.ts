import { useState, useMemo } from 'react';
import type { Firma } from '../types';

export function useFilters(firmes: Firma[]) {
  const [searchText, setSearchText] = useState('');
  const [ubicacionFilter, setUbicacionFilter] = useState('');
  const [franjaFilter, setFranjaFilter] = useState('');

  const ubicacions = useMemo(() => {
    const set = new Set(firmes.map((f) => f.ubicacion));
    return Array.from(set).sort();
  }, [firmes]);

  const franjes = useMemo(
    () => [
      { label: 'Matí (9-13h)', start: '09:00', end: '13:00' },
      { label: 'Migdia (13-16h)', start: '13:00', end: '16:00' },
      { label: 'Tarda (16-20h)', start: '16:00', end: '20:00' },
    ],
    [],
  );

  const filtered = useMemo(() => {
    return firmes.filter((f) => {
      const matchesSearch =
        !searchText ||
        f.autor.toLowerCase().includes(searchText.toLowerCase()) ||
        f.libro.toLowerCase().includes(searchText.toLowerCase()) ||
        f.editorial.toLowerCase().includes(searchText.toLowerCase());

      const matchesUbicacio = !ubicacionFilter || f.ubicacion === ubicacionFilter;

      const matchesFranja =
        !franjaFilter ||
        (() => {
          const franja = franjes.find((fr) => fr.label === franjaFilter);
          if (!franja) return true;
          return f.horaInicio >= franja.start && f.horaInicio < franja.end;
        })();

      return matchesSearch && matchesUbicacio && matchesFranja;
    });
  }, [firmes, searchText, ubicacionFilter, franjaFilter, franjes]);

  return {
    searchText,
    setSearchText,
    ubicacionFilter,
    setUbicacionFilter,
    franjaFilter,
    setFranjaFilter,
    ubicacions,
    franjes,
    filtered,
  };
}
