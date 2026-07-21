# Attendance UI Revamp — Quick Marking

## Problem
`markDay` (attendance.tsx:69) **cycles** status on every tap: `present → absent → leave → holiday`. So "absent" = 2 taps, "holiday" = 4 taps, and fixing a mistake means cycling all the way around. No way to clear a day, no bulk action.

## Solution
Replace the cycle with a **tap-to-open picker sheet**: tap any calendar day → bottom sheet slides up with explicit status buttons → one tap sets it and closes (2 deterministic taps, no guessing). Add a **"Mark all remaining Present"** bulk shortcut.

---

## 1. Service — batch marking (`src/services/attendance.ts`)
- Add `markAttendanceBatch(records: {employeeId, date, status}[])` that posts the full `records` array in one call (the endpoint already accepts an array). Keep existing `markAttendance` for single writes.

## 2. Screen (`app/(tabs)/attendance.tsx`)

**Remove:** the `CYCLE` const and cycling logic in `markDay`.

**New state:** `pickerDay: number | null` (which day's sheet is open).

**Calendar tap** → `setPickerDay(day)` instead of cycling. Keep the today-ring and status colors exactly as-is (palette `P.status` unchanged).

**New picker sheet** (absolute-positioned `View`, matching the existing pattern in `payroll.tsx:171` — backdrop `bg-black/40`, `rounded-t-card-lg` surface, drag-handle pill):
- Title: `Mark {MONTHS[month]} {day}` + weekday.
- 2×2 grid of status buttons — **Present / Absent / Paid Leave / Holiday** — each showing its status dot color + label; the day's current status is highlighted (border-primary).
- A **Clear** row that removes the record (reverts to blank/weekend).
- Tapping a status: optimistic `setRecords`, close sheet, `await markAttendance`, roll back + show error on failure (same try/catch already there).

**"Mark all remaining Present" button** (replaces the current "Quick Mark Today" CTA, keeps the same hero-styled primary button + `pressScale`):
- Fills every **working day** (skips Sat/Sun, and days already marked present) up to today if current month, else whole month, as `present`.
- Optimistic bulk `setRecords`, then one `markAttendanceBatch` call. Roll back on error.
- Confirmation via the existing centered-popup pattern is overkill — instead disable + show a spinner label while writing (`Marking…`).

**Footer hint** updated: `Tap any date to set its status.`

## 3. Keep unchanged
- Employee selector, month nav, summary stats, legend, dark-mode `dark:` classes, `P.status` colors, shadows, `Screen`/`Card`/`TopBar`.

---

## Files touched
| File | Change |
|------|--------|
| `src/services/attendance.ts` | + `markAttendanceBatch()` |
| `app/(tabs)/attendance.tsx` | remove cycle → picker sheet + bulk-present button |

## Result
- Set any status in **exactly 2 taps** (day → status), no cycling, no overshoot.
- **Clear** a day directly.
- Fill a whole month Present in **1 tap**.
- Zero new dependencies; reuses the app's existing bottom-sheet + optimistic-write patterns.
