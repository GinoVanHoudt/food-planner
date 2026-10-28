import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  addDays,
  dayRange,
  formatDate,
  formatDay,
  formatDayShort,
  formatNearDay,
  formatRange,
  fromDayKey,
  relativeDayName,
  toDayKey,
  todayKey,
} from "./dates";

describe("todayKey", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    [new Date(2026, 9, 28, 12, 0), "2026-10-28"],
    [new Date(2026, 9, 28, 23, 59, 59, 999), "2026-10-28"],
    [new Date(2026, 9, 29, 0, 0, 0, 0), "2026-10-29"],
    [new Date(2026, 9, 29, 0, 0, 1), "2026-10-29"],
    [new Date(2026, 11, 31, 23, 59), "2026-12-31"],
    [new Date(2027, 0, 1, 0, 0), "2027-01-01"],
  ])("is the local day at %s", (now, expected) => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(todayKey()).toBe(expected);
  });

  it("is the default for relative names", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 28, 23, 59));
    expect(formatDay("2026-10-29")).toBe("Tomorrow");
    vi.setSystemTime(new Date(2026, 9, 29, 0, 1));
    expect(formatDay("2026-10-29")).toBe("Today");
  });
});

describe("leap days", () => {
  it("counts 29 February in leap years only", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
    expect(dayRange("2028-02-28", "2028-03-01")).toEqual([
      "2028-02-28",
      "2028-02-29",
      "2028-03-01",
    ]);
  });

  it("round-trips and formats the leap day", () => {
    expect(toDayKey(fromDayKey("2028-02-29"))).toBe("2028-02-29");
    expect(formatDayShort("2028-02-29")).toBe("Tue 29 Feb");
  });
});

describe("relativeDayName", () => {
  it("names today, tomorrow and yesterday", () => {
    expect(relativeDayName("2026-10-28", "2026-10-28")).toBe("Today");
    expect(relativeDayName("2026-10-29", "2026-10-28")).toBe("Tomorrow");
    expect(relativeDayName("2026-10-27", "2026-10-28")).toBe("Yesterday");
  });

  it.each(["2026-10-30", "2026-10-26", "2027-10-28"])("returns null for %s", (key) => {
    expect(relativeDayName(key, "2026-10-28")).toBeNull();
  });

  it("works across a year boundary", () => {
    expect(relativeDayName("2027-01-01", "2026-12-31")).toBe("Tomorrow");
    expect(relativeDayName("2026-12-31", "2027-01-01")).toBe("Yesterday");
  });
});

describe("formatDayShort", () => {
  it.each([
    ["2026-10-28", "Wed 28 Oct"],
    ["2026-11-01", "Sun 1 Nov"],
    ["2027-01-01", "Fri 1 Jan"],
  ])("formats %s as %j", (key, expected) => {
    expect(formatDayShort(key)).toBe(expected);
  });
});

describe("day keys", () => {
  it("round-trips local dates", () => {
    expect(toDayKey(new Date(2026, 9, 26))).toBe("2026-10-26");
    expect(fromDayKey("2026-10-26")).toEqual(new Date(2026, 9, 26));
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("adds whole days across daylight saving changes", () => {
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
  });

  it("lists every day in a range, inclusive", () => {
    expect(dayRange("2026-10-30", "2026-11-02")).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
    expect(dayRange("2026-10-30", "2026-10-29")).toEqual([]);
  });

  it("lists a single day", () => {
    expect(dayRange("2026-10-28", "2026-10-28")).toEqual(["2026-10-28"]);
  });
});

describe("formatting", () => {
  it("uses relative names around today", () => {
    expect(formatDay("2026-10-26", "2026-10-26")).toBe("Today");
    expect(formatDay("2026-10-27", "2026-10-26")).toBe("Tomorrow");
    expect(formatDay("2026-10-25", "2026-10-26")).toBe("Yesterday");
    expect(formatDay("2026-10-28", "2026-10-26")).toBe("Wed 28 Oct");
  });

  it("names near days by weekday, with the date from a week ahead", () => {
    expect(formatNearDay("2026-10-26", "2026-10-26")).toBe("today");
    expect(formatNearDay("2026-10-27", "2026-10-26")).toBe("tomorrow");
    expect(formatNearDay("2026-11-01", "2026-10-26")).toBe("Sun");
    expect(formatNearDay("2026-11-02", "2026-10-26")).toBe("Mon 2 Nov");
  });

  it("switches from weekday to date between 6 and 7 days ahead, across a year boundary", () => {
    expect(formatNearDay("2027-01-02", "2026-12-28")).toBe("Sat");
    expect(formatNearDay("2027-01-03", "2026-12-28")).toBe("Sun");
    expect(formatNearDay("2027-01-04", "2026-12-28")).toBe("Mon 4 Jan");
    expect(formatNearDay("2027-01-05", "2026-12-28")).toBe("Tue 5 Jan");
  });

  it("adds the year to dates in another year", () => {
    expect(formatDate("2026-11-04", "2026-10-26")).toBe("4 Nov");
    expect(formatDate("2027-01-04", "2026-10-26")).toBe("4 Jan 2027");
  });

  it("decides on the year around the new year", () => {
    expect(formatDate("2026-12-31", "2026-12-31")).toBe("31 Dec");
    expect(formatDate("2027-01-01", "2026-12-31")).toBe("1 Jan 2027");
    expect(formatDate("2026-12-31", "2027-01-01")).toBe("31 Dec 2026");
    expect(formatDate("2027-01-01", "2027-01-01")).toBe("1 Jan");
  });

  it("formats ranges", () => {
    expect(formatRange("2026-10-26", "2026-11-01")).toBe("26 Oct – 1 Nov");
    expect(formatRange("2026-10-26", "2026-10-26")).toBe("26 Oct");
  });

  it("formats a range across a year boundary", () => {
    expect(formatRange("2026-12-28", "2027-01-10")).toBe("28 Dec – 10 Jan");
  });
});
