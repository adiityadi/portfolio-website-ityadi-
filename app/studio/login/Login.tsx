"use client";
import { useState, type FormEvent } from "react";
export default function Login({configured}:{configured:boolean}){
  const [password,setPassword]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  async function submit(event:FormEvent){
    event.preventDefault();if(busy)return;setBusy(true);setError("");
    try{const response=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});const data=await response.json();if(!response.ok)throw new Error(data.error || "Sign-in failed.");window.location.assign("/studio");}
    catch(caught){setError(caught instanceof Error?caught.message:"Sign-in failed.");setBusy(false);}
  }
  return <main className="studio" style={{minHeight:"100svh",display:"grid",placeItems:"center",padding:24}}><section className="studio-panel" style={{width:"min(100%,440px)",padding:36}}><a href="/" className="studio-eyebrow">ADI / FORM &amp; DIMENSION</a><h1 style={{fontSize:40,fontWeight:400,marginBottom:12}}>Owner studio.</h1>{configured?<><p className="studio-help">Sign in to curate your work and update your portfolio.</p><form onSubmit={submit}><label htmlFor="owner-password">Owner password<input id="owner-password" type="password" autoComplete="current-password" required maxLength={1024} value={password} onChange={event=>setPassword(event.target.value)} /></label>{error&&<p className="studio-error" role="alert">{error}</p>}<button className="studio-primary studio-full" disabled={busy} type="submit">{busy?"Signing in…":"Open studio"}</button></form></>:<p className="studio-help">The owner studio is awaiting hosting setup. Your portfolio is available below.</p>}<a href="/" className="studio-back" style={{marginTop:24,display:"inline-block"}}>← Return to portfolio</a></section></main>;
}
