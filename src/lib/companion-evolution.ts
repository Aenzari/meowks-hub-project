import { MEOWKY_FORMS } from "./meowky-evolution";

export type CompanionEvolutionStage = {
  id: number;
  name: string;
  rarity: string;
  xpRequired: number;
  trait: string;
  palette: string;
  symbol: string;
};

export type CompanionEvolutionPath = {
  companionId: string;
  stages: CompanionEvolutionStage[];
};

const thresholds = [0, 50, 100, 175, 275, 400, 550, 700, 850, 1000];
const rarities = ["Common", "Uncommon", "Rare", "Rare", "Epic", "Epic", "Legendary", "Legendary", "Mythic", "Celestial"];

function buildPath(
  companionId: string,
  forms: Array<{ name: string; trait: string; palette: string; symbol: string }>
): CompanionEvolutionPath {
  return {
    companionId,
    stages: forms.map((form, index) => ({
      id: index + 1,
      name: form.name,
      rarity: rarities[index],
      xpRequired: thresholds[index],
      trait: form.trait,
      palette: form.palette,
      symbol: form.symbol,
    })),
  };
}

export const COMPANION_EVOLUTION_PATHS: Record<string, CompanionEvolutionPath> = {
  meowky: {
    companionId: "meowky",
    stages: MEOWKY_FORMS.map((form) => ({
      id: form.id,
      name: form.name,
      rarity: form.rarity,
      xpRequired: form.xpRequired,
      trait: form.trait,
      palette: form.palette,
      symbol: form.symbol,
    })),
  },
  vulpin: buildPath("vulpin", [
    { name: "Kitfox", trait: "A curious little trailfinder", palette: "#f1c49a", symbol: "✦" },
    { name: "Emberkit", trait: "A quick-footed spark chaser", palette: "#ed9a69", symbol: "♨" },
    { name: "Brambletail", trait: "A clever woodland scout", palette: "#9caa78", symbol: "❧" },
    { name: "Duskpouncer", trait: "A nimble twilight explorer", palette: "#a58bc2", symbol: "☾" },
    { name: "Glimmerfox", trait: "A bright and resourceful guide", palette: "#e7ad79", symbol: "✧" },
    { name: "Runeblaze", trait: "A guardian of hidden trails", palette: "#d77d58", symbol: "⌘" },
    { name: "Astravulp", trait: "A moonlit pathfinder", palette: "#777db5", symbol: "☽" },
    { name: "Frostprowler", trait: "A master of silent journeys", palette: "#a9d3dc", symbol: "❄" },
    { name: "Nightsol", trait: "A mythic keeper of secret roads", palette: "#67547f", symbol: "☄" },
    { name: "Celestifox", trait: "The celestial compass of all journeys", palette: "#f0cb83", symbol: "✺" },
  ]),
  lumibun: buildPath("lumibun", [
    { name: "Dewdrop", trait: "A gentle dream beginner", palette: "#f3d9e8", symbol: "♡" },
    { name: "Petalhop", trait: "A playful garden dreamer", palette: "#edb4d1", symbol: "❀" },
    { name: "Mistribbon", trait: "A soft-hearted cloud wanderer", palette: "#b9c8eb", symbol: "≈" },
    { name: "Stardapple", trait: "A curious collector of wishes", palette: "#c5a9e7", symbol: "✧" },
    { name: "Bloomwhisper", trait: "A keeper of growing hopes", palette: "#a9d4bd", symbol: "❋" },
    { name: "Daydreamer", trait: "A radiant maker of possibilities", palette: "#f1c5a2", symbol: "☼" },
    { name: "Moonpetal", trait: "A graceful guardian of dreams", palette: "#a79bd9", symbol: "☾" },
    { name: "Aurorabelle", trait: "A luminous weaver of wonder", palette: "#a9dce0", symbol: "❄" },
    { name: "Somnielle", trait: "A mythic heart of peaceful magic", palette: "#c49acb", symbol: "☄" },
    { name: "Celestibun", trait: "The celestial dreamweaver", palette: "#f0d79a", symbol: "✺" },
  ]),
  emberwing: buildPath("emberwing", [
    { name: "Cinderling", trait: "A brave little flame keeper", palette: "#e9b18c", symbol: "♨" },
    { name: "Sparktail", trait: "A spirited spark flier", palette: "#ed946d", symbol: "✦" },
    { name: "Ashscale", trait: "A resilient young dragon", palette: "#9c9a9a", symbol: "⌁" },
    { name: "Flarecrest", trait: "A bold challenger taking flight", palette: "#e77b55", symbol: "✧" },
    { name: "Sunscale", trait: "A steadfast keeper of warm courage", palette: "#e9bd65", symbol: "☼" },
    { name: "Pyroclast", trait: "A powerful guardian of the forge", palette: "#c96d4e", symbol: "♨" },
    { name: "Stormwyrm", trait: "A legendary master of sky and flame", palette: "#8c8ac7", symbol: "☾" },
    { name: "Frostphoenix", trait: "A rare balance of fire and ice", palette: "#9bc9df", symbol: "❄" },
    { name: "Eclipsewyrm", trait: "A mythic dragon beyond the horizon", palette: "#826b9c", symbol: "☄" },
    { name: "Celestidrake", trait: "The celestial heart of dragonkind", palette: "#f1cd79", symbol: "✺" },
  ]),
};

export function getCompanionEvolutionPath(companionId: string): CompanionEvolutionPath | null {
  return COMPANION_EVOLUTION_PATHS[companionId] ?? null;
}

export function getCompanionEvolutionStage(companionId: string, xp: number): CompanionEvolutionStage | null {
  const path = getCompanionEvolutionPath(companionId);
  if (!path) return null;
  return [...path.stages].reverse().find((stage) => xp >= stage.xpRequired) ?? path.stages[0] ?? null;
}

export function getNextCompanionEvolutionStage(companionId: string, xp: number): CompanionEvolutionStage | null {
  const path = getCompanionEvolutionPath(companionId);
  return path?.stages.find((stage) => stage.xpRequired > xp) ?? null;
}
