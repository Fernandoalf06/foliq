import { describe, expect, it } from "vitest";
import { advanceRecurringDate, getRecurringDueStatus } from "./recurring";

describe("recurring schedule helpers", () => {
  it("advances weekly schedules by 7 days preserving time", () => {
    const start = new Date("2026-05-10T02:30:00.000Z");
    const next = advanceRecurringDate(start, "WEEKLY");
    expect(next.toISOString()).toBe("2026-05-17T02:30:00.000Z");
  });

  it("clamps month-end dates for monthly schedules", () => {
    const jan31NonLeap = new Date("2026-01-31T08:00:00.000Z");
    expect(advanceRecurringDate(jan31NonLeap, "MONTHLY").toISOString()).toBe(
      "2026-02-28T08:00:00.000Z",
    );

    const jan31Leap = new Date("2028-01-31T08:00:00.000Z");
    expect(advanceRecurringDate(jan31Leap, "MONTHLY").toISOString()).toBe(
      "2028-02-29T08:00:00.000Z",
    );

    const dec15 = new Date("2026-12-15T10:15:00.000Z");
    expect(advanceRecurringDate(dec15, "MONTHLY").toISOString()).toBe(
      "2027-01-15T10:15:00.000Z",
    );
  });

  it("clamps leap-day dates for yearly schedules", () => {
    const leapDay = new Date("2028-02-29T09:00:00.000Z");
    expect(advanceRecurringDate(leapDay, "YEARLY").toISOString()).toBe(
      "2029-02-28T09:00:00.000Z",
    );
  });

  it("classifies due, upcoming, and scheduled using user timezone offset", () => {
    // 2026-06-10 22:00 UTC is 2026-06-11 05:00 WIB (tzOffset = -420)
    const nowUtc = new Date("2026-06-10T22:00:00.000Z");
    const dueWib = new Date("2026-06-11T00:00:00.000Z"); // 07:00 WIB on Jun 11 (today in WIB!)
    expect(getRecurringDueStatus(dueWib, nowUtc, -420)).toBe("due");
    expect(getRecurringDueStatus(dueWib, nowUtc, 0)).toBe("upcoming");

    const upcomingWib = new Date("2026-06-16T05:00:00.000Z");
    expect(getRecurringDueStatus(upcomingWib, nowUtc, -420)).toBe("upcoming");

    const farFuture = new Date("2026-07-01T05:00:00.000Z");
    expect(getRecurringDueStatus(farFuture, nowUtc, -420)).toBe("scheduled");
  });
});
