// Built-in dare packs. Hosts add a pack to their room with one tap, then edit freely.
// Points: 1 = easy, 2 = takes some nerve, 3 = hard.

export type PackDare = { text: string; points: number };
export type Pack = { id: string; name: string; dares: PackDare[] };

export const PACKS: Pack[] = [
  {
    id: "halloween",
    name: "Halloween",
    dares: [
      // Easy
      { text: "Do your best zombie walk across the room.", points: 1 },
      { text: "Take a selfie with someone whose costume is scarier than yours.", points: 1 },
      { text: "Strike your costume's most dramatic pose for a photo.", points: 1 },
      { text: "Take a photo of yourself making your scariest face.", points: 1 },
      { text: "Build a tiny tower out of candy and photograph it.", points: 1 },
      { text: "Wear something orange or black that isn't part of your costume.", points: 1 },
      { text: "Take a photo of yourself 'hiding' somewhere spooky at the party.", points: 1 },
      { text: "Pose like a classic monster (vampire, mummy or werewolf) for a photo.", points: 1 },
      { text: "Draw a ghost on a napkin and photograph it.", points: 1 },
      { text: "Take a mysterious, dramatic selfie in the dimmest corner you can find.", points: 1 },
      // Takes some nerve
      { text: "Perform a dramatic villain monologue for at least three people.", points: 2 },
      { text: "Howl like a werewolf at the top of your lungs.", points: 2 },
      { text: "Tell a ghost story to a group and swear it's true.", points: 2 },
      { text: "Say \"I vant to suck your blood\" in a vampire accent to three different people.", points: 2 },
      { text: "Introduce yourself to someone new fully in character as your costume.", points: 2 },
      { text: "Talk in a spooky narrator voice for an entire conversation.", points: 2 },
      { text: "Do a slow-motion horror movie chase scene across the room.", points: 2 },
      { text: "Wrap one arm like a mummy (toilet paper, napkins, anything) and keep it on for 10 minutes.", points: 2 },
      { text: "Give a dramatic 30-second review of every costume near you.", points: 2 },
      { text: "Do your best haunted-house scream on camera.", points: 2 },
      // Hard
      { text: "Start a conga line of at least five people.", points: 3 },
      { text: "Dramatically 'die' on the floor like the first victim in a horror movie.", points: 3 },
      { text: "Do the Thriller or Monster Mash dance in the middle of the room.", points: 3 },
      { text: "Stay in character as a ghost who doesn't know they're dead for five minutes.", points: 3 },
      { text: "Sing a spooky song (any song, sung spookily) for an audience.", points: 3 },
      { text: "Do a full runway walk to show off your costume.", points: 3 },
      { text: "Host a fake séance with at least three people and photograph it.", points: 3 },
      { text: "Lead a group of at least four people in a horror movie poster pose.", points: 3 },
      { text: "Give the party a guided tour like a ghost tour guide.", points: 3 },
      { text: "Make a toast to the spirits in your most theatrical voice.", points: 3 },
    ],
  },
];

export const MAX_DARE_LENGTH = 200;
export const MAX_DARES_PER_ROOM = 300;

/**
 * Parse a .txt pack: one dare per line, optionally ending in "| points" (1–5, default 1).
 * Blank lines and lines starting with # are ignored.
 */
export function parseDareText(text: string): { dares: PackDare[]; skipped: number } {
  const dares: PackDare[] = [];
  let skipped = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(.*?)\s*\|\s*(\d+)\s*$/);
    const dareText = (match ? match[1] : line).trim();
    const points = match ? Number(match[2]) : 1;
    if (!dareText || dareText.length > MAX_DARE_LENGTH || points < 1 || points > 5) {
      skipped++;
      continue;
    }
    dares.push({ text: dareText, points });
  }
  return { dares, skipped };
}

export function formatDareText(dares: PackDare[]): string {
  return dares.map((d) => (d.points === 1 ? d.text : `${d.text} | ${d.points}`)).join("\n") + "\n";
}
