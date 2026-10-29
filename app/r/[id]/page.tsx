import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { DareTray } from "@/components/DareTray";
import { Framed } from "@/components/Framed";
import { HostLoginForm, JoinRoomForm } from "@/components/forms";
import { Leaderboard } from "@/components/Leaderboard";
import { WitnessPrompt } from "@/components/WitnessPrompt";
import { getContext } from "@/lib/auth";
import { ensureDare, getLeaderboard } from "@/lib/game";
import { db } from "@/lib/supabase";
import type { Submission } from "@/lib/types";
import styles from "./game.module.css";

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

  const [dare, leaderboard, { data: pendingRows, error: pendingError }] = await Promise.all([
    room.status === "active" ? ensureDare(player) : Promise.resolve(null),
    getLeaderboard(room.id),
    db().from("submissions").select("*").eq("room_id", room.id).eq("status", "pending").order("created_at"),
  ]);
  if (pendingError) throw pendingError;
  const me = leaderboard.find((row) => row.id === player.id);
  const names = new Map(leaderboard.map((row) => [row.id, row.name]));
  const pending = (pendingRows ?? []) as Submission[];

  // Claims naming me as witness, oldest first; and my own claims still awaiting a witness.
  const toJudge = pending.find((sub) => sub.witness_id === player.id);
  const awaiting = pending.filter((sub) => sub.player_id === player.id);
  const awaitingNames = [...new Set(awaiting.map((sub) => names.get(sub.witness_id ?? "") ?? "the host"))];

  const winner = leaderboard[0];

  return (
    <div className={styles.game}>
        <AutoRefresh />
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
          others={leaderboard.filter((row) => row.id !== player.id).map((row) => ({ id: row.id, name: row.name }))}
          ending={winner ? `${winner.name} wins with ${winner.points} points.` : undefined}
        />

        {awaiting.length > 0 && (
          <p className={styles.awaiting}>
            awaiting {awaitingNames.join(" & ")}&apos;s word on {awaiting.length} {awaiting.length === 1 ? "dare" : "dares"}
          </p>
        )}

        {toJudge && (
          <WitnessPrompt
            roomId={room.id}
            claim={{
              id: toJudge.id,
              claimer: names.get(toJudge.player_id) ?? "Someone",
              dareText: toJudge.dare_text,
              points: toJudge.points,
            }}
          />
        )}

        <section className={styles.board}>
          <h2>Leaderboard</h2>
          <Leaderboard rows={leaderboard} meId={player.id} />
        </section>
    </div>
  );
}
