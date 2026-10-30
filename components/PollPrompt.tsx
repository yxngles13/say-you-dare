"use client";

import { useState, useTransition } from "react";
import { votePoll } from "@/app/actions";
import { NamePicker } from "@/components/NamePicker";
import styles from "./Poll.module.css";

type Props = {
  roomId: string;
  poll: { id: string; question: string };
  people: { id: string; name: string }[];
};

/** The live poll, dropped over the screen until this player votes. */
export function PollPrompt({ roomId, poll, people }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function vote(targetId: string) {
    startTransition(async () => {
      const result = await votePoll(roomId, poll.id, targetId);
      setMessage(result?.error ?? null);
    });
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="poll-title">
      <p className="eyebrow">the room asks</p>
      <div className={styles.note} key={poll.id}>
        <h2 id="poll-title">Who&apos;s Most Likely To…</h2>
        <p>{poll.question}</p>
        <small>· your vote is secret ·</small>
      </div>
      <NamePicker people={people} disabled={pending} onPick={vote} />
      {message && <p className="error">{message}</p>}
    </div>
  );
}
