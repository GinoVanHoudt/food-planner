import { todayKey, type DayKey } from "../../lib/dates";
import { cx } from "../../lib/cx";
import s from "./Expiry.module.css";
import { expiry } from "./stock";

/** "Expires 4 Nov", in amber when it is soon and in red once it has expired. */
export function Expiry({ date }: { date: DayKey }) {
  const { label, state } = expiry(date, todayKey());
  return <span className={cx(s.expiry, s[state])}>{label}</span>;
}
