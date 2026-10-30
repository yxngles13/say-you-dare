"use client";

import { useEffect, useState, useTransition } from "react";
import { claimDare, skipDare } from "@/app/actions";
import { NamePicker } from "@/components/NamePicker";
import type { RoomStatus } from "@/lib/types";
import styles from "./DareTray.module.css";

type Phase = "unknown" | "sealed" | "opening" | "rising" | "out" | "instant";

type Props = {
  roomId: string;
  playerId: string;
  status: RoomStatus;
  dare: { id: string; text: string; points: number } | null;
  /** Everyone else in the room, who could witness a dare. */
  others: { id: string; name: string }[];
  /** Shown on the note once the game has ended. */
  ending?: string;
};

const LONG_DARE = 90;


function seenKey(roomId: string, playerId: string) {
  return `syd:envelope:${roomId}:${playerId}`;
}

function readSeen(key: string) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/**
 * The dare on the silver tray. The first time a player opens a room the note
 * arrives in a sealed envelope they tap open; after that it just sits on the tray.
 */
export function DareTray({ roomId, playerId, status, dare, others, ending }: Props) {
  const [phase, setPhase] = useState<Phase>("unknown");
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const key = seenKey(roomId, playerId);

  useEffect(() => {
    // Only an unopened envelope in an unfinished game gets the animation.
    setPhase(readSeen(key) || status === "ended" ? "instant" : "sealed");
  }, [key, status]);

  useEffect(() => {
    // Seal cracks and flap lifts → note rises → note comes forward.
    const next = phase === "opening" ? "rising" : phase === "rising" ? "out" : null;
    if (!next) return;
    const timer = setTimeout(() => setPhase(next), phase === "opening" ? 850 : 1850);
    return () => clearTimeout(timer);
  }, [phase]);

  function open() {
    try {
      localStorage.setItem(key, "1");
    } catch {
      // Private mode: the envelope will just replay on the next visit.
    }
    setPhase("opening");
  }

  const isOut = phase === "out" || phase === "instant";
  const phaseClass = phase === "instant" ? `${styles.out} ${styles.instant}` : styles[phase];
  const picking = dare !== null && pickingId === dare.id;

  function claim(dareId: string, witnessId: string) {
    startTransition(async () => {
      const result = await claimDare(roomId, dareId, witnessId);
      setMessage(result?.error ?? null);
      if (!result?.error) setPickingId(null);
    });
  }

  let note;
  if (status === "lobby") {
    note = (
      <>
        <h2>Patience</h2>
        <p>The host has not yet begun. Your secret dare will arrive here.</p>
      </>
    );
  } else if (status === "ended") {
    note = (
      <>
        <h2>The Night Is Over</h2>
        <p>{ending}</p>
      </>
    );
  } else if (dare) {
    note = (
      <>
        <h2>Your Dare</h2>
        <p>{dare.text}</p>
        <small>· Worth {dare.points} {dare.points === 1 ? "point" : "points"} ·</small>
      </>
    );
  } else {
    note = (
      <>
        <h2>All Done</h2>
        <p>You have done every dare. Wait for the host to add more.</p>
      </>
    );
  }

  return (
    <div className={styles.wrap}>
      {phase === "sealed" && (
        <p className={styles.hint}>{status === "active" ? "an invitation awaits · tap the seal" : "waiting for the host to begin"}</p>
      )}
      <div className={`${styles.stage} ${phaseClass}`}>
        <img className={styles.tray} src="/game/tray.webp" alt="" />
        <div className={styles.envelope}>
          <div className={`${styles.layer} ${styles.body}`} />
          <div className={`${styles.note} ${dare && dare.text.length > LONG_DARE ? styles.long : ""}`}>{note}</div>
          <div className={`${styles.layer} ${styles.pocket}`} />
          <div className={styles.flap}>
            <div className={styles.flapFront} />
            <div className={styles.flapBack} />
          </div>
          <button
            type="button"
            className={styles.seal}
            onClick={open}
            disabled={phase !== "sealed" || status !== "active"}
            aria-label="Break the seal"
          />
        </div>
        {status === "active" && dare && (
          <div className={styles.actions} aria-hidden={!isOut}>
            <form action={skipDare.bind(null, roomId)}>
              <button aria-label="Skip this dare" tabIndex={isOut ? 0 : -1}>✕</button>
            </form>
            <button
              type="button"
              className={styles.yes}
              aria-label="I did this dare"
              aria-pressed={picking}
              tabIndex={isOut ? 0 : -1}
              onClick={() => {
                setMessage(null);
                setPickingId(picking ? null : dare.id);
              }}
            >
              ✓
            </button>
          </div>
        )}
      </div>
      {picking && dare && (
        <div className={styles.witness}>
          <h3>Who saw you do it?</h3>
          {others.length ? (
            <NamePicker people={others} disabled={pending} onPick={(witnessId) => claim(dare.id, witnessId)} />
          ) : (
            <p className="muted">No one else is here yet. You need a witness.</p>
          )}
        </div>
      )}
      {message && <p className={`error ${styles.message}`}>{message}</p>}
    </div>
  );
}
