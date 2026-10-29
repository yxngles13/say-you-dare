import { Special_Elite, UnifrakturMaguntia } from "next/font/google";

/** Gothic display face for headings. */
export const blackletter = UnifrakturMaguntia({ weight: "400", subsets: ["latin"], variable: "--font-blackletter" });

/** Typewriter face for dare text and small labels. */
export const typewriter = Special_Elite({ weight: "400", subsets: ["latin"], variable: "--font-typewriter" });
