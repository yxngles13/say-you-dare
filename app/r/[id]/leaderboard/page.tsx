import { notFound, redirect } from "next/navigation";
import { Leaderboard } from "@/components/Leaderboard";
import { PlayerChrome } from "@/components/PlayerChrome";
import { getContext } from "@/lib/auth";
import { getLeaderboard } from "@/lib/game";
import { getPlayerExtras } from "@/lib/polls";
import styles from "../subpage.module.css";

export default async function LeaderboardPage({ params }: PageProps<"/r/[id]/leaderboard">) {
  const { id } = await params;
  const { room, player } = await getContext(id);
  if (!room) notFound();
  if (!player) redirect(`/r/${room.id}`);

  const [rows, extras] = await Promise.all([getLeaderboard(room.id), getPlayerExtras(room.id)]);

  return (
    <div className={styles.page}>
      <PlayerChrome roomId={room.id} playerId={player.id} people={rows.map((r) => ({ id: r.id, name: r.name }))} {...extras} />
      <div className={styles.framed}>
        <header className={styles.header}>
          <p className="eyebrow">{room.name} · {rows.length} players</p>
          <h1>Leaderboard</h1>
        </header>
        <Leaderboard rows={rows} meId={player.id} />
      </div>
    </div>
  );
}
