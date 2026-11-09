export type MeowkyForm = { id:number; name:string; rarity:string; xpRequired:number; trait:string; ability:string; personality:string; palette:string; symbol:string };
export const MEOWKY_FORMS:MeowkyForm[] = [
 {id:1,name:"Mewbie",rarity:"Common",xpRequired:0,trait:"Curious little beginner",ability:"First Paws — celebrates the start of your learning journey.",personality:"A tiny, bright-eyed kitten discovering the world.",palette:"#f4d9b7",symbol:"✦"},
 {id:2,name:"Pawsie",rarity:"Common",xpRequired:50,trait:"Eager explorer",ability:"Happy Hop — celebrates your first steady steps.",personality:"Playful, friendly, and always ready to try.",palette:"#f39a79",symbol:"♡"},
 {id:3,name:"Whisklet",rarity:"Uncommon",xpRequired:125,trait:"Growing learner",ability:"Whisker Wisdom — celebrates every new thing learned.",personality:"A little bolder, with a nose for discovery.",palette:"#72c8d0",symbol:"≈"},
 {id:4,name:"Mochiri",rarity:"Uncommon",xpRequired:225,trait:"Creative thinker",ability:"Mochi Spark — celebrates curious ideas and practice.",personality:"Soft-hearted, imaginative, and quietly clever.",palette:"#a9a0e9",symbol:"✧"},
 {id:5,name:"Lunabelle",rarity:"Rare",xpRequired:350,trait:"Thoughtful achiever",ability:"Moonlit Focus — celebrates consistent study.",personality:"Graceful and calm, with a growing inner glow.",palette:"#79b991",symbol:"☾"},
 {id:6,name:"Starwhisk",rarity:"Rare",xpRequired:500,trait:"Confident adventurer",ability:"Starlight Streak — celebrates your dedication.",personality:"Brave, bright, and ready for bigger challenges.",palette:"#f2c45f",symbol:"☼"},
 {id:7,name:"Aurapurr",rarity:"Epic",xpRequired:650,trait:"Radiant scholar",ability:"Aura of Insight — celebrates meaningful progress.",personality:"Wise beyond its years, with a brilliant presence.",palette:"#817bd2",symbol:"✺"},
 {id:8,name:"Eclipsia",rarity:"Epic",xpRequired:800,trait:"Masterful dreamer",ability:"Eclipse Veil — celebrates resilience and focus.",personality:"Elegant, mysterious, and wonderfully composed.",palette:"#8dc8ed",symbol:"☄"},
 {id:9,name:"Seraphyne",rarity:"Legendary",xpRequired:925,trait:"Celestial guardian",ability:"Seraphic Light — celebrates near-perfect dedication.",personality:"Majestic, kind, and surrounded by quiet wonder.",palette:"#bd8bba",symbol:"❋"},
 {id:10,name:"Aetheria",rarity:"Celestial",xpRequired:1000,trait:"The ultimate Meowky",ability:"Aether Ascension — the highest evolution, earned at 1,000 XP.",personality:"A legendary companion whose light reflects your journey.",palette:"#e9c77c",symbol:"✧"}
];
export function getMeowkyForm(xp:number):MeowkyForm {
 return [...MEOWKY_FORMS].reverse().find(form=>xp>=form.xpRequired)??MEOWKY_FORMS[0];
}
export function getNextMeowkyForm(xp:number):MeowkyForm|null {
 return MEOWKY_FORMS.find(form=>form.xpRequired>xp)??null;
}
