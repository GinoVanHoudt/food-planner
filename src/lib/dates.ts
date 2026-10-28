/** A calendar day in local time, formatted `YYYY-MM-DD` so keys sort and compare as strings. */
export type DayKey = string;

export const PLAN_DAYS = 14;
export const PAST_DAYS = 7;

export function toDayKey(date: Date): DayKey {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function fromDayKey(key: DayKey): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function todayKey(): DayKey {
  return toDayKey(new Date());
}

export function addDays(key: DayKey, days: number): DayKey {
  const date = fromDayKey(key);
  date.setDate(date.getDate() + days);
  return toDayKey(date);
}

/** Every day from `from` to `to`, both inclusive. */
export function dayRange(from: DayKey, to: DayKey): DayKey[] {
  const days: DayKey[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

const shortFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const dayMonthFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const weekdayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "short" });

/** "Today", "Tomorrow", "Yesterday", or null for other days. */
export function relativeDayName(key: DayKey, today = todayKey()): string | null {
  if (key === today) return "Today";
  if (key === addDays(today, 1)) return "Tomorrow";
  if (key === addDays(today, -1)) return "Yesterday";
  return null;
}

/** e.g. "Wed 28 Oct". */
export function formatDayShort(key: DayKey): string {
  return shortFormat.format(fromDayKey(key));
}

/** "Today", "Tomorrow", "Yesterday" or e.g. "Wed 28 Oct". */
export function formatDay(key: DayKey, today = todayKey()): string {
  return relativeDayName(key, today) ?? formatDayShort(key);
}

/**
 * A day from today on, to use mid-sentence: "today", "tomorrow", "Mon" within the week, or e.g.
 * "Mon 9 Nov" from a week ahead (when a weekday alone could mean this week or next).
 */
export function formatNearDay(key: DayKey, today = todayKey()): string {
  if (key === today) return "today";
  if (key === addDays(today, 1)) return "tomorrow";
  if (key < addDays(today, 7)) return weekdayFormat.format(fromDayKey(key));
  return formatDayShort(key);
}

/** e.g. "4 Nov", with the year if it is not this year's: "4 Nov 2027". */
export function formatDate(key: DayKey, today = todayKey()): string {
  const date = dayMonthFormat.format(fromDayKey(key));
  const year = key.slice(0, 4);
  return year === today.slice(0, 4) ? date : `${date} ${year}`;
}

/** e.g. "26 Oct – 1 Nov". */
export function formatRange(from: DayKey, to: DayKey): string {
  const start = dayMonthFormat.format(fromDayKey(from));
  return from === to ? start : `${start} – ${dayMonthFormat.format(fromDayKey(to))}`;
}
