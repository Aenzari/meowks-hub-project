import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Meowky } from "./Meowky";

type Stats = { xp:number; level:number; current_streak:number; longest_streak:number; last_activity_date:string|null };
type Achievement = { achievement_id:string; earned_at:string; catalog:{name:string;description:string;icon:string}|null };
type Leader = { user_id:string; display_name:string; xp:number; level:number; current_streak:number; rank:number };

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
  return <section className="feature-page gamification-workspace">
    <div className="feature-heading"><div><p className="eyebrow">EVERY LITTLE WIN COUNTS</p><h1>My Space<span className="coral">.</span></h1><p className="subheading">Your learning journey, one paw at a time.</p></div><div className="gamification-level">🐾 <strong>Level {level}</strong></div></div>
    <section className="meowky-companion" aria-label="Your Meowky companion">
      <div className="meowky-companion-copy"><p className="eyebrow">YOUR STUDY BUDDY</p><h2>{todayMinutes >= 30 ? "Meowky is proud of you!" : "Meowky is cheering you on."}</h2><p>{todayMinutes >= 30 ? "You showed up for your learning goal today. Give yourself a little credit." : "Every focused minute helps you grow. Keep going at your own pace."}</p><span className="meowky-mood-label">{todayMinutes >= 30 ? "✦ Goal reached" : "♡ Here for your next step"}</span></div>
      <div className="meowky-companion-art"><Meowky mood={todayMinutes >= 30 ? "happy" : "focused"} /></div>
    </section>
    {error&&<div className="inline-error" role="alert">{error}</div>}
    {notice&&<div className="inline-notice" role="status">{notice}</div>}
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
