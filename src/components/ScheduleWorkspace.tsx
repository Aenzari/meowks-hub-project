import { useMemo, useState } from "react";

type ScheduleTask = {
  id: string;
  title: string;
  details: string | null;
  task_type: "task" | "assignment" | "exam" | "reading" | "event";
  status: "todo" | "in_progress" | "completed" | "archived";
  due_at: string | null;
  course_id: string | null;
};

type Props = {
  tasks: ScheduleTask[];
  onAddEvent: (date: string) => void;
  onOpenTasks: () => void;
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;

export function ScheduleWorkspace({ tasks, onAddEvent, onOpenTasks }: Props) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => new Date());
  const today = new Date();

  const calendarDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [month]);

  const datedTasks = tasks.filter(task => task.due_at && task.status !== "archived");
  const selectedTasks = datedTasks.filter(task => sameDay(new Date(task.due_at!), selected))
    .sort((a,b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());

  const moveMonth = (amount: number) => setMonth(current => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  const monthLabel = month.toLocaleDateString([], { month: "long", year: "numeric" });

  return <section className="feature-page schedule-page">
    <div className="feature-heading">
      <div><p className="eyebrow">SEE THE BIG PICTURE</p><h1>Your calendar<span className="coral">.</span></h1><p className="subheading">Deadlines, exams, and important days—all in one place.</p></div>
      <div className="feature-heading-actions"><button className="secondary-button compact-action" onClick={onOpenTasks}>View tasks ↗</button><button className="primary-button compact-action" onClick={() => onAddEvent(dateKey(selected))}>＋ Add to this day</button></div>
    </div>
    <div className="schedule-layout">
      <section className="panel calendar-panel" aria-label="Calendar">
        <div className="calendar-toolbar">
          <div><p className="eyebrow">YOUR SCHEDULE</p><h2>{monthLabel}</h2></div>
          <div className="calendar-controls"><button onClick={() => moveMonth(-1)} aria-label="Previous month">‹</button><button onClick={() => {setMonth(new Date(today.getFullYear(),today.getMonth(),1));setSelected(new Date());}}>Today</button><button onClick={() => moveMonth(1)} aria-label="Next month">›</button></div>
        </div>
        <div className="calendar-grid calendar-weekdays">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day=><span key={day}>{day}</span>)}</div>
        <div className="calendar-grid calendar-dates">
          {calendarDays.map(day => {
            const count = datedTasks.filter(task => sameDay(new Date(task.due_at!), day)).length;
            return <button key={dateKey(day)} className={`calendar-day ${day.getMonth()!==month.getMonth()?"outside-month":""} ${sameDay(day,today)?"is-today":""} ${sameDay(day,selected)?"is-selected":""}`} onClick={() => setSelected(day)} aria-label={day.toLocaleDateString()}>
              <span>{day.getDate()}</span>{count > 0 && <i className="calendar-dots" aria-label={`${count} scheduled items`}>{Array.from({length:Math.min(count,3)},(_,i)=><b key={i}/>)}</i>}
            </button>;
          })}
        </div>
        <div className="calendar-legend"><span><i className="legend-today"/>Today</span><span><i className="legend-event"/>Has deadlines or events</span></div>
      </section>
      <aside className="panel agenda-panel">
        <div className="panel-heading"><div><p className="eyebrow">DAY VIEW</p><h2>{selected.toLocaleDateString([], { weekday:"long", month:"long", day:"numeric" })}</h2></div><span className="agenda-count">{selectedTasks.length}</span></div>
        {selectedTasks.length ? <div className="agenda-list">{selectedTasks.map(task=><article className="agenda-item" key={task.id}><span className={`agenda-marker marker-${task.task_type}`}/><div><strong>{task.title}</strong><p>{task.task_type} · {new Date(task.due_at!).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</p>{task.details && <small>{task.details}</small>}</div><span className={`status-pill status-${task.status}`}>{task.status.replace("_"," ")}</span></article>)}</div> : <div className="agenda-empty"><span>☀️</span><strong>Nothing scheduled yet</strong><p>This day is yours. Add an event or enjoy the breathing room.</p><button className="text-button" onClick={() => onAddEvent(dateKey(selected))}>＋ Add an event</button></div>}
        <button className="add-task" onClick={onOpenTasks}>View all tasks & deadlines</button>
      </aside>
    </div>
  </section>;
}
