import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../lib/supabase";

type Course = { id: string; title: string };
type Post = { id: string; user_id: string; course_id: string | null; post_type: string; title: string; body: string; created_at: string };
type Comment = { id: string; post_id: string; user_id: string; body: string; created_at: string };
type Group = { id: string; created_by: string; course_id: string | null; name: string; description: string; created_at: string };
type Reaction = { post_id: string; user_id: string; reaction: "like" | "love" | "helpful" };
type Report = { id: string; reporter_id: string; post_id: string | null; comment_id: string | null; reason: string; details: string; status: "open" | "reviewing" | "resolved" | "dismissed"; created_at: string; target_preview?: string };

export function CommunityWorkspace({ userId, courses, displayName }: { userId: string; courses: Course[]; displayName: string }) {
  const [tab,setTab]=useState<"feed"|"groups"|"moderation">("feed"),[posts,setPosts]=useState<Post[]>([]),[groups,setGroups]=useState<Group[]>([]);
  const [joined,setJoined]=useState<string[]>([]),[expanded,setExpanded]=useState<string|null>(null);
  const [comments,setComments]=useState<Record<string,Comment[]>>({}),[drafts,setDrafts]=useState<Record<string,string>>({});
  const [reactions,setReactions]=useState<Reaction[]>([]);
  const [title,setTitle]=useState(""),[body,setBody]=useState(""),[kind,setKind]=useState("discussion"),[course,setCourse]=useState("");
  const [groupName,setGroupName]=useState(""),[groupDesc,setGroupDesc]=useState(""),[groupCourse,setGroupCourse]=useState("");
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const [isModerator,setIsModerator]=useState(false),[reports,setReports]=useState<Report[]>([]),[moderationBusy,setModerationBusy]=useState<string|null>(null);

  async function refresh(){
    if(!supabase)return;
    const [p,g,m,r,role]=await Promise.all([
      supabase.from("community_posts").select("id,user_id,course_id,post_type,title,body,created_at").order("created_at",{ascending:false}).limit(50),
      supabase.from("study_groups").select("id,created_by,course_id,name,description,created_at").order("created_at",{ascending:false}).limit(50),
      supabase.from("study_group_members").select("group_id").eq("user_id",userId),
      supabase.from("community_post_reactions").select("post_id,user_id,reaction"),
      supabase.from("meowks_moderator_roles").select("user_id").eq("user_id",userId).maybeSingle()
    ]);
    if(p.error||g.error||m.error||r.error||role.error){setError(p.error?.message||g.error?.message||m.error?.message||r.error?.message||role.error?.message||"Unable to load community.");return;}
    setPosts((p.data||[]) as Post[]);setGroups((g.data||[]) as Group[]);setJoined((m.data||[]).map(x=>x.group_id));setReactions((r.data||[]) as Reaction[]);
    const moderator=Boolean(role.data);setIsModerator(moderator);
    if(moderator){
      const {data:reportRows,error:reportError}=await supabase.from("community_reports").select("id,reporter_id,post_id,comment_id,reason,details,status,created_at").order("created_at",{ascending:false}).limit(100);
      if(reportError)setError(reportError.message);
      else{
        const rows=(reportRows||[]) as Report[];
        const postIds=rows.flatMap(row=>row.post_id?[row.post_id]:[]);
        const commentIds=rows.flatMap(row=>row.comment_id?[row.comment_id]:[]);
        const postPreviews:Record<string,string>={};const commentPreviews:Record<string,string>={};
        if(postIds.length){const {data,error:previewError}=await supabase.from("community_posts").select("id,title,body").in("id",postIds);if(previewError)setError(previewError.message);(data||[]).forEach(item=>{postPreviews[item.id]=`${item.title}: ${item.body}`;});}
        if(commentIds.length){const {data,error:previewError}=await supabase.from("community_comments").select("id,body").in("id",commentIds);if(previewError)setError(previewError.message);(data||[]).forEach(item=>{commentPreviews[item.id]=item.body;});}
        setReports(rows.map(row=>({...row,target_preview:row.post_id?postPreviews[row.post_id]:row.comment_id?commentPreviews[row.comment_id]:""})));
      }
    }else setReports([]);
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
  async function react(postId:string,reaction:"like"|"love"|"helpful"){
    if(!supabase)return;setBusy(true);setError("");
    const existing=reactions.find(r=>r.post_id===postId&&r.user_id===userId);
    const result=existing?.reaction===reaction
      ? await supabase.from("community_post_reactions").delete().eq("post_id",postId).eq("user_id",userId)
      : await supabase.from("community_post_reactions").upsert({post_id:postId,user_id:userId,reaction},{onConflict:"post_id,user_id"});
    setBusy(false);if(result.error)setError(result.error.message);else await refresh();
  }
  async function report(target:{post_id?:string;comment_id?:string}){
    if(!supabase)return;
    const reason=window.prompt("Report reason: spam, harassment, misinformation, copyright, inappropriate, or other");
    if(!reason)return;
    const allowed=["spam","harassment","misinformation","copyright","inappropriate","other"];
    const normalized=reason.trim().toLowerCase();
    if(!allowed.includes(normalized)){setError("Please use one of the listed report reasons.");return;}
    const details=window.prompt("Optional details (do not include private information).")||"";
    const {error:e}=await supabase.from("community_reports").insert({reporter_id:userId,...target,reason:normalized,details:details.slice(0,1000)});
    if(e)setError(e.message);else setNotice("Thanks. Your report was submitted for review.");
  }
  async function updateReportStatus(report:Report,status:Report["status"]){
    if(!supabase||!isModerator)return;setModerationBusy(report.id);setError("");
    const {error:e}=await supabase.from("community_reports").update({status}).eq("id",report.id);
    setModerationBusy(null);if(e)setError(e.message);else{setReports(rows=>rows.map(row=>row.id===report.id?{...row,status}:row));setNotice(`Report marked ${status}.`);}
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
  const reactionCount=(postId:string,type:string)=>reactions.filter(r=>r.post_id===postId&&r.reaction===type).length;
  const myReaction=(postId:string)=>reactions.find(r=>r.post_id===postId&&r.user_id===userId)?.reaction;
  return <section className="feature-page community-workspace">
    <div className="feature-heading"><div><p className="eyebrow">BETTER TOGETHER</p><h1>Community<span className="coral">.</span></h1><p className="subheading">Ask questions, share what you know, and find your study people.</p></div></div>
    {notice&&<div className="inline-notice" role="status">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
    {error&&<div className="inline-error" role="alert">{error}<button onClick={()=>setError("")}>×</button></div>}
    <div className="community-tabs"><button className={tab==="feed"?"active":""} onClick={()=>setTab("feed")}>◎ Community feed</button><button className={tab==="groups"?"active":""} onClick={()=>setTab("groups")}>♧ Study groups</button>{isModerator&&<button className={tab==="moderation"?"active":""} onClick={()=>setTab("moderation")}>⚑ Moderation ({reports.filter(r=>r.status==="open"||r.status==="reviewing").length})</button>}</div>
    {tab==="feed"&&<>
      <form className="panel community-compose" onSubmit={publish}><div className="community-compose-heading"><span className="community-avatar">{initial}</span><div><strong>Share something with the community</strong><small>Questions, insights, and helpful resources are welcome.</small></div></div>
        <input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={180} placeholder="Give your post a clear title"/>
        <textarea value={body} onChange={e=>setBody(e.target.value)} required maxLength={10000} rows={4} placeholder="What's on your mind? Be kind and constructive…"/>
        <div className="compose-actions"><select value={kind} onChange={e=>setKind(e.target.value)}><option value="discussion">Discussion</option><option value="question">Question</option><option value="resource">Study resource</option></select><select value={course} onChange={e=>setCourse(e.target.value)}><option value="">General community</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select><button className="primary-button" disabled={busy}>{busy?"Posting…":"Publish post"}</button></div>
      </form>
      <div className="community-post-list">{posts.length?posts.map(p=><article className="panel community-post" key={p.id}>
        <div className="community-post-meta"><span className="community-avatar">{p.user_id===userId?initial:"M"}</span><div><strong>{p.user_id===userId?(displayName||"You"):"Meowks student"}</strong><small>{new Date(p.created_at).toLocaleString()} · {courseLabel(p.course_id)}</small></div><span className="post-type">{p.post_type}</span></div>
        <h2>{p.title}</h2><p className="community-post-body">{p.body}</p>
        <div className="post-actions"><button onClick={()=>{const next=expanded===p.id?null:p.id;setExpanded(next);if(next)void loadComments(p.id);}}>💬 {comments[p.id]?.length??"Comments"}</button>{p.user_id===userId?<button className="danger-text" onClick={()=>void removePost(p)}>Delete post</button>:<button onClick={()=>void report({post_id:p.id})}>Report</button>}</div>
        <div className="post-reactions" aria-label="Post reactions">
          <button className={myReaction(p.id)==="like"?"selected":""} disabled={busy} onClick={()=>void react(p.id,"like")}>👍 Like <b>{reactionCount(p.id,"like")}</b></button>
          <button className={myReaction(p.id)==="love"?"selected":""} disabled={busy} onClick={()=>void react(p.id,"love")}>💚 Love <b>{reactionCount(p.id,"love")}</b></button>
          <button className={myReaction(p.id)==="helpful"?"selected":""} disabled={busy} onClick={()=>void react(p.id,"helpful")}>✨ Helpful <b>{reactionCount(p.id,"helpful")}</b></button>
        </div>
        {expanded===p.id&&<div className="comment-thread"><form onSubmit={e=>void reply(e,p.id)}><input value={drafts[p.id]||""} onChange={e=>setDrafts(v=>({...v,[p.id]:e.target.value}))} maxLength={3000} required placeholder="Write a thoughtful reply…"/><button className="primary-button" disabled={busy}>Reply</button></form>{(comments[p.id]||[]).map(c=><div className="comment-item" key={c.id}><div><strong>{c.user_id===userId?(displayName||"You"):"Meowks student"}</strong><small>{new Date(c.created_at).toLocaleString()}</small></div><p>{c.body}</p>{c.user_id!==userId&&<button className="comment-report" onClick={()=>void report({comment_id:c.id})}>Report comment</button>}</div>)}</div>}
      </article>):<div className="empty-card"><div className="empty-illustration">🐾</div><h2>Be the first to start a conversation.</h2><p>Share a question or a study tip to get things going.</p></div>}</div>
    </>}
    {tab==="moderation"&&isModerator&&<section className="moderation-queue"><div className="panel moderation-intro"><p className="eyebrow">COMMUNITY SAFETY</p><h2>Report review queue</h2><p>Review reports submitted by students. Change a report status after taking appropriate action. This queue does not automatically hide or delete reported content.</p><button className="secondary-button" onClick={()=>void refresh()}>Refresh reports</button></div>
      {reports.length?reports.map(report=><article className="panel moderation-report" key={report.id}><div className="moderation-report-heading"><div><strong>{report.reason.replace("_"," ")}</strong><small>{new Date(report.created_at).toLocaleString()} · Reporter {report.reporter_id.slice(0,8)}…</small></div><span className={`moderation-status status-${report.status}`}>{report.status}</span></div><p className="moderation-target">Reported {report.post_id?"post":"comment"} · ID {(report.post_id||report.comment_id||"").slice(0,8)}…</p><div className="moderation-details"><strong>Reported content</strong><p>{report.target_preview||"The reported content is no longer available."}</p><strong>Reporter details</strong><p>{report.details||"No additional details supplied."}</p></div><div className="moderation-actions"><button className="secondary-button" disabled={moderationBusy===report.id||report.status==="reviewing"} onClick={()=>void updateReportStatus(report,"reviewing")}>Mark reviewing</button><button className="primary-button" disabled={moderationBusy===report.id||report.status==="resolved"} onClick={()=>void updateReportStatus(report,"resolved")}>Resolve</button><button className="secondary-button" disabled={moderationBusy===report.id||report.status==="dismissed"} onClick={()=>void updateReportStatus(report,"dismissed")}>Dismiss</button></div></article>):<div className="empty-card"><div className="empty-illustration">🐾</div><h2>No reports to review.</h2><p>New community reports will appear here.</p></div>}
    </section>}
    {tab==="groups"&&<>
      <form className="panel community-compose" onSubmit={makeGroup}><p className="eyebrow">FIND YOUR STUDY PEOPLE</p><h2>Create a study group</h2><input value={groupName} onChange={e=>setGroupName(e.target.value)} required minLength={2} maxLength={100} placeholder="Group name"/><textarea value={groupDesc} onChange={e=>setGroupDesc(e.target.value)} rows={2} maxLength={1000} placeholder="What will your group work on?"/><div className="compose-actions"><select value={groupCourse} onChange={e=>setGroupCourse(e.target.value)}><option value="">General study group</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select><button className="primary-button" disabled={busy}>＋ Create group</button></div></form>
      <div className="study-group-grid">{groups.length?groups.map(g=><article className="panel study-group-card" key={g.id}><div className="group-symbol">♧</div><h2>{g.name}</h2><p>{g.description||"A space to study and make progress together."}</p><small>{courseLabel(g.course_id)} · {new Date(g.created_at).toLocaleDateString()}</small><div className="group-card-actions">{g.created_by===userId?<span className="group-owner-label">Your group</span>:joined.includes(g.id)?<button className="secondary-button" onClick={()=>void leave(g)}>Joined · Leave</button>:<button className="primary-button" disabled={busy} onClick={()=>void join(g)}>Join group</button>}</div></article>):<div className="empty-card"><div className="empty-illustration">♧</div><h2>Your study circle starts here.</h2><p>Create a group or invite classmates to join one.</p></div>}</div>
    </>}
  </section>;
}
