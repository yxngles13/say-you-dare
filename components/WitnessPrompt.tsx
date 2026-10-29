import { judgeClaim } from "@/app/actions";
import styles from "./WitnessPrompt.module.css";

type Props = {
  roomId: string;
  claim: { id: string; claimer: string; dareText: string; points: number };
};

/** A note that drops over the screen when someone names this player as their witness. */
export function WitnessPrompt({ roomId, claim }: Props) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="witness-title">
      <div className={styles.note} key={claim.id}>
        <h2 id="witness-title">A Word, Witness</h2>
        <p className={styles.who}>{claim.claimer} claims they did</p>
        <p className={styles.dare}>&ldquo;{claim.dareText}&rdquo;</p>
        <small>· {claim.points} {claim.points === 1 ? "point" : "points"} rest on your word ·</small>
      </div>
      <p className={styles.question}>Did you see it?</p>
      <div className={styles.actions}>
        <form action={judgeClaim.bind(null, roomId, claim.id, false)}>
          <button aria-label={`No, call out ${claim.claimer}`}>✕</button>
        </form>
        <form action={judgeClaim.bind(null, roomId, claim.id, true)}>
          <button className={styles.yes} aria-label={`Yes, confirm ${claim.claimer}'s dare`}>✓</button>
        </form>
      </div>
    </div>
  );
}
