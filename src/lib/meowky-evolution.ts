export type MeowkyForm = { id:number; name:string; rarity:string; xpRequired:number; trait:string; ability:string; personality:string; palette:string; symbol:string };
export const MEOWKY_FORMS:MeowkyForm[] = [
 {id:1,name:"Meowbit",rarity:"Common",xpRequired:0,trait:"Curious beginner",ability:"First Steps — celebrates your first learning milestones.",personality:"Bright-eyed, gentle, and always ready to explore.",palette:"#f4d9b7",symbol:"✦"},
 {id:2,name:"Emberpaw",rarity:"Uncommon",xpRequired:500,trait:"Determined learner",ability:"Focus Spark — gives your study streak a fiery celebration.",personality:"Brave, warm-hearted, and full of determination.",palette:"#f39a79",symbol:"♨"},
 {id:3,name:"Aquafin",rarity:"Rare",xpRequired:1500,trait:"Adaptable thinker",ability:"Memory Wave — celebrates completed review sessions.",personality:"Calm, observant, and quick to find a new approach.",palette:"#72c8d0",symbol:"≈"},
 {id:4,name:"Astrakit",rarity:"Rare",xpRequired:2500,trait:"Imaginative creator",ability:"Idea Spark — marks creative learning milestones.",personality:"Dreamy, inventive, and endlessly curious.",palette:"#a9a0e9",symbol:"✧"},
 {id:5,name:"Sylvamew",rarity:"Epic",xpRequired:3500,trait:"Growing wisdom",ability:"Knowledge Bloom — celebrates consistent learning.",personality:"Patient, thoughtful, and quietly confident.",palette:"#79b991",symbol:"❋"},
 {id:6,name:"Solaryn",rarity:"Epic",xpRequired:5000,trait:"Steadfast discipline",ability:"Streak Guardian — gives study streak milestones a special moment.",personality:"Optimistic, loyal, and wonderfully dependable.",palette:"#f2c45f",symbol:"☼"},
 {id:7,name:"Nebulyn",rarity:"Legendary",xpRequired:7000,trait:"Deep-focus explorer",ability:"Cosmic Focus — celebrates longer focused sessions.",personality:"Mysterious, composed, and fascinated by big questions.",palette:"#817bd2",symbol:"☄"},
 {id:8,name:"Cryomew",rarity:"Legendary",xpRequired:9500,trait:"Precision specialist",ability:"Recall Mastery — celebrates review and revision milestones.",personality:"Precise, cool-headed, and quietly brilliant.",palette:"#8dc8ed",symbol:"❄"},
 {id:9,name:"Eclipsara",rarity:"Mythic",xpRequired:12500,trait:"Resilient trailblazer",ability:"Phoenix Reset — celebrates returning after a difficult week.",personality:"Fearless, compassionate, and stronger after every setback.",palette:"#bd8bba",symbol:"☾"},
 {id:10,name:"Aethermeow",rarity:"Celestial",xpRequired:16000,trait:"Master of the journey",ability:"Ascendant Aura — a unique celebration for the highest evolution.",personality:"Wise, radiant, and endlessly encouraging.",palette:"#e9c77c",symbol:"✺"}
];
export function getMeowkyForm(xp:number):MeowkyForm {
 return [...MEOWKY_FORMS].reverse().find(form=>xp>=form.xpRequired)??MEOWKY_FORMS[0];
}
export function getNextMeowkyForm(xp:number):MeowkyForm|null {
 return MEOWKY_FORMS.find(form=>form.xpRequired>xp)??null;
}
