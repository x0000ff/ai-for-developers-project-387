# DESIGN.md

Design system reference for the "Созвончик 🤙" frontend.

## Color Palette (CSS variables in `global.css`)

| Variable         | Value                       | Usage                           |
| ---------------- | --------------------------- | ------------------------------- |
| `--bg`           | `#f2ede6`                   | Page background (warm beige)    |
| `--bg-nav`       | `rgba(242, 237, 230, 0.85)` | Navbar (semi-transparent)       |
| `--border`       | `#d9d0c4`                   | Borders, dividers               |
| `--fg`           | `#1c1917`                   | Primary text (warm near-black)  |
| `--fg-muted`     | `#78716c`                   | Secondary / hint text           |
| `--accent`       | `#c97a1a`                   | Amber — CTAs, icons, badges     |
| `--accent-hover` | `#a86015`                   | Hover state for accent          |
| `--accent-fg`    | `#ffffff`                   | Text/icons on accent background |

Always use these variables — never hardcode colors.

## Typography

- Font: **DM Sans** via `var(--font)` — always set `fontFamily: 'var(--font)'`
- Headings: `fontWeight: 700`, `letterSpacing: '-0.04em'`
- Body: `fontWeight: 400`, `fontSize: 14–16`
- UI labels / buttons: `fontWeight: 500–600`, `letterSpacing: '-0.01em'` to `'-0.02em'`
- Hero headline: responsive with `clamp()` — e.g. `clamp(3rem, 7.5vw, 5.5rem)`

## Layout

- Max content width: `1200px`, centered with `margin: '0 auto'`
- Side padding: `24px`
- Navbar height: `64px`; main area min-height: `calc(100vh - 64px)`
- Full-page sections: `minHeight: '100vh'`

## Components

**Navbar (`Navbar.tsx`)**

- Sticky, `top: 0`, `zIndex: 100`
- `borderBottom: '1px solid var(--border)'`, backdrop blur (`blur(10px)`)
- Logo: 36×36 accent square (`borderRadius: 8`), white lucide icon inside
- Nav buttons: outlined (`nav-btn-outline`) or accent (`nav-btn-accent`) CSS classes

**Buttons**

- `display: 'inline-flex'`, `alignItems: 'center'`, `gap: 10`
- `borderRadius: 8`, `padding: '14px 28px'` (primary) / `'10px 20px'` (secondary)
- Always include a lucide icon alongside text
- Primary CTA: `background: 'var(--accent)'`, `color: 'var(--accent-fg)'`, class `cta-btn`
- Hover/active states are handled via CSS classes in `landing.css`

**Icon Boxes**

- Page hero icons: 64×64, `borderRadius: 16`, accent background, white icon (size 28)
- Navbar logo icon: 36×36, `borderRadius: 8`, accent background, white icon (size 18)
- Success state: large circle (64×64) with checkmark icon

**Badge / Tag**

- `border: '1px solid var(--accent)'`, `borderRadius: 6`, `padding: '5px 12px'`
- `fontSize: 11`, `fontWeight: 600`, `letterSpacing: '0.09em'`, `textTransform: 'uppercase'`
- Include a small lucide icon (size 11) before text
- Active tab badge: solid accent background with white text

**Modal / Dialog**

- `borderRadius: 12`, `padding: '32px'`, white background with subtle shadow
- Close button (X icon, 20px) in top-right corner
- Title: large, bold heading
- Form fields have labels above, `padding: '12px 14px'`, `border: '1px solid var(--border)'`
- Action buttons at bottom: "Отмена" (outlined) + "Сохранить" (accent primary)

**Date Picker**

- Calendar grid with month/year header and navigation arrows
- Days in gray text, weekend dates in muted color
- Selected date: accent background with white text
- Disabled dates (>14 days ahead): very light gray, not clickable
- Layout: centered grid of 7 columns × 6 rows

**Time Slots**

- Grid layout (5 columns × multiple rows for responsive)
- Each slot: `borderRadius: 6`, `border: '1px solid var(--border)'`, `padding: '12px'`
- Available slot: `background: white`, `cursor: pointer`
- Selected slot: `background: var(--accent)`, `color: white`
- Disabled/unavailable: `background: very light gray`, `opacity: 0.5`
- Hover state: subtle background change

**Form Fields**

- Label text: `fontSize: 14`, `fontWeight: 600`, `color: var(--fg)`, red asterisk for required
- Input: `borderRadius: 6`, `border: '1px solid var(--border)'`, `padding: '12px 14px'`
- Input focus: `outline: none`, `border-color: var(--accent)`, `box-shadow: 0 0 0 2px rgba(201,122,26,0.1)`
- Textarea/input types: max-width `100%`, `fontFamily: inherit`
- Helper text: `fontSize: 12`, `color: var(--fg-muted)`

**Admin Table / List**

- Header row: `background: #fafaf7` (very light gray), bold text
- Data rows: `border-bottom: '1px solid var(--border)'`, `padding: '14px'`
- Action icons (edit, delete): size 16, `color: var(--fg-muted)`, hover to darker
- Delete icon: red/warning color on hover
- Tab navigation: accent background on active tab, muted text on inactive

**Feature Cards** (service offerings on landing)

- `borderRadius: 12`, `background: white`, `padding: '24px'`
- Each card: icon (small), heading, description, primary CTA button
- Card hover: subtle lift/shadow (if animation desired)

## Animations

- Entrance animation: `fadeUp` keyframe (defined in `landing.css`) — fades in + slides up 16px
- Apply via inline style: `animation: 'fadeUp 0.45s ease both'`
- Stagger delays across elements: `0ms → 80ms → 240ms → 320ms`

## Icons

Use **lucide-react** exclusively. Common icon sizes: 11 (badge), 14–15 (body/nav), 16–18 (buttons/logo), 28 (page heroes). Always set `strokeWidth={2}` or `strokeWidth={1.75}`.

## Page Patterns

**Landing (`LandingPage.tsx`)** — hero layout, left-aligned, vertically centered:
`Badge → H1 (clamp size) → CTA button → Feature row (3 service cards with icons + CTAs)`

**Booking Flow** (`BookCallPage.tsx` or modal)

- Multi-step modal/form overlay:
  1. **Event Type Selection** — list/dropdown of available services (30 min Консультация, etc.)
  2. **Date Picker** — calendar limiting to next 14 days, grayed-out unavailable dates
  3. **Time Slots** — grid of available times for selected date (10:00, 11:30, 12:00, etc.)
  4. **User Data** — form fields: Name (required), Email (required), with error/helper text
  5. **Confirmation** — success icon (checkmark in circle), summary of booking details, "Вернуться на главную" button

**Admin – Event Types** (`AdminPage.tsx`, tab: Типы встреч)

- Sticky header with "Создать" (create new) button
- Two-column tab nav: "Предстоящие встречи" | "Типы встреч" (active tab highlighted)
- Table with columns: ДЛИТЕЛЬНОСТЬ | НАЗВАНИЕ | ОПИСАНИЕ | edit/delete actions
- Edit modal on icon click: fields for name, duration (minutes dropdown), description
- Empty state message centered on page

**Admin – Bookings** (`AdminPage.tsx`, tab: Предстоящие встречи)

- Same header & tab nav as event types
- Table with columns: ДАТА | ВРЕМЯ | ТИП ВСТРЕЧИ | ГОСТЬ | EMAIL
- Rows show booking data with delete action
- Empty state: "Практически встреч нет." centered

**Placeholder pages** (e.g., 404, error states) — centered both axes:
`Icon box (64×64) → H1 → muted paragraph → "Go home" link`

All pages wrap content in `<Navbar />` + `<main>` with the standard max-width container.
