import { describe, expect, it } from "vite-plus/test";
import { addDays, dayRange, formatDay, formatRange, fromDayKey, toDayKey } from "./dates";

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
});

describe("formatting", () => {
  it("uses relative names around today", () => {
    expect(formatDay("2026-10-26", "2026-10-26")).toBe("Today");
    expect(formatDay("2026-10-27", "2026-10-26")).toBe("Tomorrow");
    expect(formatDay("2026-10-25", "2026-10-26")).toBe("Yesterday");
    expect(formatDay("2026-10-28", "2026-10-26")).toBe("Wed 28 Oct");
  });

  it("formats ranges", () => {
    expect(formatRange("2026-10-26", "2026-11-01")).toBe("26 Oct – 1 Nov");
    expect(formatRange("2026-10-26", "2026-10-26")).toBe("26 Oct");
  });
});
