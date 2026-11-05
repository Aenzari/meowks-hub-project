import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../lib/supabase";

type Course = { id: string; title: string };
type Post = { id: string; user_id: string; course_id: string | null; post_type: string; title: string; body: string; created_at: string };
type Comment = { id: string; post_id: string; user_id: string; body: string; created_at: string };
type Group = { id: string; created_by: string; course_id: string | null; name: string; description: string; created_at: string };

export function CommunityWorkspace({ userId, courses, displayName }: { userId: string; courses: Course[]; displayName: string }) {
  const [tab,setTab]=useState<"feed"|"groups">("feed"),[posts,setPosts]=useState<Post[]>([]),[groups,setGroups]=useState<Group[]>([]);
  const [joined,setJoined]=useState<string[]>([]),[expanded,setExpanded]=useState<string|null>(null);
  const [comments,setComments]=useState<Record<string,Comment[]>>({}),[drafts,setDrafts]=useState<Record<string,string>>({});
  const [title,setTitle]=useState(""),[body,setBody]=useState(""),[kind,setKind]=useState("discussion"),[course,setCourse]=useState("");
  const [groupName,setGroupName]=useState(""),[groupDesc,setGroupDesc]=useState(""),[groupCourse,setGroupCourse]=useState("");
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");

  async function refresh(){
    if(!supabase)return;
    const [p,g,m]=await Promise.all([
      supabase.from("community_posts").select("id,user_id,course_id,post_type,title,body,created_at").order("created_at",{ascending:false}).limit(50),
      supabase.from("study_groups").select("id,created_by,course_id,name,description,created_at").order("created_at",{ascending:false}).limit(50),
      supabase.from("study_group_members").select("group_id").eq("user_id",userId)
    ]);
    if(p.error||g.error||m.error){setError(p.error?.message||g.error?.message||m.error?.message||"Unable to load community.");return;}
    setPosts((p.data||[]) as Post[]);setGroups((g.data||[]) as Group[]);setJoined((m.data||[]).map(x=>x.group_id));
  }
  useEffect(()=>{void refresh();},[userId]);
  async function loadComments(id:string){
    if(!supabase)return;
    const {data,error:e}=await supabase.from("community_comments").select("id,post_id,user_id,body,created_at").eq("post_id",id).order("created_at");
    if(e)setError(e.message);else setComments(v=>({...v,[id]:(data||[]) as Comment[]}));
  }
  async function publish(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!supabase)return;setBusy(true);setError("");
    const {error:e2}=await supabase.from("community_posts").insert({user_id:userId,title:title.trim(),body:body.trim(),post_type:kind,course_id:course||null});
    setBusy(false);if(e2){setError(e2.message);return;}setTitle("");setBody("");setCourse("");setNotice("Your post is live.");await refresh();
  }
  async function reply(e:FormEvent<HTMLFormElement>,id:string){
    e.preventDefault();if(!supabase)return;const value=(drafts[id]||"").trim();if(!value)return;
    setBusy(true);const {error:e2}=await supabase.from("community_comments").insert({post_id:id,user_id:userId,body:value});setBusy(false);
    if(e2)setError(e2.message);else{setDrafts(v=>({...v,[id]:""}));await loadComments(id);}
  }
  async function removePost(post:Post){
    if(!supabase||post.user_id!==userId||!window.confirm("Delete this post and its comments?"))return;
    const {error:e}=await supabase.from("community_posts").delete().eq("id",post.id);if(e)setError(e.message);else await refresh();
  }
  async function makeGroup(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!supabase)return;setBusy(true);const {error:e2}=await supabase.from("study_groups").insert({created_by:userId,name:groupName.trim(),description:groupDesc.trim(),course_id:groupCourse||null,visibility:"public"});setBusy(false);
    if(e2)setError(e2.message);else{setGroupName("");setGroupDesc("");setGroupCourse("");setNotice("Study group created.");await refresh();}
  }
  async function join(g:Group){
    if(!supabase)return;setBusy(true);const {error:e}=await supabase.from("study_group_members").insert({group_id:g.id,user_id:userId,role:"member"});setBusy(false);
    if(e)setError(e.message);else{setNotice("You joined the group.");await refresh();}
  }
  async function leave(g:Group){
    if(!supabase||g.created_by===userId)return;const {error:e}=await supabase.from("study_group_members").delete().eq("group_id",g.id).eq("user_id",userId);
    if(e)setError(e.message);else await refresh();
  }
  const courseLabel=(id:string|null)=>courses.find(c=>c.id===id)?.title||"Open community";
  const initial=displayName.trim().slice(0,1).toUpperCase()||"M";
  return <section className="feature-page community-workspace">
    <div className="feature-heading"><div><p className="eyebrow">BETTER TOGETHER</p><h1>Community<span className="coral">.</span></h1><p className="subheading">Ask questions, share what you know, and find your study people.</p></div></div>
    {notice&&<div className="inline-notice" role="status">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
    {error&&<div className="inline-error" role="alert">{error}<button onClick={()=>setError("")}>×</button></div>}
    <div className="community-tabs"><button className={tab==="feed"?"active":""} onClick={()=>setTab("feed")}>◎ Community feed</button><button className={tab==="groups"?"active":""} onClick={()=>setTab("groups")}>♧ Study groups</button></div>
    {tab==="feed"&&<>
      <form className="panel community-compose" onSubmit={publish}><div className="community-compose-heading"><span className="community-avatar">{initial}</span><div><strong>Share something with the community</strong><small>Questions, insights, and helpful resources are welcome.</small></div></div>
        <input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={180} placeholder="Give your post a clear title"/>
        <textarea value={body} onChange={e=>setBody(e.target.value)} required maxLength={10000} rows={4} placeholder="What's on your mind? Be kind and constructive…"/>
        <div className="compose-actions"><select value={kind} onChange={e=>setKind(e.target.value)}><option value="discussion">Discussion</option><option value="question">Question</option><option value="resource">Study resource</option></select><select value={course} onChange={e=>setCourse(e.target.value)}><option value="">General community</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select><button className="primary-button" disabled={busy}>{busy?"Posting…":"Publish post"}</button></div>
      </form>
      <div className="community-post-list">{posts.length?posts.map(p=><article className="panel community-post" key={p.id}>
        <div className="community-post-meta"><span className="community-avatar">{p.user_id===userId?initial:"M"}</span><div><strong>{p.user_id===userId?(displayName||"You"):"Meowks student"}</strong><small>{new Date(p.created_at).toLocaleString()} · {courseLabel(p.course_id)}</small></div><span className="post-type">{p.post_type}</span></div>
        <h2>{p.title}</h2><p className="community-post-body">{p.body}</p>
        <div className="post-actions"><button onClick={()=>{const next=expanded===p.id?null:p.id;setExpanded(next);if(next)void loadComments(p.id);}}>💬 {comments[p.id]?.length??"Comments"}</button>{p.user_id===userId&&<button className="danger-text" onClick={()=>void removePost(p)}>Delete post</button>}</div>
        {expanded===p.id&&<div className="comment-thread"><form onSubmit={e=>void reply(e,p.id)}><input value={drafts[p.id]||""} onChange={e=>setDrafts(v=>({...v,[p.id]:e.target.value}))} maxLength={3000} required placeholder="Write a thoughtful reply…"/><button className="primary-button" disabled={busy}>Reply</button></form>{(comments[p.id]||[]).map(c=><div className="comment-item" key={c.id}><strong>{c.user_id===userId?(displayName||"You"):"Meowks student"}</strong><small>{new Date(c.created_at).toLocaleString()}</small><p>{c.body}</p></div>)}</div>}
      </article>):<div className="empty-card"><div className="empty-illustration">🐾</div><h2>Be the first to start a conversation.</h2><p>Share a question or a study tip to get things going.</p></div>}</div>
    </>}
    {tab==="groups"&&<>
      <form className="panel community-compose" onSubmit={makeGroup}><p className="eyebrow">FIND YOUR STUDY PEOPLE</p><h2>Create a study group</h2><input value={groupName} onChange={e=>setGroupName(e.target.value)} required minLength={2} maxLength={100} placeholder="Group name"/><textarea value={groupDesc} onChange={e=>setGroupDesc(e.target.value)} rows={2} maxLength={1000} placeholder="What will your group work on?"/><div className="compose-actions"><select value={groupCourse} onChange={e=>setGroupCourse(e.target.value)}><option value="">General study group</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select><button className="primary-button" disabled={busy}>＋ Create group</button></div></form>
      <div className="study-group-grid">{groups.length?groups.map(g=><article className="panel study-group-card" key={g.id}><div className="group-symbol">♧</div><h2>{g.name}</h2><p>{g.description||"A space to study and make progress together."}</p><small>{courseLabel(g.course_id)} · {new Date(g.created_at).toLocaleDateString()}</small><div className="group-card-actions">{g.created_by===userId?<span className="group-owner-label">Your group</span>:joined.includes(g.id)?<button className="secondary-button" onClick={()=>void leave(g)}>Joined · Leave</button>:<button className="primary-button" disabled={busy} onClick={()=>void join(g)}>Join group</button>}</div></article>):<div className="empty-card"><div className="empty-illustration">♧</div><h2>Your study circle starts here.</h2><p>Create a group or invite classmates to join one.</p></div>}</div>
    </>}
  </section>;
}
