import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  askPoll,
  clearDares,
  deleteDare,
  deletePoll,
  removePlayer,
  revealPoll,
  setRoomStatus,
  setSubmissionStatus,
} from "@/app/actions";
import { AutoRefresh } from "@/components/AutoRefresh";
import { CopyLink } from "@/components/CopyLink";
import { AddDareForm, AddPackButton, AddPollForm, AddPollPackButton, ImportDaresForm } from "@/components/forms";
import { getContext } from "@/lib/auth";
import { getLeaderboard } from "@/lib/game";
import { PACKS } from "@/lib/packs";
import { POLL_PACKS } from "@/lib/pollPacks";
import { getRoomPolls, tally } from "@/lib/polls";
import { absoluteUrl, qrSvg } from "@/lib/qr";
import { db, PROOF_BUCKET } from "@/lib/supabase";
import type { Dare, Submission, SubmissionStatus } from "@/lib/types";

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  pending: "awaiting witness",
  approved: "confirmed",
  rejected: "called out",
};

export default async function HostPage({ params }: PageProps<"/r/[id]/host">) {
  const { id } = await params;
  const { room, player } = await getContext(id);
  if (!room) notFound();
  if (!player?.is_host) redirect(`/r/${room.id}`);

  const [{ data: dares }, { data: subs }, leaderboard, { polls, votes }] = await Promise.all([
    db().from("dares").select("*").eq("room_id", room.id).order("created_at"),
    db().from("submissions").select("*").eq("room_id", room.id).order("created_at", { ascending: false }).limit(50),
    getLeaderboard(room.id),
    getRoomPolls(room.id),
  ]);
  const livePoll = polls.find((poll) => poll.status === "live");
  const liveVoteCount = livePoll ? votes.filter((vote) => vote.poll_id === livePoll.id).length : 0;
  const dareList = (dares ?? []) as Dare[];
  const submissions = (subs ?? []) as Submission[];

  // Photos are private; the host gets 1-hour signed links.
  const photoPaths = submissions.flatMap((s) => (s.photo_path ? [s.photo_path] : []));
  const { data: signed } = photoPaths.length
    ? await db().storage.from(PROOF_BUCKET).createSignedUrls(photoPaths, 3600)
    : { data: [] };
  const photoUrl = new Map((signed ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl]] : [])));
  const names = new Map(leaderboard.map((p) => [p.id, p.name]));

  const joinUrl = await absoluteUrl(`/r/${room.id}`);
  const qr = await qrSvg(joinUrl);
  const hostKey = `${room.host_key.slice(0, 4)}-${room.host_key.slice(4)}`;

  const status = setRoomStatus.bind(null, room.id);

  return (
    <div className="stack">
      <AutoRefresh />
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
        <h2>Polls ({polls.length})</h2>
        <p className="muted">Ask the room &ldquo;Who&apos;s most likely to…&rdquo; one poll at a time, then reveal the winner on every phone.</p>
        {livePoll && (
          <div className="card stack" style={{ borderColor: "var(--blood-edge)" }}>
            <span className="eyebrow">live now</span>
            <strong style={{ fontWeight: 400 }}>Who&apos;s most likely to {livePoll.question}</strong>
            <span className="muted">
              {liveVoteCount} of {leaderboard.length} voted
            </span>
            <form action={revealPoll.bind(null, room.id, livePoll.id)}>
              <button>Reveal</button>
            </form>
          </div>
        )}
        <ul className="list">
          {polls.map((poll) => {
            const winner = poll.status === "revealed" ? tally(votes, poll.id, names)[0] : undefined;
            return (
              <li key={poll.id}>
                <span className="grow">
                  …{poll.question}
                  {poll.status === "revealed" && (
                    <span className="muted"> · {winner ? `${winner.name} won` : "no votes"}</span>
                  )}
                </span>
                {poll.status === "draft" && (
                  <form action={askPoll.bind(null, room.id, poll.id)}>
                    <button className="small" disabled={!!livePoll}>Ask</button>
                  </form>
                )}
                {poll.status !== "live" && (
                  <form action={deletePoll.bind(null, room.id, poll.id)}>
                    <button className="secondary small">Delete</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
        {POLL_PACKS.map((pack) => (
          <AddPollPackButton key={pack.id} roomId={room.id} packId={pack.id} name={pack.name} count={pack.questions.length} />
        ))}
        <AddPollForm roomId={room.id} />
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
        <h2>Dare packs</h2>
        {PACKS.map((pack) => (
          <AddPackButton key={pack.id} roomId={room.id} packId={pack.id} name={pack.name} count={pack.dares.length} />
        ))}
        <ImportDaresForm roomId={room.id} />
        <div className="row">
          {dareList.length > 0 && (
            <a href={`/r/${room.id}/dares`} download>
              Download these dares (.txt)
            </a>
          )}
          {dareList.length > 0 && room.status !== "active" && (
            <details>
              <summary>Delete all dares…</summary>
              <form action={clearDares.bind(null, room.id)} style={{ marginTop: 8 }}>
                <button className="danger small">Yes, delete all {dareList.length}</button>
              </form>
            </details>
          )}
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Download your dares to save them as your own pack, then import the file at your next party.
        </p>
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
        <h2>Claims</h2>
        <p className="muted">Players claim a dare and name a witness, who confirms or calls it out. You can overrule either way.</p>
        {!submissions.length && <p className="muted">No dares claimed yet.</p>}
        {submissions.map((sub) => {
          const decide = (status: "approved" | "rejected") => setSubmissionStatus.bind(null, room.id, sub.id, status);
          const photo = sub.photo_path ? photoUrl.get(sub.photo_path) : undefined;
          return (
            <div key={sub.id} className={`stack ${sub.status === "rejected" ? "rejected" : ""}`}>
              <div className="spread">
                <span>
                  <strong>{names.get(sub.player_id) ?? "Removed player"}</strong> · {sub.dare_text} · {sub.points} pt
                  <br />
                  <span className="muted">
                    {sub.witness_id ? `Witness: ${names.get(sub.witness_id) ?? "removed player"} · ` : ""}
                    {STATUS_LABEL[sub.status]}
                  </span>
                </span>
                <div className="row">
                  {sub.status !== "approved" && (
                    <form action={decide("approved")}>
                      <button className="secondary small">{sub.status === "pending" ? "Confirm" : "Restore"}</button>
                    </form>
                  )}
                  {sub.status !== "rejected" && (
                    <form action={decide("rejected")}>
                      <button className="secondary small">Reject</button>
                    </form>
                  )}
                </div>
              </div>
              {photo && <img src={photo} alt={`Proof from ${names.get(sub.player_id)}`} className="proof" />}
            </div>
          );
        })}
      </section>
    </div>
  );
}
