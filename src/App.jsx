import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CONCEPTS = ["Trabajo", "Reunión"];
const STATUSES = ["En progreso","Completado","Pendiente"];
const STATUS_COLORS = {"En progreso":"#f59e0b","Completado":"#10b981","Pendiente":"#6b7280"};

const TEAM = [
  {name:"Richy Juarez",     email:"richy@timely.app"},
  {name:"Emely Contreras",  email:"emely@timely.app"},
  {name:"Paula Rueda",      email:"paula@timely.app"},
  {name:"Yohan Álvarez",    email:"yohan@timely.app"},
  {name:"Alejandra Beltran",email:"alejandra@timely.app"},
  {name:"Oriana Velasquez", email:"oriana@timely.app"},
  {name:"Orietta Triana",   email:"orietta@timely.app"},
  {name:"Kathleen Mijares", email:"kathleen@timely.app"},
];

const ADMIN_EMAIL = "yohan@timely.app";
const CURRENCY = "$";
const NAV_EMPLOYEE = [{icon:"⏱",label:"Registrar"},{icon:"💵",label:"Reembolso"},{icon:"📋",label:"Mis Horas"},{icon:"⚙️",label:"Config"}];
const NAV_ADMIN    = [{icon:"⏱",label:"Registrar"},{icon:"💵",label:"Reembolso"},{icon:"📋",label:"Registros"},{icon:"📊",label:"Dashboard"},{icon:"✂️",label:"Quincenal"},{icon:"⚙️",label:"Config"}];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const calcHours = (s,e) => { if(!s||!e) return 0; const [sh,sm]=s.split(":").map(Number),[eh,em]=e.split(":").map(Number),d=(eh*60+em)-(sh*60+sm); return d>0?+(d/60).toFixed(2):0; };
const getBP = (ds) => { const d=new Date(ds+"T12:00:00"),day=d.getDate(),mo=d.getMonth(),yr=d.getFullYear(),h=day<=15?1:2; return {half:h,key:`${yr}-${String(mo+1).padStart(2,"0")}-Q${h}`,label:h===1?`1–15 ${d.toLocaleString("es",{month:"long"})} ${yr}`:`16–${new Date(yr,mo+1,0).getDate()} ${d.toLocaleString("es",{month:"long"})} ${yr}`}; };
const fmtDate = (ds) => { if(!ds) return ""; const [y,m,d]=ds.split("-"); return `${d}/${m}/${y}`; };
const today = () => new Date().toISOString().split("T")[0];
const fmtMoney = (n) => CURRENCY+(n||0).toLocaleString("es-MX",{minimumFractionDigits:2,maximumFractionDigits:2});
const nameFromEmail = (email) => TEAM.find(t=>t.email===email)?.name || email;

// ─── CSV EXPORT ────────────────────────────────────────────────────────────────
function exportCSV(records, label, rates={}) {
  const hdr=["Empleado","Tarifa/hr","Fecha","Concepto","Inicio","Fin","Horas","Monto","Estado","Descripción","Entregable"];
  const rows=records.map(r=>{const h=calcHours(r.start_time,r.end_time),rate=rates[r.employee_name]||0;return[r.employee_name,rate,fmtDate(r.date),r.concept,r.start_time,r.end_time,h,(h*rate).toFixed(2),r.status,`"${(r.description||"").replace(/"/g,"'")}"`,r.deliverable||""];});
  const csv=[hdr,...rows].map(r=>r.join(",")).join("\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"}));
  a.download=`timely_${label.replace(/[\s–]/g,"_")}.csv`;
  a.click();
}

function exportReimbCSV(reimbs, label) {
  const hdr=["Empleado","Fecha","Concepto","Monto"];
  const rows=reimbs.map(r=>[r.employee_name,fmtDate(r.date),`"${(r.concept||"").replace(/"/g,"'")}"`,r.amount]);
  const csv=[hdr,...rows].map(r=>r.join(",")).join("\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"}));
  a.download=`reembolsos_${label.replace(/[\s–]/g,"_")}.csv`;
  a.click();
}

// ─── MINI COMPONENTS ──────────────────────────────────────────────────────────
const Badge = ({status}) => <span style={{background:STATUS_COLORS[status]+"22",color:STATUS_COLORS[status],border:`1px solid ${STATUS_COLORS[status]}44`,borderRadius:20,fontSize:10,fontWeight:700,padding:"2px 8px",textTransform:"uppercase"}}>{status}</span>;

const ConceptTag = ({concept}) => {
  const c = concept==="Trabajo" ? "#3b82f6" : "#8b5cf6";
  return <span style={{background:c+"18",color:c,border:`1px solid ${c}33`,borderRadius:6,fontSize:10,fontWeight:700,padding:"2px 7px"}}>{concept}</span>;
};

const Card = ({label,value,accent}) => (
  <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"16px",flex:1,minWidth:120}}>
    <div style={{fontSize:22,fontWeight:800,color:accent||"#e8d5b0",fontFamily:"'DM Serif Display',serif"}}>{value}</div>
    <div style={{fontSize:12,color:"#9ca3af",marginTop:2}}>{label}</div>
  </div>
);

const Bar = ({value,max,color}) => (
  <div style={{background:"rgba(255,255,255,0.06)",borderRadius:4,height:5,marginTop:4}}>
    <div style={{background:color,borderRadius:4,height:5,width:`${max?Math.round((value/max)*100):0}%`,transition:"width .4s"}}/>
  </div>
);

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({onLogin}) {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const inp={background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:14,color:"#e8d5b0",padding:"15px 16px",fontSize:16,width:"100%",outline:"none",fontFamily:"inherit"};

  async function handleLogin() {
    if(!email||!password){setError("Ingresa tu correo y contraseña");return;}
    setLoading(true);setError("");
    try {
      const {data,error:err}=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});
      if(err) { setError("Correo o contraseña incorrectos"); setLoading(false); return; }
      onLogin(data.user);
    } catch(e) { setError("Error de conexión"); setLoading(false); }
  }

  return (
    <div style={{minHeight:"100dvh",background:"#0f0c08",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 24px",fontFamily:"'Syne',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet"/>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:42,color:"#e8d5b0",lineHeight:1}}>Timely</div>
          <div style={{fontSize:12,color:"#6b7280",letterSpacing:2,textTransform:"uppercase",marginTop:6}}>Control de Horas</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",letterSpacing:0.8,textTransform:"uppercase",marginBottom:6}}>Correo</div>
            <input type="email" value={email} placeholder="tu@timely.app" onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={inp}/>
          </div>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",letterSpacing:0.8,textTransform:"uppercase",marginBottom:6}}>Contraseña</div>
            <input type="password" value={password} placeholder="••••••••" onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={inp}/>
          </div>
          {error&&<div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,padding:"10px 14px",color:"#ef4444",fontSize:13}}>{error}</div>}
          <button onClick={handleLogin} disabled={loading} style={{background:"linear-gradient(135deg,#c9a96e,#e8d5b0)",color:"#1a1410",border:"none",borderRadius:14,padding:"16px",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:"inherit",marginTop:4,opacity:loading?0.7:1}}>
            {loading?"Entrando…":"Entrar →"}
          </button>
        </div>
        <div style={{marginTop:32,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"16px"}}>
          <div style={{fontSize:11,color:"#6b7280",fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",marginBottom:10}}>Correos del equipo</div>
          {TEAM.map(t=><div key={t.email} style={{fontSize:12,color:"#9ca3af",padding:"3px 0"}}>{t.name} — <span style={{color:"#c9a96e"}}>{t.email}</span></div>)}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session,setSession]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [tab,setTab]=useState(0);
  const [records,setRecords]=useState([]);
  const [reimbursements,setReimbursements]=useState([]);
  const [rates,setRates]=useState(()=>{try{return JSON.parse(localStorage.getItem("tr_rates")||"{}");}catch{return {};}});
  const [archived,setArchived]=useState(()=>{try{return JSON.parse(localStorage.getItem("tr_archived")||"[]");}catch{return [];}});
  const [loading,setLoading]=useState(false);
  const [saved,setSaved]=useState(false);
  const [savedReimb,setSavedReimb]=useState(false);
  const [archiveConfirm,setArchiveConfirm]=useState(false);
  const [selPer,setSelPer]=useState("");
  const [fEmp,setFEmp]=useState("Todos");
  const [fConcept,setFConcept]=useState("Todos");
  const [fPer,setFPer]=useState("Todos");

  const [form,setForm]=useState({date:today(),start_time:"",end_time:"",concept:CONCEPTS[0],status:"Completado",description:"",deliverable:""});
  const [reimbForm,setReimbForm]=useState({date:today(),concept:"",amount:""});

  useEffect(()=>{
    if(!supabase){setAuthLoading(false);return;}
    supabase.auth.getSession().then(({data:{session}})=>{setSession(session);setAuthLoading(false);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s));
    return()=>subscription.unsubscribe();
  },[]);

  const isAdmin = session?.user?.email===ADMIN_EMAIL;
  const myName = nameFromEmail(session?.user?.email||"");
  const NAV = isAdmin ? NAV_ADMIN : NAV_EMPLOYEE;
  const tabLabels = NAV.map(n=>n.label);

  useEffect(()=>{ if(session&&supabase){ loadRecords(); loadReimbursements(); } },[session]);

  async function loadRecords() {
    setLoading(true);
    let q = supabase.from("records").select("*").order("date",{ascending:false}).order("created_at",{ascending:false});
    if(!isAdmin) q=q.eq("employee_email",session.user.email);
    const {data,error}=await q;
    if(!error) setRecords(data||[]);
    setLoading(false);
  }

  async function loadReimbursements() {
    let q = supabase.from("reimbursements").select("*").order("date",{ascending:false});
    if(!isAdmin) q=q.eq("employee_email",session.user.email);
    const {data,error}=await q;
    if(!error) setReimbursements(data||[]);
  }

  async function handleSubmit() {
    if(!form.start_time||!form.end_time||!form.description.trim()) return;
    const h=calcHours(form.start_time,form.end_time);
    if(h<=0) return;
    setSaved(false);
    const {error}=await supabase.from("records").insert([{...form, hours:h, employee_email:session.user.email, employee_name:myName}]);
    if(!error){
      setForm({date:today(),start_time:"",end_time:"",concept:CONCEPTS[0],status:"Completado",description:"",deliverable:""});
      setSaved(true); setTimeout(()=>setSaved(false),2500);
      loadRecords();
    }
  }

  async function handleReimbSubmit() {
    if(!reimbForm.concept.trim()||!reimbForm.amount||parseFloat(reimbForm.amount)<=0) return;
    setSavedReimb(false);
    const {error}=await supabase.from("reimbursements").insert([{
      date:reimbForm.date, concept:reimbForm.concept, amount:parseFloat(reimbForm.amount),
      employee_email:session.user.email, employee_name:myName
    }]);
    if(!error){
      setReimbForm({date:today(),concept:"",amount:""});
      setSavedReimb(true); setTimeout(()=>setSavedReimb(false),2500);
      loadReimbursements();
    }
  }

  async function deleteRecord(id) { await supabase.from("records").delete().eq("id",id); setRecords(r=>r.filter(x=>x.id!==id)); }
  async function deleteReimb(id) { await supabase.from("reimbursements").delete().eq("id",id); setReimbursements(r=>r.filter(x=>x.id!==id)); }
  function saveRates(r){setRates(r);localStorage.setItem("tr_rates",JSON.stringify(r));}

  function archivePeriod(pk) {
    const pr=records.filter(r=>getBP(r.date).key===pk);
    const rb=reimbursements.filter(r=>getBP(r.date).key===pk);
    if(!pr.length&&!rb.length) return;
    const es={};
    pr.forEach(r=>{const h=calcHours(r.start_time,r.end_time);if(!es[r.employee_name])es[r.employee_name]={hours:0,pay:0,reimb:0};es[r.employee_name].hours+=h;es[r.employee_name].pay+=h*(rates[r.employee_name]||0);});
    rb.forEach(r=>{if(!es[r.employee_name])es[r.employee_name]={hours:0,pay:0,reimb:0};es[r.employee_name].reimb+=r.amount;});
    const arc={key:pk,label:periods[pk]||reimbPeriods[pk],archivedAt:new Date().toISOString(),
      totalHours:pr.reduce((a,r)=>a+calcHours(r.start_time,r.end_time),0),
      totalPay:Object.values(es).reduce((a,e)=>a+e.pay,0),
      totalReimb:Object.values(es).reduce((a,e)=>a+e.reimb,0),
      employees:Object.entries(es).map(([n,d])=>({name:n,hours:+d.hours.toFixed(2),pay:+d.pay.toFixed(2),reimb:+d.reimb.toFixed(2)})),
      recordCount:pr.length};
    const upd=[arc,...archived.filter(a=>a.key!==pk)];
    setArchived(upd);localStorage.setItem("tr_archived",JSON.stringify(upd));setArchiveConfirm(false);
  }

  // Derived
  const periods=useMemo(()=>{const m={};records.forEach(r=>{const p=getBP(r.date);if(!m[p.key])m[p.key]=p.label;});return m;},[records]);
  const reimbPeriods=useMemo(()=>{const m={};reimbursements.forEach(r=>{const p=getBP(r.date);if(!m[p.key])m[p.key]=p.label;});return m;},[reimbursements]);
  const allPeriods=useMemo(()=>({...reimbPeriods,...periods}),[periods,reimbPeriods]);
  const filtered=useMemo(()=>records.filter(r=>(fEmp==="Todos"||r.employee_name===fEmp)&&(fConcept==="Todos"||r.concept===fConcept)&&(fPer==="Todos"||getBP(r.date).key===fPer)),[records,fEmp,fConcept,fPer]);
  const perRecs=useMemo(()=>selPer?records.filter(r=>getBP(r.date).key===selPer):[],[records,selPer]);
  const perReimb=useMemo(()=>selPer?reimbursements.filter(r=>getBP(r.date).key===selPer):[],[reimbursements,selPer]);
  const perByEmp=useMemo(()=>{const m={};perRecs.forEach(r=>{m[r.employee_name]=(m[r.employee_name]||0)+calcHours(r.start_time,r.end_time);});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[perRecs]);
  const totalH=records.reduce((a,r)=>a+calcHours(r.start_time,r.end_time),0);
  const totalPay=records.reduce((a,r)=>a+calcHours(r.start_time,r.end_time)*(rates[r.employee_name]||0),0);
  const totalReimb=reimbursements.reduce((a,r)=>a+r.amount,0);
  const byConcept=useMemo(()=>{const m={};records.forEach(r=>{m[r.concept]=(m[r.concept]||0)+calcHours(r.start_time,r.end_time);});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[records]);
  const byEmp=useMemo(()=>{const m={};records.forEach(r=>{m[r.employee_name]=(m[r.employee_name]||0)+calcHours(r.start_time,r.end_time);});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[records]);
  const perTotalPay=perRecs.reduce((a,r)=>a+calcHours(r.start_time,r.end_time)*(rates[r.employee_name]||0),0);
  const perTotalReimb=perReimb.reduce((a,r)=>a+r.amount,0);

  const inp={background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,color:"#e8d5b0",padding:"13px 14px",fontSize:15,width:"100%",outline:"none",fontFamily:"inherit",WebkitAppearance:"none"};
  const lbl={fontSize:11,fontWeight:700,color:"#9ca3af",letterSpacing:0.8,textTransform:"uppercase",marginBottom:6,display:"block"};
  const btnP={background:"linear-gradient(135deg,#c9a96e,#e8d5b0)",color:"#1a1410",border:"none",borderRadius:14,padding:"15px 24px",fontWeight:800,fontSize:15,cursor:"pointer",width:"100%",fontFamily:"inherit"};
  const btnS={background:"rgba(255,255,255,0.06)",color:"#e8d5b0",border:"1px solid rgba(255,255,255,0.1)",borderRadius:14,padding:"13px 20px",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"};

  if(authLoading) return <div style={{minHeight:"100dvh",background:"#0f0c08",display:"flex",alignItems:"center",justifyContent:"center",color:"#e8d5b0",fontFamily:"'DM Serif Display',serif",fontSize:24}}>Cargando…</div>;
  if(!session) return <LoginScreen onLogin={u=>setSession({user:u})}/>;

  return (
    <div style={{minHeight:"100dvh",background:"#0f0c08",fontFamily:"'Syne',sans-serif",color:"#e8d5b0",display:"flex",flexDirection:"column",maxWidth:480,margin:"0 auto"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet"/>
      <div style={{height:"env(safe-area-inset-top,0px)",background:"#0f0c08"}}/>

      <div style={{padding:"14px 20px 10px",borderBottom:"1px solid rgba(255,255,255,0.07)",background:"rgba(15,12,8,0.97)",backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <span style={{fontFamily:"'DM Serif Display',serif",fontSize:22,color:"#e8d5b0"}}>Timely</span>
          {isAdmin&&<span style={{fontSize:10,color:"#c9a96e",marginLeft:8,letterSpacing:1,textTransform:"uppercase",fontWeight:700}}>Admin</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#e8d5b0"}}>{myName}</div>
            <div style={{fontSize:10,color:"#6b7280"}}>{session.user.email}</div>
          </div>
          <button onClick={()=>supabase.auth.signOut()} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:"#6b7280",cursor:"pointer",padding:"6px 10px",fontSize:12,fontFamily:"inherit"}}>Salir</button>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"20px 16px 110px"}}>

        {/* ── REGISTRAR ─────────────────────────────────────────────── */}
        {tabLabels[tab]==="Registrar"&&(
          <div>
            <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:26,marginBottom:4}}>Registrar horas</h2>
            <p style={{color:"#6b7280",fontSize:13,marginBottom:20}}>Como: <strong style={{color:"#c9a96e"}}>{myName}</strong></p>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div><label style={lbl}>Fecha</label><input type="date" value={form.date} max={today()} onChange={e=>setForm({...form,date:e.target.value})} style={inp}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><label style={lbl}>Inicio</label><input type="time" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})} style={inp}/></div>
                <div><label style={lbl}>Fin</label><input type="time" value={form.end_time} onChange={e=>setForm({...form,end_time:e.target.value})} style={inp}/></div>
              </div>
              {form.start_time&&form.end_time&&calcHours(form.start_time,form.end_time)>0&&(
                <div style={{background:"rgba(201,169,110,0.08)",border:"1px solid rgba(201,169,110,0.25)",borderRadius:12,padding:"12px 16px",display:"flex",gap:16}}>
                  <span style={{color:"#c9a96e",fontWeight:800}}>⏱ {calcHours(form.start_time,form.end_time)}h</span>
                  <span style={{color:"#6b7280",fontSize:12,alignSelf:"center"}}>{getBP(form.date).label}</span>
                </div>
              )}
              <div><label style={lbl}>Concepto</label><select value={form.concept} onChange={e=>setForm({...form,concept:e.target.value})} style={inp}>{CONCEPTS.map(c=><option key={c}>{c}</option>)}</select></div>
              <div><label style={lbl}>Estado</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={inp}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label style={lbl}>Descripción *</label><textarea value={form.description} rows={3} placeholder="¿En qué trabajaste?" onChange={e=>setForm({...form,description:e.target.value})} style={{...inp,resize:"none"}}/></div>
              <div><label style={lbl}>Link entregable (opcional)</label><input type="url" value={form.deliverable} placeholder="https://..." onChange={e=>setForm({...form,deliverable:e.target.value})} style={inp}/></div>
              <button onClick={handleSubmit} style={btnP}>Guardar registro</button>
              {saved&&<div style={{textAlign:"center",color:"#10b981",fontWeight:700,fontSize:14}}>✓ Guardado correctamente</div>}
            </div>
          </div>
        )}

        {/* ── REEMBOLSO ──────────────────────────────────────────────── */}
        {tabLabels[tab]==="Reembolso"&&(
          <div>
            <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:26,marginBottom:4}}>Registrar reembolso</h2>
            <p style={{color:"#6b7280",fontSize:13,marginBottom:20}}>Gastos o bonos a reembolsar, separados de las horas</p>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div><label style={lbl}>Fecha</label><input type="date" value={reimbForm.date} max={today()} onChange={e=>setReimbForm({...reimbForm,date:e.target.value})} style={inp}/></div>
              <div><label style={lbl}>Concepto *</label><input type="text" value={reimbForm.concept} placeholder="Ej: Internet, Cena equipo, Transporte…" onChange={e=>setReimbForm({...reimbForm,concept:e.target.value})} style={inp}/></div>
              <div><label style={lbl}>Monto *</label>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{color:"#9ca3af"}}>{CURRENCY}</span>
                  <input type="number" min="0" step="100" value={reimbForm.amount} placeholder="0" onChange={e=>setReimbForm({...reimbForm,amount:e.target.value})} style={inp}/>
                </div>
              </div>
              <button onClick={handleReimbSubmit} style={{...btnP,background:"linear-gradient(135deg,#10b981,#34d399)",color:"#06281c"}}>Guardar reembolso</button>
              {savedReimb&&<div style={{textAlign:"center",color:"#10b981",fontWeight:700,fontSize:14}}>✓ Reembolso guardado</div>}
            </div>

            {reimbursements.length>0&&(
              <div style={{marginTop:28}}>
                <h3 style={{fontSize:12,fontWeight:800,letterSpacing:0.5,textTransform:"uppercase",color:"#9ca3af",marginBottom:12}}>{isAdmin?"Todos los reembolsos":"Mis reembolsos"}</h3>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {reimbursements.map(r=>(
                    <div key={r.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700}}>{r.concept}</div>
                        <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>{fmtDate(r.date)}{isAdmin?` · ${r.employee_name}`:""}</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{color:"#10b981",fontWeight:800,fontSize:15}}>{fmtMoney(r.amount)}</span>
                        <button onClick={()=>deleteReimb(r.id)} style={{background:"none",border:"none",color:"#4b5563",cursor:"pointer",fontSize:16}}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── REGISTROS / MIS HORAS ─────────────────────────────────── */}
        {(tabLabels[tab]==="Registros"||tabLabels[tab]==="Mis Horas")&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:26,marginBottom:2}}>{isAdmin?"Todos los registros":"Mis Horas"}</h2>
                <p style={{color:"#6b7280",fontSize:12}}>{filtered.length} entradas · {filtered.reduce((a,r)=>a+calcHours(r.start_time,r.end_time),0).toFixed(1)}h</p>
              </div>
              <button onClick={()=>exportCSV(filtered,isAdmin?"todos":"mis_horas",rates)} style={{...btnS,padding:"9px 14px",fontSize:12}}>⬇ CSV</button>
            </div>
            {isAdmin&&(
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
                <select value={fEmp} onChange={e=>setFEmp(e.target.value)} style={{...inp,fontSize:13}}><option value="Todos">Todos los empleados</option>{TEAM.map(t=><option key={t.email}>{t.name}</option>)}</select>
                <select value={fConcept} onChange={e=>setFConcept(e.target.value)} style={{...inp,fontSize:13}}><option value="Todos">Todos los conceptos</option>{CONCEPTS.map(c=><option key={c}>{c}</option>)}</select>
                <select value={fPer} onChange={e=>setFPer(e.target.value)} style={{...inp,fontSize:13}}><option value="Todos">Todos los periodos</option>{Object.entries(periods).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
              </div>
            )}
            {loading?<div style={{textAlign:"center",color:"#6b7280",padding:"40px 0"}}>Cargando…</div>:
            filtered.length===0?<div style={{textAlign:"center",color:"#6b7280",padding:"50px 0",fontSize:14}}>Sin registros</div>:(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {filtered.map(r=>{
                  const h=calcHours(r.start_time,r.end_time),pay=h*(rates[r.employee_name]||0);
                  return(
                    <div key={r.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"14px 16px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
                            <span style={{fontSize:13,fontWeight:700,color:"#c9a96e"}}>{fmtDate(r.date)}</span>
                            <span style={{color:"#6b7280",fontSize:12}}>{r.start_time}–{r.end_time}</span>
                            <span style={{fontWeight:800,color:"#e8d5b0",fontSize:13}}>{h}h</span>
                            {pay>0&&<span style={{fontWeight:700,color:"#10b981",fontSize:12}}>{fmtMoney(pay)}</span>}
                          </div>
                          {isAdmin&&<div style={{fontSize:12,color:"#8b5cf6",fontWeight:700,marginBottom:4}}>{r.employee_name}</div>}
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:6}}><ConceptTag concept={r.concept}/><Badge status={r.status}/></div>
                          <div style={{fontSize:13,color:"#9ca3af"}}>{r.description}</div>
                          {r.deliverable&&<a href={r.deliverable} target="_blank" rel="noreferrer" style={{fontSize:12,color:"#3b82f6",textDecoration:"none",display:"block",marginTop:4}}>🔗 Entregable</a>}
                          <div style={{fontSize:11,color:"#4b5563",marginTop:6}}>{getBP(r.date).label}</div>
                        </div>
                        {(isAdmin||r.employee_email===session.user.email)&&<button onClick={()=>deleteRecord(r.id)} style={{background:"none",border:"none",color:"#4b5563",cursor:"pointer",fontSize:18,padding:"0 0 0 8px"}}>✕</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── DASHBOARD ──────────────────────────────────────────────── */}
        {tabLabels[tab]==="Dashboard"&&isAdmin&&(
          <div>
            <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:26,marginBottom:20}}>Dashboard</h2>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
              <Card label="Horas totales" value={totalH.toFixed(1)+"h"}/>
              <Card label="Pago horas" value={fmtMoney(totalPay)} accent="#10b981"/>
              <Card label="Reembolsos" value={fmtMoney(totalReimb)} accent="#f59e0b"/>
              <Card label="Empleados" value={new Set(records.map(r=>r.employee_name)).size} accent="#8b5cf6"/>
            </div>
            <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:16,marginBottom:14}}>
              <h3 style={{fontSize:12,fontWeight:800,letterSpacing:0.5,textTransform:"uppercase",color:"#9ca3af",marginBottom:14}}>Por concepto</h3>
              {byConcept.map(([c,h])=>(<div key={c} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:13}}>{c}</span><span style={{fontSize:13,fontWeight:700,color:"#c9a96e"}}>{h.toFixed(1)}h</span></div><Bar value={h} max={byConcept[0][1]} color="linear-gradient(90deg,#c9a96e,#e8d5b0)"/></div>))}
            </div>
            <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:16}}>
              <h3 style={{fontSize:12,fontWeight:800,letterSpacing:0.5,textTransform:"uppercase",color:"#9ca3af",marginBottom:14}}>Por empleado</h3>
              {byEmp.map(([emp,h])=>{
                const pay=records.filter(r=>r.employee_name===emp).reduce((a,r)=>a+calcHours(r.start_time,r.end_time)*(rates[r.employee_name]||0),0);
                return(<div key={emp} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:13}}>{emp}</span><span style={{fontSize:13}}><span style={{fontWeight:700,color:"#8b5cf6"}}>{h.toFixed(1)}h</span>{pay>0&&<span style={{color:"#10b981",marginLeft:8}}>{fmtMoney(pay)}</span>}</span></div><Bar value={h} max={byEmp[0][1]} color="linear-gradient(90deg,#8b5cf6,#c4b5fd)"/></div>);
              })}
            </div>
          </div>
        )}

        {/* ── QUINCENAL ──────────────────────────────────────────────── */}
        {tabLabels[tab]==="Quincenal"&&isAdmin&&(
          <div>
            <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:26,marginBottom:4}}>Corte Quincenal</h2>
            <p style={{color:"#6b7280",fontSize:13,marginBottom:20}}>Horas + reembolsos por periodo</p>
            <select value={selPer} onChange={e=>setSelPer(e.target.value)} style={{...inp,marginBottom:12}}>
              <option value="">Selecciona un periodo…</option>
              {Object.entries(allPeriods).sort((a,b)=>b[0].localeCompare(a[0])).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
            {selPer&&(
              <div style={{display:"flex",gap:10,marginBottom:16}}>
                <button onClick={()=>{exportCSV(perRecs,allPeriods[selPer]+"_horas",rates);exportReimbCSV(perReimb,allPeriods[selPer]+"_reembolsos");}} style={{...btnS,flex:1,fontSize:13}}>⬇ Exportar CSV</button>
                <button onClick={()=>setArchiveConfirm(true)} style={{...btnS,flex:1,fontSize:13,color:"#10b981",borderColor:"rgba(16,185,129,0.3)"}}>📁 Archivar</button>
              </div>
            )}
            {archiveConfirm&&(
              <div style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.25)",borderRadius:14,padding:"14px 16px",marginBottom:16}}>
                <p style={{fontSize:14,marginBottom:12}}>¿Archivar <strong>{allPeriods[selPer]}</strong>?</p>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>archivePeriod(selPer)} style={{...btnP,background:"linear-gradient(135deg,#10b981,#34d399)",flex:1,padding:"11px"}}>Confirmar</button>
                  <button onClick={()=>setArchiveConfirm(false)} style={{...btnS,flex:1}}>Cancelar</button>
                </div>
              </div>
            )}
            {!selPer&&<div style={{textAlign:"center",color:"#6b7280",padding:"50px 0",border:"1px dashed rgba(255,255,255,0.1)",borderRadius:16,fontSize:14}}>Selecciona un periodo</div>}
            {selPer&&(
              <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                  <Card label="Total horas" value={perRecs.reduce((a,r)=>a+calcHours(r.start_time,r.end_time),0).toFixed(1)+"h"} accent="#c9a96e"/>
                  <Card label="Pago horas" value={fmtMoney(perTotalPay)} accent="#10b981"/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr",gap:10,marginBottom:16}}>
                  <Card label="Reembolsos del periodo" value={fmtMoney(perTotalReimb)} accent="#f59e0b"/>
                </div>
                <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,overflow:"hidden",marginBottom:16}}>
                  <div style={{padding:"14px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}><span style={{fontSize:12,fontWeight:800,letterSpacing:0.5,textTransform:"uppercase",color:"#9ca3af"}}>Por empleado</span></div>
                  {perByEmp.length===0?<div style={{padding:16,color:"#6b7280",fontSize:13}}>Sin horas en este periodo</div>:perByEmp.map(([emp,h],i)=>{
                    const rate=rates[emp]||0,pay=h*rate;
                    const empReimb=perReimb.filter(r=>r.employee_name===emp).reduce((a,r)=>a+r.amount,0);
                    return(
                      <div key={emp} style={{padding:"14px 16px",borderBottom:i<perByEmp.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontWeight:700,fontSize:14}}>{emp}</span>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontWeight:800,color:"#c9a96e",fontSize:18,fontFamily:"'DM Serif Display',serif"}}>{h.toFixed(2)}h</div>
                            {rate>0&&<div style={{color:"#6b7280",fontSize:11}}>× {fmtMoney(rate)}/hr</div>}
                            {pay>0?<div style={{color:"#10b981",fontWeight:800,fontSize:15}}>{fmtMoney(pay)}</div>:<div style={{color:"#4b5563",fontSize:11}}>Sin tarifa</div>}
                            {empReimb>0&&<div style={{color:"#f59e0b",fontWeight:700,fontSize:13}}>+ {fmtMoney(empReimb)} reembolso</div>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── CONFIG ─────────────────────────────────────────────────── */}
        {tabLabels[tab]==="Config"&&(
          <div>
            <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:26,marginBottom:20}}>Configuración</h2>
            <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:16,marginBottom:24}}>
              <div style={{fontSize:12,fontWeight:800,letterSpacing:0.5,textTransform:"uppercase",color:"#9ca3af",marginBottom:10}}>Mi cuenta</div>
              <div style={{fontSize:15,fontWeight:700}}>{myName}</div>
              <div style={{fontSize:13,color:"#6b7280",marginTop:2}}>{session.user.email}</div>
              {isAdmin&&<div style={{fontSize:11,color:"#c9a96e",marginTop:4,fontWeight:700}}>👑 Administrador</div>}
            </div>
            {isAdmin&&(
              <div style={{marginBottom:24}}>
                <h3 style={{fontSize:14,fontWeight:800,marginBottom:4}}>💰 Tarifas por hora</h3>
                <p style={{color:"#6b7280",fontSize:12,marginBottom:14}}>Cada persona tiene su propia tarifa</p>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {TEAM.map(t=>(
                    <div key={t.email} style={{display:"flex",alignItems:"center",gap:10,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"12px 14px"}}>
                      <span style={{flex:1,fontSize:14,fontWeight:600}}>{t.name}</span>
                      <span style={{color:"#6b7280",fontSize:13}}>{CURRENCY}</span>
                      <input type="number" min="0" step="500" value={rates[t.name]||""} placeholder="0" onChange={e=>{const r={...rates,[t.name]:parseFloat(e.target.value)||0};saveRates(r);}} style={{...inp,width:90,padding:"8px 10px",textAlign:"right"}}/>
                      <span style={{color:"#6b7280",fontSize:12}}>/hr</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {isAdmin&&archived.length>0&&(
              <div>
                <h3 style={{fontSize:14,fontWeight:800,marginBottom:14}}>📁 Cortes archivados</h3>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {archived.map(a=>(
                    <div key={a.key} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                        <div><div style={{fontWeight:700,fontSize:14}}>{a.label}</div><div style={{fontSize:11,color:"#6b7280",marginTop:2}}>{a.recordCount} registros</div></div>
                        <div style={{textAlign:"right"}}><div style={{fontWeight:800,color:"#c9a96e"}}>{a.totalHours.toFixed(1)}h</div>{a.totalPay>0&&<div style={{color:"#10b981",fontWeight:700,fontSize:14}}>{fmtMoney(a.totalPay)}</div>}{a.totalReimb>0&&<div style={{color:"#f59e0b",fontWeight:700,fontSize:12}}>+{fmtMoney(a.totalReimb)}</div>}</div>
                      </div>
                      {a.employees.map(e=>(
                        <div key={e.name} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"5px 0",borderTop:"1px solid rgba(255,255,255,0.04)"}}>
                          <span style={{color:"#9ca3af"}}>{e.name}</span>
                          <span><span style={{color:"#e8d5b0"}}>{e.hours}h</span>{e.pay>0&&<span style={{color:"#10b981",marginLeft:10,fontWeight:700}}>{fmtMoney(e.pay)}</span>}{e.reimb>0&&<span style={{color:"#f59e0b",marginLeft:8,fontWeight:700}}>+{fmtMoney(e.reimb)}</span>}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={()=>supabase.auth.signOut()} style={{...btnS,width:"100%",marginTop:24,color:"#ef4444",borderColor:"rgba(239,68,68,0.3)"}}>Cerrar sesión</button>
          </div>
        )}
      </div>

      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"rgba(15,12,8,0.97)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(255,255,255,0.08)",display:"flex",paddingBottom:"env(safe-area-inset-bottom,0px)",zIndex:50}}>
        {NAV.map((n,i)=>(
          <button key={n.label} onClick={()=>setTab(i)} style={{flex:1,background:"none",border:"none",cursor:"pointer",padding:"10px 2px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <span style={{fontSize:18,lineHeight:1}}>{n.icon}</span>
            <span style={{fontSize:8,fontWeight:tab===i?800:500,color:tab===i?"#c9a96e":"#6b7280",letterSpacing:0.3,textTransform:"uppercase",fontFamily:"'Syne',sans-serif"}}>{n.label}</span>
            {tab===i&&<div style={{width:4,height:4,borderRadius:"50%",background:"#c9a96e",marginTop:1}}/>}
          </button>
        ))}
      </div>
    </div>
  );
}
