export type HabitatId = "meadow" | "starlight" | "moonlit";
export type CompanionHabitat = {
  companionId: string;
  name: string;
  description: string;
  themes: Record<HabitatId,{name:string;ambient:string;accent:string;ground:string;greeting:string}>;
  idleStyle: string;
  interactionLines: {happy:string;focused:string;sleepy:string};
};

/** Species-specific habitat identities. Only Meowky's habitat is playable today. */
export const COMPANION_HABITATS: Record<string,CompanionHabitat> = {
  meowky:{
    companionId:"meowky",name:"Whiskerlight Nook",description:"A gentle hideaway where little victories glow like fireflies.",
    themes:{
      meadow:{name:"Meadow Glade",ambient:"#d9efcf",accent:"#f5d58a",ground:"#9fbd91",greeting:"The meadow breeze smells like a brand-new adventure."},
      starlight:{name:"Starlight Grove",ambient:"#d9d2f2",accent:"#f5e5a2",ground:"#8d85b6",greeting:"Look! The stars have made a little path just for us."},
      moonlit:{name:"Moonlit Sanctuary",ambient:"#c7d8ee",accent:"#b7c9f4",ground:"#788ba9",greeting:"It's peaceful here. Let's listen to the moonbeams."}
    },
    idleStyle:"curious-paws",
    interactionLines:{happy:"Meowky chases a drifting spark and returns with a proud little purr.",focused:"Meowky settles in, tail curled neatly around a tiny study nook.",sleepy:"Meowky tucks its paws beneath its chest and dreams beneath the soft lights."}
  },
  vulpin:{
    companionId:"vulpin",name:"Foxglade Trails",description:"A winding woodland clearing with secret paths and glowing mushrooms.",
    themes:{meadow:{name:"Fernpath Clearing",ambient:"#cce7c4",accent:"#f1bd76",ground:"#8aaa78",greeting:"A secret trail! I knew we'd find one."},starlight:{name:"Foxfire Canopy",ambient:"#d8c9ee",accent:"#f6d58a",ground:"#8177a4",greeting:"Those foxfires are pointing toward a mystery."},moonlit:{name:"Silverpine Hollow",ambient:"#c3d5e7",accent:"#c4d4f6",ground:"#778da0",greeting:"Quiet paws, bright eyes. The forest is awake."}},
    idleStyle:"trail-scout",interactionLines:{happy:"Vulpin darts after a firefly and peeks back with a mischievous grin.",focused:"Vulpin studies a tiny trail map, ears perked for clues.",sleepy:"Vulpin curls up beneath a fern, keeping one ear on the forest."}
  },
  lumibun:{
    companionId:"lumibun",name:"Dreamdew Garden",description:"A floating garden of soft petals, cloud cushions, and sleepy stardust.",
    themes:{meadow:{name:"Petal Meadow",ambient:"#f5dce9",accent:"#f8c5c9",ground:"#b7c99f",greeting:"I saved the softest flower for you."},starlight:{name:"Cloudberry Sky",ambient:"#dddafa",accent:"#f4e3ad",ground:"#a69bc8",greeting:"Let's make a wish and let it float."},moonlit:{name:"Moonmilk Pond",ambient:"#d4e2f2",accent:"#d5cafa",ground:"#8da6b9",greeting:"The pond is holding all our quiet dreams."}},
    idleStyle:"dream-drift",interactionLines:{happy:"Lumibun bounces through drifting petals, leaving a trail of glitter.",focused:"Lumibun arranges little dream notes in a perfect row.",sleepy:"Lumibun nestles into a cloud cushion and gives a tiny yawn."}
  },
  emberwing:{
    companionId:"emberwing",name:"Emberfall Roost",description:"A warm volcanic perch with gentle crystal flames and a safe nest.",
    themes:{meadow:{name:"Mossfire Terrace",ambient:"#e9dfc8",accent:"#f0a56f",ground:"#a7a17b",greeting:"Even a little spark can light the way!"},starlight:{name:"Cometforge Nest",ambient:"#e4d3d4",accent:"#ffbc75",ground:"#9b8290",greeting:"Ready to launch into our next quest?"},moonlit:{name:"Ashen Moon Crag",ambient:"#cbd4e2",accent:"#e5ad92",ground:"#838d9d",greeting:"The embers are calm. We can rest before the next flight."}},
    idleStyle:"ember-flutter",interactionLines:{happy:"Emberwing gives a tiny wing-flap and sends warm sparks into the air.",focused:"Emberwing guards the quest list like a very serious little dragon.",sleepy:"Emberwing curls around a warm ember and lets its tail glow softly."}
  }
};
export function getCompanionHabitat(companionId:string):CompanionHabitat{return COMPANION_HABITATS[companionId]??COMPANION_HABITATS.meowky;}
