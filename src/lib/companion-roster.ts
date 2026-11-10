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
  role: string;
  personality: string;
  traits: [string, string, string];
  favoriteActivity: string;
  greeting: string;
  signatureLine: string;
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
    role: "Your gentle study partner",
    personality: "Warm-hearted, curious, and quietly brave. Meowky believes every small effort deserves a celebration.",
    traits: ["Encouraging", "Curious", "Affectionate"],
    favoriteActivity: "Studying side by side and collecting little victories",
    greeting: "Prrr! I’m happy you’re here. What shall we discover today?",
    signatureLine: "One small paw-step can lead to a whole new world.",
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
    role: "The clever pathfinder",
    personality: "Mischievous but thoughtful, Vulpin loves clever solutions and hidden trails.",
    traits: ["Resourceful", "Playful", "Observant"],
    favoriteActivity: "Solving riddles and exploring secret paths",
    greeting: "Heh, ready to find a shortcut to something wonderful?",
    signatureLine: "The best discoveries begin with a curious question.",
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
    role: "The dreamweaver",
    personality: "Gentle, imaginative, and empathetic, Lumibun turns quiet moments into bright ideas.",
    traits: ["Gentle", "Imaginative", "Kind"],
    favoriteActivity: "Dream journaling and peaceful creative breaks",
    greeting: "Hello, little dreamer. Shall we make something lovely?",
    signatureLine: "Soft thoughts can grow into extraordinary things.",
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
    role: "The fearless spark-keeper",
    personality: "Bold, loyal, and full of energy, Emberwing helps turn daunting goals into exciting quests.",
    traits: ["Courageous", "Loyal", "Energetic"],
    favoriteActivity: "Taking on challenges and celebrating brave attempts",
    greeting: "Wings ready! Which big quest are we tackling today?",
    signatureLine: "A brave beginning is already a kind of victory.",
  },
];
