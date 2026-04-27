import { useTranslation } from 'react-i18next';

const LANGUAGES = ['en', 'ru', 'es'] as const;
type Lang = (typeof LANGUAGES)[number];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language;

  function handleChange(lang: Lang) {
    i18n.changeLanguage(lang);
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 2,
        background: 'transparent',
      }}
    >
      {LANGUAGES.map((lang) => {
        const isActive = current === lang || current.startsWith(lang);
        return (
          <button
            key={lang}
            onClick={() => handleChange(lang)}
            style={{
              fontFamily: 'var(--font)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.03em',
              padding: '4px 9px',
              borderRadius: 6,
              border: 'none',
              background: isActive ? 'var(--accent)' : 'transparent',
              color: isActive ? 'white' : 'var(--fg-muted)',
              cursor: isActive ? 'default' : 'pointer',
              transition: 'background 0.12s ease, color 0.12s ease',
            }}
            aria-pressed={isActive}
            aria-label={`Switch to ${lang.toUpperCase()}`}
          >
            {lang.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
