"use client";

import { useEffect, useState } from "react";
import { PollBars } from "@/components/PollBars";
import { winnersOf, type TallyRow } from "@/lib/pollTally";
import styles from "./Poll.module.css";

type Props = {
  poll: { id: string; question: string };
  /** Votes per player, most first. */
  tally: TallyRow[];
};

const seenKey = (pollId: string) => `syd:reveal:${pollId}`;

/** "The room has spoken": shown once per poll on each phone, then dismissed. */
export function PollReveal({ poll, tally }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(seenKey(poll.id)) !== "1");
    } catch {
      setOpen(true);
    }
  }, [poll.id]);

  function close() {
    try {
      localStorage.setItem(seenKey(poll.id), "1");
    } catch {
      // Private mode: it may show again on the next visit.
    }
    setOpen(false);
  }

  if (!open) return null;

  const winners = winnersOf(tally);

  return (
    <div className={`${styles.overlay} ${styles.reveal}`} role="dialog" aria-modal="true" aria-labelledby="reveal-title">
      <p className="eyebrow">the room has spoken</p>
      <div className={styles.frame}>
        <img src="/game/frame.webp" alt="" />
        <div className={styles.inFrame}>
          <p className="eyebrow">most likely to {poll.question}</p>
          <h2 id="reveal-title" className={styles.winner}>
            {winners.names.length ? winners.names.join(" & ") : "No one"}
          </h2>
          <p className="eyebrow">
            {winners.votes
              ? `${winners.votes} ${winners.votes === 1 ? "vote" : "votes"}${winners.names.length > 1 ? " each" : ""}`
              : "no votes were cast"}
          </p>
        </div>
      </div>
      <PollBars tally={tally} />
      <button type="button" className="secondary" onClick={close}>
        Back to my dare
      </button>
    </div>
  );
}
