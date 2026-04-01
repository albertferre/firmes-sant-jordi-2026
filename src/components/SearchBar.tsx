import { useI18n } from '../i18n/I18nContext';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const { t } = useI18n();

  return (
    <div className="relative group">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <span className="material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">
          search
        </span>
      </div>
      <input
        type="text"
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchPlaceholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-lowest dark:bg-on-surface/10 border-none py-4 pl-12 pr-10 rounded-xl shadow-sm text-sm font-body text-on-surface dark:text-surface-highest placeholder:text-tertiary/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-3 flex items-center"
          aria-label="Esborrar cerca"
        >
          <span className="material-symbols-outlined text-lg text-tertiary/50 hover:text-primary transition-colors">close</span>
        </button>
      )}
    </div>
  );
}
