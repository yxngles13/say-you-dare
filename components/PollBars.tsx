import type { TallyRow } from "@/lib/pollTally";
import styles from "./Poll.module.css";

/** Top-3 vote bars for a revealed poll. */
export function PollBars({ tally }: { tally: TallyRow[] }) {
  const top = tally[0]?.votes ?? 0;
  if (!top) return null;
  return (
    <div className={styles.bars}>
      {tally.slice(0, 3).map((row) => (
        <div key={row.id} className={`${styles.bar} ${row.votes === top ? styles.top : ""}`}>
          <span>{row.name}</span>
          <i style={{ width: `${(row.votes / top) * 100}%` }} />
          <span>{row.votes}</span>
        </div>
      ))}
    </div>
  );
}
