import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Notification = {
  id: string;
  actor_id: string | null;
  notification_type: "post_reaction" | "post_comment" | "comment_reply" | "group_member";
  post_id: string | null;
  comment_id: string | null;
  group_id: string | null;
  created_at: string;
  read_at: string | null;
};

const notificationCopy: Record<Notification["notification_type"], string> = {
  post_reaction: "reacted to your post",
  post_comment: "commented on your post",
  comment_reply: "replied to your comment",
  group_member: "joined your study group",
};

export function NotificationWorkspace({
  userId,
  onUnreadCountChange,
  onOpenCommunity,
}: {
  userId: string;
  onUnreadCountChange: (count: number) => void;
  onOpenCommunity: () => void;
}) {
  const [items, setItems] = useState<Notification[]>([]);
  const [people, setPeople] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const unreadCount = items.filter(item => !item.read_at).length;

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const { data, error: loadError } = await supabase
      .from("community_notifications")
      .select("id,actor_id,notification_type,post_id,comment_id,group_id,created_at,read_at")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (loadError) { setError(loadError.message); return; }
    const rows = (data || []) as Notification[];
    setItems(rows);
    const actorIds = [...new Set(rows.flatMap(row => row.actor_id ? [row.actor_id] : []))];
    if (actorIds.length) {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles").select("id,display_name").in("id", actorIds);
      if (profileError) setError(profileError.message);
      else setPeople(Object.fromEntries((profiles || []).map(person => [person.id, person.display_name || "A Meowks student"])));
    } else setPeople({});
  }, [userId]);

  useEffect(() => {
    void refresh();
    if (!supabase) return;
    const channel = supabase.channel(`community-notifications-${userId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "community_notifications",
        filter: `recipient_id=eq.${userId}`,
      }, () => { void refresh(); })
      .subscribe();
    return () => { void supabase?.removeChannel(channel); };
  }, [refresh, userId]);

  useEffect(() => { onUnreadCountChange(unreadCount); }, [unreadCount, onUnreadCountChange]);

  async function markRead(item: Notification) {
    if (!supabase || item.read_at) return;
    setBusy(true); setError("");
    const { error: updateError } = await supabase.from("community_notifications")
      .update({ read_at: new Date().toISOString() }).eq("id", item.id);
    setBusy(false);
    if (updateError) setError(updateError.message);
    else setItems(current => current.map(row => row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row));
  }

  async function markAllRead() {
    if (!supabase || unreadCount === 0) return;
    setBusy(true); setError("");
    const readAt = new Date().toISOString();
    const { error: updateError } = await supabase.from("community_notifications")
      .update({ read_at: readAt }).eq("recipient_id", userId).is("read_at", null);
    setBusy(false);
    if (updateError) setError(updateError.message);
    else setItems(current => current.map(row => row.read_at ? row : { ...row, read_at: readAt }));
  }

  function openItem(item: Notification) {
    if (!item.read_at) void markRead(item);
    onOpenCommunity();
  }

  return <section className="feature-page notification-workspace">
    <div className="feature-heading">
      <div><p className="eyebrow">YOUR MEOWKS UPDATES</p><h1>Notifications<span className="coral">.</span></h1>
        <p className="subheading">Stay in the loop with your community.</p></div>
      <button className="secondary-button" disabled={busy || unreadCount === 0} onClick={() => void markAllRead()}>Mark all as read</button>
    </div>
    {error && <div className="inline-error" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss">×</button></div>}
    <div className="notification-list">
      {items.length ? items.map(item => <button
        type="button" className={`panel notification-item ${item.read_at ? "is-read" : "is-unread"}`}
        key={item.id} onClick={() => openItem(item)} disabled={busy}
      >
        <span className="notification-dot" aria-hidden="true">{item.read_at ? "✓" : "•"}</span>
        <span className="notification-copy">
          <strong>{item.actor_id ? (people[item.actor_id] || "A Meowks student") : "A former member"} {notificationCopy[item.notification_type]}</strong>
          <small>{new Date(item.created_at).toLocaleString()}</small>
        </span>
        {!item.read_at && <span className="notification-new">New</span>}
      </button>) : <div className="empty-card"><div className="empty-illustration">🐾</div><h2>You're all caught up.</h2><p>Reactions, comments, replies, and study group activity will show up here.</p></div>}
    </div>
  </section>;
}
