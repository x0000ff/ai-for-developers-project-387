# Plan: Добавление i18n (EN / RU / ES) — Завершено

## Context

Приложение «Созвончик» (Vite + React SPA) содержит только русский язык — все строки захардкожены в 4 TSX-файлах. Добавлена поддержка English, Russian и Spanish с автоопределением языка из браузерного заголовка `Accept-Language` (`navigator.language`) и ручным переключателем в Footer (всегда видимом на всех страницах).

---

## Стек для i18n

`react-i18next` + `i18next` + `i18next-browser-languagedetector` — стандартный выбор для Vite + React.

---

## Шаги реализации

### 1. Установка зависимостей

```bash
cd packages/frontend
pnpm add i18next react-i18next i18next-browser-languagedetector
```

### 2. Создать файлы переводов

**`src/locales/en.json`** — английский  
**`src/locales/ru.json`** — русский (текущие строки)  
**`src/locales/es.json`** — испанский

Структура: секции `nav`, `landing`, `bookCall`, `admin`, `languageSwitcher` + `appTitle`.  
Интерполяция: `{{count}} мин` → `{{count}} min` (синтаксис i18next).  
Строка `modalDeleteEventTypeBody` использует `<bold>{{name}}</bold>` для `Trans` компонента.

### 3. Создать `src/i18n.ts`

```typescript
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ru from './locales/ru.json';
import es from './locales/es.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, ru: { translation: ru }, es: { translation: es } },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ru', 'es'],
    detection: {
      order: ['localStorage', 'navigator'], // localStorage — ручной выбор, navigator — браузер
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
```

### 4. Обновить `src/main.tsx`

- Добавить `import './i18n';` первой строкой (до других импортов)
- Добавить `useEffect` в `App` для динамического обновления `document.title`:

```typescript
function App() {
  const { t, i18n } = useTranslation();
  useEffect(() => { document.title = t('appTitle'); }, [t, i18n.language]);
  return <Routes>...</Routes>;
}
```

### 5. Создать `src/utils/locale.ts`

```typescript
const LOCALE_MAP: Record<string, string> = { en: 'en-US', ru: 'ru-RU', es: 'es-ES' };
export function getLocale(lang: string): string {
  return LOCALE_MAP[lang] ?? 'en-US';
}
```

### 6. Создать `src/components/LanguageSwitcher.tsx` и `src/components/Footer.tsx`

Три кнопки `EN / RU / ES` в стиле навбара (border `var(--border)`, активная — `var(--accent)`). Размещается в Footer, виден на всех страницах.

```typescript
import { useTranslation } from 'react-i18next';
const LANGUAGES = ['en', 'ru', 'es'] as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language;
  return (
    <div style={{ display: 'flex', gap: 2, border: '1px solid var(--border)', borderRadius: 8, padding: 2 }}>
      {LANGUAGES.map((lang) => {
        const isActive = current === lang || current.startsWith(lang);
        return (
          <button key={lang} onClick={() => i18n.changeLanguage(lang)}
            style={{
              fontSize: 12, fontWeight: 600, padding: '4px 9px', borderRadius: 6, border: 'none',
              background: isActive ? 'var(--accent)' : 'transparent',
              color: isActive ? 'white' : 'var(--fg-muted)',
              cursor: isActive ? 'default' : 'pointer',
            }}>
            {lang.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
```

### 7. Обновить компоненты

**`Navbar.tsx`**: `useTranslation()`, заменить 2 строки (логотип и кнопка админки).

**`LandingPage.tsx`**: `useTranslation()` в `LandingPage` и `EventTypeCard`, заменить ~8 строк.

**`BookCallPage.tsx`**: `useTranslation()`, заменить ~20 строк.  
Функции `formatTime`/`formatDate` переделать: принимают `locale` параметром.

```typescript
const { i18n } = useTranslation();
const locale = getLocale(i18n.language);
// Передавать locale в formatTime(iso, locale) и formatDate(iso, locale)
```

Также передать `locale={i18n.language}` в `<Calendar>` от `@mantine/dates` + импортировать `dayjs/locale/ru` и `dayjs/locale/es` в `main.tsx`.

**`AdminPage.tsx`**: `useTranslation()` в `AdminPage` и `EventTypeForm`, заменить ~35 строк. Использовать `Trans` для строки с `<strong>`:

```tsx
import { Trans } from 'react-i18next';
<Trans
  i18nKey="admin.modalDeleteEventTypeBody"
  values={{ name: deleteTarget?.name }}
  components={{ bold: <strong style={{ color: 'var(--fg)' }} /> }}
/>;
```

Те же исправления `formatDate`/`formatTime` с `getLocale`.

### 8. Обновить `index.html`

Заменить `<title>Созвончик — Забронируйте звонок. Без лишних шагов.</title>` на `<title>Sozvonchik — Book a call. No extra steps.</title>` (fallback, перезапишется в runtime).

---

## Критические файлы

- `packages/frontend/package.json` — добавить 3 зависимости
- `packages/frontend/src/main.tsx` — импорт i18n, `useEffect` для title
- `packages/frontend/src/components/Navbar.tsx` — `useTranslation`
- `packages/frontend/src/pages/LandingPage.tsx` — ~8 строк
- `packages/frontend/src/pages/BookCallPage.tsx` — ~20 строк + locale
- `packages/frontend/src/pages/AdminPage.tsx` — ~35 строк + locale + `Trans`
- `packages/frontend/index.html` — title fallback

## Новые файлы

- `packages/frontend/src/i18n.ts`
- `packages/frontend/src/locales/en.json`
- `packages/frontend/src/locales/ru.json`
- `packages/frontend/src/locales/es.json`
- `packages/frontend/src/utils/locale.ts`
- `packages/frontend/src/components/LanguageSwitcher.tsx`
- `packages/frontend/src/components/Footer.tsx`

---

## Проверка

✅ **Завершено:**

1. Установлены зависимости i18next и созданы 3 JSON-файла переводов
2. Инициализирована i18n в `main.tsx` с автоопределением языка
3. Переведены 4 компонента и все строки текста
4. Переключатель языков добавлен в Footer (всегда видимый)
5. Даты/времена используют динамическую локаль
6. Calendar использует правильную локаль для названий месяцев
7. TypeScript компиляция успешна: `pnpm typecheck` ✓

**Как использовать:**

1. `pnpm dev` — открыть браузер → по умолчанию определится язык из `navigator.language`
2. Нажать на EN/RU/ES кнопку внизу страницы → язык меняется, сохраняется в localStorage
3. Перезагрузить → язык восстанавливается
4. Очистить localStorage → язык снова определится из браузера
