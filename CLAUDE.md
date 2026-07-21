# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm start                # start dev server (choose platform interactively)
npm run android          # open on Android emulator
npm run ios              # open on iOS simulator
npm run web              # open in browser
npm run lint             # ESLint via expo lint
npx expo start --clear  # always use after changing theme/config/fonts
```

## Design source of truth

Stitch project **`15722671644706642579`** ("TinyPayroll Mobile UI Design") — pull screens via MCP before building any screen.

Design system: **"Calm Precision"**
- Font: Inter (headings + body), Geist (numeric data)
- Primary: Ink Indigo `#1a1f2c`
- Gold `#d4af37` — money values, active tab, primary CTAs
- Light bg: `#f8f9ff`, surface: `#ffffff`
- Dark bg: `#0d0f14`, dark surface: `#161a24`
- Border radius: 14–18px cards, 10–12px buttons/inputs, pill (`9999`) for chips

## Dark mode

**All screens must support both light and dark mode.** Styling is done with **NativeWind v4** (Tailwind classes). Dark mode uses the `dark:` variant, which follows the system `useColorScheme` automatically — never build a manual light/dark hook for colors in JSX.

Design tokens are defined in `tailwind.config.js` as light/dark pairs. Use them via className:

| Purpose | className |
|---------|-----------|
| app bg | `bg-canvas-light dark:bg-canvas-dark` |
| surface/card | `bg-surface-light dark:bg-surface-dark` |
| surface-low | `bg-surface-low-light dark:bg-surface-low-dark` |
| primary text | `text-text-light dark:text-text-dark` (AppText default) |
| muted text | `text-muted-light dark:text-muted-dark` |
| placeholder | `text-placeholder-light dark:text-placeholder-dark` |
| border | `border-border-light dark:border-border-dark` |
| ink (mode-invariant) | `bg-ink` / `text-ink` |
| gold (mode-invariant) | `bg-gold` / `text-gold` |
| gold tint bg | `bg-gold-bg-light dark:bg-gold-bg-dark` |

**Font: Roboto** for all UI text, **JetBrains Mono** for numeric/currency data. The legacy `font-inter*` / `font-jakarta*` classes are repointed to Roboto weights in `tailwind.config.js` (400/500/600/700/800), so existing className usage keeps working — you don't have to rename classes across screens. `font-geist`/`font-mono` → JetBrains Mono. Radius: `rounded-card` (14), `rounded-card-lg` (18), `rounded-input` (10), `rounded-button` (12), `rounded-full` (pills).

### Shared UI components — `src/components/ui/`

Prefer these over raw primitives:
- `<Screen variant="canvas"|"surface" edges={...}>` — SafeAreaView + standard background
- `<Card variant="surface"|"ink">` — bakes in border, radius, and the correct shadow. Do **not** re-add borders/shadows on a Card.
- `<AppText className="...">` — defaults to Roboto + primary text color
- `<Divider />` — hairline separator
- `<TopBar title variant="surface"|"glass" onSettings? onNotifications? />` — the shared header for all 5 tab screens. Renders a hamburger (☰) that opens the sidebar via `useSidebar().open()`, the TP badge + title, and optional bell/gear on the right. Use `variant="glass"` for the Dashboard's translucent bar. Do **not** hand-roll a tab header — use this so all tabs stay consistent.
- `<SidebarProvider>` + `useSidebar()` — the slide-in drawer. `SidebarProvider` wraps `<Tabs>` (in `app/(tabs)/_layout.tsx`, inside `AuthProvider`); it opens on hamburger tap or a left-edge swipe, closes on backdrop tap / drag. NAV array is extensible (Dashboard, Business Settings, Org Catalog today); Log Out pinned at the bottom calls `signOut`. Requires `GestureHandlerRootView` at the app root (already wired in `app/_layout.tsx`).
- `usePalette()` → `P` — raw hex values for things that **cannot** take a className: Ionicons `color`, native `style` props, `placeholderTextColor`, StatusBar, and `P.status.*` (attendance).
- `useShadows()` → `{ card, hero }` — apply via `style` on a non-Card `View`.
- `pressScale` — `style={pressScale}` for press-in scale on tappable Pressables.

### Shadow rules
- Surface/white cards → use `<Card>` (or `style={useShadows().card}` on a raw View)
- Ink hero cards + primary CTAs → `<Card variant="ink">` (or `style={useShadows().hero}`) — gold glow
- Press-in effect on tappable cards: `style={pressScale}` (scales to 0.97 when pressed)

### Attendance status colours
Status cell backgrounds must be **saturated in dark mode** (not pastels — they're invisible on `#161a24`). These come from `usePalette().status` (applied via `style`, not className, so dark values stay saturated):

```ts
status: {
  present: { bg: dark ? '#166534' : '#dcfce7', dot: '#16a34a', text: dark ? '#ffffff' : '#15803d' },
  absent:  { bg: dark ? '#991b1b' : '#fee2e2', dot: '#dc2626', text: dark ? '#ffffff' : '#dc2626' },
  leave:   { bg: dark ? '#854d0e' : '#fef9c3', dot: '#ca8a04', text: dark ? '#ffffff' : '#92400e' },
  holiday: { bg: dark ? '#1e3a5f' : '#dbeafe', dot: '#3b82f6', text: dark ? '#ffffff' : '#1d4ed8' },
  weekend: { bg: 'transparent', dot: 'transparent', text: '' },
}
```

## Architecture

Expo 54, expo-router (file-based routing), React 19, React Native 0.81, **NativeWind v4** (Tailwind) for styling, New Architecture enabled.

**Path alias:** `@/` → repo root.

### Routing — `app/`

```
app/
  _layout.tsx           # Root Stack — imports global.css, Roboto + JetBrains Mono fonts,
                        #   GestureHandlerRootView wrapper (for sidebar swipe),
                        #   DarkTheme/DefaultTheme from @react-navigation/native,
                        #   scheme-aware headerStyle on all Stack screens, StatusBar style auto
  (tabs)/
    _layout.tsx         # 5 bottom tabs — Ionicons, active tint = gold #d4af37, scheme-aware bg/border
    index.tsx           # Dashboard ✅
    employees.tsx       # Employees list ✅
    attendance.tsx      # Attendance Calendar ✅
    payroll.tsx         # Payroll runs list ✅
    reports.tsx         # Reports + export ✅
  activity.tsx          # All Activity ✅ (full audit feed, paginated "Show more" + skeleton rows; opened from the Dashboard's "Recent Activity" button)
  employees/
    add.tsx             # Add Employee modal ✅ (dept/role via ComboBox off the catalog, create-on-the-fly)
    edit.tsx            # Edit Employee ✅
    [id].tsx            # Employee detail ✅
  payroll/
    review.tsx          # Review Payroll ✅ (success overlay = absolute View, NOT Modal/Sheet)
    payslip.tsx         # Payslip ✅
    payslips.tsx        # Payslips list ✅
  settings/
    business.tsx        # Business Configuration ✅ (reached via ⚙ gear on Dashboard top bar)
    catalog.tsx         # Org Catalog — departments & designations CRUD ✅ (reached via sidebar)
```

Payroll runs can be created for any past/future month (period picker sheet) and soft-deleted (trash icon → confirm sheet). Create/delete errors surface in a centered popup, not inline banners.

### `src/` — all non-route code

```
src/
  components/
    ui/                 # shared NativeWind UI: Screen, Card, AppText, Divider, Button, Chip,
                        #   TopBar, Sidebar (SidebarProvider/useSidebar), Skeleton (reanimated pulse), palette, shadows
  components/
    ui/
      ComboBox.tsx      # typeahead select with create-on-the-fly (departments/designations)
  types/
    index.ts            # Employee, PayrollRun, AttendanceRecord, BusinessConfig, PayrollAdjustment, Department, Designation
  utils/
    payroll.ts          # calculateFinalSalary(), buildPayrollItem(), formatCurrency() — pure, assert at bottom
  services/             # REST clients: api, auth, employees, payroll, reports, departments, designations, theme,
                        #   activity (audit feed; 10s stale-while-dedup page cache, cleared on signOut)
```

Styling config lives at the repo root: `tailwind.config.js` (design tokens), `global.css`, `metro.config.js` (`withNativeWind`), `babel.config.js` (`nativewind/babel` + `jsxImportSource`).

### NativeWind rules

- Layout: raw `View` from `react-native` + `className`. Column is default; add `flex-row` for rows. (Old `YStack`→`View`, `XStack`→`View className="flex-row"`.)
- Text: `<AppText className="...">` from `@/src/components/ui` — defaults to Inter + primary text color. Numeric/money data → add `font-geist`.
- Never hardcode design hex in JSX className — use the token classes from the Dark mode table. Use `usePalette()` hex only where className can't reach (Ionicons color, native `style`, `placeholderTextColor`, StatusBar, attendance status).
- `<Divider />` for dividers.
- **Bottom-sheet / success overlays:** use an absolute-positioned `View` (`className="absolute inset-0 ..."`), never a Modal — matches the pre-existing pattern in `payroll/review.tsx`.

### Stack screen headers

All Stack screens (employees/add, employees/edit, employees/[id], payroll/review, payroll/payslip, payroll/payslips, settings/business, settings/catalog) get their header from `_layout.tsx` — **do not add a manual top bar inside these screens**. Use `<Screen edges={['bottom']}>` to avoid double padding.

### Salary formula

```
Final = Base + Overtime + Bonus − UnpaidLeave − Advances − Deductions
```

Implemented in `src/utils/payroll.ts`. Always compute here, never inline in components.

## Screens — build status

| Screen | File | Status |
|--------|------|--------|
| Dashboard | `(tabs)/index.tsx` | ✅ |
| Employees list | `(tabs)/employees.tsx` | ✅ |
| Add Employee | `employees/add.tsx` | ✅ modal |
| Attendance Calendar | `(tabs)/attendance.tsx` | ✅ |
| Payroll runs | `(tabs)/payroll.tsx` | ✅ |
| Review Payroll | `payroll/review.tsx` | ✅ |
| Payslip | `payroll/payslip.tsx` | ✅ |
| Reports | `(tabs)/reports.tsx` | ✅ |
| Business Config | `settings/business.tsx` | ✅ |
| Edit Employee | `employees/edit.tsx` | ✅ |
| Employee detail | `employees/[id].tsx` | ✅ |
| Payslips list | `payroll/payslips.tsx` | ✅ |
| Org Catalog | `settings/catalog.tsx` | ✅ |
| All Activity | `activity.tsx` | ✅ |

For any new screen: pull from Stitch MCP first, match layout, use `<Screen>`/`<Card>`/`<AppText>` from `src/components/ui`, implement dark mode via `dark:` classes, add press-in scale (`style={pressScale}`) on tappable cards.
