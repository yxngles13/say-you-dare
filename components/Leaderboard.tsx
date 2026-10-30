import type { LeaderboardRow } from "@/lib/types";
import styles from "./Leaderboard.module.css";

type Props = {
  rows: LeaderboardRow[];
  meId?: string;
  /** Show only the first N rows, plus the viewer's own row if it falls below them. */
  limit?: number;
};

export function Leaderboard({ rows, meId, limit }: Props) {
  if (!rows.length) return <p className="muted">No players yet.</p>;

  const shown = limit ? rows.slice(0, limit) : rows;
  const me = limit ? rows.slice(limit).find((row) => row.id === meId) : undefined;

  return (
    <ol className={styles.board}>
      {shown.map((row) => <Row key={row.id} row={row} isMe={row.id === meId} />)}
      {me && (
        <>
          <li className={styles.gap} aria-hidden>⋯</li>
          <Row row={me} isMe />
        </>
      )}
    </ol>
  );
}

function Row({ row, isMe }: { row: LeaderboardRow; isMe: boolean }) {
  const podium = row.points > 0 && row.rank <= 3;
  return (
    <li className={`${styles.row} ${podium ? styles.podium : ""} ${isMe ? styles.me : ""}`}>
      <span className={styles.rank}>{row.rank === 1 && row.points > 0 ? "♛" : row.rank}</span>
      <span className={styles.name}>
        {row.name}
        {row.isHost && <small> host</small>}
        {isMe && <small> you</small>}
      </span>
      <span className={styles.done}>{row.completed} done</span>
      <strong className={styles.points}>{row.points} pts</strong>
    </li>
  );
}
