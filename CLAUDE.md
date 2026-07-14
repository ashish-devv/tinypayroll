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

**All screens must support both light and dark mode.** Use the `useC()` hook pattern — define both variants keyed off `useColorScheme()`. Never hardcode colors directly in JSX; always go through `C`.

| Light token | Dark equivalent |
|-------------|----------------|
| `#f8f9ff` bg | `#0d0f14` |
| `#ffffff` surface | `#161a24` |
| `#eff4ff` surface-low | `#1e2235` |
| `#0b1c30` text | `#e8eaf0` |
| `#45464c` muted | `#8b8fa8` |
| `#e0e3ea` border | `#2a2f3e` |
| `#1a1f2c` ink | stays `#1a1f2c` |
| `#d4af37` gold | stays `#d4af37` |

Full `useC()` hook used in every screen:

```tsx
import { useColorScheme } from 'react-native';

function useC() {
  const dark = useColorScheme() === 'dark';
  return {
    bg:          dark ? '#0d0f14' : '#f8f9ff',
    surface:     dark ? '#161a24' : '#ffffff',
    surfaceLow:  dark ? '#1e2235' : '#eff4ff',
    text:        dark ? '#e8eaf0' : '#0b1c30',
    muted:       dark ? '#8b8fa8' : '#45464c',
    placeholder: dark ? '#555a72' : '#9ba1b0',
    border:      dark ? '#2a2f3e' : '#e0e3ea',
    ink:         '#1a1f2c',
    gold:        '#d4af37',
    goldBg:      dark ? '#2a2410' : '#fdf6d8',
    // shadows — apply via style prop on YStack
    cardShadow: {
      shadowColor: dark ? '#000000' : '#1a1f2c',
      shadowOpacity: dark ? 0.28 : 0.07,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: dark ? 5 : 2,
    } as const,
    heroShadow: {   // gold glow — use on ink CTAs and hero cards
      shadowColor: '#d4af37',
      shadowOpacity: dark ? 0.28 : 0.2,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 },
      elevation: dark ? 10 : 6,
    } as const,
  };
}
```

### Shadow rules
- Surface/white cards → `style={C.cardShadow}`
- Ink hero cards + primary CTAs → `style={C.heroShadow}` (gold glow)
- Press-in effect on tappable cards: `style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}`

### Attendance status colours
Status cell backgrounds must be **saturated in dark mode** (not pastels — they're invisible on `#161a24`). Always define inside `useC()`:

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

Expo 54, expo-router (file-based routing), React 19, React Native 0.81, **Tamagui** UI library, New Architecture + React Compiler enabled.

**Path alias:** `@/` → repo root.

### Routing — `app/`

```
app/
  _layout.tsx           # Root Stack — Inter/Geist fonts, TamaguiProvider (light forced),
                        #   DarkTheme/DefaultTheme from @react-navigation/native,
                        #   scheme-aware headerStyle on all Stack screens, StatusBar style auto
  (tabs)/
    _layout.tsx         # 5 bottom tabs — Ionicons, active tint = gold #d4af37, scheme-aware bg/border
    index.tsx           # Dashboard ✅
    employees.tsx       # Employees list ✅
    attendance.tsx      # Attendance Calendar ✅
    payroll.tsx         # Payroll runs list ✅
    reports.tsx         # Reports + export ✅
  employees/
    add.tsx             # Add Employee modal ✅
  payroll/
    review.tsx          # Review Payroll ✅ (success overlay = absolute View, NOT Modal/Sheet)
    payslip.tsx         # Payslip ✅
  settings/
    business.tsx        # Business Configuration ✅ (reached via ⚙ gear on Dashboard top bar)
```

### `src/` — all non-route code

```
src/
  theme/
    tamagui.config.ts   # Inter_400Regular as base family, face map for 500/600/700, Geist_500Medium mono
  types/
    index.ts            # Employee, PayrollRun, AttendanceRecord, BusinessConfig, PayrollAdjustment
  utils/
    payroll.ts          # calculateFinalSalary(), buildPayrollItem(), formatCurrency() — pure, assert at bottom
  data/
    mock.ts             # 5 employees, 3 payroll runs (Jun pending, May/Apr paid), attendance records
  components/           # shared UI (empty — add as needed)
  services/             # Firebase stubs (empty — future)
```

### Tamagui rules

- Layout: `YStack` / `XStack` — never raw `View` for structural layout (exception: shadows on cards, progress bars)
- Text: always `<Text fontFamily="$body">` — Tamagui resolves Inter via the `face` weight map
- **Never** use `$textPrimary`, `$inkIndigo` or other custom color tokens in JSX — use `C` hex values
- Radius: `borderRadius={14}` cards, `borderRadius={10}` inputs/buttons, `borderRadius={9999}` pills
- `Separator` from tamagui for dividers
- Tamagui `Sheet` crashes with `setValue` — use absolute-positioned `View` for bottom sheet overlays

### Stack screen headers

All Stack screens (employees/add, payroll/review, payroll/payslip, settings/business) get their header from `_layout.tsx` — **do not add a manual top-bar XStack inside these screens**. Use `edges={['bottom']}` on `SafeAreaView` to avoid double padding.

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

For any new screen: pull from Stitch MCP first, match layout, implement dark mode via `useC()`, add `cardShadow`/`heroShadow`, add press-in scale on tappable cards.
