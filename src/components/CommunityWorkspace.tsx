import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../lib/supabase";

type Course = { id: string; title: string };
type Post = { id: string; user_id: string; course_id: string | null; post_type: string; title: string; body: string; created_at: string };
type Comment = { id: string; post_id: string; user_id: string; body: string; created_at: string };
type Group = { id: string; created_by: string; course_id: string | null; name: string; description: string; visibility: "public" | "private"; created_at: string };
type Reaction = { post_id: string; user_id: string; reaction: "like" | "love" | "helpful" };
type Report = { id: string; reporter_id: string; post_id: string | null; comment_id: string | null; reason: string; details: string; status: "open" | "reviewing" | "resolved" | "dismissed"; created_at: string; target_preview?: string };

export function CommunityWorkspace({ userId, courses, displayName }: { userId: string; courses: Course[]; displayName: string }) {
  const [tab,setTab]=useState<"feed"|"groups"|"moderation">("feed"),[posts,setPosts]=useState<Post[]>([]),[groups,setGroups]=useState<Group[]>([]);
  const [feedFilter,setFeedFilter]=useState<"all"|"discussion"|"question"|"resource">("all"),[feedSearch,setFeedSearch]=useState("");
  const [joined,setJoined]=useState<string[]>([]),[expanded,setExpanded]=useState<string|null>(null),[groupCreators,setGroupCreators]=useState<Record<string,string>>({});
  const [comments,setComments]=useState<Record<string,Comment[]>>({}),[commentCounts,setCommentCounts]=useState<Record<string,number>>({}),[drafts,setDrafts]=useState<Record<string,string>>({});
  const [reactions,setReactions]=useState<Reaction[]>([]),[people,setPeople]=useState<Record<string,string>>({});
  const [title,setTitle]=useState(""),[body,setBody]=useState(""),[kind,setKind]=useState("discussion"),[course,setCourse]=useState("");
  const [groupName,setGroupName]=useState(""),[groupDesc,setGroupDesc]=useState(""),[groupCourse,setGroupCourse]=useState("");
  const [groupSearch,setGroupSearch]=useState(""),[groupScope,setGroupScope]=useState<"all"|"joined"|"created">("all"),[groupCourseFilter,setGroupCourseFilter]=useState("");
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const [isModerator,setIsModerator]=useState(false),[reports,setReports]=useState<Report[]>([]),[moderationBusy,setModerationBusy]=useState<string|null>(null);
  const [reportTarget,setReportTarget]=useState<{post_id?:string;comment_id?:string}|null>(null),[reportReason,setReportReason]=useState("spam"),[reportDetails,setReportDetails]=useState(""),[reportBusy,setReportBusy]=useState(false);

  async function refresh(){
    if(!supabase)return;
    const [p,g,m,r,role]=await Promise.all([
      supabase.from("community_posts").select("id,user_id,course_id,post_type,title,body,created_at").order("created_at",{ascending:false}).limit(50),
      supabase.from("study_groups").select("id,created_by,course_id,name,description,visibility,created_at").order("created_at",{ascending:false}).limit(50),
      supabase.from("study_group_members").select("group_id").eq("user_id",userId),
      supabase.from("community_post_reactions").select("post_id,user_id,reaction"),
      supabase.from("meowks_moderator_roles").select("user_id").eq("user_id",userId).maybeSingle()
    ]);
    if(p.error||g.error||m.error||r.error||role.error){setError(p.error?.message||g.error?.message||m.error?.message||r.error?.message||role.error?.message||"Unable to load community.");return;}
    setPosts((p.data||[]) as Post[]);setGroups((g.data||[]) as Group[]);setJoined((m.data||[]).map(x=>x.group_id));setReactions((r.data||[]) as Reaction[]);
    const creatorIds=[...new Set((g.data||[]).map(item=>item.created_by))];
    if(creatorIds.length){const {data:creatorProfiles}=await supabase.from("profiles").select("id,display_name").in("id",creatorIds);if(creatorProfiles)setGroupCreators(Object.fromEntries(creatorProfiles.map(item=>[item.id,item.display_name||"Meowks student"])));}
    else setGroupCreators({});
    const postIds=(p.data||[]).map(item=>item.id);
    if(postIds.length){
      const {data:commentRows,error:commentCountError}=await supabase.from("community_comments").select("post_id").in("post_id",postIds);
      if(commentCountError)setError(commentCountError.message);
      else{const counts:Record<string,number>={};(commentRows||[]).forEach(row=>{counts[row.post_id]=(counts[row.post_id]||0)+1;});setCommentCounts(counts);}
    }else setCommentCounts({});
    const authorIds=[...new Set((p.data||[]).map(item=>item.user_id))];
    if(authorIds.length){const {data:profiles}=await supabase.from("profiles").select("id,display_name").in("id",authorIds);setPeople(current=>({...current,...Object.fromEntries((profiles||[]).map(item=>[item.id,item.display_name||"Meowks student"]))}));}
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
    if(e)setError(e.message);else{
      setComments(v=>({...v,[id]:(data||[]) as Comment[]}));setCommentCounts(v=>({...v,[id]:(data||[]).length}));
      const ids=[...new Set((data||[]).map(item=>item.user_id))];
      if(ids.length){const {data:profiles}=await supabase.from("profiles").select("id,display_name").in("id",ids);if(profiles)setPeople(current=>({...current,...Object.fromEntries(profiles.map(item=>[item.id,item.display_name||"Meowks student"]))}));}
    }
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
  async function editPost(post:Post){
    if(!supabase||post.user_id!==userId)return;
    const nextTitle=window.prompt("Edit post title",post.title);
    if(nextTitle===null)return;
    const nextBody=window.prompt("Edit post content",post.body);
    if(nextBody===null)return;
    if(!nextTitle.trim()||!nextBody.trim()){setError("Post title and content cannot be empty.");return;}
    setBusy(true);setError("");
    const {error:e}=await supabase.from("community_posts").update({title:nextTitle.trim(),body:nextBody.trim()}).eq("id",post.id).eq("user_id",userId);
    setBusy(false);
    if(e)setError(e.message);else{setNotice("Your post was updated.");await refresh();}
  }
  async function editComment(comment:Comment){
    if(!supabase||comment.user_id!==userId)return;
    const nextBody=window.prompt("Edit your comment",comment.body);
    if(nextBody===null)return;
    if(!nextBody.trim()){setError("Comment cannot be empty.");return;}
    setBusy(true);setError("");
    const {error:e}=await supabase.from("community_comments").update({body:nextBody.trim()}).eq("id",comment.id).eq("user_id",userId);
    setBusy(false);
    if(e)setError(e.message);else{setNotice("Your comment was updated.");await loadComments(comment.post_id);}
  }
  async function removeComment(comment:Comment){
    if(!supabase||comment.user_id!==userId||!window.confirm("Delete your comment?"))return;
    setBusy(true);setError("");
    const {error:e}=await supabase.from("community_comments").delete().eq("id",comment.id).eq("user_id",userId);
    setBusy(false);
    if(e)setError(e.message);else{setNotice("Your comment was deleted.");await loadComments(comment.post_id);}
  }
  async function removePost(post:Post){
    if(!supabase||post.user_id!==userId||!window.confirm("Delete this post and its comments?"))return;
    const {error:e}=await supabase.from("community_posts").delete().eq("id",post.id).eq("user_id",userId);if(e)setError(e.message);else await refresh();
  }
  async function react(postId:string,reaction:"like"|"love"|"helpful"){
    if(!supabase)return;setBusy(true);setError("");
    const existing=reactions.find(r=>r.post_id===postId&&r.user_id===userId);
    const result=existing?.reaction===reaction
      ? await supabase.from("community_post_reactions").delete().eq("post_id",postId).eq("user_id",userId)
      : await supabase.from("community_post_reactions").upsert({post_id:postId,user_id:userId,reaction},{onConflict:"post_id,user_id"});
    setBusy(false);if(result.error)setError(result.error.message);else await refresh();
  }
  function report(target:{post_id?:string;comment_id?:string}){
    setReportTarget(target);setReportReason("spam");setReportDetails("");setError("");
  }
  async function submitReport(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!supabase||!reportTarget||reportBusy)return;
    setReportBusy(true);setError("");
    const {error:e2}=await supabase.from("community_reports").insert({reporter_id:userId,...reportTarget,reason:reportReason,details:reportDetails.trim().slice(0,1000)});
    setReportBusy(false);
    if(e2)setError(e2.message);else{setReportTarget(null);setReportDetails("");setNotice("Thanks. Your report was submitted for review.");}
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
  async function editGroup(g:Group){
    if(!supabase||g.created_by!==userId)return;
    const nextName=window.prompt("Edit group name",g.name);
    if(nextName===null)return;
    const nextDescription=window.prompt("Edit group description",g.description);
    if(nextDescription===null)return;
    if(nextName.trim().length<2||nextName.trim().length>100||nextDescription.length>1000){setError("Group name must be 2–100 characters and description no more than 1,000.");return;}
    setBusy(true);setError("");
    const {error:e}=await supabase.from("study_groups").update({name:nextName.trim(),description:nextDescription.trim()}).eq("id",g.id).eq("created_by",userId);
    setBusy(false);
    if(e)setError(e.message);else{setNotice("Your study group was updated.");await refresh();}
  }
  async function deleteGroup(g:Group){
    if(!supabase||g.created_by!==userId||!window.confirm(`Delete “${g.name}”? This permanently removes the group and its memberships.`))return;
    setBusy(true);setError("");
    const {error:e}=await supabase.from("study_groups").delete().eq("id",g.id).eq("created_by",userId);
    setBusy(false);
    if(e)setError(e.message);else{setNotice("Your study group was deleted.");await refresh();}
  }

  const courseLabel=(id:string|null)=>courses.find(c=>c.id===id)?.title||"Open community";
  const initial=displayName.trim().slice(0,1).toUpperCase()||"M";
  const reactionCount=(postId:string,type:string)=>reactions.filter(r=>r.post_id===postId&&r.reaction===type).length;
  const myReaction=(postId:string)=>reactions.find(r=>r.post_id===postId&&r.user_id===userId)?.reaction;
  const visiblePosts=posts.filter(post=>(feedFilter==="all"||post.post_type===feedFilter)&&(!feedSearch.trim()||`${post.title} ${post.body} ${people[post.user_id]||""}`.toLowerCase().includes(feedSearch.trim().toLowerCase())));
  const visibleGroups=groups.filter(group=>(groupScope==="all"||(groupScope==="joined"&&(joined.includes(group.id)||group.created_by===userId))||(groupScope==="created"&&group.created_by===userId))&&(!groupCourseFilter||group.course_id===groupCourseFilter)&&(!groupSearch.trim()||`${group.name} ${group.description} ${courseLabel(group.course_id)}`.toLowerCase().includes(groupSearch.trim().toLowerCase())));
  return <section className="feature-page community-workspace">
    <div className="feature-heading"><div><p className="eyebrow">BETTER TOGETHER</p><h1>Community<span className="coral">.</span></h1><p className="subheading">Ask questions, share what you know, and find your study people.</p></div></div>
    {notice&&<div className="inline-notice" role="status">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
    {error&&<div className="inline-error" role="alert">{error}<button onClick={()=>setError("")}>×</button></div>}
    <div className="community-tabs" role="tablist" aria-label="Community sections"><button role="tab" aria-selected={tab==="feed"} className={tab==="feed"?"active":""} onClick={()=>setTab("feed")}>Feed</button><button role="tab" aria-selected={tab==="groups"} className={tab==="groups"?"active":""} onClick={()=>setTab("groups")}>Study groups</button>{isModerator&&<button role="tab" aria-selected={tab==="moderation"} className={tab==="moderation"?"active":""} onClick={()=>setTab("moderation")}>Moderation <span className="nav-count">{reports.filter(r=>r.status==="open"||r.status==="reviewing").length}</span></button>}</div>
    {tab==="feed"&&<>
      <form className="panel community-compose" onSubmit={publish}><div className="community-compose-heading"><span className="community-avatar">{initial}</span><div><strong>Share something with the community</strong><small>Questions, insights, and helpful resources are welcome.</small></div></div>
        <input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={180} placeholder="Give your post a clear title"/>
        <textarea value={body} onChange={e=>setBody(e.target.value)} required maxLength={10000} rows={4} placeholder="What's on your mind? Be kind and constructive…"/>
        <div className="compose-actions"><select value={kind} onChange={e=>setKind(e.target.value)}><option value="discussion">Discussion</option><option value="question">Question</option><option value="resource">Study resource</option></select><select value={course} onChange={e=>setCourse(e.target.value)}><option value="">General community</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select><button className="primary-button" disabled={busy}>{busy?"Posting…":"Publish post"}</button></div>
      </form>
      <div className="community-feed-tools"><div className="community-filter-tabs" aria-label="Filter posts">{([{value:"all",label:"For you"},{value:"discussion",label:"Discussions"},{value:"question",label:"Questions"},{value:"resource",label:"Resources"}] as const).map(option=><button type="button" key={option.value} className={feedFilter===option.value?"active":""} onClick={()=>setFeedFilter(option.value)}>{option.label}</button>)}</div><input aria-label="Search community posts" value={feedSearch} onChange={e=>setFeedSearch(e.target.value)} placeholder="Search discussions, questions, resources…"/></div>
      <div className="community-post-list">{visiblePosts.length?visiblePosts.map(p=><article className="panel community-post" key={p.id}>
        <div className="community-post-meta"><span className="community-avatar">{p.user_id===userId?initial:"M"}</span><div><strong>{p.user_id===userId?(displayName||"You"):(people[p.user_id]||"Meowks student")}</strong><small>{new Date(p.created_at).toLocaleString()} · {courseLabel(p.course_id)}</small></div><span className="post-type">{p.post_type}</span></div>
        <h2>{p.title}</h2><p className="community-post-body">{p.body}</p>
        <div className="post-actions"><button onClick={()=>{const next=expanded===p.id?null:p.id;setExpanded(next);if(next)void loadComments(p.id);}}>💬 {commentCounts[p.id]??0} {commentCounts[p.id]===1?"Comment":"Comments"}</button>{p.user_id===userId?<><button onClick={()=>void editPost(p)}>Edit post</button><button className="danger-text" onClick={()=>void removePost(p)}>Delete post</button></>:<button onClick={()=>void report({post_id:p.id})}>Report</button>}</div>
        <div className="post-reactions" aria-label="Post reactions">
          <button className={myReaction(p.id)==="like"?"selected":""} disabled={busy} onClick={()=>void react(p.id,"like")}>👍 Like <b>{reactionCount(p.id,"like")}</b></button>
          <button className={myReaction(p.id)==="love"?"selected":""} disabled={busy} onClick={()=>void react(p.id,"love")}>💚 Love <b>{reactionCount(p.id,"love")}</b></button>
          <button className={myReaction(p.id)==="helpful"?"selected":""} disabled={busy} onClick={()=>void react(p.id,"helpful")}>✨ Helpful <b>{reactionCount(p.id,"helpful")}</b></button>
        </div>
        {expanded===p.id&&<div className="comment-thread"><form onSubmit={e=>void reply(e,p.id)}><input value={drafts[p.id]||""} onChange={e=>setDrafts(v=>({...v,[p.id]:e.target.value}))} maxLength={3000} required placeholder="Write a thoughtful reply…"/><button className="primary-button" disabled={busy}>Reply</button></form>{(comments[p.id]||[]).map(c=><div className="comment-item" key={c.id}><div><strong>{c.user_id===userId?(displayName||"You"):(people[c.user_id]||"Meowks student")}</strong><small>{new Date(c.created_at).toLocaleString()}</small></div><p>{c.body}</p>{c.user_id===userId?<><button className="comment-report" onClick={()=>void editComment(c)}>Edit comment</button><button className="comment-report danger-text" disabled={busy} onClick={()=>void removeComment(c)}>Delete comment</button></>:<button className="comment-report" onClick={()=>void report({comment_id:c.id})}>Report comment</button>}</div>)}</div>}
      </article>):<div className="empty-card"><div className="empty-illustration">🐾</div><h2>{feedSearch||feedFilter!=="all"?"No matching posts.":"Be the first to start a conversation."}</h2><p>{feedSearch||feedFilter!=="all"?"Try another search or filter.":"Share a question or a study tip to get things going."}</p></div>}</div>
    </>}
    {tab==="moderation"&&isModerator&&<section className="moderation-queue"><div className="panel moderation-intro"><p className="eyebrow">COMMUNITY SAFETY</p><h2>Report review queue</h2><p>Review reports submitted by students. Change a report status after taking appropriate action. This queue does not automatically hide or delete reported content.</p><button className="secondary-button" onClick={()=>void refresh()}>Refresh reports</button></div>
      {reports.length?reports.map(report=><article className="panel moderation-report" key={report.id}><div className="moderation-report-heading"><div><strong>{report.reason.replace("_"," ")}</strong><small>{new Date(report.created_at).toLocaleString()} · Reporter {report.reporter_id.slice(0,8)}…</small></div><span className={`moderation-status status-${report.status}`}>{report.status}</span></div><p className="moderation-target">Reported {report.post_id?"post":"comment"} · ID {(report.post_id||report.comment_id||"").slice(0,8)}…</p><div className="moderation-details"><strong>Reported content</strong><p>{report.target_preview||"The reported content is no longer available."}</p><strong>Reporter details</strong><p>{report.details||"No additional details supplied."}</p></div><div className="moderation-actions"><button className="secondary-button" disabled={moderationBusy===report.id||report.status==="reviewing"} onClick={()=>void updateReportStatus(report,"reviewing")}>Mark reviewing</button><button className="primary-button" disabled={moderationBusy===report.id||report.status==="resolved"} onClick={()=>void updateReportStatus(report,"resolved")}>Resolve</button><button className="secondary-button" disabled={moderationBusy===report.id||report.status==="dismissed"} onClick={()=>void updateReportStatus(report,"dismissed")}>Dismiss</button></div></article>):<div className="empty-card"><div className="empty-illustration">🐾</div><h2>No reports to review.</h2><p>New community reports will appear here.</p></div>}
    </section>}
    {reportTarget&&<div className="community-report-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!reportBusy)setReportTarget(null);}}>
      <section className="panel community-report-dialog" role="dialog" aria-modal="true" aria-labelledby="community-report-title">
        <div className="community-report-heading"><div><p className="eyebrow">COMMUNITY SAFETY</p><h2 id="community-report-title">Report {reportTarget.post_id?"this post":"this comment"}</h2></div><button type="button" className="comment-report" aria-label="Close report form" disabled={reportBusy} onClick={()=>setReportTarget(null)}>×</button></div>
        <p>Let the moderation team know what concerns you. Reports are private; please don’t include personal or sensitive information.</p>
        <form onSubmit={e=>void submitReport(e)}>
          <label htmlFor="community-report-reason">Reason</label>
          <select id="community-report-reason" value={reportReason} onChange={e=>setReportReason(e.target.value)} required>
            <option value="spam">Spam</option><option value="harassment">Harassment or bullying</option><option value="misinformation">Misinformation</option><option value="copyright">Copyright concern</option><option value="inappropriate">Inappropriate content</option><option value="other">Other</option>
          </select>
          <label htmlFor="community-report-details">Additional details <span>(optional, up to 1,000 characters)</span></label>
          <textarea id="community-report-details" value={reportDetails} onChange={e=>setReportDetails(e.target.value)} maxLength={1000} rows={4} placeholder="Share context that may help the moderators review this report."/>
          <div className="community-report-footer"><small>{reportDetails.length}/1000</small><button type="button" className="secondary-button" disabled={reportBusy} onClick={()=>setReportTarget(null)}>Cancel</button><button type="submit" className="primary-button" disabled={reportBusy}>{reportBusy?"Submitting…":"Submit report"}</button></div>
        </form>
      </section>
    </div>}
    {tab==="groups"&&<>
      <form className="panel community-compose" onSubmit={makeGroup}><p className="eyebrow">FIND YOUR STUDY PEOPLE</p><h2>Create a study group</h2><input value={groupName} onChange={e=>setGroupName(e.target.value)} required minLength={2} maxLength={100} placeholder="Group name"/><textarea value={groupDesc} onChange={e=>setGroupDesc(e.target.value)} rows={2} maxLength={1000} placeholder="What will your group work on?"/><div className="compose-actions"><select value={groupCourse} onChange={e=>setGroupCourse(e.target.value)}><option value="">General study group</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select><button className="primary-button" disabled={busy}>＋ Create group</button></div></form>
      <div className="study-group-discovery">
        <div className="study-group-discovery-heading"><div><p className="eyebrow">EXPLORE TOGETHER</p><h2>Find your study circle</h2><p>{visibleGroups.length} of {groups.length} groups shown</p></div><input aria-label="Search study groups" value={groupSearch} onChange={e=>setGroupSearch(e.target.value)} placeholder="Search groups or topics…"/></div>
        <div className="study-group-controls"><div className="community-filter-tabs" aria-label="Filter study groups"><button type="button" className={groupScope==="all"?"active":""} onClick={()=>setGroupScope("all")}>All groups</button><button type="button" className={groupScope==="joined"?"active":""} onClick={()=>setGroupScope("joined")}>My groups</button><button type="button" className={groupScope==="created"?"active":""} onClick={()=>setGroupScope("created")}>Created by me</button></div><select aria-label="Filter study groups by course" value={groupCourseFilter} onChange={e=>setGroupCourseFilter(e.target.value)}><option value="">All courses</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
      </div>
      <div className="study-group-grid">{visibleGroups.length?visibleGroups.map(g=><article className="panel study-group-card" key={g.id}><div className="group-symbol">♧</div><h2>{g.name}</h2><p>{g.description||"A space to study and make progress together."}</p><div className="group-card-meta"><small>{courseLabel(g.course_id)} · {new Date(g.created_at).toLocaleDateString()}</small><span className={`group-visibility visibility-${g.visibility}`}>{g.visibility==="private"?"Private group":"Public group"}</span></div><p className="group-created-by">Started by <strong>{g.created_by===userId?"you":(groupCreators[g.created_by]||"Meowks student")}</strong></p><div className="group-card-actions">{g.created_by===userId?<><span className="group-owner-label">Your group</span><button className="secondary-button" disabled={busy} onClick={()=>void editGroup(g)}>Edit details</button><button className="danger-text" disabled={busy} onClick={()=>void deleteGroup(g)}>Delete group</button></>:joined.includes(g.id)?<button className="secondary-button" disabled={busy} onClick={()=>void leave(g)}>Joined · Leave</button>:<button className="primary-button" disabled={busy} onClick={()=>void join(g)}>Join group</button>}</div></article>):<div className="empty-card"><div className="empty-illustration">♧</div><h2>{groups.length?"No groups match those filters.":"Your study circle starts here."}</h2><p>{groups.length?"Try a different search or filter to discover more groups.":"Create a group or invite classmates to join one."}</p>{groups.length>0&&<button type="button" className="secondary-button" onClick={()=>{setGroupSearch("");setGroupScope("all");setGroupCourseFilter("");}}>Clear filters</button>}</div>}</div>
    </>}
  </section>;
}
