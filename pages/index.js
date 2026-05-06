import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

// ── BRAND CONFIG (mirrors server-side) ──
const BRANDS = {
  Aashirvaad: {
    emoji: '🌾',
    category: 'Atta & Flour',
    subreddits: ['r/india','r/IndianFood','r/cooking','r/bangalore','r/delhi','r/grocery','r/mumbai','r/pune','r/AskIndia','r/IndianKitchen','r/diabetes_india'],
    competitors: ['Pillsbury','Fortune Atta','Annapurna','Patanjali Atta',"Nature's Basket"],
    newSubs: ['r/AskIndia','r/IndianKitchen','r/diabetes_india'],
  },
  Bingo: {
    emoji: '🍟',
    category: 'Snacks & Chips',
    subreddits: ['r/india','r/AskIndia','r/bangalore','r/mumbai','r/delhi','r/IndianFood','r/teenagers','r/pune','r/munchies','r/cricket'],
    competitors: ['Lays','Kurkure','Haldirams','Too Yumm','Doritos'],
    newSubs: ['r/munchies','r/cricket'],
  },
  Candyman: {
    emoji: '🍬',
    category: 'Confectionery',
    subreddits: ['r/india','r/AskIndia','r/IndianFood','r/mumbai','r/delhi','r/bangalore','r/sweets','r/nostalgia'],
    competitors: ['Cadbury Eclairs','Mentos','Alpenliebe','Parle','Kopiko'],
    newSubs: ['r/sweets','r/nostalgia'],
  },
  Sunfeast: {
    emoji: '🍪',
    category: 'Biscuits & Pasta',
    subreddits: ['r/india','r/IndianFood','r/AskIndia','r/cooking','r/bangalore','r/delhi','r/mumbai','r/snackexchange'],
    competitors: ['Britannia','Parle-G','McVities','Oreo','Maggi'],
    newSubs: ['r/snackexchange'],
  },
  Yippee: {
    emoji: '🍜',
    category: 'Instant Noodles',
    subreddits: ['r/india','r/IndianFood','r/AskIndia','r/cooking','r/bangalore','r/mumbai','r/delhi','r/pune','r/CasualConversation'],
    competitors: ['Maggi','Yippee','Wai Wai','Knorr',"Ching's Secret"],
    newSubs: ['r/CasualConversation'],
  },
  Fabelle: {
    emoji: '🍫',
    category: 'Premium Chocolates',
    subreddits: ['r/india','r/chocolate','r/IndianFood','r/AskIndia','r/bangalore','r/mumbai','r/delhi','r/luxury','r/GiftsForHer','r/weddingplanning'],
    competitors: ['Cadbury Silk','Ferrero Rocher','Lindt','Amul Dark','Smoor','Manam','Royce'],
    newSubs: ['r/chocolate','r/luxury','r/GiftsForHer','r/weddingplanning'],
  },
};

const C = {
  bg:'#0f0f17',surf:'#1a1a2e',card:'#16213e',
  acc:'#FF4500',acc2:'#ff6a3d',
  text:'#e8ecf4',muted:'#7c8499',border:'rgba(255,255,255,0.08)',
  grn:'#22c55e',ylw:'#f59e0b',red:'#ef4444',pur:'#a78bfa',
};

const sentColor = s => s==='positive'?C.grn:s==='negative'?C.red:C.ylw;
const urgColor  = u => u==='high'?C.red:u==='medium'?C.ylw:C.grn;
const trendColor= t => t==='rising'?C.grn:t==='falling'?C.red:C.muted;
const trendArrow= t => t==='rising'?'↑':t==='falling'?'↓':'→';

function SlideCard({num,title,children}){
  return(
    <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:11,marginBottom:10,overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'11px 14px',borderBottom:`1px solid ${C.border}`}}>
        <span style={{fontSize:10,fontWeight:700,background:'rgba(255,69,0,.1)',color:C.acc,padding:'2px 7px',borderRadius:4}}>SLIDE {num}</span>
        <span style={{fontSize:13,fontWeight:600}}>{title}</span>
      </div>
      <div style={{padding:'13px 14px'}}>{children}</div>
    </div>
  );
}

export default function Home(){
  const [brand,setBrand]=useState('Aashirvaad');
  const [fromDate,setFromDate]=useState('');
  const [toDate,setToDate]=useState('');
  const [activeSubs,setActiveSubs]=useState(new Set(BRANDS.Aashirvaad.subreddits));
  const [activeComps,setActiveComps]=useState(new Set(BRANDS.Aashirvaad.competitors));
  const [running,setRunning]=useState(false);
  const [progress,setProgress]=useState(0);
  const [steps,setSteps]=useState({});
  const [logs,setLogs]=useState([{msg:'Agent ready. Select a brand, set dates, click Run Now.',type:'info',ts:'—'}]);
  const [report,setReport]=useState(null);
  const [history,setHistory]=useState([]);
  const [status,setStatus]=useState('idle');
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const logRef=useRef(null);
  const reportRef=useRef(null);

  useEffect(()=>{
    const t=new Date(),a=new Date(t-3*864e5);
    setToDate(t.toISOString().split('T')[0]);
    setFromDate(a.toISOString().split('T')[0]);
  },[]);

  useEffect(()=>{ if(logRef.current) logRef.current.scrollTop=logRef.current.scrollHeight; },[logs]);

  // When brand changes — update subreddits and competitors
  const handleBrandChange = (newBrand) => {
    setBrand(newBrand);
    setActiveSubs(new Set(BRANDS[newBrand].subreddits));
    setActiveComps(new Set(BRANDS[newBrand].competitors));
    setReport(null);
  };

  const addLog=(msg,type='info')=>{
    const ts=new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    setLogs(prev=>[...prev,{msg,type,ts}]);
  };
  const setStep=(id,s)=>setSteps(prev=>({...prev,[id]:s}));
  const toggleSub=s=>setActiveSubs(prev=>{const n=new Set(prev);n.has(s)?n.delete(s):n.add(s);return n;});
  const toggleComp=c=>setActiveComps(prev=>{const n=new Set(prev);n.has(c)?n.delete(c):n.add(c);return n;});

  const runAgent=async()=>{
    if(!fromDate||!toDate){alert('Please select both dates');return;}
    setRunning(true);setReport(null);setStatus('running');setProgress(0);setSteps({});
    const subsStr=[...activeSubs].join(', ');
    try{
      setStep('s1','active');setStep('s2','active');setStep('s3','active');
      addLog(`Scanning Reddit for "${brand}" (${BRANDS[brand].category}) | ${fromDate} → ${toDate}`,'step');
      addLog(`Subreddits: ${subsStr}`);
      setProgress(10);

      const r1=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({fromDate,toDate,brand,subreddits:subsStr,competitors:[...activeComps].join(', '),callType:'core'})});
      const j1=await r1.json();
      if(!j1.success) throw new Error(j1.error||'API call failed');
      const p1=j1.data;

      setStep('s1','done');setStep('s2','done');setStep('s3','done');
      setProgress(45);
      addLog(`Posts: ${p1.summary.total_posts} · Comments: ${p1.summary.total_comments}`,'ok');
      addLog(`Sentiment: ${p1.summary.sentiment_score}/100 — ${p1.summary.sentiment_label}`,'ok');

      setStep('s4','active');setStep('s5','active');
      addLog('Running keyword association analysis...','step');
      setProgress(55);

      const r2=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({fromDate,toDate,brand,subreddits:subsStr,callType:'keywords',
          themes:p1.top_themes.map(t=>t.theme).join(', ')})});
      const j2=await r2.json();
      if(!j2.success) throw new Error(j2.error||'Keywords API call failed');
      const p2=j2.data;

      setStep('s4','done');setStep('s5','done');
      setProgress(78);
      addLog(`Keywords: ${p2.keyword_associations.slice(0,4).map(k=>k.keyword).join(', ')} …`,'ok');
      addLog(`${p2.insights.length} insights · ${p2.signal_alerts.length} signal alerts`,'ok');

      setStep('s6','active');
      addLog('Building report...','step');
      setProgress(92);

      const full={...p1,...p2,meta:{fromDate,toDate,brand,category:BRANDS[brand].category,emoji:BRANDS[brand].emoji}};
      setReport(full);
      setHistory(prev=>[{from:fromDate,to:toDate,score:p1.summary.sentiment_score,
        mood:p1.summary.sentiment_label,posts:p1.summary.total_posts,brand,emoji:BRANDS[brand].emoji},...prev].slice(0,5));

      setStep('s6','done');setProgress(100);setStatus('done');
      addLog(`Done — ${p1.top_themes.length} themes · ${p2.keyword_associations.length} keywords · ${p2.signal_alerts.length} signals`,'ok');
      setTimeout(()=>reportRef.current?.scrollIntoView({behavior:'smooth'}),300);
      setSidebarOpen(false);
    }catch(err){
      addLog('ERROR: '+err.message,'error');setStatus('error');setProgress(0);
    }
    setRunning(false);
  };

  const downloadPPT=async()=>{
    if(!report) return;
    addLog('Generating PowerPoint...','step');
    try{
      const res=await fetch('/api/ppt',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({data:report,meta:report.meta})});
      if(!res.ok) throw new Error('PPT generation failed');
      const blob=await res.blob();
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download=`${brand}_Reddit_${fromDate}_to_${toDate}.pptx`;
      a.click();URL.revokeObjectURL(url);
      addLog('PowerPoint downloaded ✓','ok');
    }catch(err){addLog('PPT error: '+err.message,'error');}
  };

  const stepLabels={s1:'Reddit scrape',s2:'AI analysis',s3:'Sentiment',s4:'Keywords',s5:'Insights',s6:'Build report'};
  const brandConfig = BRANDS[brand];

  const sidebarContent = (
    <div style={{display:'flex',flexDirection:'column',gap:5,height:'100%'}}>
      <div style={{display:'flex',alignItems:'center',gap:9,padding:'4px 6px',marginBottom:16}}>
        <div style={{width:32,height:32,background:C.acc,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <span style={{fontSize:18}}>📡</span>
        </div>
        <div>
          <div style={{fontSize:13,fontWeight:600}}>Brand Radar</div>
          <div style={{fontSize:10,color:C.muted}}>ITC Intelligence</div>
        </div>
      </div>

      <div style={{fontSize:10,color:C.muted,textTransform:'uppercase',letterSpacing:'0.08em',padding:'0 5px',margin:'4px 0 3px'}}>Brands</div>
      {Object.entries(BRANDS).map(([b,cfg])=>(
        <div key={b} onClick={()=>{handleBrandChange(b);setSidebarOpen(false);}}
          style={{display:'flex',alignItems:'center',gap:7,padding:'7px 9px',borderRadius:6,fontSize:12,cursor:'pointer',
            color:b===brand?C.acc:C.muted,background:b===brand?'rgba(255,69,0,0.1)':'transparent'}}>
          <span style={{fontSize:14}}>{cfg.emoji}</span>
          <div>
            <div style={{fontWeight:b===brand?600:400}}>{b}</div>
            <div style={{fontSize:10,color:C.muted}}>{cfg.category}</div>
          </div>
        </div>
      ))}

      <div style={{background:C.card,borderRadius:9,padding:10,marginTop:8}}>
        <div style={{fontSize:10,color:C.muted,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>Active brand</div>
        <div style={{fontSize:13,fontWeight:600,color:C.acc,marginBottom:4}}>{brandConfig.emoji} {brand}</div>
        <div style={{fontSize:10,color:C.muted,marginBottom:6}}>{brandConfig.category}</div>
        <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Tracking {brandConfig.subreddits.length} subreddits</div>
        <div style={{fontSize:10,color:C.muted}}>vs {brandConfig.competitors.length} competitors</div>
      </div>

      <div style={{marginTop:'auto',background:C.card,borderRadius:9,padding:10}}>
        <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Agent status</div>
        <div style={{fontSize:12,fontWeight:500,display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:7,height:7,borderRadius:'50%',flexShrink:0,
            background:status==='done'?C.grn:status==='running'?C.ylw:status==='error'?C.red:C.muted}}/>
          {status==='done'?'Report ready':status==='running'?'Running...':status==='error'?'Failed':'Ready'}
        </div>
      </div>
    </div>
  );

  return(
    <>
      <Head>
        <title>{brand} Reddit Intelligence</title>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
      </Head>

      <style>{`
        @media(max-width:768px){
          .desktop-sidebar{display:none !important}
          .mobile-header{display:flex !important}
          .main-content{padding:14px !important}
          .config-grid{grid-template-columns:1fr !important}
          .sub-comp-grid{grid-template-columns:1fr !important}
          .kpi-row{grid-template-columns:1fr 1fr !important}
          .slides-side-by-side{grid-template-columns:1fr !important}
          .run-row{flex-wrap:wrap}
          .prog-wrap{width:100% !important;flex:none !important}
          .page-title{font-size:16px !important}
        }
        @media(min-width:769px){
          .mobile-header{display:none !important}
          .mobile-overlay{display:none !important}
        }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{display:'flex',minHeight:'100vh',background:C.bg,color:C.text,fontFamily:'system-ui,-apple-system,sans-serif'}}>

        {/* MOBILE HEADER */}
        <div className="mobile-header" style={{display:'none',position:'fixed',top:0,left:0,right:0,zIndex:100,
          background:C.surf,borderBottom:`1px solid ${C.border}`,padding:'12px 16px',
          alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:28,height:28,background:C.acc,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{fontSize:14}}>📡</span>
            </div>
            <div style={{fontSize:13,fontWeight:600}}>Brand Radar</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:14}}>{brandConfig.emoji}</span>
            <span style={{fontSize:12,color:C.acc,fontWeight:600}}>{brand}</span>
            <button onClick={()=>setSidebarOpen(!sidebarOpen)}
              style={{background:'transparent',border:`1px solid ${C.border}`,borderRadius:6,padding:'6px 10px',color:C.text,fontSize:12,cursor:'pointer'}}>
              ☰ Menu
            </button>
          </div>
        </div>

        {/* MOBILE OVERLAY SIDEBAR */}
        {sidebarOpen&&(
          <div className="mobile-overlay" onClick={()=>setSidebarOpen(false)}
            style={{position:'fixed',inset:0,zIndex:200,background:'rgba(0,0,0,0.7)'}}>
            <div onClick={e=>e.stopPropagation()}
              style={{width:260,height:'100%',background:C.surf,padding:'20px 14px',overflowY:'auto'}}>
              <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
                <button onClick={()=>setSidebarOpen(false)}
                  style={{background:'transparent',border:'none',color:C.muted,fontSize:20,cursor:'pointer'}}>✕</button>
              </div>
              {sidebarContent}
            </div>
          </div>
        )}

        {/* DESKTOP SIDEBAR */}
        <aside className="desktop-sidebar" style={{width:230,background:C.surf,borderRight:`1px solid ${C.border}`,
          padding:'18px 12px',flexShrink:0,position:'sticky',top:0,height:'100vh',overflowY:'auto'}}>
          {sidebarContent}
        </aside>

        {/* MAIN */}
        <main className="main-content" style={{flex:1,padding:'24px 28px',overflowY:'auto',paddingTop:0}}>
          <div style={{paddingTop:24}} className="mobile-pt">
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
              <span style={{fontSize:24}}>{brandConfig.emoji}</span>
              <h1 className="page-title" style={{fontSize:19,fontWeight:600}}>{brand} Intelligence Dashboard</h1>
            </div>
            <p style={{fontSize:12,color:C.muted,marginBottom:18}}>
              {brandConfig.category} · Pick dates → Run → 9-slide report + PPT download
            </p>

            {/* CONFIG PANEL */}
            <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:13,padding:18,marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>⚙ Run Configuration</div>

              {/* Brand + Dates */}
              <div className="config-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}>
                <div style={{display:'flex',flexDirection:'column',gap:5}}>
                  <label style={{fontSize:11,color:C.muted,fontWeight:500}}>Brand</label>
                  <select value={brand} onChange={e=>handleBrandChange(e.target.value)}
                    style={{background:C.card,border:`1px solid ${C.acc}`,borderRadius:6,padding:'7px 10px',
                      fontSize:12,color:C.acc,fontWeight:600,fontFamily:'inherit',outline:'none',cursor:'pointer'}}>
                    {Object.entries(BRANDS).map(([b,cfg])=>(
                      <option key={b} value={b}>{cfg.emoji} {b} — {cfg.category}</option>
                    ))}
                  </select>
                </div>
                {[['From date',fromDate,setFromDate],['To date',toDate,setToDate]].map(([lbl,val,fn])=>(
                  <div key={lbl} style={{display:'flex',flexDirection:'column',gap:5}}>
                    <label style={{fontSize:11,color:C.muted,fontWeight:500}}>{lbl}</label>
                    <input type="date" value={val} onChange={e=>fn(e.target.value)}
                      style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,padding:'7px 10px',
                        fontSize:12,color:C.text,fontFamily:'inherit',outline:'none',colorScheme:'dark',width:'100%'}}/>
                  </div>
                ))}
              </div>

              {/* Subreddits + Competitors */}
              <div className="sub-comp-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                <div>
                  <div style={{fontSize:11,color:C.muted,fontWeight:500,marginBottom:6}}>
                    Subreddits for {brand}
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                    {brandConfig.subreddits.map(s=>{
                      const on=activeSubs.has(s);
                      return(
                        <button key={s} onClick={()=>toggleSub(s)} style={{fontSize:10,padding:'3px 8px',borderRadius:4,cursor:'pointer',
                          border:`1px solid ${on?'rgba(255,69,0,0.4)':'rgba(255,255,255,0.08)'}`,
                          color:on?C.acc:C.muted,
                          background:on?'rgba(255,69,0,0.1)':'transparent'}}>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:11,color:C.muted,fontWeight:500,marginBottom:6}}>
                    Competitors for {brand}
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                    {brandConfig.competitors.map(c=>{
                      const on=activeComps.has(c);
                      return(
                        <button key={c} onClick={()=>toggleComp(c)} style={{fontSize:10,padding:'3px 8px',borderRadius:4,cursor:'pointer',
                          border:`1px solid ${on?'rgba(167,139,250,0.4)':'rgba(255,255,255,0.08)'}`,
                          color:on?C.pur:C.muted,background:on?'rgba(167,139,250,0.1)':'transparent'}}>
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Run row */}
              <div className="run-row" style={{display:'flex',alignItems:'center',gap:10,paddingTop:14,borderTop:`1px solid ${C.border}`,flexWrap:'wrap'}}>
                <button onClick={runAgent} disabled={running}
                  style={{background:C.acc,color:'white',border:'none',borderRadius:7,padding:'10px 22px',
                    fontSize:13,fontWeight:600,cursor:running?'not-allowed':'pointer',opacity:running?0.4:1,whiteSpace:'nowrap'}}>
                  {running?'⏳ Running...':'▶ Run Now'}
                </button>
                <button onClick={downloadPPT} disabled={!report}
                  style={{color:report?C.pur:C.muted,border:`1px solid ${report?'rgba(167,139,250,0.4)':C.border}`,
                    borderRadius:7,padding:'10px 16px',fontSize:12,cursor:report?'pointer':'not-allowed',
                    background:report?'rgba(167,139,250,0.1)':'transparent',whiteSpace:'nowrap',fontWeight:report?600:400}}>
                  ↓ Download PPT
                </button>
                <div className="prog-wrap" style={{flex:1,minWidth:80}}>
                  <div style={{background:'rgba(255,255,255,0.06)',borderRadius:4,height:5,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${progress}%`,background:`linear-gradient(90deg,${C.acc},${C.acc2})`,
                      borderRadius:4,transition:'width 0.5s ease'}}/>
                  </div>
                  <div style={{display:'flex',gap:5,flexWrap:'wrap',marginTop:8}}>
                    {Object.entries(stepLabels).map(([id,lbl])=>(
                      <span key={id} style={{fontSize:10,padding:'2px 8px',borderRadius:16,
                        border:`1px solid ${steps[id]==='done'?C.grn:steps[id]==='active'?C.acc:C.border}`,
                        color:steps[id]==='done'?C.grn:steps[id]==='active'?C.acc:C.muted,
                        background:steps[id]==='done'?'rgba(34,197,94,0.07)':steps[id]==='active'?'rgba(255,69,0,0.07)':'transparent'}}>
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* LOG */}
            <div ref={logRef} style={{background:'#090912',border:`1px solid ${C.border}`,borderRadius:10,padding:10,
              fontFamily:'monospace',fontSize:11,minHeight:70,maxHeight:130,overflowY:'auto',marginBottom:18}}>
              {logs.map((l,i)=>(
                <div key={i} style={{marginBottom:2,lineHeight:1.6}}>
                  <span style={{color:'#2d3a55'}}>[{l.ts}] </span>
                  <span style={{color:l.type==='ok'?C.grn:l.type==='error'?C.red:l.type==='step'?C.pur:C.muted,
                    fontWeight:l.type==='step'?600:400}}>{l.msg}</span>
                </div>
              ))}
            </div>

            {/* HISTORY */}
            {history.length>0&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,color:C.muted,fontWeight:500,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Run History</div>
                <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:4}}>
                  {history.map((h,i)=>{
                    const col=h.score>=70?C.grn:h.score>=50?C.ylw:C.red;
                    return(
                      <div key={i} style={{background:C.surf,border:`1px solid ${i===0?'rgba(255,69,0,0.35)':C.border}`,
                        borderRadius:8,padding:'8px 12px',minWidth:150,flexShrink:0}}>
                        <div style={{fontSize:10,color:C.muted,marginBottom:2}}>{h.emoji} {h.brand}</div>
                        <div style={{fontSize:10,color:C.muted,marginBottom:3}}>{h.from} → {h.to}</div>
                        <div style={{fontSize:18,fontWeight:700,color:col}}>{h.score}<span style={{fontSize:12,fontWeight:400,color:C.muted}}>/100</span></div>
                        <div style={{fontSize:10,color:C.muted}}>{h.mood} · {h.posts} posts</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* REPORT */}
            {report&&(
              <div ref={reportRef}>
                <div style={{background:'linear-gradient(135deg,#1a1a2e,#16213e)',border:'1px solid rgba(255,69,0,0.22)',
                  borderRadius:12,padding:'16px 20px',marginBottom:14,display:'flex',alignItems:'center',
                  justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                  <div>
                    <h2 style={{fontSize:16,fontWeight:700}}>{report.meta.emoji} {brand} · Reddit Intelligence Report</h2>
                    <p style={{fontSize:11,color:C.muted,marginTop:3}}>
                      {report.meta.fromDate} → {report.meta.toDate} · {report.meta.category} · {report.summary.total_posts} posts · {report.summary.total_comments} comments
                    </p>
                  </div>
                  <span style={{fontSize:10,background:'rgba(255,69,0,0.13)',color:C.acc,padding:'3px 10px',borderRadius:16,fontWeight:600}}>Manual run</span>
                </div>

                {/* KPI row */}
                <div className="kpi-row" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:12}}>
                  {[
                    {label:'Posts found',value:report.summary.total_posts,color:C.acc,sub:'in date range'},
                    {label:'Comments',value:report.summary.total_comments,color:C.pur,sub:'analyzed'},
                    {label:'Sentiment score',value:report.summary.sentiment_score,color:C.grn,sub:'out of 100'},
                    {label:'Overall mood',value:report.summary.sentiment_label,color:C.text,sub:'top: '+report.summary.top_subreddit,small:true},
                  ].map(({label,value,color,sub,small})=>(
                    <div key={label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:13}}>
                      <div style={{fontSize:10,color:C.muted,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:4}}>{label}</div>
                      <div style={{fontSize:small?17:22,fontWeight:700,color,marginBottom:2}}>{value}</div>
                      <div style={{fontSize:10,color:C.muted}}>{sub}</div>
                    </div>
                  ))}
                </div>

                {/* SLIDE 01 */}
                <SlideCard num="01" title="Executive Summary">
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:10}}>
                    {[['Posts',report.summary.total_posts,C.acc],['Comments',report.summary.total_comments,C.pur],
                      ['Score',report.summary.sentiment_score,C.grn],['Mood',report.summary.sentiment_label,C.text]].map(([l,v,c])=>(
                      <div key={l} style={{background:'rgba(255,255,255,0.04)',border:`1px solid ${C.border}`,borderRadius:6,padding:10,textAlign:'center'}}>
                        <div style={{fontSize:20,fontWeight:800,color:c,marginBottom:1}}>{v}</div>
                        <div style={{fontSize:10,color:C.muted}}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:10,color:C.muted,marginBottom:5}}>Sentiment distribution</div>
                  <div style={{display:'flex',height:8,borderRadius:4,overflow:'hidden',gap:2,marginBottom:6}}>
                    <div style={{width:`${report.sentiment_breakdown.positive}%`,background:C.grn,borderRadius:3}}/>
                    <div style={{width:`${report.sentiment_breakdown.neutral}%`,background:C.ylw,borderRadius:3}}/>
                    <div style={{width:`${report.sentiment_breakdown.negative}%`,background:C.red,borderRadius:3}}/>
                  </div>
                  <div style={{display:'flex',gap:12,fontSize:11,color:C.muted,flexWrap:'wrap'}}>
                    {[['#22c55e','Positive',report.sentiment_breakdown.positive],['#f59e0b','Neutral',report.sentiment_breakdown.neutral],['#ef4444','Negative',report.sentiment_breakdown.negative]].map(([c,l,v])=>(
                      <span key={l}><span style={{width:6,height:6,borderRadius:'50%',background:c,display:'inline-block',marginRight:3}}/>{l} {v}%</span>
                    ))}
                  </div>
                </SlideCard>

                {/* SLIDE 02 */}
                <SlideCard num="02" title="Sentiment Deep Dive">
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    <div>
                      {['positive','neutral','negative'].map((k,i)=>{
                        const c=i===0?C.grn:i===1?C.ylw:C.red;
                        return(
                          <div key={k} style={{marginBottom:11}}>
                            <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:4}}>
                              <span style={{color:c,textTransform:'capitalize'}}>{k}</span>
                              <span style={{fontWeight:600}}>{report.sentiment_breakdown[k]}%</span>
                            </div>
                            <div style={{height:6,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden'}}>
                              <div style={{width:`${report.sentiment_breakdown[k]}%`,height:'100%',background:c,borderRadius:3}}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div>
                      <div style={{fontSize:10,color:C.muted,marginBottom:7}}>Sample Reddit quotes</div>
                      {report.top_themes.slice(0,3).map((t,i)=>(
                        <div key={i} style={{background:'rgba(255,255,255,0.03)',borderRadius:6,padding:'7px 9px',marginBottom:6,borderLeft:'2px solid #FF4500'}}>
                          <div style={{fontSize:11,fontStyle:'italic',color:'#cbd5e1',marginBottom:2}}>"{t.example}"</div>
                          <div style={{fontSize:10,color:C.muted}}>{t.icon} {t.theme}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </SlideCard>

                {/* SLIDE 03 */}
                <SlideCard num="03" title="Hot Topics & Themes">
                  {report.top_themes.map((t,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'flex-start',gap:8,padding:'8px 0',
                      borderBottom:i<report.top_themes.length-1?`1px solid ${C.border}`:'none'}}>
                      <div style={{width:24,height:24,borderRadius:5,background:'rgba(255,255,255,0.05)',
                        display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0}}>{t.icon}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:500}}>{t.theme}</div>
                        <div style={{fontSize:10,color:C.muted,fontStyle:'italic',marginTop:2}}>"{t.example}"</div>
                      </div>
                      <div style={{fontSize:10,color:C.muted,flexShrink:0}}>{t.count}×</div>
                      <span style={{fontSize:10,padding:'2px 6px',borderRadius:8,fontWeight:500,flexShrink:0,
                        background:`${sentColor(t.sentiment)}1a`,color:sentColor(t.sentiment)}}>
                        {t.sentiment.charAt(0).toUpperCase()+t.sentiment.slice(1)}
                      </span>
                    </div>
                  ))}
                </SlideCard>

                {/* SLIDE 04 — Keywords */}
                <SlideCard num="04" title={`Keyword Associations — What is ${brand} Linked To?`}>
                  <div style={{fontSize:11,color:C.muted,marginBottom:10}}>
                    Words Reddit users co-mention with {brand} ·
                    <span style={{color:C.grn}}> ↑ Rising</span>
                    <span style={{color:C.muted}}> → Stable</span>
                    <span style={{color:C.red}}> ↓ Falling</span>
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:14}}>
                    {report.keyword_associations.map((k,i)=>{
                      const maxF=Math.max(...report.keyword_associations.map(x=>x.frequency));
                      const sz=10+Math.round((k.frequency/maxF)*9);
                      const tc=trendColor(k.trend);
                      return <span key={i} style={{borderRadius:20,padding:'4px 10px',fontSize:sz,fontWeight:500,
                        background:`${tc}1a`,border:`1px solid ${tc}44`,color:tc}}>
                        {k.keyword} <span style={{opacity:0.5,fontSize:9}}>{k.frequency}</span>
                      </span>;
                    })}
                  </div>
                  {report.keyword_associations.map((k,i)=>{
                    const maxF=Math.max(...report.keyword_associations.map(x=>x.frequency));
                    const tc=trendColor(k.trend);
                    return(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',
                        borderBottom:i<report.keyword_associations.length-1?`1px solid ${C.border}`:'none',flexWrap:'wrap'}}>
                        <div style={{flex:1,fontSize:12,fontWeight:500,minWidth:100}}>
                          {k.keyword}
                          <div style={{height:4,borderRadius:2,marginTop:3,width:`${Math.round((k.frequency/maxF)*100)}%`,background:tc}}/>
                        </div>
                        <div style={{fontSize:11,color:C.muted,minWidth:80}}>{k.frequency} mentions</div>
                        <span style={{fontSize:10,padding:'2px 7px',borderRadius:8,fontWeight:500,minWidth:72,textAlign:'center',
                          background:`${tc}18`,color:tc,border:`1px solid ${tc}33`}}>{trendArrow(k.trend)} {k.trend}</span>
                        <div style={{fontSize:11,color:C.muted,fontStyle:'italic',flex:2,minWidth:120}}>{k.context}</div>
                      </div>
                    );
                  })}
                  {report.keyword_clusters&&(
                    <div style={{marginTop:14}}>
                      <div style={{fontSize:11,color:C.muted,marginBottom:8,fontWeight:500,textTransform:'uppercase',letterSpacing:'0.06em'}}>Keyword Clusters</div>
                      {report.keyword_clusters.map((c,i)=>(
                        <div key={i} style={{marginBottom:6}}>
                          <span style={{fontSize:11,color:C.pur,fontWeight:600}}>{c.cluster}: </span>
                          {c.keywords.map(w=><span key={w} style={{fontSize:11,background:'rgba(167,139,250,0.1)',
                            border:'1px solid rgba(167,139,250,0.2)',borderRadius:4,padding:'1px 6px',marginRight:4}}>{w}</span>)}
                        </div>
                      ))}
                    </div>
                  )}
                </SlideCard>

                {/* SLIDE 05 — Posts with links */}
                <SlideCard num="05" title="Top Reddit Posts — click titles to open on Reddit">
                  <div style={{fontSize:11,color:C.muted,marginBottom:10}}>Click any post title to open it directly on Reddit →</div>
                  {report.top_posts.map((p,i)=>(
                    <div key={i} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${C.border}`,borderRadius:8,padding:12,marginBottom:8}}>
                      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:7,flexWrap:'wrap'}}>
                        <a href={`https://reddit.com/${p.subreddit}`} target="_blank" rel="noopener noreferrer"
                          style={{fontSize:10,background:'rgba(255,69,0,0.1)',color:C.acc,padding:'1px 7px',borderRadius:7,textDecoration:'none',fontWeight:600}}>
                          {p.subreddit}
                        </a>
                        {p.flair&&<span style={{fontSize:10,background:'rgba(255,255,255,0.06)',color:C.muted,padding:'1px 6px',borderRadius:5}}>{p.flair}</span>}
                        <span style={{width:5,height:5,borderRadius:'50%',background:sentColor(p.sentiment),display:'inline-block'}}/>
                        <span style={{fontSize:10,color:C.muted}}>▲ {p.upvotes}</span>
                        {p.num_comments&&<span style={{fontSize:10,color:C.muted}}>💬 {p.num_comments}</span>}
                        {p.awards>0&&<span style={{fontSize:10,color:C.ylw}}>🏆 {p.awards}</span>}
                        {p.author&&<span style={{fontSize:10,color:C.muted,marginLeft:'auto'}}>u/{p.author}</span>}
                      </div>
                      <a href={p.reddit_url} target="_blank" rel="noopener noreferrer"
                        style={{fontSize:13,fontWeight:600,color:C.text,textDecoration:'none',display:'block',marginBottom:6,lineHeight:1.4}}
                        onMouseEnter={e=>e.target.style.color=C.acc}
                        onMouseLeave={e=>e.target.style.color=C.text}>
                        {p.title} ↗
                      </a>
                      <div style={{fontSize:11,color:C.muted,fontStyle:'italic',borderLeft:'2px solid #FF4500',paddingLeft:7,marginBottom:6}}>{p.key_quote}</div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <a href={p.reddit_url} target="_blank" rel="noopener noreferrer"
                          style={{fontSize:10,color:C.acc,textDecoration:'none',padding:'3px 10px',border:'1px solid rgba(255,69,0,0.3)',borderRadius:6}}>
                          🔗 Open on Reddit
                        </a>
                        <span style={{fontSize:10,color:'rgba(255,255,255,0.15)',wordBreak:'break-all',flex:1}}>{p.reddit_url}</span>
                      </div>
                    </div>
                  ))}
                </SlideCard>

                {/* SLIDE 06 + 07 */}
                <div className="slides-side-by-side" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                  <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:11,overflow:'hidden'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,padding:'11px 14px',borderBottom:`1px solid ${C.border}`}}>
                      <span style={{fontSize:10,fontWeight:700,background:'rgba(255,69,0,.1)',color:C.acc,padding:'2px 7px',borderRadius:4}}>SLIDE 06</span>
                      <span style={{fontSize:13,fontWeight:600}}>Competitor Landscape</span>
                    </div>
                    <div style={{padding:'13px 14px'}}>
                      {report.competitors_mentioned.map((c,i)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',
                          borderBottom:i<report.competitors_mentioned.length-1?`1px solid ${C.border}`:'none'}}>
                          <div style={{flex:1,fontSize:12,fontWeight:500}}>{c.brand}</div>
                          <div style={{fontSize:10,color:C.muted}}>{c.mentions} mentions</div>
                          <span style={{fontSize:10,padding:'2px 6px',borderRadius:8,fontWeight:500,
                            background:c.vs_brand==='favorable'?'rgba(34,197,94,0.12)':c.vs_brand==='unfavorable'?'rgba(239,68,68,0.12)':'rgba(245,158,11,0.12)',
                            color:c.vs_brand==='favorable'?C.grn:c.vs_brand==='unfavorable'?C.red:C.ylw}}>
                            {c.vs_brand==='favorable'?'We win':c.vs_brand==='unfavorable'?'They win':'Neutral'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:11,overflow:'hidden'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,padding:'11px 14px',borderBottom:`1px solid ${C.border}`}}>
                      <span style={{fontSize:10,fontWeight:700,background:'rgba(255,69,0,.1)',color:C.acc,padding:'2px 7px',borderRadius:4}}>SLIDE 07</span>
                      <span style={{fontSize:13,fontWeight:600}}>AI Insights</span>
                    </div>
                    <div style={{padding:'13px 14px'}}>
                      {report.insights.map((ins,i)=>(
                        <div key={i} style={{background:'rgba(167,139,250,0.06)',border:'1px solid rgba(167,139,250,0.17)',borderRadius:7,padding:10,marginBottom:7}}>
                          <div style={{fontSize:10,color:C.pur,fontWeight:700,marginBottom:3}}>INSIGHT {i+1}</div>
                          <div style={{fontSize:12,lineHeight:1.6}}>{ins}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* SLIDE 08 */}
                <SlideCard num="08" title="Signal Alerts & Recommendations">
                  {report.signal_alerts.map((s,i)=>(
                    <div key={i} style={{borderRadius:7,padding:10,display:'flex',gap:8,marginBottom:7,
                      background:s.urgency==='high'?'rgba(239,68,68,0.07)':s.urgency==='medium'?'rgba(245,158,11,0.07)':'rgba(34,197,94,0.06)',
                      border:`1px solid ${urgColor(s.urgency)}33`}}>
                      <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',padding:'2px 5px',borderRadius:3,flexShrink:0,marginTop:1,
                        background:`${urgColor(s.urgency)}22`,color:urgColor(s.urgency)}}>{s.urgency}</div>
                      <div>
                        <div style={{fontSize:12,fontWeight:500,marginBottom:2}}>{s.signal}</div>
                        <div style={{fontSize:11,color:C.muted}}>→ {s.action}</div>
                      </div>
                    </div>
                  ))}
                </SlideCard>

                {/* SLIDE 09 — Brief */}
                <SlideCard num="09" title="📤 Executive Brief — Share Ready">
                  <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Copy and paste into WhatsApp or email:</div>
                  <div style={{background:'rgba(255,69,0,0.05)',border:'1px solid rgba(255,69,0,0.2)',borderRadius:8,padding:14,
                    fontSize:12,lineHeight:1.8,whiteSpace:'pre-wrap',fontFamily:'monospace'}}>
{`${report.meta.emoji} ${brand} Reddit Pulse | ${report.meta.fromDate} → ${report.meta.toDate}

📊 Sentiment: ${report.summary.sentiment_score}/100 (${report.summary.sentiment_label})
📝 Posts: ${report.summary.total_posts} analyzed across ${report.summary.top_subreddit}
🔥 Top topic: ${report.top_themes[0]?.theme} — "${report.top_themes[0]?.example}"
💡 Insight: ${report.insights[0]||'—'}
🚨 Alert: ${report.signal_alerts[0]?.signal||'—'} (${report.signal_alerts[0]?.urgency||'—'} priority)

Top post: ${report.top_posts[0]?.reddit_url||'—'}

Generated by ITC Brand Radar`}
                  </div>
                  <button onClick={()=>{
                    const t=`${report.meta.emoji} ${brand} Reddit Pulse | ${report.meta.fromDate} → ${report.meta.toDate}\n\nSentiment: ${report.summary.sentiment_score}/100 (${report.summary.sentiment_label})\nPosts: ${report.summary.total_posts}\nTop: ${report.top_themes[0]?.theme}\nInsight: ${report.insights[0]||''}\nAlert: ${report.signal_alerts[0]?.signal||''}\nTop post: ${report.top_posts[0]?.reddit_url||''}`;
                    navigator.clipboard.writeText(t);}}
                    style={{marginTop:8,background:'transparent',border:`1px solid ${C.border}`,borderRadius:6,padding:'6px 14px',fontSize:11,cursor:'pointer',color:C.text}}>
                    Copy to clipboard
                  </button>
                </SlideCard>

              </div>
            )}

          </div>
        </main>
      </div>

      {/* Mobile padding */}
      <style>{`
        @media(max-width:768px){
          .mobile-pt{padding-top:64px !important}
        }
      `}</style>
    </>
  );
}
