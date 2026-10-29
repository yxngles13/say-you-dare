import type { LeaderboardRow } from "@/lib/types";

export function Leaderboard({ rows, meId }: { rows: LeaderboardRow[]; meId?: string }) {
  if (!rows.length) return <p className="muted">No players yet.</p>;
  return (
    <ol className="list">
      {rows.map((row) => (
        <li key={row.id}>
          <strong style={{ width: 24 }}>{row.rank}</strong>
          <span className="grow">
            {row.name}
            {row.isHost && " (host)"}
            {row.id === meId && " (you)"}
          </span>
          <span className="muted">{row.completed} done</span>
          <strong>{row.points} pts</strong>
        </li>
      ))}
    </ol>
  );
}
