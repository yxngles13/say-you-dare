"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./PlayerNav.module.css";

type Props = {
  roomId: string;
  /** A live poll this player hasn't voted on yet. */
  pollWaiting: boolean;
};

const icons = {
  dare: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <rect x="3" y="6" width="18" height="13" rx="1" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  ),
  polls: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M5 4h14v16H5z" />
      <path d="M9 9.5a3 3 0 1 1 3 3v1.5" />
      <circle cx="12" cy="17" r="0.6" />
    </svg>
  ),
  ranks: (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M4 17l-1-10 5 4 4-6 4 6 5-4-1 10z" />
      <path d="M4 20h16" />
    </svg>
  ),
};

/** Bottom bar on the player screens: the dare (home), polls, and the full leaderboard. */
export function PlayerNav({ roomId, pollWaiting }: Props) {
  const pathname = usePathname();
  const base = `/r/${roomId}`;
  const tabs = [
    { href: base, label: "Dare", icon: icons.dare },
    { href: `${base}/polls`, label: "Polls", icon: icons.polls, dot: pollWaiting },
    { href: `${base}/leaderboard`, label: "Ranks", icon: icons.ranks },
  ];

  return (
    <nav className={styles.nav} aria-label="Game">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={styles.tab}
          aria-current={pathname === tab.href ? "page" : undefined}
        >
          <span className={styles.icon}>
            {tab.icon}
            {tab.dot && <i className={styles.dot} aria-label="new poll" />}
          </span>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
