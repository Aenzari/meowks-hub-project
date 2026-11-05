import { FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { BrandMark } from "./components/BrandMark";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

const navItems = [
  { icon: "⌂", label: "Overview" },
  { icon: "▤", label: "My courses" },
  { icon: "✓", label: "Tasks & deadlines" },
  { icon: "▧", label: "Study tools" },
  { icon: "◎", label: "Community" },
];

type Profile = { display_name: string | null; student_status: string };

function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() } },
        });
        if (authError) throw authError;
        if (data.session) setMessage("Your account is ready. Welcome to Meowks!");
        else setMessage("Account created. Check your email for the confirmation link, then come back to log in.");
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(), password,
        });
        if (authError) throw authError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  return <main className="auth-page">
    <section className="auth-card">
      <BrandMark />
      <div className="auth-intro"><p className="eyebrow">YOUR CAMPUS. YOUR JOURNEY. YOUR GROWTH.</p><h1>{mode === "signup" ? "Make space to grow." : "Welcome back."}</h1><p className="subheading">{mode === "signup" ? "Your student life, a little more organized." : "Pick up where you left off."}</p></div>
      <div className="auth-tabs"><button className={mode === "signup" ? "selected" : ""} onClick={() => {setMode("signup");setError("");setMessage("");}}>Create account</button><button className={mode === "login" ? "selected" : ""} onClick={() => {setMode("login");setError("");setMessage("");}}>Log in</button></div>
      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === "signup" && <label>Display name<input value={name} onChange={e=>setName(e.target.value)} placeholder="What should we call you?" required maxLength={60}/></label>}
        <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required/></label>
        <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required/></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className="form-success" role="status">{message}</p>}
        <button className="primary-button auth-submit" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create my account" : "Log in to Meowks"}</button>
      </form>
      <p className="auth-legal">By continuing, you agree to use Meowks respectfully and protect your account credentials.</p>
    </section>
    <div className="auth-mascot"><span>🐱</span><strong>A little progress adds up.</strong><p>Meowky is saving you a spot.</p></div>
  </main>;
}

function Onboarding({ user, onComplete }: { user: User; onComplete: (profile: Profile) => void }) {
  const [displayName, setDisplayName] = useState((user.user_metadata.display_name as string | undefined) ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError("");
    const { data, error: updateError } = await supabase.from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", user.id)
      .select("display_name,student_status").single();
    setBusy(false);
    if (updateError) { setError(updateError.message); return; }
    onComplete(data as Profile);
  }

  return <main className="auth-page"><section className="auth-card onboarding-card">
    <BrandMark/><div className="auth-intro"><p className="eyebrow">LET'S GET YOU SET UP</p><h1>What should we call you?</h1><p className="subheading">This name will appear in your Meowks student space.</p></div>
    <form className="auth-form" onSubmit={save}><label>Your display name<input value={displayName} onChange={e=>setDisplayName(e.target.value)} required minLength={2} maxLength={60} placeholder="Your name"/></label>
      <div className="independent-note"><strong>University membership is optional.</strong><p>You can use Meowks as an independent student and connect with a university later.</p></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button auth-submit" disabled={busy}>{busy ? "Saving…" : "Continue to my space"}</button>
    </form>
  </section><div className="auth-mascot"><span>🐱</span><strong>Nice to meet you!</strong><p>Let's make this semester count.</p></div></main>;
}

export default function App() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [checked, setChecked] = useState<number[]>([1]);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) { setUser(data.session?.user ?? null); setAuthReady(true); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) setProfile(null);
      setAuthReady(true);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!supabase || !user) { setProfile(null); return; }
    let mounted = true;
    setProfileError("");
    supabase.from("profiles").select("display_name,student_status").eq("id", user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) setProfileError(error.message);
        else setProfile(data as Profile | null);
      });
    return () => { mounted = false; };
  }, [user]);

  if (isSupabaseConfigured && !authReady) return <div className="loading-screen">Getting your Meowks space ready…</div>;
  if (isSupabaseConfigured && !user) return <AuthScreen/>;
  if (isSupabaseConfigured && user && profileError) return <main className="auth-page"><section className="auth-card"><BrandMark/><h1>One setup step left.</h1><p className="subheading">We couldn't load your student profile. Make sure you have run the initial Supabase migration in this repository.</p><p className="form-error">{profileError}</p><button className="primary-button auth-submit" onClick={()=>supabase?.auth.signOut()}>Sign out</button></section></main>;
  if (isSupabaseConfigured && user && !profile) return <Onboarding user={user} onComplete={setProfile}/>;

  const tasks = [
    { title: "Review lecture notes", course: "Introduction to Computing", due: "Today · 4:00 PM" },
    { title: "Finish problem set", course: "Discrete Mathematics", due: "Tomorrow · 11:59 PM" },
    { title: "Prepare group outline", course: "Communication Arts", due: "Friday · 5:00 PM" },
  ];
  return <div className="app-shell">
    <aside className="sidebar"><BrandMark/><div className="workspace-label">YOUR STUDENT SPACE</div>
      <nav className="nav-list" aria-label="Main navigation">{navItems.map(item=><button className={`nav-item ${activeNav===item.label?"active":""}`} key={item.label} onClick={()=>setActiveNav(item.label)}><span className="nav-icon">{item.icon}</span>{item.label}</button>)}</nav>
      <div className="sidebar-bottom"><div className="mascot-mini">m.</div><div><strong>Meowky says</strong><p>Small steps still count. ✨</p></div></div>
    </aside>
    <main className="main-area"><header className="topbar"><div className="mobile-brand"><BrandMark compact/></div><div className="breadcrumb">My space <span>/</span> {activeNav}</div>
      <div className="topbar-right"><span className="streak-pill">✦ 3-day streak</span>{user && <button className="avatar" aria-label="Sign out" title="Sign out" onClick={()=>supabase?.auth.signOut()}>{(profile?.display_name ?? user.email ?? "S").charAt(0).toUpperCase()}</button>}</div></header>
      <section className="page-content"><div className="welcome-row"><div><p className="eyebrow">YOUR DAY IS WAITING</p><h1>Hey, {profile?.display_name?.split(" ")[0] ?? "student"}<span className="coral">.</span></h1><p className="subheading">A little progress today goes a long way.</p></div><div className="mascot-card"><div className="mascot-face">🐱</div><div><strong>Meowky</strong><p>Your study buddy</p></div></div></div>
        {!isSupabaseConfigured && <div className="setup-notice"><span>ⓘ</span><div><strong>You're viewing the local starter.</strong><p>Connect Supabase later using the values in <code>.env.local</code>. No account data is stored yet.</p></div></div>}
        <div className="stats-grid"><article className="stat-card"><span className="stat-label">Tasks completed</span><strong>4 <small>/ 7</small></strong><div className="progress-track"><span style={{width:"57%"}}/></div><span className="stat-foot">Keep the momentum going</span></article><article className="stat-card mint-card"><span className="stat-label">Paw Points</span><strong>120 <small>✦</small></strong><span className="stat-foot">You're earning your stripes</span></article><article className="stat-card peach-card"><span className="stat-label">Study time this week</span><strong>3.5 <small>hrs</small></strong><span className="stat-foot">A strong start to the week</span></article></div>
        <div className="content-grid"><section className="panel tasks-panel"><div className="panel-heading"><div><p className="eyebrow">STAY ON TRACK</p><h2>Up next</h2></div><button className="text-button">View all ↗</button></div>
          <div className="task-list">{tasks.map((task,index)=><label className={`task-row ${checked.includes(index)?"task-done":""}`} key={task.title}><input type="checkbox" checked={checked.includes(index)} onChange={()=>setChecked(old=>old.includes(index)?old.filter(x=>x!==index):[...old,index])}/><span className="task-copy"><strong>{task.title}</strong><small>{task.course}</small></span><span className="task-due">{task.due}</span></label>)}</div><button className="add-task" onClick={()=>window.alert("Task management is the next feature after authentication.")}>＋ Add a task</button>
        </section><section className="panel focus-panel"><p className="eyebrow">A MOMENT FOR YOU</p><h2>Ready to focus?</h2><p className="focus-description">Give one thing your full attention. Meowky will cheer you on.</p><div className="timer-circle"><strong>25</strong><span>MINUTES</span></div><button className="primary-button" onClick={()=>window.alert("The focus timer is a starter placeholder.")}>Start a focus session</button></section></div>
        <footer>Made for students, with a little help from Meowky. <span>MEOWKS © 2026</span></footer>
      </section>
    </main>
  </div>;
}
