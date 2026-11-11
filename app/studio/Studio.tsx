"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, CheckCircle2, CircleHelp, ExternalLink, ImagePlus, Layers, Loader2, LockKeyhole, LogOut, Palette, Plus, Search, ShieldCheck, Upload, X } from "lucide-react";
import type { Project, Settings } from "../lib/data";

type View = "projects" | "appearance";
type StudioData = { projects: Project[]; settings: Settings; owner: { displayName: string; email: string } };
type Draft = Omit<Project, "id"> & { id?: string };
type UploadResult = { url: string; kind: "image" | "model"; name: string };
const blankProject = (sortOrder: number): Draft => ({ title: "", category: "2d", medium: "", description: "", year: new Date().getFullYear().toString(), imageUrl: "", modelUrl: "", sourceUrl: "", published: false, sortOrder });

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(typeof body.error === "string" ? body.error : `Request failed (${response.status}). Please try again.`), { status: response.status });
  return body as T;
}
const json = (method: string, body: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export default function Studio() {
  const [data, setData] = useState<StudioData | null>(null);
  const [view, setView] = useState<View>("projects");
  const [filter, setFilter] = useState<"all" | "2d" | "3d">("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [appearance, setAppearance] = useState<Settings | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"cover" | "model" | "logo" | "portrait" | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const editorTitle = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const result = await request<StudioData>("/api/studio");
      setData(result);
      setAppearance(result.settings);
      setBlocked(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not open your studio.");
      setBlocked((caught as { status?: number }).status === 401 || (caught as { status?: number }).status === 403);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (draft) editorTitle.current?.focus(); }, [draft?.id, !!draft]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 6500); return () => clearTimeout(timer); }, [notice]);

  function openDraft(project?: Project) {
    setDraft(project ? { ...project } : blankProject(Math.max(-1, ...(data?.projects.map(item => item.sortOrder) ?? [])) + 1));
    setArchiveId(null); setError(""); setNotice("");
  }
  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft(current => current ? { ...current, [key]: value } : current); }
  function updateAppearance<K extends keyof Settings>(key: K, value: Settings[K]) { setAppearance(current => current ? { ...current, [key]: value } : current); }

  async function upload(file: File | undefined, kind: "cover" | "model" | "logo" | "portrait") {
    if (!file) return;
    setError(""); setUploading(kind);
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error("Choose a file under 8 MB.");
      const payload = new FormData(); payload.append("file", file);
      const result = await request<UploadResult>("/api/uploads", { method: "POST", body: payload });
      if (kind === "model" && result.kind !== "model") throw new Error("Choose a binary glTF (.glb) model.");
      if (kind !== "model" && result.kind !== "image") throw new Error("Choose a PNG, JPEG, WebP or GIF image.");
      if (kind === "logo" || kind === "portrait") updateAppearance(kind === "logo" ? "logoUrl" : "portraitUrl", result.url);
      else updateDraft(kind === "cover" ? "imageUrl" : "modelUrl", result.url);
      setNotice(`${result.name} uploaded. Save your changes to use it.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Upload failed. Please try again."); }
    finally { setUploading(null); }
  }

  async function saveProject(event: FormEvent) {
    event.preventDefault(); if (!draft || busy || uploading) return;
    setBusy(true); setError("");
    try {
      const { id, ...body } = draft;
      await request<{ project: Project }>(id ? `/api/projects/${encodeURIComponent(id)}` : "/api/projects", json(id ? "PUT" : "POST", body));
      await refresh(); setDraft(null); setNotice(draft.published ? "Project saved and published to your portfolio." : "Draft saved. Only you can see it in the studio.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save this project."); }
    finally { setBusy(false); }
  }

  async function archiveProject(id: string) {
    setBusy(true); setError("");
    try { await request(`/api/projects/${encodeURIComponent(id)}`, { method: "DELETE" }); await refresh(); setDraft(null); setArchiveId(null); setNotice("Project archived and removed from your portfolio."); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not archive this project."); }
    finally { setBusy(false); }
  }

  async function move(project: Project, direction: -1 | 1) {
    if (!data || busy) return;
    const group = [...data.projects].filter(item => item.category === project.category).sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
    const from = group.findIndex(item => item.id === project.id); const other = group[from + direction];
    if (!other) return;
    [group[from], group[from + direction]] = [group[from + direction], group[from]];
    setBusy(true); setError("");
    try {
      for (let index = 0; index < group.length; index++) {
        const { id, ...item } = group[index];
        await request(`/api/projects/${encodeURIComponent(id)}`, json("PUT", { ...item, sortOrder: index }));
      }
      await refresh(); setNotice("Gallery order updated.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not finish reordering. Refresh to see the saved order."); await refresh(); }
    finally { setBusy(false); }
  }

  async function saveAppearance(event: FormEvent) {
    event.preventDefault(); if (!appearance || busy || uploading) return;
    setBusy(true); setError("");
    try { await request("/api/settings", json("PUT", appearance)); await refresh(); setNotice("Portfolio appearance saved."); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save your settings."); }
    finally { setBusy(false); }
  }

  const projects = (data?.projects ?? []).filter(item => (filter === "all" || item.category === filter) && `${item.title} ${item.medium}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  const published = data?.projects.filter(item => item.published).length ?? 0;

  return <main className="studio">
    <aside className="studio-sidebar">
      <a className="studio-wordmark" href="/" aria-label="Back to portfolio">{data?.settings.logoUrl ? <img src={data.settings.logoUrl} alt={data.settings.name} /> : <>adi<span>•</span></>}</a>
      <div className="studio-side-label">OWNER STUDIO</div>
      <nav aria-label="Studio sections">
        <button className={view === "projects" ? "is-active" : ""} onClick={() => { setView("projects"); setDraft(null); setError(""); }}><Layers size={18} /> Work <span>{data?.projects.length ?? "—"}</span></button>
        <button className={view === "appearance" ? "is-active" : ""} onClick={() => { setView("appearance"); setDraft(null); setError(""); }}><Palette size={18} /> Appearance</button>
      </nav>
      <div className="studio-sidebar-bottom"><div className="studio-secure"><ShieldCheck size={17} /><span>Owner access only</span></div><p>{data?.owner.displayName || "Your private workspace"}</p><button type="button" className="studio-text-button" onClick={async () => { try { await request("/api/auth/logout", {method:"POST"}); window.location.assign("/"); } catch(caught) { setError(caught instanceof Error ? caught.message : "Sign out failed."); } }}><LogOut size={15} /> Sign out</button></div>
    </aside>

    <section className="studio-main">
      <header className="studio-topbar"><div><span className="studio-breadcrumb">Studio</span><span className="studio-slash">/</span>{view === "projects" ? "Selected work" : "Appearance"}</div><a className="studio-preview" href="/" target="_blank" rel="noreferrer">View portfolio <ExternalLink size={14} /></a></header>
      <div className="studio-content">
        {notice && <div className="studio-notice" role="status"><CheckCircle2 size={17} /><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss notification"><X size={15} /></button></div>}
        {error && <div className="studio-error" role="alert">{error}</div>}
        {loading ? <div className="studio-loading"><Loader2 className="studio-spin" size={26} /><p>Opening your studio…</p></div> : blocked ? <div className="studio-access"><LockKeyhole size={36} /><h1>This studio is private.</h1><p>Sign in with the owner account to manage projects.</p><a className="studio-primary" href="/studio/login">Sign in as owner <ArrowRight size={17} /></a><a href="/">Return to portfolio</a></div> : !data ? <div className="studio-access"><h1>Studio couldn’t load.</h1><p>Your work hasn’t changed.</p><button className="studio-primary" onClick={() => void refresh()}>Try again</button></div> : view === "projects" && !draft ? <>
          <div className="studio-heading"><div><p className="studio-eyebrow">CURATE YOUR WORLD</p><h1>Your work.</h1><p>A home for every dimension of your practice.</p></div><button className="studio-primary" onClick={() => openDraft()}><Plus size={18} /> Add project</button></div>
          <div className="studio-summary"><div><strong>{String(data.projects.length).padStart(2, "0")}</strong><span>Total projects</span></div><div><strong>{String(published).padStart(2, "0")}</strong><span>Published</span></div><div><strong>{String(data.projects.length - published).padStart(2, "0")}</strong><span>Drafts</span></div><p><CircleHelp size={16} /> Drafts stay private until you publish them.</p></div>
          <div className="studio-toolbar"><div className="studio-tabs" role="group" aria-label="Filter projects">{(["all", "2d", "3d"] as const).map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "all" ? "All work" : `${value.toUpperCase()} work`}</button>)}</div><label className="studio-search"><Search size={16} /><input aria-label="Search projects" placeholder="Find a project" value={search} onChange={event => setSearch(event.target.value)} /></label></div>
          {projects.length === 0 ? <div className="studio-empty"><Layers size={30} /><h2>{search ? "No matching work." : "A new canvas awaits."}</h2><p>{search ? "Try another title or medium." : "Add your first project to this collection."}</p>{!search && <button className="studio-primary" onClick={() => openDraft()}>Add project <Plus size={16} /></button>}</div> : <div className="studio-project-grid">{projects.map(project => {
            const siblings = data.projects.filter(item => item.category === project.category).sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)); const position = siblings.findIndex(item => item.id === project.id);
            return <article className="studio-project" key={project.id}><button className="studio-project-image" onClick={() => openDraft(project)} aria-label={`Edit ${project.title}`}>{project.imageUrl ? <img src={project.imageUrl} alt="" loading="lazy" /> : <span className="studio-image-placeholder"><ImagePlus size={30} />Add a cover</span>}<span className="studio-category">{project.category.toUpperCase()}</span><span className={`studio-status ${project.published ? "is-published" : ""}`}><i />{project.published ? "Published" : "Draft"}</span><span className="studio-edit-label">Edit project <ArrowRight size={15} /></span></button><div className="studio-project-info"><div><h2>{project.title}</h2><p>{project.medium || "Untitled medium"}<span> · </span>{project.year}</p></div><div className="studio-order"><button disabled={busy || position === 0} onClick={() => void move(project, -1)} aria-label={`Move ${project.title} earlier`} title="Move earlier"><ArrowUp size={15} /></button><button disabled={busy || position === siblings.length - 1} onClick={() => void move(project, 1)} aria-label={`Move ${project.title} later`} title="Move later"><ArrowDown size={15} /></button></div></div></article>;
          })}</div>}
          <footer className="studio-footer"><span>Made for the work you haven’t made yet.</span><span>ADI / STUDIO</span></footer>
        </> : view === "projects" && draft ? <>
          <button className="studio-back" onClick={() => { setDraft(null); setArchiveId(null); setError(""); }} disabled={busy || !!uploading}><ArrowLeft size={16} /> All work</button>
          <div className="studio-heading"><div><p className="studio-eyebrow">{draft.id ? "PROJECT DETAILS" : "A NEW PERSPECTIVE"}</p><h1>{draft.id ? "Edit project." : "Add your work."}</h1><p>Give this piece a place in your portfolio.</p></div></div>
          <form className="studio-editor" onSubmit={saveProject}>
            <div className="studio-editor-main"><div className="studio-panel"><div className="studio-panel-heading"><h2>The essentials</h2><span>01</span></div><label>Project title<input ref={editorTitle} required maxLength={100} value={draft.title} onChange={event => updateDraft("title", event.target.value)} placeholder="A name for this piece" /></label><div className="studio-form-row"><label>Collection<select value={draft.category} onChange={event => updateDraft("category", event.target.value as "2d" | "3d")}><option value="2d">2D — Graphic & visual design</option><option value="3d">3D — Objects & dimensions</option></select></label><label>Year<input required maxLength={12} value={draft.year} onChange={event => updateDraft("year", event.target.value)} placeholder="2026" /></label></div><label>Medium / discipline<input required maxLength={100} value={draft.medium} onChange={event => updateDraft("medium", event.target.value)} placeholder="e.g. Brand identity, CGI, motion design" /></label><label>Description<textarea rows={5} maxLength={3000} value={draft.description} onChange={event => updateDraft("description", event.target.value)} placeholder="The idea, the details, the story behind the work." /></label><label>Project link <span className="studio-optional">Optional</span><input type="url" value={draft.sourceUrl} onChange={event => updateDraft("sourceUrl", event.target.value)} placeholder="https://www.behance.net/gallery/…" /></label></div>
              <div className="studio-panel"><div className="studio-panel-heading"><h2>Media</h2><span>02</span></div><label>Cover image</label><div className={`studio-upload ${draft.imageUrl ? "has-image" : ""}`}>{draft.imageUrl && <img src={draft.imageUrl} alt="Project cover preview" />}<label className="studio-file-label"><Upload size={20} /><strong>{uploading === "cover" ? "Uploading…" : draft.imageUrl ? "Replace cover" : "Upload a cover image"}</strong><span>PNG, JPG, WebP or GIF · Up to 8 MB</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={!!uploading || busy} onChange={event => { void upload(event.target.files?.[0], "cover"); event.target.value = ""; }} /></label></div><label>Or use an image URL<input type="url" value={draft.imageUrl.startsWith("/") ? "" : draft.imageUrl} onChange={event => updateDraft("imageUrl", event.target.value)} placeholder={draft.imageUrl.startsWith("/") ? "Cover uploaded successfully" : "https://…"} /></label>{draft.category === "3d" && <div className="studio-model"><label>3D model <span className="studio-optional">Optional</span></label><p>A GLB model lets visitors explore the object. Your cover is used while it loads.</p><label className="studio-file-label studio-model-upload"><Upload size={19} /><strong>{uploading === "model" ? "Uploading model…" : draft.modelUrl ? "Replace GLB model" : "Upload GLB model"}</strong><span>Binary glTF (.glb) · Up to 8 MB</span><input type="file" accept=".glb,model/gltf-binary" disabled={!!uploading || busy} onChange={event => { void upload(event.target.files?.[0], "model"); event.target.value = ""; }} /></label><label>Or use a GLB URL<input type="url" value={draft.modelUrl.startsWith("/") ? "" : draft.modelUrl} onChange={event => updateDraft("modelUrl", event.target.value)} placeholder={draft.modelUrl.startsWith("/") ? "Model uploaded successfully" : "https://…/model.glb"} /></label>{draft.modelUrl && <div className="studio-attached"><CheckCircle2 size={16} /><span>3D model attached</span><button type="button" onClick={() => updateDraft("modelUrl", "")}>Remove</button></div>}</div>}</div></div>
            <aside className="studio-editor-side"><div className="studio-panel"><div className="studio-panel-heading"><h2>Visibility</h2><span><LockKeyhole size={16} /></span></div><label className="studio-publish"><input type="checkbox" checked={draft.published} onChange={event => updateDraft("published", event.target.checked)} /><span><strong>Publish to portfolio</strong><small>{draft.published ? "This project will be visible in your gallery." : "Keep this as a private draft."}</small></span></label><button className="studio-primary studio-full" disabled={busy || !!uploading} type="submit">{busy ? <Loader2 size={17} className="studio-spin" /> : <Check size={17} />}{busy ? "Saving…" : "Save project"}</button><p className="studio-help">Changes appear in the portfolio after saving.</p>{error && <p className="studio-inline-error">{error}</p>}</div>{draft.id && <div className="studio-archive"><p>Remove this work from the portfolio.</p>{archiveId === draft.id ? <><strong>Archive this project?</strong><p>It will disappear from your gallery and studio list.</p><div><button type="button" disabled={busy} onClick={() => void archiveProject(draft.id!)}>Yes, archive</button><button type="button" disabled={busy} onClick={() => setArchiveId(null)}>Cancel</button></div></> : <button type="button" onClick={() => setArchiveId(draft.id!)}>Archive project</button>}</div>}</aside>
          </form>
        </> : appearance ? <>
          <div className="studio-heading"><div><p className="studio-eyebrow">MAKE IT YOURS</p><h1>A signature touch.</h1><p>Your identity, your palette, your words.</p></div></div>
          <form className="studio-editor" onSubmit={saveAppearance}><div className="studio-editor-main"><div className="studio-panel"><div className="studio-panel-heading"><h2>Identity & introduction</h2><span>01</span></div><label>Display name<input required maxLength={100} value={appearance.name} onChange={event => updateAppearance("name", event.target.value)} /></label><label>Headline<input required maxLength={180} value={appearance.headline} onChange={event => updateAppearance("headline", event.target.value)} /></label><label>About your practice<textarea rows={5} maxLength={2000} value={appearance.biography} onChange={event => updateAppearance("biography", event.target.value)} /></label><label>About portrait</label><div className="studio-logo-preview">{appearance.portraitUrl ? <img src={appearance.portraitUrl} alt="About portrait preview" /> : <span>No portrait selected</span>}</div><label className="studio-file-label studio-logo-upload"><Upload size={18} /><strong>{uploading === "portrait" ? "Uploading…" : "Upload About portrait"}</strong><span>Transparent PNG or WebP · Up to 8 MB</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || !!uploading} onChange={event => { void upload(event.target.files?.[0], "portrait"); event.target.value = ""; }} /></label>{appearance.portraitUrl && <button type="button" className="studio-text-button" onClick={() => updateAppearance("portraitUrl", "")}>Remove portrait</button>}<label>Contact link<input type="url" required value={appearance.contactUrl} onChange={event => updateAppearance("contactUrl", event.target.value)} placeholder="https://www.instagram.com/…" /></label><p className="studio-help">Use your contact page or social profile.</p></div><div className="studio-panel"><div className="studio-panel-heading"><h2>Logo & color</h2><span>02</span></div><p className="studio-help">Upload your original logo to preserve its exact design.</p><div className="studio-logo-preview">{appearance.logoUrl ? <img src={appearance.logoUrl} alt="Current portfolio logo" /> : <span>No custom logo uploaded</span>}</div><label className="studio-file-label studio-logo-upload"><Upload size={18} /><strong>{uploading === "logo" ? "Uploading…" : "Upload original logo"}</strong><span>PNG, JPG or WebP · Transparent PNG recommended</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || !!uploading} onChange={event => { void upload(event.target.files?.[0], "logo"); event.target.value = ""; }} /></label>{appearance.logoUrl && <button className="studio-text-button" type="button" onClick={() => updateAppearance("logoUrl", "")}>Remove custom logo</button>}<div className="studio-form-row studio-color-row"><label>Accent color<div className="studio-color-input"><input aria-label="Choose accent color" type="color" value={appearance.accentColor} onChange={event => updateAppearance("accentColor", event.target.value)} /><input aria-label="Accent hex code" pattern="#[a-fA-F0-9]{6}" required value={appearance.accentColor} onChange={event => updateAppearance("accentColor", event.target.value)} maxLength={7} /></div></label><label>Background color<div className="studio-color-input"><input aria-label="Choose background color" type="color" value={appearance.backgroundColor} onChange={event => updateAppearance("backgroundColor", event.target.value)} /><input aria-label="Background hex code" pattern="#[a-fA-F0-9]{6}" required value={appearance.backgroundColor} onChange={event => updateAppearance("backgroundColor", event.target.value)} maxLength={7} /></div></label></div></div></div><aside className="studio-editor-side"><div className="studio-panel"><h2>Ready when you are.</h2><p className="studio-help">Save to update your introduction and visual identity across the portfolio.</p><button className="studio-primary studio-full" type="submit" disabled={busy || !!uploading}>{busy ? <Loader2 className="studio-spin" size={17} /> : <Check size={17} />}{busy ? "Saving…" : "Save appearance"}</button>{error && <p className="studio-inline-error">{error}</p>}<a className="studio-side-preview" href="/" target="_blank" rel="noreferrer">Open portfolio <ExternalLink size={14} /></a></div></aside></form>
        </> : null}
      </div>
    </section>
  </main>;
}
