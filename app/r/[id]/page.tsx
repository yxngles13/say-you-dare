import Link from "next/link";
import { notFound } from "next/navigation";
import { skipDare } from "@/app/actions";
import { AutoRefresh } from "@/components/AutoRefresh";
import { HostLoginForm, JoinRoomForm } from "@/components/forms";
import { Leaderboard } from "@/components/Leaderboard";
import { ProofUpload } from "@/components/ProofUpload";
import { getContext } from "@/lib/auth";
import { ensureDare, getLeaderboard } from "@/lib/game";

export default async function RoomPage({ params }: PageProps<"/r/[id]">) {
  const { id } = await params;
  const { room, player } = await getContext(id);
  if (!room) notFound();

  // Not joined yet: this is where the QR code / invite link lands.
  if (!player) {
    return (
      <div className="stack">
        <div>
          <h1>{room.name}</h1>
          <span className="badge">PIN {room.code ?? "expired"}</span>
        </div>
        <section className="card stack">
          <h2>Join the party</h2>
          <JoinRoomForm roomId={room.id} />
        </section>
        <details className="card">
          <summary>I&apos;m the host</summary>
          <HostLoginForm roomId={room.id} />
        </details>
      </div>
    );
  }

  const [dare, leaderboard] = await Promise.all([
    room.status === "active" ? ensureDare(player) : Promise.resolve(null),
    getLeaderboard(room.id),
  ]);
  const me = leaderboard.find((row) => row.id === player.id);

  return (
    <div className="stack">
      <AutoRefresh />
      <div className="spread">
        <div>
          <h1 style={{ marginBottom: 4 }}>{room.name}</h1>
          <span className="badge">PIN {room.code ?? "expired"}</span>
        </div>
        {player.is_host && <Link href={`/r/${room.id}/host`}>Host panel</Link>}
      </div>

      <p className="muted">
        Playing as <strong>{player.name}</strong> · {me?.points ?? 0} pts · {me?.completed ?? 0} done · rank{" "}
        {me?.rank ?? "-"}
      </p>

      {room.status === "lobby" && (
        <div className="dare">
          <h2>Waiting for the host to start…</h2>
          <p className="muted">Your secret dare will appear here.</p>
        </div>
      )}

      {room.status === "active" && (
        <div className="dare stack">
          <small className="muted">YOUR SECRET DARE · {dare?.points ?? 0} PTS</small>
          {dare ? (
            <>
              <h2 style={{ margin: 0 }}>{dare.text}</h2>
              <ProofUpload key={dare.id} roomId={room.id} dareId={dare.id} />
              <form action={skipDare.bind(null, room.id)}>
                <button className="secondary small">Skip this dare</button>
              </form>
            </>
          ) : (
            <h2 style={{ margin: 0 }}>You&apos;ve done every dare! Wait for the host to add more.</h2>
          )}
        </div>
      )}

      {room.status === "ended" && (
        <div className="dare">
          <h2>Game over!</h2>
          <p className="muted">{leaderboard[0] ? `${leaderboard[0].name} wins with ${leaderboard[0].points} pts.` : ""}</p>
        </div>
      )}

      <section className="card">
        <h2>Leaderboard</h2>
        <Leaderboard rows={leaderboard} meId={player.id} />
      </section>
    </div>
  );
}
