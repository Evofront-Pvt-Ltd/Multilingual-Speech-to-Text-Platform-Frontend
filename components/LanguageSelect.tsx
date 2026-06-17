'use client';

import { LANGUAGES } from '@/lib/languages';

interface LanguageSelectProps {
  label: string;
  value: string;
  onChange: (code: string) => void;
  exclude?: string;
  disabled?: boolean;
}

export default function LanguageSelect({
  label,
  value,
  onChange,
  exclude,
  disabled = false,
}: LanguageSelectProps) {
  const options = exclude
    ? LANGUAGES.filter((l) => l.code !== exclude)
    : LANGUAGES;

  return (
    <div className="form-group">
      <label>{label}</label>
      <select
        className="select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {options.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name} ({lang.nativeName})
          </option>
        ))}
      </select>
    </div>
  );
}
