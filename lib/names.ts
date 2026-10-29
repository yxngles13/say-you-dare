import { randomInt } from "node:crypto";

const ADJECTIVES = [
  "Midnight", "Neon", "Velvet", "Wild", "Secret", "Golden", "Cosmic", "Haunted", "Electric", "Sneaky",
  "Lucky", "Crimson", "Glitter", "Chaotic", "Moonlit", "Fearless", "Spicy", "Mystic", "Rowdy", "Silver",
];
const NOUNS = [
  "Raccoons", "Foxes", "Ravens", "Wolves", "Tigers", "Owls", "Bandits", "Rebels", "Phantoms", "Dragons",
  "Panthers", "Vipers", "Comets", "Goblins", "Jackals", "Falcons", "Sharks", "Llamas", "Rascals", "Hyenas",
];

const pick = (list: string[]) => list[randomInt(list.length)];

export const randomRoomName = () => `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
