export type CompanionAvailability = "recruited" | "coming-soon";

export type CompanionProfile = {
  id: string;
  name: string;
  species: string;
  symbol: string;
  description: string;
  rarity: string;
  availability: CompanionAvailability;
  collectionLabel: string;
};

/**
 * Central companion roster.
 * Add future companions here first, then connect their dedicated art,
 * evolution rules, dialogue, and habitat as those features are implemented.
 */
export const COMPANION_ROSTER: CompanionProfile[] = [
  {
    id: "meowky",
    name: "Meowky",
    species: "Starlight cat",
    symbol: "🐱",
    description: "Your first study companion, growing alongside every little win.",
    rarity: "Common → Celestial",
    availability: "recruited",
    collectionLabel: "First companion",
  },
  {
    id: "vulpin",
    name: "Vulpin",
    species: "Moon fox",
    symbol: "🦊",
    description: "A clever woodland wanderer. Its adventure has yet to begin.",
    rarity: "To be discovered",
    availability: "coming-soon",
    collectionLabel: "Coming soon",
  },
  {
    id: "lumibun",
    name: "Lumibun",
    species: "Dream bunny",
    symbol: "🐰",
    description: "A gentle dream-chaser with a pocketful of stardust.",
    rarity: "To be discovered",
    availability: "coming-soon",
    collectionLabel: "Coming soon",
  },
  {
    id: "emberwing",
    name: "Emberwing",
    species: "Little dragon",
    symbol: "🐉",
    description: "A tiny flame keeper with a brave heart and bright future.",
    rarity: "To be discovered",
    availability: "coming-soon",
    collectionLabel: "Coming soon",
  },
];
