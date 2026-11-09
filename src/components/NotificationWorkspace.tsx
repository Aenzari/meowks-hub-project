import { useCallback, useEffect, useRef, useState } from "react";
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

const PAGE_SIZE = 50;

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
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [filter, setFilter] = useState<"all" | "unread" | "reactions" | "comments" | "groups">("all");
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const unreadCount = items.filter(item => !item.read_at).length;
  const visibleItems = items.filter(item => filter === "all" || (filter === "unread" && !item.read_at) || (filter === "reactions" && item.notification_type === "post_reaction") || (filter === "comments" && (item.notification_type === "post_comment" || item.notification_type === "comment_reply")) || (filter === "groups" && item.notification_type === "group_member"));

  const loadPeople = useCallback(async (rows: Notification[]) => {
    if (!supabase) return;
    const actorIds = [...new Set(rows.flatMap(row => row.actor_id ? [row.actor_id] : []))];
    if (!actorIds.length) {
      setPeople({});
      return;
    }
    const { data, error: profileError } = await supabase
      .from("profiles").select("id,display_name").in("id", actorIds);
    if (profileError) {
      setError(profileError.message);
      return;
    }
    setPeople(current => ({
      ...current,
      ...Object.fromEntries((data || []).map(person => [person.id, person.display_name || "A Meowks student"])),
    }));
  }, []);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      setError("Supabase is not configured.");
      return;
    }
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase
      .from("community_notifications")
      .select("id,actor_id,notification_type,post_id,comment_id,group_id,created_at,read_at")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);
    if (currentRequest !== requestId.current) return;
    if (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }
    const rows = (data || []) as Notification[];
    setItems(rows);
    setHasMore(rows.length === PAGE_SIZE);
    await loadPeople(rows);
    if (currentRequest === requestId.current) setLoading(false);
  }, [userId, loadPeople]);

  const loadOlder = useCallback(async () => {
    if (!supabase || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    setError("");
    const start = items.length;
    const { data, error: loadError } = await supabase
      .from("community_notifications")
      .select("id,actor_id,notification_type,post_id,comment_id,group_id,created_at,read_at")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .range(start, start + PAGE_SIZE - 1);
    if (loadError) setError(loadError.message);
    else {
      const rows = (data || []) as Notification[];
      setItems(current => {
        const existing = new Set(current.map(item => item.id));
        return [...current, ...rows.filter(item => !existing.has(item.id))];
      });
      setHasMore(rows.length === PAGE_SIZE);
      await loadPeople(rows);
    }
    setLoadingOlder(false);
  }, [hasMore, items.length, loadPeople, loadingOlder, userId]);

  useEffect(() => {
    void refresh();
    if (!supabase) return;
    const channel = supabase.channel(`community-notifications-${userId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "community_notifications",
        filter: `recipient_id=eq.${userId}`,
      }, () => { void refresh(); })
      .subscribe(status => {
        setRealtimeStatus(status === "SUBSCRIBED" ? "connected" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED" ? "disconnected" : "connecting");
      });
    return () => {
      setRealtimeStatus("disconnected");
      void supabase?.removeChannel(channel);
    };
  }, [refresh, userId]);

  useEffect(() => { onUnreadCountChange(unreadCount); }, [unreadCount, onUnreadCountChange]);

  async function markRead(item: Notification) {
    if (!supabase || item.read_at) return;
    setBusy(true); setError("");
    const readAt = new Date().toISOString();
    const { error: updateError } = await supabase.from("community_notifications")
      .update({ read_at: readAt }).eq("id", item.id).eq("recipient_id", userId);
    setBusy(false);
    if (updateError) setError(updateError.message);
    else setItems(current => current.map(row => row.id === item.id ? { ...row, read_at: readAt } : row));
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
      <div className="notification-actions">
        <button className="secondary-button" type="button" disabled={loading || busy} onClick={() => void refresh()}>Refresh</button>
        <button className="secondary-button" disabled={busy || unreadCount === 0} onClick={() => void markAllRead()}>Mark all as read</button>
      </div>
    </div>
    <div className="notification-connection" role="status">
      <span className={`notification-connection-dot ${realtimeStatus}`} />
      {realtimeStatus === "connected" ? "Live updates connected" : realtimeStatus === "connecting" ? "Connecting to live updates…" : "Live updates disconnected — refresh to check for new activity."}
    </div>
    {error && <div className="inline-error" role="alert">{error}<button type="button" onClick={() => setError("")} aria-label="Dismiss">×</button></div>}
    <div className="notification-toolbar"><div className="notification-filters" role="tablist" aria-label="Filter notifications">{([{value:"all",label:"All"},{value:"unread",label:"Unread"},{value:"reactions",label:"Reactions"},{value:"comments",label:"Comments"},{value:"groups",label:"Groups"}] as const).map(option=><button type="button" role="tab" aria-selected={filter===option.value} className={filter===option.value?"active":""} key={option.value} onClick={()=>setFilter(option.value)}>{option.label}{option.value==="unread"&&unreadCount>0?" "+unreadCount:""}</button>)}</div><span>{items.length} updates loaded</span></div>
    <div className="notification-list" aria-busy={loading}>
      {loading && !items.length ? <div className="empty-card"><p>Loading your notifications…</p></div> : visibleItems.length ? visibleItems.map(item => <button
        type="button" className={`panel notification-item ${item.read_at ? "is-read" : "is-unread"}`}
        key={item.id} onClick={() => openItem(item)} disabled={busy}
      >
        <span className="notification-dot" aria-hidden="true">{item.read_at ? "✓" : "•"}</span>
        <span className="notification-copy">
          <strong>{item.actor_id ? (people[item.actor_id] || "A Meowks student") : "A former member"} {notificationCopy[item.notification_type]}</strong>
          <small>{new Date(item.created_at).toLocaleString()}</small>
        </span>
        {!item.read_at && <span className="notification-new">New</span>}
      </button>) : <div className="empty-card"><div className="empty-illustration">🐾</div><h2>{loading ? "Refreshing your updates…" : filter === "unread" ? "No unread notifications." : "You're all caught up."}</h2><p>Reactions, comments, replies, and study group activity will show up here.</p></div>}
    </div>
    {hasMore && <div className="notification-load-more"><button className="secondary-button" type="button" disabled={loadingOlder} onClick={() => void loadOlder()}>{loadingOlder ? "Loading…" : "Load older notifications"}</button></div>}
  </section>;
}
