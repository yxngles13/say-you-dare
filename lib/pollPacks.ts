// Built-in "Who's most likely to…" poll packs. Each question is the part after that phrase.

export type PollPack = { id: string; name: string; questions: string[] };

export const MAX_POLL_LENGTH = 120;
export const MAX_POLLS_PER_ROOM = 100;

export const POLL_PACKS: PollPack[] = [
  {
    id: "halloween",
    name: "Halloween",
    questions: [
      "scream at their own reflection?",
      "be the first to die in a horror movie?",
      "secretly be a vampire?",
      "eat all the candy before trick-or-treaters arrive?",
      "befriend the ghost instead of running?",
      "go into the creepy basement alone?",
      "still be scared of the dark?",
      "get lost in a corn maze?",
      "survive a zombie apocalypse?",
      "summon something by accident with a Ouija board?",
      "wear the same costume every year?",
      "hand out toothbrushes instead of candy?",
      "talk their way out of a haunted house?",
      "be the villain in the horror movie?",
      "cry during a scary movie?",
    ],
  },
];

/** Accepts "Who's most likely to wear a cape?" or just "wear a cape" and returns "wear a cape?". */
export function normalizeQuestion(raw: string): string {
  let text = raw.trim().replace(/^who('|’)?s\s+(the\s+)?most\s+likely\s+to\s*/i, "").replace(/^…|^\.\.\./, "").trim();
  if (text && !/[?!.]$/.test(text)) text += "?";
  return text;
}
