import "server-only";
import { db } from "./supabase";
import type { PollVote } from "./pollTally";
import type { Poll, Submission } from "./types";

export { tally, winnersOf, type PollVote, type TallyRow } from "./pollTally";

/** Every poll in the room (oldest first) plus the votes cast in polls that have been asked. */
export async function getRoomPolls(roomId: string): Promise<{ polls: Poll[]; votes: PollVote[] }> {
  const { data: polls, error } = await db().from("polls").select("*").eq("room_id", roomId).order("created_at");
  if (error) throw error;
  const asked = (polls ?? []).filter((p) => p.status !== "draft").map((p) => p.id);
  if (!asked.length) return { polls: (polls ?? []) as Poll[], votes: [] };

  const { data: votes, error: votesError } = await db()
    .from("poll_votes")
    .select("poll_id, voter_id, target_id")
    .in("poll_id", asked);
  if (votesError) throw votesError;
  return { polls: (polls ?? []) as Poll[], votes: (votes ?? []) as PollVote[] };
}

/** What every player screen needs besides its own content: polls, votes and pending claims. */
export async function getPlayerExtras(roomId: string) {
  const [{ polls, votes }, { data: pending, error }] = await Promise.all([
    getRoomPolls(roomId),
    db().from("submissions").select("*").eq("room_id", roomId).eq("status", "pending").order("created_at"),
  ]);
  if (error) throw error;
  return { polls, votes, pending: (pending ?? []) as Submission[] };
}
