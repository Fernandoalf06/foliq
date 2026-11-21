import { toLocalDateKey } from "./money";

export type RecurringCadence = "WEEKLY" | "MONTHLY" | "YEARLY";

/**
 * Advance a recurring due date by one cadence cycle while preserving time-of-day
 * and clamping month-end dates (e.g. Jan 31 + 1 month -> Feb 28/29 instead of Mar 3).
 */
export function advanceRecurringDate(
  current: Date,
  cadence: RecurringCadence,
): Date {
  const next = new Date(current.getTime());

  if (cadence === "WEEKLY") {
    next.setUTCDate(next.getUTCDate() + 7);
    return next;
  }

  const origDay = next.getUTCDate();
  const targetYear =
    cadence === "YEARLY" ? next.getUTCFullYear() + 1 : next.getUTCFullYear();
  const targetMonth =
    cadence === "YEARLY" ? next.getUTCMonth() : next.getUTCMonth() + 1;

  // Compute last valid day of target month
  const normalizedYear = targetYear + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const maxDayInMonth = new Date(
    Date.UTC(normalizedYear, normalizedMonth + 1, 0),
  ).getUTCDate();

  return new Date(
    Date.UTC(
      normalizedYear,
      normalizedMonth,
      Math.min(origDay, maxDayInMonth),
      next.getUTCHours(),
      next.getUTCMinutes(),
      next.getUTCSeconds(),
      next.getUTCMilliseconds(),
    ),
  );
}

/**
 * Classify a recurring rule's due status relative to today in the user's local timezone.
 */
export function getRecurringDueStatus(
  nextDueDate: Date,
  now: Date = new Date(),
  tzOffsetMinutes: number = 0,
): "due" | "upcoming" | "scheduled" {
  const dueKey = toLocalDateKey(nextDueDate, tzOffsetMinutes);
  const todayKey = toLocalDateKey(now, tzOffsetMinutes);
  if (dueKey <= todayKey) return "due";

  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingKey = toLocalDateKey(sevenDaysOut, tzOffsetMinutes);
  if (dueKey <= upcomingKey) return "upcoming";

  return "scheduled";
}
