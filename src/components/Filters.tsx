interface FiltersProps {
  ubicacions: string[];
  ubicacionFilter: string;
  onUbicacioChange: (val: string) => void;
  franjes: { label: string }[];
  franjaFilter: string;
  onFranjaChange: (val: string) => void;
}

export function Filters({
  ubicacions,
  ubicacionFilter,
  onUbicacioChange,
  franjes,
  franjaFilter,
  onFranjaChange,
}: FiltersProps) {
  const selectClass =
    'px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rosa focus:border-transparent';

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={ubicacionFilter}
        onChange={(e) => onUbicacioChange(e.target.value)}
        className={selectClass}
      >
        <option value="">Totes les ubicacions</option>
        {ubicacions.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
      <select
        value={franjaFilter}
        onChange={(e) => onFranjaChange(e.target.value)}
        className={selectClass}
      >
        <option value="">Totes les hores</option>
        {franjes.map((f) => (
          <option key={f.label} value={f.label}>
            {f.label}
          </option>
        ))}
      </select>
    </div>
  );
}
