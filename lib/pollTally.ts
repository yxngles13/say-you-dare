// Vote counting for polls. No server imports, so client components can use it too.

export type PollVote = { poll_id: string; voter_id: string; target_id: string };
export type TallyRow = { id: string; name: string; votes: number };

/** Votes per player for one poll, most votes first. Players with no votes are left out. */
export function tally(votes: PollVote[], pollId: string, names: Map<string, string>): TallyRow[] {
  const counts = new Map<string, number>();
  for (const vote of votes) {
    if (vote.poll_id === pollId) counts.set(vote.target_id, (counts.get(vote.target_id) ?? 0) + 1);
  }
  return [...counts]
    .map(([id, count]) => ({ id, name: names.get(id) ?? "Someone who left", votes: count }))
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
}

/** Winners of a tally (ties share it) and their vote count. */
export function winnersOf(rows: TallyRow[]): { names: string[]; votes: number } {
  const votes = rows[0]?.votes ?? 0;
  return { names: votes ? rows.filter((row) => row.votes === votes).map((row) => row.name) : [], votes };
}
