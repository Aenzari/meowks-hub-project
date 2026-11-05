import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { BrandMark } from "./components/BrandMark";
import { LearnWorkspace } from "./components/LearnWorkspace";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

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


type Course = { id: string; title: string; code: string | null; description: string | null; created_at: string };
type Task = { id: string; title: string; details: string | null; task_type: "task" | "assignment" | "exam" | "reading" | "event"; status: "todo" | "in_progress" | "completed" | "archived"; due_at: string | null; course_id: string | null; created_at: string };
type TaskDraft = { title: string; details: string; task_type: Task["task_type"]; due_at: string; course_id: string };
const emptyTask: TaskDraft = { title: "", details: "", task_type: "assignment", due_at: "", course_id: "" };

export default function App() {
  const [activeNav, setActiveNav] = useState("Overview");
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
    supabase.from("profiles").select("display_name,student_status").eq("id", user.id).maybeSingle()
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
  const upcomingTasks = pendingTasks.slice(0, 5);
  const courseName = (id: string | null) => courses.find(course => course.id === id)?.title ?? "Personal";
  const dateLabel = (value: string | null) => value ? new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "No due date";
  const nav = [{ icon: "⌂", label: "Overview" }, { icon: "▤", label: "My courses" }, { icon: "✓", label: "Tasks & deadlines" }, { icon: "▧", label: "Study tools" }, { icon: "◎", label: "Community" }];

  return <div className="app-shell">
    <aside className="sidebar"><BrandMark/><div className="workspace-label">YOUR STUDENT SPACE</div>
      <nav className="nav-list" aria-label="Main navigation">{nav.map(item=><button className={`nav-item ${activeNav===item.label?"active":""}`} key={item.label} onClick={()=>setActiveNav(item.label)}><span className="nav-icon">{item.icon}</span>{item.label}</button>)}</nav>
      <div className="sidebar-bottom"><div className="mascot-mini">m.</div><div><strong>Meowky says</strong><p>Small steps still count. ✨</p></div></div>
    </aside>
    <main className="main-area"><header className="topbar"><div className="mobile-brand"><BrandMark compact/></div><div className="breadcrumb">My space <span>/</span> {activeNav}</div>
      <div className="topbar-right"><span className="streak-pill">✦ Meowks</span>{user && <button className="avatar" aria-label="Sign out" title="Sign out" onClick={()=>supabase?.auth.signOut()}>{(profile?.display_name ?? user.email ?? "S").charAt(0).toUpperCase()}</button>}</div></header>
      <section className="page-content">
        {notice && <div className="inline-notice" role="status">{notice}<button onClick={()=>setNotice("")} aria-label="Dismiss">×</button></div>}
        {dataError && <div className="inline-error" role="alert">{dataError}<button onClick={()=>setDataError("")} aria-label="Dismiss">×</button></div>}
        {activeNav === "Overview" && <>
          <div className="welcome-row"><div><p className="eyebrow">YOUR DAY IS WAITING</p><h1>Hey, {profile?.display_name?.split(" ")[0] ?? "student"}<span className="coral">.</span></h1><p className="subheading">A little progress today goes a long way.</p></div><div className="mascot-card"><div className="mascot-face">🐱</div><div><strong>Meowky</strong><p>Your study buddy</p></div></div></div>
          <div className="stats-grid"><article className="stat-card"><span className="stat-label">Tasks completed</span><strong>{completedCount} <small>/ {tasks.length}</small></strong><div className="progress-track"><span style={{width:tasks.length ? `${completedCount/tasks.length*100}%` : "0%"}}/></div><span className="stat-foot">Your personal task progress</span></article><article className="stat-card mint-card"><span className="stat-label">My courses</span><strong>{courses.length}</strong><span className="stat-foot">Courses in your space</span></article><article className="stat-card peach-card"><span className="stat-label">Open tasks</span><strong>{pendingTasks.length}</strong><span className="stat-foot">One step at a time</span></article></div>
          <div className="content-grid"><section className="panel tasks-panel"><div className="panel-heading"><div><p className="eyebrow">STAY ON TRACK</p><h2>Upcoming tasks</h2></div><button className="text-button" onClick={()=>setActiveNav("Tasks & deadlines")}>View all ↗</button></div>
            {dataLoading ? <p className="empty-state">Loading your tasks…</p> : upcomingTasks.length ? <div className="task-list">{upcomingTasks.map(task=><div className={`task-row ${task.status==="completed"?"task-done":""}`} key={task.id}><input aria-label={`Complete ${task.title}`} type="checkbox" checked={task.status==="completed"} onChange={()=>void updateTaskStatus(task,task.status==="completed"?"todo":"completed")}/><span className="task-copy"><strong>{task.title}</strong><small>{courseName(task.course_id)} · {task.task_type}</small></span><span className="task-due">{dateLabel(task.due_at)}</span></div>)}</div> : <p className="empty-state">No tasks yet. Add one to get started.</p>}
            <button className="add-task" onClick={()=>openTask()}>＋ Add a task</button>
          </section><section className="panel focus-panel"><p className="eyebrow">BUILD YOUR ROUTINE</p><h2>Your courses</h2><p className="focus-description">{courses.length ? `You're organizing ${courses.length} course${courses.length===1?"":"s"} in Meowks.` : "Add your first course to keep classes and deadlines together."}</p><div className="course-count">{courses.length}</div><button className="primary-button" onClick={()=>{setActiveNav("My courses");}}>Manage courses</button></section></div>
        </>}
        {activeNav === "My courses" && <section className="feature-page"><div className="feature-heading"><div><p className="eyebrow">ORGANIZE YOUR SEMESTER</p><h1>My courses<span className="coral">.</span></h1><p className="subheading">Keep your classes together in one place.</p></div><button className="primary-button compact-action" onClick={()=>openCourse()}>＋ Add course</button></div>
          {dataLoading ? <p className="empty-state">Loading courses…</p> : courses.length ? <div className="course-grid">{courses.map(course=><article className="course-card" key={course.id}><div className="course-card-top"><span className="course-symbol">▤</span><span className="course-code">{course.code || "PERSONAL"}</span></div><h2>{course.title}</h2><p>{course.description || "No course description yet."}</p><div className="course-card-actions"><button onClick={()=>openCourse(course)}>Edit</button><button className="danger-text" onClick={()=>void deleteCourse(course)}>Delete</button></div></article>)}</div> : <div className="empty-card"><div className="empty-illustration">📚</div><h2>Your semester starts here.</h2><p>Add your first course. You can keep courses private to your own student space.</p><button className="primary-button compact-action" onClick={()=>openCourse()}>＋ Create your first course</button></div>}
        </section>}
        {activeNav === "Tasks & deadlines" && <section className="feature-page"><div className="feature-heading"><div><p className="eyebrow">MAKE TIME FOR WHAT MATTERS</p><h1>Tasks & deadlines<span className="coral">.</span></h1><p className="subheading">Assignments, exams, readings, and everything in between.</p></div><button className="primary-button compact-action" onClick={()=>openTask()}>＋ Add task</button></div>
          <div className="task-filters"><span>{tasks.length} total</span><span>{pendingTasks.length} open</span><span>{completedCount} completed</span></div>
          {dataLoading ? <p className="empty-state">Loading tasks…</p> : tasks.length ? <div className="panel full-task-list">{tasks.map(task=><article className="full-task-row" key={task.id}><input type="checkbox" aria-label={`Complete ${task.title}`} checked={task.status==="completed"} onChange={()=>void updateTaskStatus(task,task.status==="completed"?"todo":"completed")}/><div className="full-task-copy"><strong className={task.status==="completed"?"completed-title":""}>{task.title}</strong><p>{courseName(task.course_id)} · {task.task_type} · {dateLabel(task.due_at)}</p></div><span className={`status-pill status-${task.status}`}>{task.status.replace("_"," ")}</span><button className="icon-action" onClick={()=>openTask(task)} aria-label="Edit task">✎</button><button className="icon-action danger-text" onClick={()=>void deleteTask(task)} aria-label="Delete task">×</button></article>)}</div> : <div className="empty-card"><div className="empty-illustration">✍️</div><h2>A clear list, a clear mind.</h2><p>Add an assignment, exam, or task and Meowks will keep it organized.</p><button className="primary-button compact-action" onClick={()=>openTask()}>＋ Add your first task</button></div>}
        </section>}
        {activeNav === "Study tools" && user && <LearnWorkspace userId={user.id} courses={courses}/>}
        {activeNav === "Community" && <div className="empty-card feature-placeholder"><div className="empty-illustration">◎</div><h2>Community is coming next.</h2><p>We are building Meowks one dependable student feature at a time.</p></div>}
        <footer>Made for students, with a little help from Meowky. <span>MEOWKS © 2026</span></footer>
      </section>
    </main>
    {courseModal && <div className="modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setCourseModal(false);}}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="course-modal-title"><div className="modal-heading"><div><p className="eyebrow">YOUR STUDENT SPACE</p><h2 id="course-modal-title">{courseEditing?"Edit course":"Add a course"}</h2></div><button className="modal-close" onClick={()=>setCourseModal(false)} aria-label="Close">×</button></div><form className="auth-form" onSubmit={saveCourse}><label>Course name<input value={courseTitle} onChange={e=>setCourseTitle(e.target.value)} required maxLength={120} placeholder="e.g. Introduction to Computing"/></label><label>Course code <span className="optional-label">Optional</span><input value={courseCode} onChange={e=>setCourseCode(e.target.value)} maxLength={30} placeholder="e.g. CS 101"/></label><label>Description <span className="optional-label">Optional</span><textarea value={courseDescription} onChange={e=>setCourseDescription(e.target.value)} maxLength={500} rows={3} placeholder="What will you study in this course?"/></label><p className="private-hint">🔒 This course is private to your account for now.</p><button className="primary-button auth-submit" disabled={saving}>{saving?"Saving…":courseEditing?"Save changes":"Create course"}</button></form></section></div>}
    {taskModal && <div className="modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setTaskModal(false);}}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="task-modal-title"><div className="modal-heading"><div><p className="eyebrow">STAY ON TRACK</p><h2 id="task-modal-title">{taskEditing?"Edit task":"Add a task"}</h2></div><button className="modal-close" onClick={()=>setTaskModal(false)} aria-label="Close">×</button></div><form className="auth-form" onSubmit={saveTask}><label>Task title<input value={taskDraft.title} onChange={e=>setTaskDraft({...taskDraft,title:e.target.value})} required maxLength={160} placeholder="e.g. Finish chapter 3 exercises"/></label><label>Type<select value={taskDraft.task_type} onChange={e=>setTaskDraft({...taskDraft,task_type:e.target.value as TaskDraft["task_type"]})}><option value="assignment">Assignment</option><option value="exam">Exam</option><option value="reading">Reading</option><option value="task">Personal task</option><option value="event">Event</option></select></label><label>Course <span className="optional-label">Optional</span><select value={taskDraft.course_id} onChange={e=>setTaskDraft({...taskDraft,course_id:e.target.value})}><option value="">Personal / no course</option>{courses.map(course=><option key={course.id} value={course.id}>{course.title}</option>)}</select></label><label>Due date <span className="optional-label">Optional</span><input type="datetime-local" value={taskDraft.due_at} onChange={e=>setTaskDraft({...taskDraft,due_at:e.target.value})}/></label><label>Notes <span className="optional-label">Optional</span><textarea rows={3} value={taskDraft.details} onChange={e=>setTaskDraft({...taskDraft,details:e.target.value})} maxLength={2000} placeholder="Add instructions or notes"/></label><button className="primary-button auth-submit" disabled={saving}>{saving?"Saving…":taskEditing?"Save changes":"Create task"}</button></form></section></div>}
  </div>;
}
