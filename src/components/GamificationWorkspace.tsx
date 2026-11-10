import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Meowky } from "./Meowky";
import { Meowky3D } from "./Meowky3D";
import { MEOWKY_FORMS, getMeowkyForm, getNextMeowkyForm } from "../lib/meowky-evolution";

type Stats = { xp:number; level:number; current_streak:number; longest_streak:number; last_activity_date:string|null };
type Achievement = { achievement_id:string; earned_at:string; catalog:{name:string;description:string;icon:string}|null };
type Leader = { user_id:string; display_name:string; xp:number; level:number; current_streak:number; rank:number };
type MeowkyCare = { fullness:number; joy:number; energy:number; bond:number; completed:string[]; day:string };
type MeowkyMemory = { id:string; title:string; detail:string; icon:string; date:string; category:"journey"|"evolution"|"achievement"|"streak"|"care" };

export function GamificationWorkspace({userId}:{userId:string}) {
  const [stats,setStats]=useState<Stats|null>(null);
  const [achievements,setAchievements]=useState<Achievement[]>([]);
  const [catalog,setCatalog]=useState<Record<string,{name:string;description:string;icon:string}>>({});
  const [leaders,setLeaders]=useState<Leader[]>([]);
  const [optIn,setOptIn]=useState(false);
  const [todayMinutes,setTodayMinutes]=useState(0);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [companionMood,setCompanionMood]=useState<"happy"|"focused"|"sleepy">("focused");
  const [companionLine,setCompanionLine]=useState("I’m right here. Let’s make one small step count.");
  const [headpats,setHeadpats]=useState(0);
  const [roomTheme,setRoomTheme]=useState<"meadow"|"starlight"|"moonlit">("meadow");
  const [roomDecor,setRoomDecor]=useState("sprout");
  const [care,setCare]=useState<MeowkyCare>({fullness:68,joy:62,energy:76,bond:0,completed:[],day:new Date().toLocaleDateString("en-CA")});
  const [careReady,setCareReady]=useState(false);
  const [surpriseLine,setSurpriseLine]=useState("");
  const [surpriseUsed,setSurpriseUsed]=useState(false);
  const [journal,setJournal]=useState<MeowkyMemory[]>([]);
  const [journalReady,setJournalReady]=useState(false);
  const [journalOwner,setJournalOwner]=useState("");
  const [journalFilter,setJournalFilter]=useState<"all"|"journey"|"evolution"|"achievement"|"streak"|"care">("all");
  const [evolutionCelebration,setEvolutionCelebration]=useState<(typeof MEOWKY_FORMS)[number]|null>(null);

  async function refresh(){
    if(!supabase)return;
    setError("");
    const [s,a,c,p,l,study]=await Promise.all([
      supabase.from("user_stats").select("xp,level,current_streak,longest_streak,last_activity_date").eq("user_id",userId).maybeSingle(),
      supabase.from("user_achievements").select("achievement_id,earned_at").eq("user_id",userId).order("earned_at",{ascending:false}),
      supabase.from("meowks_achievements").select("id,name,description,icon").order("name"),
      supabase.from("profiles").select("leaderboard_opt_in").eq("id",userId).single(),
      supabase.rpc("meowks_leaderboard",{p_limit:20}),
      supabase.from("study_sessions").select("duration_seconds").eq("user_id",userId).gte("started_at",new Date(new Date().setHours(0,0,0,0)).toISOString())
    ]);
    const failure=s.error||a.error||c.error||p.error||l.error||study.error;
    if(failure){setError(failure.message);return;}
    setStats((s.data as Stats|null));
    setAchievements((a.data||[]).map((item:any)=>({...item,catalog:null})));
    setCatalog(Object.fromEntries((c.data||[]).map((item:any)=>[item.id,{name:item.name,description:item.description,icon:item.icon}])));
    setOptIn(Boolean(p.data?.leaderboard_opt_in));
    setLeaders((l.data||[]) as Leader[]);
    setTodayMinutes(Math.floor((study.data||[]).reduce((sum:any,item:any)=>sum+item.duration_seconds,0)/60));
  }
  useEffect(()=>{void refresh();},[userId]);
  useEffect(()=>{
    const today=new Date().toLocaleDateString("en-CA");
    try{
      const saved=window.localStorage.getItem("achieve-meowky-care-"+userId);
      if(saved){
        const parsed=JSON.parse(saved) as MeowkyCare;
        if(typeof parsed.fullness==="number"&&typeof parsed.joy==="number"&&typeof parsed.energy==="number"&&typeof parsed.bond==="number"){
          setCare({...parsed,completed:parsed.day===today&&Array.isArray(parsed.completed)?parsed.completed:[],day:today});
        }else{setCare(value=>({...value,day:today,completed:[]}));}
      }else{setCare(value=>({...value,day:today}));}
    }catch{setCare(value=>({...value,day:today,completed:[]}));}
    setCareReady(true);
  },[userId]);
  useEffect(()=>{if(!careReady)return;try{window.localStorage.setItem("achieve-meowky-care-"+userId,JSON.stringify(care));}catch{/* Care remains available for this visit if storage is unavailable. */}},[care,userId,careReady]);
  useEffect(()=>{try{const saved=window.localStorage.getItem("achieve-meowky-journal-"+userId);const parsed=saved?JSON.parse(saved):[];setJournal(Array.isArray(parsed)?parsed.filter((item:any)=>item&&typeof item.id==="string"&&typeof item.title==="string"):[]);}catch{setJournal([]);}setJournalReady(true);setJournalOwner(userId);},[userId]);
  useEffect(()=>{if(!journalReady||journalOwner!==userId)return;try{window.localStorage.setItem("achieve-meowky-journal-"+userId,JSON.stringify(journal.slice(0,100)));}catch{/* Journal remains available for this visit if storage is unavailable. */}},[journal,userId,journalReady,journalOwner]);


  async function toggleLeaderboard(){
    if(!supabase)return;
    setBusy(true);setError("");setNotice("");
    const next=!optIn;
    const {error:e}=await supabase.from("profiles").update({leaderboard_opt_in:next}).eq("id",userId);
    setBusy(false);
    if(e){setError(e.message);return;}
    setOptIn(next);setNotice(next?"You're now visible on the opt-in leaderboard.":"Your name has been removed from the leaderboard.");
    await refresh();
  }

  const xp=stats?.xp??0;
  const level=stats?.level??1;
  const levelProgress=xp%250;
  const earned=new Set(achievements.map(item=>item.achievement_id));
  const dailyGoal=30;
  const currentForm=getMeowkyForm(xp);
  const nextForm=getNextMeowkyForm(xp);
  const evolutionProgress=nextForm?Math.min(100,Math.round(((xp-currentForm.xpRequired)/(nextForm.xpRequired-currentForm.xpRequired))*100)):100;
  useEffect(()=>{
    if(!stats)return;
    const key=`achieve-meowky-form-${userId}`;
    try{
      const previous=Number(window.localStorage.getItem(key));
      if(!previous){window.localStorage.setItem(key,String(currentForm.id));return;}
      if(currentForm.id>previous){setEvolutionCelebration(currentForm);setCompanionMood("happy");setCompanionLine(`${currentForm.name} has arrived! I’m so proud of how far we’ve come.`);}
      window.localStorage.setItem(key,String(currentForm.id));
    }catch{ /* Storage may be unavailable; the companion remains usable. */ }
  },[userId,stats,currentForm.id]);
  const companionRank=currentForm.id>=10?"Celestial guardian":currentForm.id>=9?"Cosmic companion":currentForm.id>=7?"Starlit mentor":currentForm.id>=5?"Growing guide":currentForm.id>=3?"Curious explorer":"Little learning buddy";
  const bondStage=xp>=850?"Soulbound":xp>=550?"Inseparable":xp>=275?"Trusted friend":xp>=100?"Growing friendship":"New friend";
  const bondMessage=xp>=850?"Your bond has become something legendary.":xp>=550?"Meowky knows your rhythm and celebrates every return.":xp>=275?"Your shared study adventures are becoming a real friendship.":xp>=100?"Every session helps your little friendship grow.":"Every journey begins with one small hello.";
  const roomRank=xp>=850?"Celestial sanctuary":xp>=550?"Starlit hideaway":xp>=275?"Enchanted nook":xp>=100?"Cozy corner":"A little place to begin";
  const roomDecorations=[{id:"sprout",name:"Moonflower sprout",icon:"🌱",unlock:0},{id:"books",name:"Study book stack",icon:"📚",unlock:50},{id:"lantern",name:"Dream lantern",icon:"🏮",unlock:100},{id:"crystal",name:"Star crystal",icon:"💎",unlock:275},{id:"moon",name:"Moon window",icon:"🌙",unlock:550},{id:"crown",name:"Celestial crown",icon:"👑",unlock:850}];
  const activeDecor=roomDecorations.find(item=>item.id===roomDecor)||roomDecorations[0];
  const currentHour=new Date().getHours();
  const timeOfDay: "morning"|"day"|"evening"=currentHour<11?"morning":currentHour<18?"day":"evening";
  const timeGreeting=timeOfDay==="morning"?"A bright morning stretch":timeOfDay==="day"?"A sunny afternoon pause":"A soft evening wind-down";
  const daysSinceActivity=stats?.last_activity_date?Math.max(0,Math.floor((new Date(new Date().toLocaleDateString("en-CA")).getTime()-new Date(stats.last_activity_date+"T00:00:00").getTime())/86400000)):null;
  const returnGreeting=daysSinceActivity!==null&&daysSinceActivity>=2?"I missed you! Every return is a fresh beginning.":daysSinceActivity===1?"Welcome back! I saved a little purr just for you.":"It’s lovely spending another day together.";
  const activityDialogue=todayMinutes>=30?"You reached today's study goal! I’m doing the proudest little purr.":todayMinutes>0?"I saw you studying today. Every minute is a tiny victory.":(stats?.current_streak??0)>=3?"Your study streak is still glowing. Shall we keep it going?":"Ready when you are. We can start with just five minutes.";
  const friendshipTier=care.bond>=30?"Soul companion":care.bond>=15?"Best friends":care.bond>=7?"Close friends":care.bond>=3?"Good friends":"New friends";
  useEffect(()=>{
    if(!journalReady||!stats)return;
    const today=new Date().toLocaleDateString("en-CA");
    const memories:MeowkyMemory[]=[];
    if(currentForm.id>1)memories.push({id:"evolution-"+currentForm.id,title:currentForm.name+" awakened",detail:"You reached "+currentForm.xpRequired.toLocaleString()+" XP and unlocked the "+currentForm.rarity+" form.",icon:"✨",date:today,category:"evolution"});
    if(todayMinutes>=30)memories.push({id:"daily-goal-"+today,title:"A focused day",detail:"You completed at least 30 minutes of study. Meowky is celebrating your effort.",icon:"📚",date:today,category:"journey"});
    if((stats.current_streak??0)>=3)memories.push({id:"streak-"+stats.current_streak,title:stats.current_streak+" day study streak",detail:"You kept showing up for your learning journey. One day at a time adds up.",icon:"🔥",date:today,category:"streak"});
    achievements.forEach(item=>{const info=catalog[item.achievement_id];if(info)memories.push({id:"achievement-"+item.achievement_id,title:info.name,detail:info.description||"You earned a new achievement on your learning journey.",icon:info.icon||"🏅",date:item.earned_at?new Date(item.earned_at).toLocaleDateString("en-CA"):today,category:"achievement"});});
    setJournal(existing=>{const known=new Set(existing.map(item=>item.id));const fresh=memories.filter(item=>!known.has(item.id));if(existing.length===0&&fresh.length===0)fresh.push({id:"journey-begins",title:"Our adventure begins",detail:"This is where your memories with Meowky begin. Every little step can become a story.",icon:"🐾",date:today,category:"journey"});return fresh.length?[...fresh,...existing].slice(0,100):existing;});
  },[journalReady,stats,currentForm.id,todayMinutes,achievements,catalog]);
  function addCareMemory(action:"feed"|"play"|"rest"){
    const details={feed:{title:"A thoughtful snack",detail:"You shared a little snack with Meowky and made sure they felt cared for.",icon:"🍪"},play:{title:"Playtime together",detail:"You took a playful break with Meowky and shared a happy moment.",icon:"🧶"},rest:{title:"A peaceful rest",detail:"You helped Meowky recharge. Rest is part of every good journey.",icon:"🌙"}};
    const item=details[action];const memory:MeowkyMemory={id:"care-"+care.day+"-"+action,title:item.title,detail:item.detail,icon:item.icon,date:care.day,category:"care"};
    setJournal(existing=>existing.some(entry=>entry.id===memory.id)?existing:[memory,...existing].slice(0,100));
  }
  const surpriseMessages=["A tiny star fell into our room. I think it wished us a wonderful day!","Secret mission: stretch your shoulders, sip some water, and come back when you're ready.","I found a little imaginary flower and named it after you.","Psst… your effort matters, even on the days progress feels slow.","If I could give you one thing, it would be a pocket-sized bit of courage."];
  function revealSurprise(){
    const index=Math.floor(Math.random()*surpriseMessages.length);
    setSurpriseLine(surpriseMessages[index]);setSurpriseUsed(true);
    setCompanionMood("happy");setCompanionLine(surpriseMessages[index]);
  }

  function careForMeowky(action:"feed"|"play"|"rest"){
    const effects={feed:{fullness:22,joy:4,energy:-2,line:"Nom nom! That snack was purr-fect. Thank you!"},play:{fullness:-5,joy:22,energy:-12,line:"Wheee! That was so much fun. You always know how to make me smile!"},rest:{fullness:-2,joy:3,energy:24,line:"Mmm… a little rest feels wonderful. I’m all recharged!"}};
    const change=effects[action];
    addCareMemory(action);
    setCare(value=>({...value,fullness:Math.max(0,Math.min(100,value.fullness+change.fullness)),joy:Math.max(0,Math.min(100,value.joy+change.joy)),energy:Math.max(0,Math.min(100,value.energy+change.energy)),bond:value.bond+1,completed:value.completed.includes(action)?value.completed:[...value.completed,action]}));
    setCompanionMood(action==="rest"?"sleepy":"happy");setCompanionLine(change.line);
  }

  return <section className="feature-page gamification-workspace">
    <div className="feature-heading"><div><p className="eyebrow">EVERY LITTLE WIN COUNTS</p><h1>My Space<span className="coral">.</span></h1><p className="subheading">Your learning journey, one paw at a time.</p></div><div className="gamification-level">🐾 <strong>Level {level}</strong></div></div>
    <section className={"meowky-companion meowky-companion-interactive mood-" + companionMood} aria-label="Your Meowky companion">
      <div className="meowky-companion-copy"><p className="eyebrow">YOUR COMPANION · {currentForm.rarity.toUpperCase()}</p><h2>{currentForm.name}</h2><span className="meowky-companion-rank">{companionRank}</span><p className="meowky-companion-personality">{currentForm.personality}</p><span className="meowky-bond-level">♡ {bondStage}</span><p className="meowky-bond-message">{bondMessage}</p><p className="meowky-companion-dialogue" aria-live="polite">{companionLine}</p><span className="meowky-mood-label">{todayMinutes >= 30 ? "✦ Daily study goal reached" : "♡ Your companion is here"}</span><div className="meowky-companion-actions" role="group" aria-label="Companion mood"><button type="button" onClick={()=>{setCompanionMood("focused");setCompanionLine("I’m right here. Let’s make one small step count.");}}>Study together</button><button type="button" onClick={()=>{setCompanionMood("sleepy");setCompanionLine("Even the brightest minds need a little rest. Take a gentle breather.");}}>Rest mode</button><button type="button" onClick={()=>{setCompanionMood("happy");setCompanionLine("You’re doing better than you think. Every little win deserves a cheer!");}}>Cheer me on</button><button type="button" className="meowky-headpat" onClick={()=>{setCompanionMood("happy");setCompanionLine(["Prrr! That was a lovely headpat.","Meowky’s whiskers are doing a happy dance!","A tiny purr of appreciation, just for you."][headpats%3]);setHeadpats(value=>value+1);}}>♡ Headpat</button></div><small className="meowky-headpat-count" aria-live="polite">{headpats} headpats this visit</small></div>
      <div className="meowky-companion-art meowky-evolution-stage" data-rarity={currentForm.rarity.toLowerCase()}><span className="meowky-stage-aura" aria-hidden="true"/><Meowky3D formId={currentForm.id} mood={companionMood} timeOfDay={timeOfDay} /><span className="meowky-stage-name">{currentForm.name}</span></div>
    </section>

    <section className="meowky-care panel" aria-label="Meowky daily care">
      <div className="meowky-home-heading"><div><p className="eyebrow">LITTLE MOMENTS OF CARE</p><h2>Meowky's daily life</h2><p>{timeGreeting} · Your companion feels loved when you spend time together.</p></div><span className="meowky-care-bond">♡ {care.bond} care bonds</span></div>
      <div className="meowky-care-meters">
        <div><div className="meowky-care-meter-label"><span>🍪 Fullness</span><b>{care.fullness}%</b></div><div className="meowky-care-track"><span style={{width:care.fullness+"%"}}/></div></div>
        <div><div className="meowky-care-meter-label"><span>💖 Happiness</span><b>{care.joy}%</b></div><div className="meowky-care-track joy"><span style={{width:care.joy+"%"}}/></div></div>
        <div><div className="meowky-care-meter-label"><span>⚡ Energy</span><b>{care.energy}%</b></div><div className="meowky-care-track energy"><span style={{width:care.energy+"%"}}/></div></div>
      </div>
      <div className="meowky-care-actions" role="group" aria-label="Care for Meowky">
        <button type="button" disabled={care.completed.includes("feed")} onClick={()=>careForMeowky("feed")}><span>🍪</span><b>{care.completed.includes("feed")?"Snack given":"Give a snack"}</b><small>{care.completed.includes("feed")?"Today's care complete":"Restore fullness"}</small></button>
        <button type="button" disabled={care.completed.includes("play")} onClick={()=>careForMeowky("play")}><span>🧶</span><b>{care.completed.includes("play")?"Playtime done":"Play together"}</b><small>{care.completed.includes("play")?"Today's care complete":"Boost happiness"}</small></button>
        <button type="button" disabled={care.completed.includes("rest")} onClick={()=>careForMeowky("rest")}><span>🌙</span><b>{care.completed.includes("rest")?"Rest complete":"Take a rest"}</b><small>{care.completed.includes("rest")?"Today's care complete":"Restore energy"}</small></button>
      </div>
      <div className="meowky-care-quest"><div><p className="eyebrow">DAILY CARE QUEST</p><strong>{care.completed.length} / 3 moments shared</strong><p>{care.completed.length===3?"You made Meowky's day! Come back tomorrow for another little routine.":"Complete all three care moments to finish today's companion routine."}</p></div><div className="meowky-care-paws" aria-label={care.completed.length+" of 3 daily care tasks completed"}>{["feed","play","rest"].map((task,index)=><span key={task} className={care.completed.includes(task)?"done":""}>{care.completed.includes(task)?"🐾":index+1}</span>)}</div></div>
      <p className="meowky-home-note">Care progress is saved on this device and resets its daily checklist each new day. Care bonds are for fun and do not change your study XP.</p>
    </section>

    <section className="meowky-bond-story panel" aria-label="Your relationship with Meowky">
      <div className="meowky-home-heading"><div><p className="eyebrow">A FRIENDSHIP THAT GROWS</p><h2>{friendshipTier}</h2><p>{returnGreeting}</p></div><span className="meowky-care-bond">♡ {care.bond} bonds</span></div>
      <div className="meowky-story-grid">
        <article><span>📖</span><small>YOUR STUDY STORY</small><p>{activityDialogue}</p></article>
        <article><span>🔥</span><small>STREAK MOMENT</small><p>{(stats?.current_streak??0)>0?"We're on a "+stats!.current_streak+" day study streak. Let's celebrate showing up!":"Every streak starts with one study session. I'll be cheering you on."}</p></article>
      </div>
      <div className="meowky-surprise-row"><div><strong>✨ A little surprise</strong><p>{surpriseLine||"There's a small bit of magic waiting whenever you need a smile."}</p></div><button type="button" disabled={surpriseUsed} onClick={revealSurprise}>{surpriseUsed?"Surprise discovered":"Reveal surprise"}</button></div>
      {(todayMinutes>=30||(stats?.current_streak??0)>=7)&&<div className="meowky-milestone-note" role="status"><span>🎉</span><div><strong>{todayMinutes>=30?"Daily study goal achieved!":"A seven-day streak milestone!"}</strong><p>{todayMinutes>=30?"Meowky is celebrating your 30-minute study goal with you.":"A whole week of showing up. That's something to be proud of."}</p></div></div>}
    </section>
    <section className="meowky-journal panel" aria-label="Meowky adventure journal">
      <div className="meowky-home-heading"><div><p className="eyebrow">OUR LITTLE HISTORY</p><h2>Meowky's adventure journal</h2><p>A keepsake of the milestones, memories, and moments you've shared.</p></div><span className="meowky-journal-count">📖 {journal.length} memories</span></div>
      <div className="meowky-journal-filters" role="group" aria-label="Filter journal memories">{(["all","journey","evolution","achievement","streak","care"] as const).map(filter=><button type="button" key={filter} className={journalFilter===filter?"selected":""} aria-pressed={journalFilter===filter} onClick={()=>setJournalFilter(filter)}>{filter==="all"?"All memories":filter==="journey"?"Journey":filter==="evolution"?"Evolution":filter==="achievement"?"Achievements":filter==="streak"?"Streaks":"Care"}</button>)}</div>
      <div className="meowky-journal-list">{(journalFilter==="all"?journal:journal.filter(item=>item.category===journalFilter)).length===0?<div className="meowky-journal-empty"><span>🌱</span><strong>Your next memory is waiting.</strong><p>Study, care for Meowky, or unlock an achievement to add a new page.</p></div>:(journalFilter==="all"?journal:journal.filter(item=>item.category===journalFilter)).map(item=><article className="meowky-journal-entry" key={item.id}><span className="meowky-journal-icon" aria-hidden="true">{item.icon}</span><div><div className="meowky-journal-entry-meta"><strong>{item.title}</strong><time dateTime={item.date}>{new Date(item.date+"T00:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}</time></div><p>{item.detail}</p><small>{item.category}</small></div></article>)}</div>
      <p className="meowky-home-note">Your journal is saved privately on this device and browser. It does not award extra XP or sync between devices.</p>
    </section>
    <section className="meowky-home panel" aria-label="Meowky's personal space">
      <div className="meowky-home-heading"><div><p className="eyebrow">A LITTLE PLACE TO CALL HOME</p><h2>Meowky's nook</h2><p>{roomRank} · A home that grows with your learning journey.</p></div><span className="meowky-home-level">Level {Math.min(6,Math.floor(xp/170)+1)} home</span></div>
      <div className={"meowky-room-scene theme-"+roomTheme}>
        <span className="meowky-room-window" aria-hidden="true">✦</span><span className="meowky-room-plant" aria-hidden="true">🌿</span><span className="meowky-room-shelf" aria-hidden="true">▤</span>
        <div className="meowky-room-companion"><Meowky3D formId={currentForm.id} mood={companionMood} timeOfDay={timeOfDay}/><span>{currentForm.name}'s cozy corner</span></div>
        <div className="meowky-room-decor" aria-label={"Selected decoration: "+activeDecor.name}><span>{activeDecor.icon}</span><small>{activeDecor.name}</small></div>
        <span className="meowky-room-rug" aria-hidden="true"/>
      </div>
      <div className="meowky-room-controls"><div><strong>Choose your room mood</strong><div className="meowky-room-themes" role="group" aria-label="Room themes"><button type="button" className={roomTheme==="meadow"?"selected":""} aria-pressed={roomTheme==="meadow"} onClick={()=>setRoomTheme("meadow")}>🌿 Meadow</button><button type="button" className={roomTheme==="starlight"?"selected":""} aria-pressed={roomTheme==="starlight"} onClick={()=>setRoomTheme("starlight")}>✨ Starlight</button><button type="button" className={roomTheme==="moonlit"?"selected":""} aria-pressed={roomTheme==="moonlit"} onClick={()=>setRoomTheme("moonlit")}>🌙 Moonlit</button></div></div>
      <div><strong>Decorations</strong><div className="meowky-room-decorations">{roomDecorations.map(item=>{const unlocked=xp>=item.unlock;return <button type="button" key={item.id} disabled={!unlocked} className={roomDecor===item.id?"selected":""} aria-pressed={roomDecor===item.id} title={unlocked?item.name:"Unlock at "+item.unlock+" XP"} onClick={()=>setRoomDecor(item.id)}><span>{unlocked?item.icon:"🔒"}</span><small>{unlocked?item.name:item.unlock+" XP"}</small></button>;})}</div></div></div>
      <p className="meowky-home-note">Your room choices are saved for this visit. Decorations unlock automatically as you earn Paw Points.</p>
    </section>
    {evolutionCelebration&&<div className="meowky-evolution-celebration" role="dialog" aria-modal="true" aria-labelledby="meowky-evolution-title"><div className="meowky-celebration-sparkles" aria-hidden="true"><i>✦</i><i>✧</i><i>✺</i><i>✦</i><i>✧</i><i>✺</i></div><div className="meowky-celebration-art"><Meowky3D formId={evolutionCelebration.id} mood="happy"/></div><p className="eyebrow">A NEW COMPANION FORM HAS AWAKENED</p><h2 id="meowky-evolution-title">Meet {evolutionCelebration.name}!</h2><span className="meowky-celebration-rarity" data-rarity={evolutionCelebration.rarity.toLowerCase()}>{evolutionCelebration.rarity} evolution</span><p>{evolutionCelebration.personality}</p><div className="meowky-celebration-ability"><strong>{evolutionCelebration.ability}</strong></div><button type="button" onClick={()=>setEvolutionCelebration(null)}>Continue our journey</button></div>}
    {error&&<div className="inline-error" role="alert">{error}</div>}
    {notice&&<div className="inline-notice" role="status">{notice}</div>}
    <section className="panel meowky-evolution-panel">
      <div className="panel-heading"><div><p className="eyebrow">YOUR EVOLUTION JOURNEY</p><h2>{nextForm ? "Your next form is waiting." : "Celestial form achieved."}</h2></div><span className="meowky-rarity-pill" data-rarity={currentForm.rarity.toLowerCase()}>{currentForm.rarity}</span></div>
      <div className="meowky-evolution-progress"><div className="meowky-evolution-progress-copy"><strong>{currentForm.name}</strong><span>{nextForm ? `${xp.toLocaleString()} / ${nextForm.xpRequired.toLocaleString()} XP` : "All 10 forms unlocked"}</span></div><div className="progress-track"><span style={{width:`${evolutionProgress}%`}}/></div><p>{nextForm ? `${(nextForm.xpRequired-xp).toLocaleString()} XP until ${nextForm.name} · ${nextForm.rarity}` : "You've reached the highest known evolution. Your next chapter is still unwritten."}</p></div>
    </section>
    <section className="panel meowky-collection-panel">
      <div className="panel-heading"><div><p className="eyebrow">THE MEOWKY COLLECTION</p><h2>Ten forms. One journey.</h2></div><span className="achievement-count">{MEOWKY_FORMS.filter(form=>xp>=form.xpRequired).length} / 10 discovered</span></div>
      <div className="meowky-card-grid">{MEOWKY_FORMS.map(form=>{const unlocked=xp>=form.xpRequired;return <article className={`meowky-collectible-card ${unlocked?"is-unlocked":"is-locked"}`} data-rarity={form.rarity.toLowerCase()} key={form.id}><div className="meowky-card-art" style={{"--form-color":form.palette} as React.CSSProperties}><span className="meowky-card-sigil">{unlocked?form.symbol:"?"}</span>{unlocked?<Meowky level={Math.max(1,form.id*5)} mood="happy"/>:<span className="meowky-card-lock" aria-hidden="true">✦</span>}</div><div className="meowky-card-copy"><div className="meowky-card-meta"><span>FORM {String(form.id).padStart(2,"0")}</span><b>{form.rarity}</b></div><h3>{unlocked?form.name:"Undiscovered Meowky"}</h3><p>{unlocked?form.trait:`Unlock at ${form.xpRequired.toLocaleString()} XP`}</p>{unlocked&&<><strong className="meowky-card-ability">{form.ability}</strong><small>{form.personality}</small></>}</div></article>})}</div>
      <p className="meowky-collection-note">All students follow the same evolution path. Future special forms can be added without changing this collection's foundations.</p>
    </section>
    <div className="gamification-stats">
      <article className="stat-card paw-xp"><span className="stat-label">Paw Points</span><strong>{xp.toLocaleString()}</strong><span className="stat-foot">Total XP earned</span></article>
      <article className="stat-card mint-card"><span className="stat-label">Learning streak</span><strong>🔥 {stats?.current_streak??0} <small>days</small></strong><span className="stat-foot">Longest: {stats?.longest_streak??0} days</span></article>
      <article className="stat-card peach-card"><span className="stat-label">Pawchievements</span><strong>{achievements.length} <small>/ {Object.keys(catalog).length}</small></strong><span className="stat-foot">Milestones unlocked</span></article>
    </div>
    <section className="panel level-panel"><div className="level-panel-heading"><div><p className="eyebrow">YOUR NEXT MILESTONE</p><h2>Level {level} progress</h2></div><strong>{levelProgress} / 250 XP</strong></div><div className="progress-track level-progress"><span style={{width:`${(levelProgress/250)*100}%`}}/></div><p className="stat-foot">{250-levelProgress} Paw Points to Level {level+1}</p></section>
    <div className="gamification-columns">
      <section className="panel daily-paws"><p className="eyebrow">DAILY PAWS</p><h2>Make today count.</h2><p>Build a steady routine with a little focused study each day.</p><div className="daily-goal-row"><strong>{todayMinutes} / {dailyGoal} min</strong><span>{Math.min(100,Math.round(todayMinutes/dailyGoal*100))}%</span></div><div className="progress-track"><span style={{width:`${Math.min(100,todayMinutes/dailyGoal*100)}%`}}/></div><small>{todayMinutes>=dailyGoal?"Daily study goal complete. Great work!":"A 30-minute study session is today's suggested goal."}</small></section>
      <section className="panel leaderboard-panel"><div className="panel-heading"><div><p className="eyebrow">FRIENDLY COMPETITION</p><h2>Paw Points leaderboard</h2></div></div><p className="leaderboard-note">Only students who opt in appear here. Your profile stays private by default.</p><label className="leaderboard-toggle"><input type="checkbox" checked={optIn} disabled={busy} onChange={()=>void toggleLeaderboard()}/> Include me in the leaderboard</label>{leaders.length?<div className="leaderboard-list">{leaders.map(person=><div className="leaderboard-row" key={person.user_id}><span>#{person.rank}</span><strong>{person.user_id===userId?"You":person.display_name}</strong><small>Lv. {person.level}</small><b>{person.xp.toLocaleString()} XP</b></div>)}</div>:<p className="empty-state">No students have opted in yet. Be the first to join!</p>}</section>
    </div>
    <section className="panel achievements-panel"><div className="panel-heading"><div><p className="eyebrow">PAWCHIEVEMENTS</p><h2>Little wins, big progress</h2></div><span className="achievement-count">{achievements.length} unlocked</span></div><div className="achievement-grid">{Object.entries(catalog).map(([id,item])=><article className={`achievement-card ${earned.has(id)?"unlocked":""}`} key={id}><span>{item.icon}</span><div><strong>{item.name}</strong><p>{item.description}</p>{earned.has(id)&&<small>Unlocked {new Date(achievements.find(a=>a.achievement_id===id)!.earned_at).toLocaleDateString()}</small>}</div></article>)}</div></section>
    <p className="gamification-footnote">Paw Points are awarded automatically for completed learning activities. Repeated actions cannot be used to claim the same reward twice.</p>
  </section>;
}
