import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { BrandMark } from "./components/BrandMark";
import { Meowky } from "./components/Meowky";
import { LearnWorkspace } from "./components/LearnWorkspace";
import { CommunityWorkspace } from "./components/CommunityWorkspace";
import { ProfileWorkspace, type StudentProfile } from "./components/ProfileWorkspace";
import { NotificationWorkspace } from "./components/NotificationWorkspace";
import { GamificationWorkspace } from "./components/GamificationWorkspace";
import { ScheduleWorkspace } from "./components/ScheduleWorkspace";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

type Profile = StudentProfile;

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
    <div className="auth-mascot"><Meowky className="auth-meowky-art" /><strong>A little progress adds up.</strong><p>Meowky is saving you a spot.</p></div>
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
      .select("id,display_name,avatar_url,student_status,bio,major,year_of_study,interests,profile_visibility").single();
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


type Course = { id: string; title: string; code: string | null; description: string | null; created_at: string };
type Task = { id: string; title: string; details: string | null; task_type: "task" | "assignment" | "exam" | "reading" | "event"; status: "todo" | "in_progress" | "completed" | "archived"; due_at: string | null; course_id: string | null; created_at: string };
type TaskDraft = { title: string; details: string; task_type: Task["task_type"]; due_at: string; course_id: string };
const emptyTask: TaskDraft = { title: "", details: "", task_type: "assignment", due_at: "", course_id: "" };

export default function App() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const handleUnreadCountChange = useCallback((count: number) => setUnreadNotifications(count), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [profileError, setProfileError] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [notice, setNotice] = useState("");
  const [courseModal, setCourseModal] = useState(false);
  const [courseEditing, setCourseEditing] = useState<Course | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [taskFilter, setTaskFilter] = useState<"all" | "open" | "completed" | "overdue">("all");
  const [taskModal, setTaskModal] = useState(false);
  const [taskEditing, setTaskEditing] = useState<Task | null>(null);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(emptyTask);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) { setUser(data.session?.user ?? null); setAuthReady(true); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) { setProfile(null); setCourses([]); setTasks([]); }
      setAuthReady(true);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!supabase || !user) { setProfile(null); return; }
    let mounted = true;
    setProfileError("");
    supabase.from("profiles").select("id,display_name,avatar_url,student_status,bio,major,year_of_study,interests,profile_visibility").eq("id", user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) setProfileError(error.message);
        else setProfile(data as Profile | null);
      });
    return () => { mounted = false; };
  }, [user]);

  async function loadWorkspace() {
    if (!supabase || !user) return;
    setDataLoading(true); setDataError("");
    const [courseResult, taskResult] = await Promise.all([
      supabase.from("courses").select("id,title,code,description,created_at").eq("created_by", user.id).eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("tasks").select("id,title,details,task_type,status,due_at,course_id,created_at").eq("user_id", user.id).neq("status", "archived").order("due_at", { ascending: true, nullsFirst: false }),
    ]);
    if (courseResult.error || taskResult.error) setDataError(courseResult.error?.message ?? taskResult.error?.message ?? "Unable to load your workspace.");
    else { setCourses((courseResult.data ?? []) as Course[]); setTasks((taskResult.data ?? []) as Task[]); }
    setDataLoading(false);
  }

  useEffect(() => { if (user && profile) void loadWorkspace(); }, [user, profile]);

  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user) return;
    setSaving(true); setDataError(""); setNotice("");
    const values = { title: courseTitle.trim(), code: courseCode.trim() || null, description: courseDescription.trim() || null };
    const result = courseEditing
      ? await supabase.from("courses").update(values).eq("id", courseEditing.id).select().single()
      : await supabase.from("courses").insert({ ...values, created_by: user.id, visibility: "private" }).select().single();
    setSaving(false);
    if (result.error) { setDataError(result.error.message); return; }
    setCourseModal(false); setCourseEditing(null); setCourseTitle(""); setCourseCode(""); setCourseDescription("");
    setNotice(courseEditing ? "Course updated." : "Course created."); await loadWorkspace();
  }

  function openCourse(course?: Course) {
    setCourseEditing(course ?? null); setCourseTitle(course?.title ?? ""); setCourseCode(course?.code ?? "");
    setCourseDescription(course?.description ?? ""); setDataError(""); setCourseModal(true);
  }

  async function deleteCourse(course: Course) {
    if (!supabase || !window.confirm(`Delete "${course.title}"? Tasks linked to it will become unassigned.`)) return;
    const { error } = await supabase.from("courses").delete().eq("id", course.id);
    if (error) setDataError(error.message); else { setNotice("Course deleted."); await loadWorkspace(); }
  }

  function openTask(task?: Task) {
    setTaskEditing(task ?? null);
    setTaskDraft(task ? { title: task.title, details: task.details ?? "", task_type: task.task_type, due_at: task.due_at ? new Date(task.due_at).toISOString().slice(0,16) : "", course_id: task.course_id ?? "" } : emptyTask);
    setDataError(""); setTaskModal(true);
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user) return;
    setSaving(true); setDataError("");
    const values = { title: taskDraft.title.trim(), details: taskDraft.details.trim() || null, task_type: taskDraft.task_type, due_at: taskDraft.due_at ? new Date(taskDraft.due_at).toISOString() : null, course_id: taskDraft.course_id || null };
    const result = taskEditing
      ? await supabase.from("tasks").update(values).eq("id", taskEditing.id).select().single()
      : await supabase.from("tasks").insert({ ...values, user_id: user.id }).select().single();
    setSaving(false);
    if (result.error) { setDataError(result.error.message); return; }
    setTaskModal(false); setTaskEditing(null); setTaskDraft(emptyTask); setNotice(taskEditing ? "Task updated." : "Task added."); await loadWorkspace();
  }

  async function updateTaskStatus(task: Task, status: Task["status"]) {
    if (!supabase) return;
    const { error } = await supabase.from("tasks").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", task.id);
    if (error) setDataError(error.message); else await loadWorkspace();
  }

  async function deleteTask(task: Task) {
    if (!supabase || !window.confirm(`Delete "${task.title}"?`)) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) setDataError(error.message); else { setNotice("Task deleted."); await loadWorkspace(); }
  }

  if (isSupabaseConfigured && !authReady) return <div className="loading-screen">Getting your Meowks space ready…</div>;
  if (isSupabaseConfigured && !user) return <AuthScreen/>;
  if (isSupabaseConfigured && user && profileError) return <main className="auth-page"><section className="auth-card"><BrandMark/><h1>One setup step left.</h1><p className="subheading">We couldn't load your student profile. Make sure you have run the initial Supabase migration in this repository.</p><p className="form-error">{profileError}</p><button className="primary-button auth-submit" onClick={()=>supabase?.auth.signOut()}>Sign out</button></section></main>;
  if (isSupabaseConfigured && user && !profile) return <Onboarding user={user} onComplete={setProfile}/>;

  const completedCount = tasks.filter(task => task.status === "completed").length;
  const pendingTasks = tasks.filter(task => task.status !== "completed");
  const upcomingTasks = pendingTasks.filter(task => task.due_at).slice(0, 5);
  const now = Date.now();
  const overdueTasks = pendingTasks.filter(task => task.due_at && new Date(task.due_at).getTime() < now);
  const dueTodayTasks = pendingTasks.filter(task => task.due_at && new Date(task.due_at).toDateString() === new Date().toDateString());
  const visibleTasks = tasks.filter(task => {
    const matchesSearch = `${task.title} ${task.details ?? ""} ${courses.find(course => course.id === task.course_id)?.title ?? "Personal"} ${task.task_type}`.toLowerCase().includes(taskSearch.trim().toLowerCase());
    const isOverdue = task.status !== "completed" && !!task.due_at && new Date(task.due_at).getTime() < now;
    const matchesFilter = taskFilter === "all" || (taskFilter === "open" && task.status !== "completed") || (taskFilter === "completed" && task.status === "completed") || (taskFilter === "overdue" && isOverdue);
    return matchesSearch && matchesFilter;
  });
  const visibleCourses = courses.filter(course => `${course.title} ${course.code ?? ""} ${course.description ?? ""}`.toLowerCase().includes(courseSearch.trim().toLowerCase()));
  const courseName = (id: string | null) => courses.find(course => course.id === id)?.title ?? "Personal";
  const dateLabel = (value: string | null) => value ? new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "No due date";
  const navGroups = [
    { title: "YOUR WORLD", items: [{ icon: "⌂", label: "Overview", short: "Home" }] },
    { title: "LEARN", items: [{ icon: "▤", label: "My courses", short: "Courses" }, { icon: "▧", label: "Study tools", short: "Tools" }] },
    { title: "PLAN", items: [{ icon: "▦", label: "Calendar", short: "Calendar" }, { icon: "✓", label: "Tasks & deadlines", short: "Tasks" }] },
    { title: "CONNECT", items: [{ icon: "◎", label: "Community", short: "Guild" }] },
    { title: "PLAY & GROW", items: [{ icon: "✦", label: "Achieve", short: "Sanctuary" }] },
    { title: "ACCOUNT", items: [{ icon: "♙", label: "My profile", short: "Profile" }] },
  ];
  const mobileNav = [
    { icon: "⌂", label: "Overview", short: "Home" },
    { icon: "▤", label: "My courses", short: "Academy" },
    { icon: "▦", label: "Calendar", short: "Planner" },
    { icon: "◎", label: "Community", short: "Guild" },
    { icon: "✦", label: "Achieve", short: "Sanctuary" },
  ];

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <aside className="sidebar"><BrandMark/><div className="workspace-label">YOUR STUDENT SPACE</div>
      <nav className="nav-list" aria-label="Main navigation">{navGroups.map(group=><div className="nav-group" key={group.title}><p className="nav-group-label">{group.title}</p>{group.items.map(item=><button className={`nav-item ${activeNav===item.label?"active":""}`} key={item.label} onClick={()=>setActiveNav(item.label)} aria-current={activeNav===item.label?"page":undefined}><span className="nav-icon">{item.icon}</span><span>{item.label}</span></button>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="mascot-mini">m.</div><div><strong>Meowky says</strong><p>Small steps still count. ✨</p></div></div>
    </aside>
    <main className="main-area" id="main-content" tabIndex={-1}><header className="topbar"><div className="mobile-brand"><BrandMark compact/></div><div className="breadcrumb" aria-label="Current location">My space <span>/</span> {navGroups.find(group=>group.items.some(item=>item.label===activeNav))?.title ?? "INBOX"} <span>/</span> <strong>{activeNav}</strong></div>
      <div className="topbar-right"><span className="streak-pill">✦ Meowks</span><button className="notification-trigger" aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ""}`} title="Notifications" onClick={()=>setActiveNav("Notifications")}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>{unreadNotifications>0&&<i>{unreadNotifications>99?"99+":unreadNotifications}</i>}</button>{user && <><button type="button" className="account-chip account-chip-button" onClick={()=>setActiveNav("My profile")} aria-label="Open your profile"><span className="avatar">{(profile?.display_name ?? user.email ?? "S").charAt(0).toUpperCase()}</span><span className="account-name">{profile?.display_name ?? "Student"}</span></button><button className="logout-button" type="button" title="Sign out of Meowks" aria-label="Log out of Meowks" onClick={()=>supabase?.auth.signOut()}><span aria-hidden="true">↪</span> Log out</button></>}</div></header>
      <nav className="mobile-nav" aria-label="Main navigation">{mobileNav.map(item=><button key={item.label} className={activeNav===item.label?"active":""} onClick={()=>setActiveNav(item.label)} aria-label={item.short} aria-current={activeNav===item.label?"page":undefined}><span>{item.icon}</span><small>{item.short}</small></button>)}</nav>
      <section className="page-content" aria-busy={dataLoading}>
        {notice && <div className="inline-notice" role="status">{notice}<button onClick={()=>setNotice("")} aria-label="Dismiss">×</button></div>}
        {dataError && <div className="inline-error" role="alert">{dataError}<button onClick={()=>setDataError("")} aria-label="Dismiss">×</button></div>}
        <div className="workspace-stage" key={activeNav} aria-label={`${activeNav} workspace`}>
        {activeNav === "Overview" && <>
          <section className="dashboard-welcome" aria-labelledby="dashboard-greeting">
            <div className="dashboard-welcome-copy">
              <p className="hero-kicker"><span /> YOUR STUDENT SPACE</p>
              <p className="dashboard-date">{new Date().toLocaleDateString([], {weekday:"long", month:"long", day:"numeric"})}</p>
              <h1 id="dashboard-greeting">Good day, {profile?.display_name?.split(" ")[0] ?? "student"}<span className="coral">.</span></h1>
              <p>Make room for progress. Here's what deserves your attention today.</p>
              <div className="dashboard-actions">
                <button className="primary-button" onClick={()=>openTask()}>＋ Add a task</button>
                <button className="secondary-button" onClick={()=>setActiveNav("Calendar")}>Open calendar ↗</button>
              </div>
            </div>
            <div className="dashboard-welcome-mascot"><div className="dashboard-mascot-halo"><Meowky className="dashboard-meowky" mood="focused"/></div><span>One step at a time ✨</span></div>
          </section>

          <section className="hub-quest-board" aria-label="Today's study quests">
            <article className="hub-quest-card">
              <div className="hub-quest-heading">
                <div><p className="eyebrow">YOUR DAILY QUESTS</p><h2>A little progress goes a long way.</h2></div>
                <span className="hub-quest-count">{dueTodayTasks.length} due today</span>
              </div>
              {dueTodayTasks.length ? <div className="hub-quest-list">{dueTodayTasks.slice(0,3).map(task=><div className="hub-quest-item" key={task.id}><span aria-hidden="true">✦</span><div><strong>{task.title}</strong><small>{courseName(task.course_id)} · {task.task_type}</small></div><b>Today's quest</b></div>)}</div> : <div className="hub-quest-empty"><strong>Your quest board is clear today.</strong>No deadlines are due today. Add a task whenever a new assignment or idea comes up.</div>}
            </article>
            <article className="hub-momentum-card">
              <div><p className="eyebrow">YOUR MOMENTUM</p><h2>Every task is a step forward.</h2></div>
              <div className="hub-momentum-number"><strong>{completedCount}</strong><span>of {tasks.length} tasks completed</span></div>
              <div className="hub-momentum-track" role="progressbar" aria-label="Task completion progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={tasks.length ? Math.round(completedCount/tasks.length*100) : 0}><span style={{width:`${tasks.length ? completedCount/tasks.length*100 : 0}%`}}/></div>
              <p>{tasks.length ? `${Math.round(completedCount/tasks.length*100)}% of your task list is complete. Keep your own pace.` : "Your first task is the beginning of your progress story."}</p>
            </article>
          </section>

          <section className="dashboard-stat-grid" aria-label="Your study overview">
            <article className="dashboard-stat dashboard-stat-primary"><span className="dashboard-stat-icon">◷</span><span className="dashboard-stat-label">Open tasks</span><strong>{pendingTasks.length}</strong><small>{dueTodayTasks.length} need attention today</small></article>
            <article className="dashboard-stat"><span className="dashboard-stat-icon mint">✓</span><span className="dashboard-stat-label">Completed</span><strong>{completedCount}</strong><small>{tasks.length ? Math.round(completedCount/tasks.length*100) : 0}% of your task list</small></article>
            <article className="dashboard-stat"><span className="dashboard-stat-icon coral-bg">!</span><span className="dashboard-stat-label">Overdue</span><strong>{overdueTasks.length}</strong><small>{overdueTasks.length ? "Let's make a catch-up plan" : "You're all caught up"}</small></article>
            <article className="dashboard-stat"><span className="dashboard-stat-icon cream-bg">▤</span><span className="dashboard-stat-label">My courses</span><strong>{courses.length}</strong><small>In your student space</small></article>
          </section>

          <section className="dashboard-week panel" aria-label="This week's workload">
            <div className="dashboard-section-heading"><div><p className="eyebrow">PLAN AHEAD</p><h2>This week</h2></div><button className="text-button" onClick={()=>setActiveNav("Calendar")}>View calendar ↗</button></div>
            <div className="dashboard-week-days">{Array.from({length:7},(_,index)=>{const date=new Date();date.setHours(0,0,0,0);date.setDate(date.getDate()+index);const count=pendingTasks.filter(task=>task.due_at&&new Date(task.due_at).toDateString()===date.toDateString()).length;const isToday=index===0;return <button type="button" key={date.toISOString()} className={`dashboard-week-day ${isToday?"today":""} ${count?"has-items":""}`} onClick={()=>setActiveNav("Calendar")} aria-label={`${date.toLocaleDateString([], {weekday:"long",month:"long",day:"numeric"})}, ${count} open items`}><small>{date.toLocaleDateString([], {weekday:"short"})}</small><strong>{date.getDate()}</strong><i>{count?count+" "+(count===1?"item":"items"):"—"}</i></button>})}</div>
          </section>

          <div className="dashboard-main-grid">
            <section className="panel dashboard-deadlines">
              <div className="dashboard-section-heading"><div><p className="eyebrow">WHAT'S NEXT</p><h2>Upcoming deadlines</h2></div><button className="text-button" onClick={()=>{setActiveNav("Tasks & deadlines");setTaskFilter("open");}}>All tasks ↗</button></div>
              {dataLoading ? <p className="empty-state" role="status">Gathering your deadlines…</p> : upcomingTasks.length ? <div className="dashboard-deadline-list">{upcomingTasks.slice(0,5).map(task=>{const due=task.due_at?new Date(task.due_at):null;const overdue=!!due&&due.getTime()<now;return <article className="dashboard-deadline" key={task.id}><button type="button" className="dashboard-check" aria-label={`Complete ${task.title}`} onClick={()=>void updateTaskStatus(task,"completed")}>○</button><div className="dashboard-deadline-copy"><strong>{task.title}</strong><span>{courseName(task.course_id)} · {task.task_type}</span></div><time className={overdue?"is-overdue":""} dateTime={task.due_at ?? undefined}>{overdue?"Overdue":dateLabel(task.due_at)}</time></article>})}</div> : <div className="dashboard-empty"><span>✦</span><strong>Your schedule has breathing room.</strong><p>No open deadlines yet. Add a task whenever something comes up.</p><button className="secondary-button" onClick={()=>openTask()}>Add your first task</button></div>}
            </section>
            <aside className="dashboard-side-stack">
              <section className="panel dashboard-progress"><p className="eyebrow">YOUR MOMENTUM</p><h2>Small wins add up.</h2><div className="dashboard-progress-ring" style={{"--progress":`${tasks.length?completedCount/tasks.length*100:0}%`} as React.CSSProperties}><div><strong>{tasks.length?Math.round(completedCount/tasks.length*100):0}%</strong><small>complete</small></div></div><p>{completedCount? `You've completed ${completedCount} ${completedCount===1?"task":"tasks"}. Keep that momentum going.`:"Your first completed task is a win worth celebrating."}</p></section>
              <section className="panel dashboard-quick-links"><p className="eyebrow">JUMP BACK IN</p><button onClick={()=>setActiveNav("Study tools")}><span>✎</span><span><strong>Study tools</strong><small>Notes, flashcards & quizzes</small></span><b>↗</b></button><button onClick={()=>setActiveNav("Community")}><span>◎</span><span><strong>Community</strong><small>Learn alongside others</small></span><b>↗</b></button></section>
            </aside>
          </div>
        </>}
        {activeNav === "Calendar" && <ScheduleWorkspace tasks={tasks} onAddEvent={(date)=>{setTaskEditing(null);setTaskDraft({...emptyTask,task_type:"event",due_at:`${date}T09:00`});setDataError("");setTaskModal(true);}} onOpenTasks={()=>setActiveNav("Tasks & deadlines")}/>}
        {activeNav === "My courses" && <section className="feature-page"><div className="feature-heading"><div><p className="eyebrow">YOUR ACADEMY</p><h1>My courses<span className="coral">.</span></h1><p className="subheading">Keep your classes together in one place.</p></div><div className="feature-heading-actions"><button className="secondary-button compact-action" onClick={()=>setActiveNav("Study tools")}>Open study tools ↗</button><button className="primary-button compact-action" onClick={()=>openCourse()}>＋ Add course</button></div></div>
          {dataLoading ? <p className="empty-state" role="status">Loading courses…</p> : courses.length ? <><div className="organization-toolbar"><label className="search-field"><span>⌕</span><input aria-label="Search courses" value={courseSearch} onChange={e=>setCourseSearch(e.target.value)} placeholder="Search your courses…"/></label><span>{visibleCourses.length} of {courses.length} courses</span></div>{visibleCourses.length ? <div className="course-grid">{visibleCourses.map(course=>{const linkedTasks=tasks.filter(task=>task.course_id===course.id);const openCount=linkedTasks.filter(task=>task.status!=="completed").length;return <article className="course-card" key={course.id}><div className="course-card-top"><span className="course-symbol">▤</span><span className="course-code">{course.code || "PERSONAL"}</span></div><h2>{course.title}</h2><p>{course.description || "No course description yet."}</p><div className="course-card-summary"><span>{linkedTasks.length} linked {linkedTasks.length===1?"item":"items"}</span><span>{openCount} open</span></div><div className="course-card-actions"><button onClick={()=>openCourse(course)}>Edit</button><button className="danger-text" onClick={()=>void deleteCourse(course)}>Delete</button></div></article>})}</div> : <div className="empty-card compact-empty"><h2>No matching courses</h2><p>Try another course name or code.</p></div>}</> : <div className="empty-card"><div className="empty-illustration">📚</div><h2>Your semester starts here.</h2><p>Add your first course. You can keep courses private to your own student space.</p><button className="primary-button compact-action" onClick={()=>openCourse()}>＋ Create your first course</button></div>}
        </section>}
        {activeNav === "Tasks & deadlines" && <section className="feature-page"><div className="feature-heading"><div><p className="eyebrow">YOUR PLANNER</p><h1>Tasks & deadlines<span className="coral">.</span></h1><p className="subheading">Assignments, exams, readings, and everything in between.</p></div><div className="feature-heading-actions"><button className="secondary-button compact-action" onClick={()=>setActiveNav("Calendar")}>Open calendar ↗</button><button className="primary-button compact-action" onClick={()=>openTask()}>＋ Add task</button></div></div>
          <div className="task-filters"><span>{tasks.length} total</span><span>{pendingTasks.length} open</span><span>{completedCount} completed</span><span className={overdueTasks.length?"overdue-text":""}>{overdueTasks.length} overdue</span></div>
          <div className="organization-toolbar task-toolbar"><label className="search-field"><span>⌕</span><input aria-label="Search tasks" value={taskSearch} onChange={e=>setTaskSearch(e.target.value)} placeholder="Search tasks, courses, or details…"/></label><div className="task-filter-tabs" role="group" aria-label="Filter tasks">{([{value:"all",label:"All"},{value:"open",label:"Open"},{value:"completed",label:"Completed"},{value:"overdue",label:"Overdue"}] as const).map(option=><button type="button" key={option.value} className={taskFilter===option.value?"active":""} onClick={()=>setTaskFilter(option.value)}>{option.label}</button>)}</div></div>
          {dataLoading ? <p className="empty-state" role="status">Loading tasks…</p> : tasks.length ? visibleTasks.length ? <div className="panel full-task-list">{visibleTasks.map(task=><article className="full-task-row" key={task.id}><input type="checkbox" aria-label={`Complete ${task.title}`} checked={task.status==="completed"} onChange={()=>void updateTaskStatus(task,task.status==="completed"?"todo":"completed")}/><div className="full-task-copy"><strong className={task.status==="completed"?"completed-title":""}>{task.title}</strong><p>{courseName(task.course_id)} · {task.task_type} · {dateLabel(task.due_at)}</p></div><span className={`status-pill status-${task.status}`}>{task.status.replace("_"," ")}</span><button className="icon-action" onClick={()=>openTask(task)} aria-label="Edit task">✎</button><button className="icon-action danger-text" onClick={()=>void deleteTask(task)} aria-label="Delete task">×</button></article>)}</div> : <div className="empty-card compact-empty"><h2>No tasks match this view</h2><p>Try changing the filter or search term.</p></div> : <div className="empty-card"><div className="empty-illustration">✍️</div><h2>A clear list, a clear mind.</h2><p>Add an assignment, exam, or task and Meowks will keep it organized.</p><button className="primary-button compact-action" onClick={()=>openTask()}>＋ Add your first task</button></div>}
        </section>}
        {activeNav === "Study tools" && user && <LearnWorkspace userId={user.id} courses={courses}/>}
        {activeNav === "Community" && user && (
          <CommunityWorkspace userId={user.id} courses={courses} displayName={profile?.display_name || "Student"}/>
        )}
        {activeNav === "Notifications" && user && (
          <NotificationWorkspace userId={user.id} onUnreadCountChange={handleUnreadCountChange} onOpenCommunity={() => setActiveNav("Community")}/>
        )}
        {activeNav === "My profile" && user && profile && (
          <ProfileWorkspace userId={user.id} profile={profile} onProfileUpdated={setProfile}/>
        )}
        {activeNav === "Achieve" && user && <GamificationWorkspace userId={user.id}/>}
        </div>
        <footer>Made for students, with a little help from Meowky. <span>MEOWKS © 2026</span></footer>
      </section>
    </main>
    {courseModal && <div className="modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setCourseModal(false);}}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="course-modal-title"><div className="modal-heading"><div><p className="eyebrow">YOUR STUDENT SPACE</p><h2 id="course-modal-title">{courseEditing?"Edit course":"Add a course"}</h2></div><button className="modal-close" onClick={()=>setCourseModal(false)} aria-label="Close">×</button></div><form className="auth-form" onSubmit={saveCourse}><label>Course name<input value={courseTitle} onChange={e=>setCourseTitle(e.target.value)} required maxLength={120} placeholder="e.g. Introduction to Computing"/></label><label>Course code <span className="optional-label">Optional</span><input value={courseCode} onChange={e=>setCourseCode(e.target.value)} maxLength={30} placeholder="e.g. CS 101"/></label><label>Description <span className="optional-label">Optional</span><textarea value={courseDescription} onChange={e=>setCourseDescription(e.target.value)} maxLength={500} rows={3} placeholder="What will you study in this course?"/></label><p className="private-hint">🔒 This course is private to your account for now.</p><button className="primary-button auth-submit" disabled={saving}>{saving?"Saving…":courseEditing?"Save changes":"Create course"}</button></form></section></div>}
    {taskModal && <div className="modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setTaskModal(false);}}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="task-modal-title"><div className="modal-heading"><div><p className="eyebrow">STAY ON TRACK</p><h2 id="task-modal-title">{taskEditing?"Edit task":"Add a task"}</h2></div><button className="modal-close" onClick={()=>setTaskModal(false)} aria-label="Close">×</button></div><form className="auth-form" onSubmit={saveTask}><label>Task title<input value={taskDraft.title} onChange={e=>setTaskDraft({...taskDraft,title:e.target.value})} required maxLength={160} placeholder="e.g. Finish chapter 3 exercises"/></label><label>Type<select value={taskDraft.task_type} onChange={e=>setTaskDraft({...taskDraft,task_type:e.target.value as TaskDraft["task_type"]})}><option value="assignment">Assignment</option><option value="exam">Exam</option><option value="reading">Reading</option><option value="task">Personal task</option><option value="event">Event</option></select></label><label>Course <span className="optional-label">Optional</span><select value={taskDraft.course_id} onChange={e=>setTaskDraft({...taskDraft,course_id:e.target.value})}><option value="">Personal / no course</option>{courses.map(course=><option key={course.id} value={course.id}>{course.title}</option>)}</select></label><label>Due date <span className="optional-label">Optional</span><input type="datetime-local" value={taskDraft.due_at} onChange={e=>setTaskDraft({...taskDraft,due_at:e.target.value})}/></label><label>Notes <span className="optional-label">Optional</span><textarea rows={3} value={taskDraft.details} onChange={e=>setTaskDraft({...taskDraft,details:e.target.value})} maxLength={2000} placeholder="Add instructions or notes"/></label><button className="primary-button auth-submit" disabled={saving}>{saving?"Saving…":taskEditing?"Save changes":"Create task"}</button></form></section></div>}
  </div>;
}
