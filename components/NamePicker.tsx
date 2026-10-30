"use client";

import { useState } from "react";
import styles from "./NamePicker.module.css";

/** Rooms bigger than this get a search box. */
const SEARCH_FROM = 8;
/** Most names shown at once; typing narrows the rest. */
const MAX_NAMES = 12;

type Props = {
  people: { id: string; name: string }[];
  disabled?: boolean;
  onPick: (id: string) => void;
};

/** Tap-a-name buttons, with a search box once the party gets big. Used for witnesses and poll votes. */
export function NamePicker({ people, disabled, onPick }: Props) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = needle ? people.filter((p) => p.name.toLowerCase().includes(needle)) : people;
  const shown = matches.slice(0, MAX_NAMES);

  return (
    <div className={styles.picker}>
      {people.length > SEARCH_FROM && (
        <input
          className={styles.search}
          type="search"
          placeholder="Search names…"
          aria-label="Search names"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      <div className={styles.names}>
        {shown.map((person) => (
          <button key={person.id} type="button" disabled={disabled} onClick={() => onPick(person.id)}>
            {person.name}
          </button>
        ))}
      </div>
      {!matches.length && <p className="muted">No one by that name.</p>}
      {matches.length > shown.length && <p className="muted">and {matches.length - shown.length} more · keep typing</p>}
    </div>
  );
}
