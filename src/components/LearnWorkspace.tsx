import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../lib/supabase";

type Course = { id: string; title: string };
type Note = { id: string; title: string; content: string; course_id: string | null; updated_at: string };
type Deck = { id: string; title: string; description: string | null; course_id: string | null };
type Card = { id: string; front: string; back: string; position: number };

export function LearnWorkspace({ userId, courses }: { userId: string; courses: Course[] }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteCourse, setNoteCourse] = useState("");
  const [deckOpen, setDeckOpen] = useState(false);
  const [deckTitle, setDeckTitle] = useState("");
  const [deckCourse, setDeckCourse] = useState("");
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(1500);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  async function refresh() {
    if (!supabase) return;
    const [n, d] = await Promise.all([
      supabase.from("study_notes").select("id,title,content,course_id,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }),
      supabase.from("flashcard_decks").select("id,title,description,course_id").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);
    if (n.error || d.error) setError(n.error?.message || d.error?.message || "Unable to load study tools.");
    else { setNotes((n.data || []) as Note[]); setDecks((d.data || []) as Deck[]); }
  }

  useEffect(() => { void refresh(); }, [userId]);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (seconds === 0 && running) {
      setRunning(false);
      void finishSession();
    }
  }, [seconds, running]);

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError("");
    const values = { title: noteTitle.trim(), content: noteContent, course_id: noteCourse || null };
    const result = editingNote
      ? await supabase.from("study_notes").update(values).eq("id", editingNote.id)
      : await supabase.from("study_notes").insert({ ...values, user_id: userId });
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    setNoteOpen(false); setEditingNote(null); setNoteTitle(""); setNoteContent(""); setNoteCourse("");
    setMessage(editingNote ? "Note updated." : "Note saved."); await refresh();
  }

  function editNote(note?: Note) {
    setEditingNote(note || null); setNoteTitle(note?.title || ""); setNoteContent(note?.content || "");
    setNoteCourse(note?.course_id || ""); setNoteOpen(true); setError("");
  }

  async function removeNote(note: Note) {
    if (!supabase || !window.confirm("Delete this note?")) return;
    const { error: e } = await supabase.from("study_notes").delete().eq("id", note.id);
    if (e) setError(e.message); else { setMessage("Note deleted."); await refresh(); }
  }

  async function createDeck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError("");
    const { data, error: e } = await supabase.from("flashcard_decks").insert({
      user_id: userId, title: deckTitle.trim(), course_id: deckCourse || null,
    }).select("id,title,description,course_id").single();
    setBusy(false);
    if (e) { setError(e.message); return; }
    setDeckOpen(false); setDeckTitle(""); setDeckCourse(""); setMessage("Deck created.");
    await refresh(); await selectDeck(data as Deck);
  }

  async function selectDeck(deck: Deck) {
    if (!supabase) return;
    setActiveDeck(deck); setCardIndex(0); setFlipped(false);
    const { data, error: e } = await supabase.from("flashcards").select("id,front,back,position")
      .eq("deck_id", deck.id).order("position");
    if (e) setError(e.message); else setCards((data || []) as Card[]);
  }

  async function addCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !activeDeck) return;
    setBusy(true); setError("");
    const { error: e } = await supabase.from("flashcards").insert({
      user_id: userId, deck_id: activeDeck.id, front: cardFront.trim(), back: cardBack.trim(), position: cards.length,
    });
    setBusy(false);
    if (e) { setError(e.message); return; }
    setCardFront(""); setCardBack(""); await selectDeck(activeDeck);
  }

  async function removeDeck(deck: Deck) {
    if (!supabase || !window.confirm("Delete this deck and all its cards?")) return;
    const { error: e } = await supabase.from("flashcard_decks").delete().eq("id", deck.id);
    if (e) setError(e.message); else { setActiveDeck(null); setMessage("Deck deleted."); await refresh(); }
  }

  async function finishSession() {
    if (!supabase || !startedAt) return;
    const ended = Date.now();
    const duration = Math.floor((ended - startedAt) / 1000);
    if (duration >= 60) {
      const { error: e } = await supabase.from("study_sessions").insert({
        user_id: userId, started_at: new Date(startedAt).toISOString(),
        ended_at: new Date(ended).toISOString(), duration_seconds: duration,
      });
      if (e) setError(e.message); else setMessage("Study session saved. Great work!");
    }
    setStartedAt(null);
  }

  function startTimer() {
    if (seconds <= 0) setSeconds(minutes * 60);
    if (!startedAt) setStartedAt(Date.now());
    setRunning(true);
  }

  async function stopTimer() {
    setRunning(false); await finishSession(); setSeconds(minutes * 60);
  }

  const courseName = (id: string | null) => courses.find((course) => course.id === id)?.title || "Personal";
  const activeCard = cards[cardIndex];

  return <section className="feature-page learn-workspace">
    <div className="feature-heading"><div><p className="eyebrow">LEARN AT YOUR OWN PACE</p><h1>Study tools<span className="coral">.</span></h1><p className="subheading">Your notes, memory practice, and focus time in one place.</p></div></div>
    {message && <div className="inline-notice" role="status">{message}<button onClick={() => setMessage("")}>×</button></div>}
    {error && <div className="inline-error" role="alert">{error}<button onClick={() => setError("")}>×</button></div>}
    <div className="learn-grid">
      <section className="panel learn-panel">
        <div className="panel-heading"><div><p className="eyebrow">YOUR KNOWLEDGE SPACE</p><h2>My notes</h2></div><button className="text-button" onClick={() => editNote()}>＋ New note</button></div>
        {notes.length ? <div className="note-list">{notes.map((note) => <article className="note-item" key={note.id}><div><strong>{note.title}</strong><small>{courseName(note.course_id)} · {new Date(note.updated_at).toLocaleDateString()}</small><p>{note.content.slice(0, 140) || "No note content yet."}</p></div><div className="note-actions"><button onClick={() => editNote(note)}>Edit</button><button className="danger-text" onClick={() => void removeNote(note)}>Delete</button></div></article>)}</div> : <p className="empty-state">No notes yet. Capture something worth remembering.</p>}
      </section>
      <section className="panel learn-panel">
        <div className="panel-heading"><div><p className="eyebrow">ACTIVE RECALL</p><h2>Flashcards</h2></div><button className="text-button" onClick={() => setDeckOpen(true)}>＋ New deck</button></div>
        {activeDeck ? <div className="practice-area">
          <div className="practice-heading"><strong>{activeDeck.title}</strong><button className="text-button" onClick={() => setActiveDeck(null)}>All decks</button></div>
          {activeCard ? <><button className="flashcard-face" onClick={() => setFlipped(!flipped)}><span>{flipped ? "ANSWER" : "QUESTION"}</span><strong>{flipped ? activeCard.back : activeCard.front}</strong><small>Tap to flip</small></button><div className="flashcard-controls"><button disabled={cardIndex === 0} onClick={() => { setCardIndex(cardIndex - 1); setFlipped(false); }}>← Previous</button><span>{cardIndex + 1} / {cards.length}</span><button disabled={cardIndex >= cards.length - 1} onClick={() => { setCardIndex(cardIndex + 1); setFlipped(false); }}>Next →</button></div></> : <p className="empty-state">Add your first flashcard below.</p>}
          <form className="quick-card-form" onSubmit={addCard}><input value={cardFront} onChange={(e) => setCardFront(e.target.value)} placeholder="Question / front" required/><textarea value={cardBack} onChange={(e) => setCardBack(e.target.value)} placeholder="Answer / back" rows={2} required/><button className="primary-button" disabled={busy}>{busy ? "Saving…" : "＋ Add flashcard"}</button></form>
        </div> : decks.length ? <div className="deck-list">{decks.map((deck) => <article className="deck-item" key={deck.id}><button className="deck-open" onClick={() => void selectDeck(deck)}><span className="deck-icon">▤</span><span><strong>{deck.title}</strong><small>{courseName(deck.course_id)} · Open deck</small></span><b>→</b></button><button className="danger-text deck-delete" onClick={() => void removeDeck(deck)}>Delete</button></article>)}</div> : <p className="empty-state">Create a deck to start practicing active recall.</p>}
      </section>
    </div>
    <section className="panel timer-panel"><div><p className="eyebrow">FOCUS WITHOUT DISTRACTIONS</p><h2>Study timer</h2><p className="focus-description">A focused session is a small promise to yourself.</p></div><div className="timer-controls"><select aria-label="Study duration" value={minutes} disabled={running} onChange={(e) => { const value = Number(e.target.value); setMinutes(value); setSeconds(value * 60); }}><option value={15}>15 minutes</option><option value={25}>25 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option></select><div className="timer-display">{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</div><div className="timer-buttons">{!running ? <button className="primary-button" onClick={startTimer}>Start focus</button> : <button className="primary-button" onClick={() => setRunning(false)}>Pause</button>}{startedAt && <button className="secondary-button" onClick={() => void stopTimer()}>Finish session</button>}</div></div></section>
    {noteOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setNoteOpen(false); }}><section className="modal-card" role="dialog" aria-modal="true"><div className="modal-heading"><div><p className="eyebrow">YOUR KNOWLEDGE SPACE</p><h2>{editingNote ? "Edit note" : "Create a note"}</h2></div><button className="modal-close" onClick={() => setNoteOpen(false)}>×</button></div><form className="auth-form" onSubmit={saveNote}><label>Note title<input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} required maxLength={140} placeholder="e.g. Week 1 lecture summary"/></label><label>Course <span className="optional-label">Optional</span><select value={noteCourse} onChange={(e) => setNoteCourse(e.target.value)}><option value="">Personal note</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><label>Notes<textarea rows={9} value={noteContent} onChange={(e) => setNoteContent(e.target.value)} maxLength={20000} placeholder="Write your key ideas, explanations, and reminders…"/></label><button className="primary-button auth-submit" disabled={busy}>{busy ? "Saving…" : "Save note"}</button></form></section></div>}
    {deckOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setDeckOpen(false); }}><section className="modal-card" role="dialog" aria-modal="true"><div className="modal-heading"><div><p className="eyebrow">ACTIVE RECALL</p><h2>Create flashcard deck</h2></div><button className="modal-close" onClick={() => setDeckOpen(false)}>×</button></div><form className="auth-form" onSubmit={createDeck}><label>Deck name<input value={deckTitle} onChange={(e) => setDeckTitle(e.target.value)} required maxLength={120} placeholder="e.g. Biology — Cell Structure"/></label><label>Course <span className="optional-label">Optional</span><select value={deckCourse} onChange={(e) => setDeckCourse(e.target.value)}><option value="">Personal deck</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><button className="primary-button auth-submit" disabled={busy}>{busy ? "Creating…" : "Create deck"}</button></form></section></div>}
  </section>;
}
