import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'EN' },
  { code: 'hi', name: 'Hindi', native: 'हि' },
  { code: 'kn', name: 'Kannada', native: 'ಕ' },
  { code: 'ta', name: 'Tamil', native: 'த' },
  { code: 'te', name: 'Telugu', native: 'తె' }
];

export default function LanguageSelector({ currentLang, onChange }) {
  return (
    <div className="flex items-center gap-1.5 bg-bg-elevated border border-border rounded-lg px-2.5 py-1.5 hover:bg-bg-hover transition-colors cursor-pointer">
      <Globe size={14} className="text-text-tertiary" />
      <select
        value={currentLang}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-text-secondary text-xs font-medium focus:outline-none cursor-pointer"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-bg-elevated text-text-primary">
            {lang.native} ({lang.name})
          </option>
        ))}
      </select>
    </div>
  );
}
