'use client';
import {useCallback,useEffect,useRef,useState,createElement} from 'react';
import {defaultSettings,type Project,type Settings} from './lib/data';
function Arrow({left=false}:{left?:boolean}) {return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={left?{transform:'rotate(180deg)'}:{}}><path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5"/></svg>}
function Cube(){return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 3 8 5v8l-8 5-8-5V8l8-5Zm0 9v9M4 8l8 4 8-4M12 3v9" stroke="currentColor" strokeWidth="1.3"/></svg>}
function Square(){return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.3"/></svg>}
function Artwork({project}:{project:Project}){const [broken,setBroken]=useState(false);useEffect(()=>setBroken(false),[project.imageUrl]);return broken?<div className="art-unavailable"><span>{project.title}</span><small>Artwork preview unavailable</small></div>:<img src={project.imageUrl} alt={project.title+' — '+project.medium} draggable={false} onError={()=>setBroken(true)}/>}
function Model({url,animated}:{url:string;animated:boolean}){useEffect(()=>{if(!document.querySelector('script[data-model-viewer]')){const script=document.createElement('script');script.type='module';script.src='https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js';script.dataset.modelViewer='true';document.head.append(script)}},[]);return createElement('model-viewer',{src:url,alt:'Interactive project model','camera-controls':true,'auto-rotate':animated||undefined,'shadow-intensity':'1','environment-image':'neutral',style:{width:'100%',height:'100%'}})}
type BranchAnchor={id:string;x:number;y:number;rotation:number;scale:number;visible:boolean;offset:number};
export default function Portfolio(){
 const [mode,setMode]=useState<'2d'|'3d'>('3d');
 const [projects,setProjects]=useState<Project[]>([]),[settings,setSettings]=useState<Settings>(defaultSettings);
 const [loading,setLoading]=useState(true),[loadError,setLoadError]=useState('');
 const [indices,setIndices]=useState({'2d':0,'3d':0}),[drag,setDrag]=useState(0),[motion,setMotion]=useState(true);
 const [dialog,setDialog]=useState<'about'|'project'|null>(null),[sceneLoaded,setSceneLoaded]=useState(false);
 const iframe=useRef<HTMLIFrameElement>(null),stage=useRef<HTMLDivElement>(null),modal=useRef<HTMLDialogElement>(null),surface=useRef<HTMLElement>(null);
 const pointerFrame=useRef<number|null>(null),pointerTarget=useRef({x:.5,y:.5}),pointerCurrent=useRef({x:.5,y:.5});
 const frames=useRef(new Map<string,HTMLElement>()),branchAnchors=useRef<BranchAnchor[]>([]),anchorFrame=useRef<number|null>(null);
 const modeRef=useRef(mode),scenePayload=useRef<{projects:{id:string}[];index:number;drag:number}>({projects:[],index:0,drag:0});
 modeRef.current=mode;
 const start=useRef<number|null>(null),lastWheel=useRef(0),lastFocus=useRef<HTMLElement|null>(null),didDrag=useRef(false);
 const activePointer=useRef<number|null>(null);
 const work=projects.filter(p=>p.category===mode&&p.published).sort((a,b)=>a.sortOrder-b.sortOrder);
 const index=Math.min(indices[mode],Math.max(0,work.length-1)),selected=work[index];
 scenePayload.current={projects:mode==='3d'?work.map(p=>({id:p.id})):[],index,drag};
 const applyBranchAnchors=useCallback(()=>{
  anchorFrame.current=null;
  if(modeRef.current!=='3d'||!iframe.current||!stage.current)return;
  const worldRect=iframe.current.getBoundingClientRect(),stageRect=stage.current.getBoundingClientRect();
  if(!worldRect.width||!worldRect.height)return;
  for(const anchor of branchAnchors.current){
   const frame=frames.current.get(anchor.id);if(!frame)continue;
   // The iframe's transformed rectangle includes the world's subtle zoom/crop.
   const x=worldRect.left+anchor.x*worldRect.width-stageRect.left;
   const y=worldRect.top+anchor.y*worldRect.height-stageRect.top;
   frame.classList.add('branch-attached');
   frame.style.left=`${x}px`;frame.style.top=`${y}px`;
   frame.style.transformOrigin='50% 100%';
   frame.style.transform=`translate(-50%,-100%) rotate(${anchor.rotation}deg) scale(${anchor.scale})`;
   frame.style.opacity=anchor.visible?String(1-Math.min(1,Math.abs(anchor.offset))*.58):'0';
   frame.style.zIndex=String(Math.max(1,10-Math.round(Math.abs(anchor.offset)*2)));
   frame.style.pointerEvents=anchor.visible?'':'none';
   frame.style.visibility=anchor.visible?'visible':'hidden';
   frame.setAttribute('aria-hidden',String(!anchor.visible));
   frame.inert=!anchor.visible;
  }
 },[]);
 const queueBranchAnchors=useCallback(()=>{if(anchorFrame.current===null)anchorFrame.current=requestAnimationFrame(applyBranchAnchors)},[applyBranchAnchors]);
 useEffect(()=>{
  const element=surface.current;if(!element)return;
  const tick=()=>{
   const current=pointerCurrent.current,target=pointerTarget.current;
   current.x+=(target.x-current.x)*.095;current.y+=(target.y-current.y)*.095;
   element.style.setProperty('--pointer-x',`${current.x*100}%`);element.style.setProperty('--pointer-y',`${current.y*100}%`);
   element.style.setProperty('--parallax-x',`${(current.x-.5)*14}px`);element.style.setProperty('--parallax-y',`${(current.y-.5)*10}px`);
   if(Math.abs(target.x-current.x)+Math.abs(target.y-current.y)>.0002)pointerFrame.current=requestAnimationFrame(tick);else pointerFrame.current=null;
  };
  const move=(event:PointerEvent)=>{if(!motion||event.pointerType==='touch')return;const rect=element.getBoundingClientRect();pointerTarget.current={x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height};element.classList.add('pointer-active');if(iframe.current&&modeRef.current==='3d'){const world=iframe.current.getBoundingClientRect();iframe.current.contentWindow?.postMessage({type:'adi-pointer',x:(event.clientX-world.left)/world.width,y:(event.clientY-world.top)/world.height},window.location.origin)}if(pointerFrame.current===null)pointerFrame.current=requestAnimationFrame(tick)};
  const leave=()=>{element.classList.remove('pointer-active');pointerTarget.current={x:.5,y:.5};iframe.current?.contentWindow?.postMessage({type:'adi-pointer-leave'},window.location.origin);if(pointerFrame.current===null)pointerFrame.current=requestAnimationFrame(tick)};
  element.addEventListener('pointermove',move,{passive:true});element.addEventListener('pointerleave',leave);
  return()=>{element.removeEventListener('pointermove',move);element.removeEventListener('pointerleave',leave);if(pointerFrame.current!==null)cancelAnimationFrame(pointerFrame.current);pointerFrame.current=null;};
 },[motion]);
 useEffect(()=>{
  const onMessage=(event:MessageEvent)=>{
   if(event.origin!==window.location.origin||event.source!==iframe.current?.contentWindow||!event.data||typeof event.data!=='object')return;
   if(event.data.type==='adi-world-ready'){
    iframe.current?.contentWindow?.postMessage({type:'adi-projects',...scenePayload.current},window.location.origin);
    return;
   }
   if(event.data.type!=='adi-anchors'||modeRef.current!=='3d'||!Array.isArray(event.data.anchors))return;
   branchAnchors.current=event.data.anchors.slice(0,200).filter((anchor:BranchAnchor)=>anchor&&typeof anchor.id==='string'&&typeof anchor.visible==='boolean'&&[anchor.x,anchor.y,anchor.rotation,anchor.scale,anchor.offset].every(Number.isFinite)&&Math.abs(anchor.x)<10&&Math.abs(anchor.y)<10&&Math.abs(anchor.rotation)<=45&&anchor.scale>0&&anchor.scale<=2);
   queueBranchAnchors();
  };
  window.addEventListener('message',onMessage);window.addEventListener('resize',queueBranchAnchors);
  const world=iframe.current?.parentElement;world?.addEventListener('transitionend',queueBranchAnchors);
  return()=>{window.removeEventListener('message',onMessage);window.removeEventListener('resize',queueBranchAnchors);world?.removeEventListener('transitionend',queueBranchAnchors);if(anchorFrame.current!==null)cancelAnimationFrame(anchorFrame.current);anchorFrame.current=null};
 },[queueBranchAnchors]);
 useEffect(()=>{
  if(mode!=='3d'){
   branchAnchors.current=[];
   for(const frame of frames.current.values()){
    frame.classList.remove('branch-attached');frame.inert=false;
    for(const property of ['left','top','transform','transform-origin','opacity','z-index','pointer-events','visibility'])frame.style.removeProperty(property);
   }
  }
  iframe.current?.contentWindow?.postMessage({type:'adi-projects',...scenePayload.current},window.location.origin);
 },[mode,index,drag,projects,sceneLoaded]);
 const loadPortfolio=useCallback(async(signal?:AbortSignal)=>{
  setLoading(true);setLoadError('');
  try{
   const response=await fetch('/api/projects',{signal,cache:'no-store'});
   if(!response.ok)throw new Error('The gallery could not load. Please try again.');
   const data=await response.json();
   if(!Array.isArray(data.projects)||!data.settings)throw new Error('The gallery could not load. Please try again.');
   setProjects(data.projects);setSettings(data.settings);
  }catch(error){if(!signal?.aborted){setProjects([]);setLoadError(error instanceof Error?error.message:'The gallery could not load. Please try again.')}}
  finally{if(!signal?.aborted)setLoading(false)}
 },[]);
 useEffect(()=>{const controller=new AbortController();void loadPortfolio(controller.signal);return()=>controller.abort()},[loadPortfolio]);
 useEffect(()=>{const reduced=matchMedia('(prefers-reduced-motion: reduce)');setMotion(!reduced.matches);const handler=()=>setMotion(!reduced.matches);reduced.addEventListener('change',handler);return()=>reduced.removeEventListener('change',handler)},[]);
 useEffect(()=>{iframe.current?.contentWindow?.postMessage({type:'adi-motion',enabled:motion&&mode==='3d'},window.location.origin)},[motion,mode,sceneLoaded]);
 useEffect(()=>{if(dialog){lastFocus.current=document.activeElement as HTMLElement;modal.current?.showModal()}else if(modal.current?.open){modal.current.close();lastFocus.current?.focus()}},[dialog]);
 const navigate=(step:number)=>setIndices(s=>({...s,[mode]:work.length?(index+step+work.length)%work.length:0}));
 const changeMode=(value:'2d'|'3d')=>{setMode(value);setDrag(0)};
 const beginDrag=(event:React.PointerEvent<HTMLElement>)=>{
  if(!event.isPrimary||event.button!==0||(event.target as HTMLElement).closest('button,model-viewer'))return;
  start.current=event.clientX;activePointer.current=event.pointerId;didDrag.current=false;
 };
 const moveDrag=(event:React.PointerEvent<HTMLElement>)=>{
  if(start.current!==null&&activePointer.current===event.pointerId){
   const distance=event.clientX-start.current;
   // Leave taps uncaptured so their click reaches the original artwork.
   if(!didDrag.current&&Math.abs(distance)>6){didDrag.current=true;stage.current?.setPointerCapture(event.pointerId)}
   if(didDrag.current)setDrag(distance);
  }
  if(motion&&mode==='3d'&&event.pointerType!=='touch'&&iframe.current){const rect=iframe.current.getBoundingClientRect();iframe.current.contentWindow?.postMessage({type:'adi-pointer',x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height},window.location.origin)}
 };
 const finishDrag=(event:React.PointerEvent<HTMLElement>)=>{
  if(start.current===null||activePointer.current!==event.pointerId)return;
  const distance=event.clientX-start.current;
  if(didDrag.current&&Math.abs(distance)>45&&work.length>1)navigate(distance<0?1:-1);
  start.current=null;activePointer.current=null;setDrag(0);
  if(stage.current?.hasPointerCapture(event.pointerId))stage.current.releasePointerCapture(event.pointerId);
 };
 const cancelDrag=(event:React.PointerEvent<HTMLElement>)=>{
  if(activePointer.current!==event.pointerId)return;
  start.current=null;activePointer.current=null;didDrag.current=true;setDrag(0);
  if(stage.current?.hasPointerCapture(event.pointerId))stage.current.releasePointerCapture(event.pointerId);
 };
 const selectProject=(i:number)=>{if(didDrag.current){didDrag.current=false;return}if(i!==index)setIndices(s=>({...s,[mode]:i}));else setDialog('project')};
 return <main ref={surface} className={'portfolio mode-'+mode+(!motion?' still':'')} style={{'--accent':settings.accentColor,'--forest':settings.backgroundColor,'--page-bg':settings.backgroundColor} as React.CSSProperties}>
  <a className="skip-link" href="#work">Skip to work</a>
  <div className="world" aria-hidden="true"><div className="world-fallback"/><iframe ref={iframe} src="/sylva.html" title="Sylva Living Green animated world" tabIndex={-1} onLoad={()=>setSceneLoaded(true)} sandbox="allow-scripts allow-same-origin"/><div className="world-shade"/></div>
  <div className="paper-grid" aria-hidden="true"/>
  <div className="xray-lens" aria-hidden="true"><div className="xray-grid"/></div>
  <header className="site-header"><a className="brand" href="/" aria-label={settings.name+' home'}>{settings.logoUrl?<img src={settings.logoUrl} alt={settings.name}/>:<span className="brand-type">adi<span>®</span></span>}<span className="brand-caption">FORM &<br/>DIMENSION</span></a><div className="dimension-switch" role="tablist" aria-label="Portfolio dimension"><span className="switch-glass" aria-hidden="true"/>{(['2d','3d'] as const).map(v=><button key={v} role="tab" aria-selected={mode===v} aria-controls="work" onClick={()=>changeMode(v)}>{v==='2d'?<Square/>:<Cube/>}<span>{v.toUpperCase()}</span></button>)}</div><nav aria-label="Main navigation"><button onClick={()=>setDialog('about')}>About <span>↗</span></button><a href={settings.contactUrl} target="_blank" rel="noopener noreferrer" className="contact-link">Let’s talk <span>↗</span></a></nav></header>
  <section className="intro"><p className="eyebrow"><span className="live-dot"/> {settings.name.toUpperCase()} <span className="intro-divider">/</span> DESIGNER & VISUAL ARTIST</p><h1 key={mode}>{mode==='3d'?<>{settings.headline.split(' ').slice(0,-1).join(' ')}<br/><em>{settings.headline.split(' ').slice(-1)[0]}</em></>:<>A different<br/><em>perspective.</em></>}</h1><p className="intro-note">{mode==='3d'?'A living collection of forms, textures & curious experiments.':'Identity, artwork & graphic explorations. Made to be felt.'}</p></section>
  <div className="side-note">JAIPUR, INDIA <span>—</span> INDEPENDENT DESIGNER</div>
  <section id="work" ref={stage} className="gallery-stage" tabIndex={0} aria-label={mode==='3d'?'3D portfolio. Drag to move work along the branch.':'2D portfolio. Drag to browse framed artwork.'} onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();navigate(1)}if(e.key==='ArrowLeft'){e.preventDefault();navigate(-1)}}} onWheel={e=>{if(work.length<2||Math.max(Math.abs(e.deltaX),Math.abs(e.deltaY))<4||Date.now()-lastWheel.current<650)return;lastWheel.current=Date.now();navigate((e.deltaX||e.deltaY)>0?1:-1)}} onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={cancelDrag} onLostPointerCapture={cancelDrag} onPointerLeave={event=>{if(!didDrag.current)cancelDrag(event)}}>
   {mode==='2d'&&<span className="gallery-watermark" aria-hidden="true">SELECTED WORK</span>}
   {work.map((p,i)=>{let offset=i-index;if(offset>work.length/2)offset-=work.length;if(offset< -work.length/2)offset+=work.length;return <article ref={node=>{if(node)frames.current.set(p.id,node);else frames.current.delete(p.id)}} className={'work-frame '+(i===index?'is-active':'')} key={p.id} style={{'--offset':offset,'--abs-offset':Math.abs(offset),'--drag':drag+'px','--branch-y':Math.pow(offset,2)*45+'px','--branch-angle':offset*-9+'deg'} as React.CSSProperties} aria-hidden={Math.abs(offset)>1}><div className="frame-top"><span>{mode==='3d'?'OBJECT':'ARTWORK'} / {String(i+1).padStart(2,'0')}</span><span>{p.year}</span></div><div className="frame-art" onClick={()=>selectProject(i)}>{p.modelUrl&&i===index?<Model url={p.modelUrl} animated={motion}/>:<Artwork project={p}/>}</div><div className="frame-bottom"><span>{p.medium}</span><button tabIndex={i===index?0:-1} aria-label={'View '+p.title} onClick={()=>{setIndices(s=>({...s,[mode]:i}));setDialog('project')}}>↗</button></div></article>})}
   {loading?<div className="empty-gallery" role="status"><h2>Opening the collection.</h2><p>Loading published work.</p></div>:loadError?<div className="empty-gallery" role="alert"><h2>The gallery could not load.</h2><p>{loadError}</p><button className="dialog-cta" onClick={()=>void loadPortfolio()}>Try again <Arrow/></button></div>:!work.length&&<div className="empty-gallery"><h2>A new dimension is coming.</h2><p>More work will appear here soon.</p></div>}{mode==='3d'&&<div className="world-label"><span className="world-dot"/> SYLVA / LIVING GREEN <small>AN INTERACTIVE WORLD</small></div>}
  </section>
  <footer className="gallery-footer"><div className="work-caption" aria-live="polite"><p className="eyebrow">{mode==='3d'?'EXPLORATIONS IN 3D':'SELECTED 2D WORK'} <span>/{selected?.year||'2026'}</span></p><button className="project-title" onClick={()=>selected&&setDialog('project')}>{selected?.title||'Coming soon'} <span>↗</span></button><p>{selected?.medium||'NEW WORK IN PROGRESS'}</p></div><div className="browse-control"><div className="browse-caption">{work.length>1?'DRAG TO EXPLORE':'EXPLORE THE ARTWORK'}<span>← &nbsp; →</span></div><div className="pager"><button aria-label="Previous project" onClick={()=>navigate(-1)} disabled={work.length<2}><Arrow left/></button><button aria-label="Next project" onClick={()=>navigate(1)} disabled={work.length<2}><Arrow/></button></div></div><div className="footer-tools"><button onClick={()=>setMotion(!motion)} aria-pressed={!motion} aria-label={motion?'Pause motion':'Play motion'}><span>{motion?'Ⅱ':'▷'}</span> MOTION {motion?'ON':'OFF'}</button><a href="/studio">Owner studio <span>↗</span></a></div></footer>
  <div className="screen-corners" aria-hidden="true"><span>+</span><span>+</span></div>
  <dialog className={'portfolio-dialog'+(dialog==='about'?' about-dialog':'')} ref={modal} onCancel={()=>setDialog(null)} onClick={e=>{if(e.target===e.currentTarget)setDialog(null)}}><div className="dialog-inner"><button className="dialog-close" onClick={()=>setDialog(null)} aria-label="Close dialog">×</button>{dialog==='about'?<div className="about-content"><div className="about-portrait" aria-hidden={!settings.portraitUrl}>{settings.portraitUrl?<img src={settings.portraitUrl} alt={settings.name} loading="lazy"/>:<span className="portrait-monogram" aria-hidden="true">adi.</span>}<span className="portrait-caption">{settings.name}<br/><small>ARTIST / DESIGNER / CREATIVE EXPLORER</small></span></div><div className="about-copy"><p className="eyebrow">THE PERSON BEHIND THE PIXELS</p><h2>Two ways of seeing.<br/><em>One curious mind.</em></h2><div className="biography">{settings.biography.split(/\n\s*\n/).map((paragraph,i)=><p key={i}>{paragraph}</p>)}</div><a className="dialog-cta" href={settings.contactUrl} target="_blank" rel="noopener noreferrer">Start a conversation <Arrow/></a><div className="socials"><a href="https://www.behance.net/adiityadi" target="_blank" rel="noopener noreferrer">Behance ↗</a><a href="https://adityarathore.artstation.com" target="_blank" rel="noopener noreferrer">ArtStation ↗</a><a href="https://www.instagram.com/adi.ityadi/" target="_blank" rel="noopener noreferrer">Instagram ↗</a></div><p className="credits">Living Green environment by ThreeUI Community. <a href="/credits.html" target="_blank" rel="noopener noreferrer">Credits & licenses ↗</a></p></div></div>:selected&&<div className="project-content"><div className="detail-art">{selected.modelUrl?<Model url={selected.modelUrl} animated={motion}/>:<Artwork project={selected}/>}</div><div className="detail-copy"><p className="eyebrow">{selected.medium} · {selected.year}</p><h2>{selected.title}</h2><p>{selected.description}</p>{selected.sourceUrl&&<a className="dialog-cta" href={selected.sourceUrl} target="_blank" rel="noopener noreferrer">View original project <Arrow/></a>}</div></div>}</div></dialog>
 </main>
}
