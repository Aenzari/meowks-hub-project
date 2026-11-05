import { useState } from "react";
import { BrandMark } from "./components/BrandMark";
import { isSupabaseConfigured } from "./lib/supabase";

const navItems = [
  { icon: "⌂", label: "Overview" },
  { icon: "▤", label: "My courses" },
  { icon: "✓", label: "Tasks & deadlines" },
  { icon: "▧", label: "Study tools" },
  { icon: "◎", label: "Community" },
];

export default function App() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [checked, setChecked] = useState<number[]>([1]);
  const tasks = [
    { title: "Review lecture notes", course: "Introduction to Computing", due: "Today · 4:00 PM" },
    { title: "Finish problem set", course: "Discrete Mathematics", due: "Tomorrow · 11:59 PM" },
    { title: "Prepare group outline", course: "Communication Arts", due: "Friday · 5:00 PM" },
  ];
  return <div className="app-shell">
    <aside className="sidebar">
      <BrandMark />
      <div className="workspace-label">YOUR STUDENT SPACE</div>
      <nav className="nav-list" aria-label="Main navigation">
        {navItems.map(item => <button className={`nav-item ${activeNav === item.label ? "active" : ""}`} key={item.label} onClick={() => setActiveNav(item.label)}>
          <span className="nav-icon">{item.icon}</span>{item.label}
        </button>)}
      </nav>
      <div className="sidebar-bottom"><div className="mascot-mini">m.</div><div><strong>Meowky says</strong><p>Small steps still count. ✨</p></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <div className="mobile-brand"><BrandMark compact /></div>
        <div className="breadcrumb">My space <span>/</span> {activeNav}</div>
        <div className="topbar-right"><span className="streak-pill">✦ 3-day streak</span><button className="avatar" aria-label="Profile">S</button></div>
      </header>
      <section className="page-content">
        <div className="welcome-row"><div><p className="eyebrow">YOUR DAY IS WAITING</p><h1>Hey, student<span className="coral">.</span></h1><p className="subheading">A little progress today goes a long way.</p></div>
          <div className="mascot-card"><div className="mascot-face">🐱</div><div><strong>Meowky</strong><p>Your study buddy</p></div></div>
        </div>
        {!isSupabaseConfigured && <div className="setup-notice"><span>ⓘ</span><div><strong>You're viewing the local starter.</strong><p>Connect Supabase later using the values in <code>.env.local</code>. No account data is stored yet.</p></div></div>}
        <div className="stats-grid">
          <article className="stat-card"><span className="stat-label">Tasks completed</span><strong>4 <small>/ 7</small></strong><div className="progress-track"><span style={{width:"57%"}} /></div><span className="stat-foot">Keep the momentum going</span></article>
          <article className="stat-card mint-card"><span className="stat-label">Paw Points</span><strong>120 <small>✦</small></strong><span className="stat-foot">You're earning your stripes</span></article>
          <article className="stat-card peach-card"><span className="stat-label">Study time this week</span><strong>3.5 <small>hrs</small></strong><span className="stat-foot">A strong start to the week</span></article>
        </div>
        <div className="content-grid">
          <section className="panel tasks-panel"><div className="panel-heading"><div><p className="eyebrow">STAY ON TRACK</p><h2>Up next</h2></div><button className="text-button">View all ↗</button></div>
            <div className="task-list">{tasks.map((task,index)=><label className={`task-row ${checked.includes(index)?"task-done":""}`} key={task.title}>
              <input type="checkbox" checked={checked.includes(index)} onChange={()=>setChecked(old=>old.includes(index)?old.filter(x=>x!==index):[...old,index])}/>
              <span className="task-copy"><strong>{task.title}</strong><small>{task.course}</small></span><span className="task-due">{task.due}</span>
            </label>)}</div><button className="add-task" onClick={()=>window.alert("Task creation is part of the next implementation phase.")}>＋ Add a task</button>
          </section>
          <section className="panel focus-panel"><p className="eyebrow">A MOMENT FOR YOU</p><h2>Ready to focus?</h2><p className="focus-description">Give one thing your full attention. Meowky will cheer you on.</p><div className="timer-circle"><strong>25</strong><span>MINUTES</span></div><button className="primary-button" onClick={()=>window.alert("The focus timer is a starter placeholder.")}>Start a focus session</button></section>
        </div>
        <footer>Made for students, with a little help from Meowky. <span>MEOWKS © 2026</span></footer>
      </section>
    </main>
  </div>;
}