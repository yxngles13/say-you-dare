import { AutoRefresh } from "@/components/AutoRefresh";
import { PlayerNav } from "@/components/PlayerNav";
import { PollPrompt } from "@/components/PollPrompt";
import { PollReveal } from "@/components/PollReveal";
import { WitnessPrompt } from "@/components/WitnessPrompt";
import { tally, type PollVote } from "@/lib/polls";
import type { Poll, Submission } from "@/lib/types";

type Props = {
  roomId: string;
  playerId: string;
  people: { id: string; name: string }[];
  polls: Poll[];
  votes: PollVote[];
  /** Pending claims in the room; the oldest naming this player as witness is shown. */
  pending: Submission[];
};

/**
 * Shared by every player screen: auto-refresh, the bottom nav, the live poll
 * (until this player votes), the latest poll reveal, and claims awaiting this player's word.
 */
export function PlayerChrome({ roomId, playerId, people, polls, votes, pending }: Props) {
  const livePoll = polls.find((poll) => poll.status === "live");
  const voted = !!livePoll && votes.some((vote) => vote.poll_id === livePoll.id && vote.voter_id === playerId);
  const lastRevealed = polls
    .filter((poll) => poll.status === "revealed")
    .sort((a, b) => (b.revealed_at ?? "").localeCompare(a.revealed_at ?? ""))[0];
  const names = new Map(people.map((p) => [p.id, p.name]));
  const toJudge = pending.find((sub) => sub.witness_id === playerId);

  return (
    <>
      <AutoRefresh />
      <PlayerNav roomId={roomId} pollWaiting={!!livePoll && !voted} />
      {livePoll && !voted && (
        <PollPrompt key={livePoll.id} roomId={roomId} poll={{ id: livePoll.id, question: livePoll.question }} people={people} />
      )}
      {lastRevealed && (
        <PollReveal
          key={lastRevealed.id}
          poll={{ id: lastRevealed.id, question: lastRevealed.question }}
          tally={tally(votes, lastRevealed.id, names)}
        />
      )}
      {toJudge && (
        <WitnessPrompt
          roomId={roomId}
          claim={{
            id: toJudge.id,
            claimer: names.get(toJudge.player_id) ?? "Someone",
            dareText: toJudge.dare_text,
            points: toJudge.points,
          }}
        />
      )}
    </>
  );
}
