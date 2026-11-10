export type AccessorySlot = "head" | "face" | "neck" | "back" | "aura";
export type CompanionAccessory = {
  id: string;
  name: string;
  description: string;
  icon: string;
  slot: AccessorySlot;
  unlockXp: number;
  unlockAchievements?: number;
  compatibleCompanions: string[];
  color: string;
  rarity: "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "Celestial";
};

/**
 * Cosmetic catalogue. Compatibility is declared per companion so future
 * character renderers can reuse the same unlock/equip system.
 */
export const COMPANION_ACCESSORIES: CompanionAccessory[] = [
  { id:"meadow-blossom", name:"Meadow blossom", description:"A tiny flower tucked beside the ear.", icon:"🌼", slot:"head", unlockXp:0, compatibleCompanions:["meowky","vulpin","lumibun","emberwing"], color:"#f2c66d", rarity:"Common" },
  { id:"scholar-cap", name:"Scholar cap", description:"A soft cap for focused study sessions.", icon:"🎓", slot:"head", unlockXp:50, compatibleCompanions:["meowky","vulpin","lumibun","emberwing"], color:"#8b78bd", rarity:"Uncommon" },
  { id:"starlace-scarf", name:"Starlace scarf", description:"A cozy scarf threaded with little stars.", icon:"🧣", slot:"neck", unlockXp:100, compatibleCompanions:["meowky","vulpin","lumibun","emberwing"], color:"#e99b9d", rarity:"Rare" },
  { id:"moonlit-glasses", name:"Moonlit glasses", description:"Round lenses for a curious little scholar.", icon:"👓", slot:"face", unlockXp:175, compatibleCompanions:["meowky","vulpin","lumibun"], color:"#7e9ec9", rarity:"Rare" },
  { id:"aurora-wings", name:"Aurora wings", description:"A pair of soft, shimmering fantasy wings.", icon:"🪽", slot:"back", unlockXp:275, compatibleCompanions:["meowky","vulpin","lumibun","emberwing"], color:"#9cc9d7", rarity:"Epic" },
  { id:"sunbeam-cape", name:"Sunbeam cape", description:"A brave little cape for big learning quests.", icon:"🦸", slot:"back", unlockXp:400, unlockAchievements:3, compatibleCompanions:["meowky","vulpin","emberwing"], color:"#e9b75f", rarity:"Epic" },
  { id:"moonhalo", name:"Moon halo", description:"A quiet ring of moonlight above your companion.", icon:"🌙", slot:"aura", unlockXp:550, compatibleCompanions:["meowky","vulpin","lumibun","emberwing"], color:"#b9a8ed", rarity:"Legendary" },
  { id:"celestial-crown", name:"Celestial crown", description:"A radiant crown for a truly legendary journey.", icon:"👑", slot:"head", unlockXp:850, unlockAchievements:5, compatibleCompanions:["meowky","vulpin","lumibun","emberwing"], color:"#e9cf83", rarity:"Celestial" },
];
export type EquippedAccessories = Partial<Record<AccessorySlot,string>>;
export function getAccessoryUnlockReason(item: CompanionAccessory, xp: number, achievementCount: number): string | null {
  if (xp >= item.unlockXp || (item.unlockAchievements !== undefined && achievementCount >= item.unlockAchievements)) return null;
  if (item.unlockAchievements !== undefined) return `Reach ${item.unlockXp} XP or earn ${item.unlockAchievements} achievements`;
  return `Unlock at ${item.unlockXp.toLocaleString()} XP`;
}
