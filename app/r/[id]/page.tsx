import Link from "next/link";
import { notFound } from "next/navigation";
import { DareTray } from "@/components/DareTray";
import { Framed } from "@/components/Framed";
import { HostLoginForm, JoinRoomForm } from "@/components/forms";
import { Leaderboard } from "@/components/Leaderboard";
import { PlayerChrome } from "@/components/PlayerChrome";
import { getContext } from "@/lib/auth";
import { ensureDare, getLeaderboard } from "@/lib/game";
import { getPlayerExtras } from "@/lib/polls";
import styles from "./game.module.css";

/** How many players the game screen ranks; the Ranks tab has everyone. */
const TOP = 5;

export default async function RoomPage({ params }: PageProps<"/r/[id]">) {
  const { id } = await params;
  const { room, player } = await getContext(id);
  if (!room) notFound();

  // Not joined yet: this is where the QR code / invite link lands.
  if (!player) {
    return (
      <>
        <Framed>
          <p className="eyebrow">
            {room.name} · PIN {room.code ?? "expired"}
          </p>
          <h1>Welcome</h1>
          <p className="eyebrow">you have been invited</p>
          <JoinRoomForm roomId={room.id} />
        </Framed>
        <div className="beneath">
          <details className="card">
            <summary>I&apos;m the host</summary>
            <HostLoginForm roomId={room.id} />
          </details>
        </div>
      </>
    );
  }

  const [dare, leaderboard, extras] = await Promise.all([
    room.status === "active" ? ensureDare(player) : Promise.resolve(null),
    getLeaderboard(room.id),
    getPlayerExtras(room.id),
  ]);
  const me = leaderboard.find((row) => row.id === player.id);
  const names = new Map(leaderboard.map((row) => [row.id, row.name]));
  const people = leaderboard.map((row) => ({ id: row.id, name: row.name }));

  // My own claims still awaiting a witness.
  const awaiting = extras.pending.filter((sub) => sub.player_id === player.id);
  const awaitingNames = [...new Set(awaiting.map((sub) => names.get(sub.witness_id ?? "") ?? "the host"))];
  const livePoll = extras.polls.find((poll) => poll.status === "live");
  const liveVotes = livePoll ? extras.votes.filter((vote) => vote.poll_id === livePoll.id) : [];
  const winner = leaderboard[0];

  return (
    <div className={styles.game}>
      <PlayerChrome roomId={room.id} playerId={player.id} people={people} {...extras} />
      {player.is_host && (
        <Link className={styles.hostLink} href={`/r/${room.id}/host`}>
          Host panel
        </Link>
      )}
      <header className={styles.header}>
        <h1>Hi {player.name}!</h1>
        <p className={styles.meta}>
          {room.name} · PIN {room.code ?? "expired"} · {me?.points ?? 0} pts · rank {me?.rank ?? "-"}
        </p>
      </header>

      <DareTray
        roomId={room.id}
        playerId={player.id}
        status={room.status}
        dare={dare && { id: dare.id, text: dare.text, points: dare.points }}
        others={people.filter((p) => p.id !== player.id)}
        ending={winner ? `${winner.name} wins with ${winner.points} points.` : undefined}
      />

      {awaiting.length > 0 && (
        <p className={styles.awaiting}>
          awaiting {awaitingNames.join(" & ")}&apos;s word on {awaiting.length} {awaiting.length === 1 ? "dare" : "dares"}
        </p>
      )}
      {livePoll && liveVotes.some((vote) => vote.voter_id === player.id) && (
        <p className={styles.awaiting}>
          your vote is sealed · {liveVotes.length} of {leaderboard.length} voted
        </p>
      )}

      <section className={styles.board}>
        <h2>Leaderboard</h2>
        <Leaderboard rows={leaderboard} meId={player.id} limit={TOP} />
      </section>
    </div>
  );
}
