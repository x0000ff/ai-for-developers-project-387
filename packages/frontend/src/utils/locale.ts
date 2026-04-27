const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  es: 'es-ES',
};

export function getLocale(lang: string): string {
  return LOCALE_MAP[lang] ?? 'en-US';
}
