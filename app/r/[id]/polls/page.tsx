import { notFound, redirect } from "next/navigation";
import { PlayerChrome } from "@/components/PlayerChrome";
import { PollBars } from "@/components/PollBars";
import { getContext } from "@/lib/auth";
import { getLeaderboard } from "@/lib/game";
import { getPlayerExtras, tally, winnersOf } from "@/lib/polls";
import styles from "../subpage.module.css";

export default async function PollsPage({ params }: PageProps<"/r/[id]/polls">) {
  const { id } = await params;
  const { room, player } = await getContext(id);
  if (!room) notFound();
  if (!player) redirect(`/r/${room.id}`);

  const [rows, extras] = await Promise.all([getLeaderboard(room.id), getPlayerExtras(room.id)]);
  const people = rows.map((r) => ({ id: r.id, name: r.name }));
  const names = new Map(people.map((p) => [p.id, p.name]));

  const live = extras.polls.find((poll) => poll.status === "live");
  const liveVotes = live ? extras.votes.filter((vote) => vote.poll_id === live.id) : [];
  // Polls the host hasn't asked yet stay secret.
  const revealed = extras.polls
    .filter((poll) => poll.status === "revealed")
    .sort((a, b) => (b.revealed_at ?? "").localeCompare(a.revealed_at ?? ""));

  return (
    <div className={styles.page}>
      <PlayerChrome roomId={room.id} playerId={player.id} people={people} {...extras} />
      <div className={styles.framed}>
        <header className={styles.header}>
          <p className="eyebrow">{room.name} · who&apos;s most likely to…</p>
          <h1>Polls</h1>
        </header>

        <section className="card stack">
          <span className="eyebrow">live now</span>
          {live ? (
            <>
              <strong style={{ fontWeight: 400 }}>Who&apos;s most likely to {live.question}</strong>
              <span className="muted">
                {liveVotes.some((vote) => vote.voter_id === player.id) ? "your vote is sealed · " : ""}
                {liveVotes.length} of {rows.length} voted · waiting for the host to reveal
              </span>
            </>
          ) : (
            <span className="muted">No poll right now. The host will ask the room soon.</span>
          )}
        </section>

        <section className={styles.section}>
          <h2>The Room Has Spoken</h2>
          {!revealed.length && <p className={`muted ${styles.empty}`}>No results yet.</p>}
          {revealed.map((poll) => {
            const results = tally(extras.votes, poll.id, names);
            const winners = winnersOf(results);
            return (
              <article key={poll.id} className={`card ${styles.result}`}>
                <span className="eyebrow">most likely to {poll.question}</span>
                <h3>{winners.names.length ? winners.names.join(" & ") : "No one"}</h3>
                <PollBars tally={results} />
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
