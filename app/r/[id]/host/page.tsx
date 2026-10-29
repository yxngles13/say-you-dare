import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteDare, removePlayer, setRoomStatus, setSubmissionStatus } from "@/app/actions";
import { CopyLink } from "@/components/CopyLink";
import { AddDareForm } from "@/components/forms";
import { getContext } from "@/lib/auth";
import { getLeaderboard } from "@/lib/game";
import { absoluteUrl, qrSvg } from "@/lib/qr";
import { db, PROOF_BUCKET } from "@/lib/supabase";
import type { Dare, Submission } from "@/lib/types";

export default async function HostPage({ params }: PageProps<"/r/[id]/host">) {
  const { id } = await params;
  const { room, player } = await getContext(id);
  if (!room) notFound();
  if (!player?.is_host) redirect(`/r/${room.id}`);

  const [{ data: dares }, { data: subs }, leaderboard] = await Promise.all([
    db().from("dares").select("*").eq("room_id", room.id).order("created_at"),
    db().from("submissions").select("*").eq("room_id", room.id).order("created_at", { ascending: false }).limit(50),
    getLeaderboard(room.id),
  ]);
  const dareList = (dares ?? []) as Dare[];
  const submissions = (subs ?? []) as Submission[];

  // Photos are private; the host gets 1-hour signed links.
  const { data: signed } = submissions.length
    ? await db().storage.from(PROOF_BUCKET).createSignedUrls(submissions.map((s) => s.photo_path), 3600)
    : { data: [] };
  const photoUrl = new Map((signed ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl]] : [])));
  const names = new Map(leaderboard.map((p) => [p.id, p.name]));

  const joinUrl = await absoluteUrl(`/r/${room.id}`);
  const qr = await qrSvg(joinUrl);
  const hostKey = `${room.host_key.slice(0, 4)}-${room.host_key.slice(4)}`;

  const status = setRoomStatus.bind(null, room.id);

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1 style={{ marginBottom: 4 }}>{room.name}</h1>
          <span className="badge">Host panel · {room.status}</span>
        </div>
        <Link href={`/r/${room.id}`}>Play</Link>
      </div>

      <section className="card stack">
        <h2>Invite guests</h2>
        <p className="muted">Guests scan the QR code, or go to the home page and enter the PIN.</p>
        <div className="code">{room.code ?? "PIN expired"}</div>
        {/* Generated server-side by the qrcode library from our own URL. */}
        <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} />
        <CopyLink url={joinUrl} />
      </section>

      <details className="card">
        <summary>Host from another phone</summary>
        <p className="muted">
          Open the room link on the other phone, tap &quot;I&apos;m the host&quot; and enter this code. Keep it private.
        </p>
        <div className="code">{hostKey}</div>
      </details>

      <section className="card stack">
        <h2>Game</h2>
        <div className="row">
          {room.status !== "active" && (
            <form action={status.bind(null, "active")}>
              <button disabled={!dareList.length}>{room.status === "ended" ? "Resume game" : "Start game"}</button>
            </form>
          )}
          {room.status === "active" && (
            <form action={status.bind(null, "ended")}>
              <button className="danger">End game</button>
            </form>
          )}
          <Link href={`/r/${room.id}/host`}>Refresh</Link>
        </div>
        {!dareList.length && <p className="muted">Add at least one dare to start.</p>}
      </section>

      <section className="card stack">
        <h2>Dares ({dareList.length})</h2>
        <p className="muted">Each player draws their own random dare from this list.</p>
        <ul className="list">
          {dareList.map((dare) => (
            <li key={dare.id}>
              <span className="grow">{dare.text}</span>
              <span className="badge">{dare.points} pt</span>
              <form action={deleteDare.bind(null, room.id, dare.id)}>
                <button className="secondary small">Delete</button>
              </form>
            </li>
          ))}
        </ul>
        <AddDareForm roomId={room.id} />
      </section>

      <section className="card stack">
        <h2>Players ({leaderboard.length})</h2>
        <ul className="list">
          {leaderboard.map((row) => (
            <li key={row.id}>
              <strong style={{ width: 24 }}>{row.rank}</strong>
              <span className="grow">{row.name}{row.isHost && " (host)"}</span>
              <strong>{row.points} pts</strong>
              {row.id !== player.id && (
                <form action={removePlayer.bind(null, room.id, row.id)}>
                  <button className="secondary small">Remove</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card stack">
        <h2>Proofs</h2>
        {!submissions.length && <p className="muted">No proofs submitted yet.</p>}
        {submissions.map((sub) => (
          <div key={sub.id} className={`stack ${sub.status === "rejected" ? "rejected" : ""}`}>
            <div className="spread">
              <span>
                <strong>{names.get(sub.player_id) ?? "Removed player"}</strong> · {sub.dare_text} · {sub.points} pt
              </span>
              <form
                action={setSubmissionStatus.bind(null, room.id, sub.id, sub.status === "approved" ? "rejected" : "approved")}
              >
                <button className="secondary small">{sub.status === "approved" ? "Reject" : "Restore"}</button>
              </form>
            </div>
            {photoUrl.get(sub.photo_path) && (
              <img src={photoUrl.get(sub.photo_path)} alt={`Proof from ${names.get(sub.player_id)}`} className="proof" />
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
