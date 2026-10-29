import styles from "./Framed.module.css";

/** Content set inside the ornate white frame, for the entrance screens (landing, join, host). */
export function Framed({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.frame}>
      <img className={styles.ornament} src="/game/frame.webp" alt="" />
      <div className={styles.inner}>{children}</div>
    </div>
  );
}
