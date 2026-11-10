export type MeowkyForm = { id:number; name:string; rarity:string; xpRequired:number; trait:string; ability:string; personality:string; palette:string; symbol:string };
export const MEOWKY_FORMS:MeowkyForm[] = [
 {id:1,name:"Mewlet",rarity:"Common",xpRequired:0,trait:"Curious beginner",ability:"First Steps — celebrates your first learning milestones.",personality:"Tiny, bright-eyed, gentle, and always ready to explore.",palette:"#f4d9b7",symbol:"✦"},
 {id:2,name:"Purrspark",rarity:"Uncommon",xpRequired:50,trait:"Newly awakened learner",ability:"Focus Spark — celebrates the first signs of a growing study habit.",personality:"Playful, warm-hearted, and crackling with little sparks of curiosity.",palette:"#f39a79",symbol:"♨"},
 {id:3,name:"Tidewhisk",rarity:"Rare",xpRequired:100,trait:"Adaptable thinker",ability:"Memory Wave — celebrates completed review sessions.",personality:"Calm, observant, and flowing smoothly around every challenge.",palette:"#72c8d0",symbol:"≈"},
 {id:4,name:"Starpaw",rarity:"Rare",xpRequired:175,trait:"Imaginative explorer",ability:"Idea Spark — celebrates creative learning milestones.",personality:"Dreamy, inventive, and guided by a growing constellation of ideas.",palette:"#a9a0e9",symbol:"✧"},
 {id:5,name:"Bloomtail",rarity:"Epic",xpRequired:275,trait:"Growing wisdom",ability:"Knowledge Bloom — celebrates consistent learning.",personality:"Patient, thoughtful, and surrounded by a flourishing little garden.",palette:"#79b991",symbol:"❋"},
 {id:6,name:"Sunwhisk",rarity:"Epic",xpRequired:400,trait:"Radiant achiever",ability:"Streak Guardian — celebrates steady effort and study streak milestones.",personality:"Optimistic, loyal, and shining with dependable confidence.",palette:"#f2c45f",symbol:"☼"},
 {id:7,name:"Moonveil",rarity:"Legendary",xpRequired:550,trait:"Moonlit scholar",ability:"Lunar Focus — celebrates deep-focus learning sessions.",personality:"Elegant, mysterious, and quietly brilliant beneath a silver glow.",palette:"#817bd2",symbol:"☾"},
 {id:8,name:"Frostflare",rarity:"Legendary",xpRequired:700,trait:"Precision specialist",ability:"Crystal Recall — celebrates review, revision, and mastery milestones.",personality:"Composed, resilient, and dazzlingly precise.",palette:"#8dc8ed",symbol:"❄"},
 {id:9,name:"Eclipseon",rarity:"Mythic",xpRequired:850,trait:"Cosmic trailblazer",ability:"Eclipse Resolve — celebrates resilience and returning stronger after setbacks.",personality:"Fearless, compassionate, and wrapped in the mystery of the cosmos.",palette:"#bd8bba",symbol:"☄"},
 {id:10,name:"Celestielle",rarity:"Celestial",xpRequired:1000,trait:"Master of the journey",ability:"Ascendant Aura — marks the ultimate evolution and every milestone beyond it.",personality:"Wise, radiant, and endlessly encouraging; the most extraordinary Meowky.",palette:"#e9c77c",symbol:"✺"}
];
export function getMeowkyForm(xp:number):MeowkyForm {
 return [...MEOWKY_FORMS].reverse().find(form=>xp>=form.xpRequired)??MEOWKY_FORMS[0];
}
export function getNextMeowkyForm(xp:number):MeowkyForm|null {
 return MEOWKY_FORMS.find(form=>form.xpRequired>xp)??null;
}
