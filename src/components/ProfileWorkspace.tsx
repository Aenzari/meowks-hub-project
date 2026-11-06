import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "../lib/supabase";

export type StudentProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  student_status: string;
  bio: string;
  major: string;
  year_of_study: string;
  interests: string[];
  profile_visibility: "private" | "community";
};

type DirectoryProfile = Pick<StudentProfile,"id"|"display_name"|"avatar_url"|"bio"|"major"|"year_of_study"|"interests">;

const INTEREST_OPTIONS = ["Programming","Design","Science","Business","Writing","Mathematics","Arts","Research","Gaming","Volunteering"];

export function ProfileWorkspace({ userId, profile, onProfileUpdated }: {
  userId: string;
  profile: StudentProfile;
  onProfileUpdated: (profile: StudentProfile) => void;
}) {
  const [profileTab,setProfileTab]=useState<"profile"|"discover">("profile");
  const [displayName,setDisplayName]=useState(profile.display_name||"");
  const [bio,setBio]=useState(profile.bio||"");
  const [major,setMajor]=useState(profile.major||"");
  const [year,setYear]=useState(profile.year_of_study||"");
  const [interests,setInterests]=useState<string[]>(profile.interests||[]);
  const [visibility,setVisibility]=useState<"private"|"community">(profile.profile_visibility||"community");
  const [directory,setDirectory]=useState<DirectoryProfile[]>([]);
  const [search,setSearch]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");

  useEffect(()=>{
    setDisplayName(profile.display_name||"");setBio(profile.bio||"");setMajor(profile.major||"");
    setYear(profile.year_of_study||"");setInterests(profile.interests||[]);setVisibility(profile.profile_visibility||"community");
  },[profile]);

  async function loadDirectory(){
    if(!supabase)return;
    const {data,error:e}=await supabase.from("profiles")
      .select("id,display_name,avatar_url,bio,major,year_of_study,interests")
      .eq("profile_visibility","community").order("display_name",{ascending:true}).limit(100);
    if(e)setError(e.message);else setDirectory((data||[]) as DirectoryProfile[]);
  }
  useEffect(()=>{void loadDirectory();},[userId]);

  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!supabase)return;
    setBusy(true);setError("");setNotice("");
    const values={
      display_name:displayName.trim(),bio:bio.trim(),major:major.trim(),
      year_of_study:year.trim(),interests,profile_visibility:visibility
    };
    const {data,error:e}=await supabase.from("profiles").update(values).eq("id",userId)
      .select("id,display_name,avatar_url,student_status,bio,major,year_of_study,interests,profile_visibility").single();
    setBusy(false);
    if(e){setError(e.message);return;}
    onProfileUpdated(data as StudentProfile);setNotice("Your student profile has been updated.");
    await loadDirectory();
  }

  const visibleDirectory=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return directory.filter(person=>person.id!==userId&&(!q||[
      person.display_name||"",person.major,person.year_of_study,...(person.interests||[])
    ].join(" ").toLowerCase().includes(q)));
  },[directory,search,userId]);

  function toggleInterest(value:string){
    setInterests(current=>current.includes(value)?current.filter(x=>x!==value):current.length>=10?current:[...current,value]);
  }

  return <section className="feature-page profile-workspace">
    <div className="feature-heading"><div><p className="eyebrow">YOUR MEOWKS IDENTITY</p><h1>My profile<span className="coral">.</span></h1><p className="subheading">Introduce yourself, find your people, and shape your student space.</p></div></div>
    {notice&&<div className="inline-notice" role="status">{notice}</div>}
    {error&&<div className="inline-error" role="alert">{error}</div>}
    <div className="profile-section-tabs" role="tablist" aria-label="Profile sections"><button role="tab" aria-selected={profileTab==="profile"} className={profileTab==="profile"?"active":""} onClick={()=>setProfileTab("profile")}>My profile</button><button role="tab" aria-selected={profileTab==="discover"} className={profileTab==="discover"?"active":""} onClick={()=>setProfileTab("discover")}>Discover students</button></div>
    <div className="profile-layout">
      {profileTab==="profile"&&<form className="panel profile-editor" onSubmit={save}>
        <div className="profile-preview"><div className="profile-avatar">{(displayName.trim()[0]||"M").toUpperCase()}</div><div><strong>{displayName||"Your name"}</strong><small>{major||"Add your field of study"}</small><span className="profile-status">{profile.student_status==="verified"?"Verified university status":profile.student_status==="unverified"?"University status unverified":"Independent student"}</span></div></div>
        <label>Display name<input value={displayName} onChange={e=>setDisplayName(e.target.value)} required minLength={2} maxLength={60} placeholder="How classmates know you"/></label>
        <label>About me <span className="optional-label">Optional · 280 characters</span><textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={280} rows={4} placeholder="A little about what you're learning or working toward…"/></label>
        <div className="profile-form-grid"><label>Program / major<input value={major} onChange={e=>setMajor(e.target.value)} maxLength={100} placeholder="e.g. Computer Science"/></label><label>Year of study<input value={year} onChange={e=>setYear(e.target.value)} maxLength={40} placeholder="e.g. 2nd year"/></label></div>
        <fieldset className="interest-picker"><legend>Interests <span className="optional-label">Choose up to 10</span></legend><div className="interest-options">{INTEREST_OPTIONS.map(item=><button type="button" key={item} className={interests.includes(item)?"interest-chip selected":"interest-chip"} onClick={()=>toggleInterest(item)} aria-pressed={interests.includes(item)}>{item}</button>)}</div></fieldset>
        <label>Profile visibility<select value={visibility} onChange={e=>setVisibility(e.target.value as "private"|"community")}><option value="community">Visible to signed-in Meowks students</option><option value="private">Private — only me</option></select></label>
        <p className="profile-privacy-note">Your email, university verification details, and account credentials are never shown in the student directory. University affiliation and verification cannot be edited here.</p>
        <button className="primary-button" disabled={busy}>{busy?"Saving profile…":"Save profile"}</button>
      </form>}
      {profileTab==="discover"&&<section className="profile-directory">
        <div className="panel directory-heading"><p className="eyebrow">MEET THE COMMUNITY</p><h2>Student directory</h2><p>Find classmates who share your interests. Only profiles set to community visibility appear here.</p><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search names, majors, interests…"/></div>
        {visibleDirectory.length?visibleDirectory.map(person=><article className="panel directory-card" key={person.id}><div className="directory-avatar">{(person.display_name?.[0]||"M").toUpperCase()}</div><div className="directory-person"><strong>{person.display_name||"Meowks student"}</strong><small>{[person.major,person.year_of_study].filter(Boolean).join(" · ")||"Student"}</small>{person.bio&&<p>{person.bio}</p>}{person.interests?.length>0&&<div className="directory-interests">{person.interests.slice(0,5).map(tag=><span key={tag}>{tag}</span>)}</div>}</div></article>):<div className="empty-card"><div className="empty-illustration">🐾</div><h2>No classmates found yet.</h2><p>Try another search, or invite classmates to complete their profiles.</p></div>}
      </section>}
    </div>
  </section>;
}
