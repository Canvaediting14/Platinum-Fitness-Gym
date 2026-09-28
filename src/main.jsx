import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from 'firebase/auth'
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, query, setDoc, updateDoc, where, serverTimestamp
} from 'firebase/firestore'
import { auth, db, firebaseReady } from './firebase'
import './styles.css'

const DEMO_MEMBERS = [
  { id:'demo1', name:'Amit Kumar', phone:'+919876511111', plan:'Monthly', fee:1500, start:'2026-08-14', expiry:'2026-09-13', status:'expired' },
  { id:'demo2', name:'Priya Verma', phone:'+919876500000', plan:'Monthly', fee:1200, start:'2026-08-28', expiry:'2026-09-28', status:'expiring' },
  { id:'demo3', name:'Rohan Sharma', phone:'+919876543210', plan:'Monthly', fee:1500, start:'2026-08-31', expiry:'2026-09-30', status:'active' },
  { id:'demo4', name:'Sneha Iyer', phone:'+919876522222', plan:'Quarterly', fee:4000, start:'2026-07-07', expiry:'2026-10-07', status:'active' },
  { id:'demo5', name:'TEST_Quarterly_8ddc', phone:'+919876533333', plan:'Quarterly', fee:4000, start:'2026-07-01', expiry:'2026-09-30', status:'active' },
  { id:'demo6', name:'Neha Singh', phone:'+919876544444', plan:'Monthly', fee:1500, start:'2026-09-01', expiry:'2026-10-01', status:'active' },
]

const PLAN_DAYS = { Monthly:30, Quarterly:90, HalfYearly:180, Yearly:365 }
const today = () => new Date().toISOString().slice(0,10)
const addDays = (date, days) => { const d=new Date(date+'T00:00:00'); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10) }
const money = n => `₹${Number(n||0).toLocaleString('en-IN')}`
const initials = n => n.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase()
const daysLeft = expiry => Math.ceil((new Date(expiry+'T23:59:59')-new Date())/86400000)
const statusFor = expiry => { const d=daysLeft(expiry); return d < 0 ? 'expired' : d <= 7 ? 'expiring' : 'active' }

function App(){
  const [user,setUser]=useState(null)
  const [page,setPage]=useState('home')
  const [members,setMembers]=useState(firebaseReady?[]:DEMO_MEMBERS)
  const [payments,setPayments]=useState([])
  const [settings,setSettings]=useState({gymName:'Platinum Fitness Gym'})
  const [showForm,setShowForm]=useState(false)
  const [editMember,setEditMember]=useState(null)
  const [selected,setSelected]=useState(null)
  const [loading,setLoading]=useState(firebaseReady)
  const [error,setError]=useState('')

  useEffect(()=>{ if(!firebaseReady){setLoading(false);return} return onAuthStateChanged(auth,u=>setUser(u)) },[])

  useEffect(()=>{
    if(!firebaseReady || !user) return
    setLoading(true)
    const q=query(collection(db,'members'),where('ownerId','==',user.uid))
    const unsub=onSnapshot(q,s=>{setMembers(s.docs.map(d=>({id:d.id,...d.data()})));setLoading(false)},e=>{setError(e.message);setLoading(false)})
    return unsub
  },[user])
  useEffect(()=>{
    if(!firebaseReady || !user) return
    const q=query(collection(db,'payments'),where('ownerId','==',user.uid))
    return onSnapshot(q,s=>setPayments(s.docs.map(d=>({id:d.id,...d.data()}))))
  },[user])
  useEffect(()=>{
    if(!firebaseReady || !user) return
    return onSnapshot(doc(db,'settings',user.uid),s=>{if(s.exists()) setSettings(s.data())})
  },[user])

  const normalized = useMemo(()=>members.map(m=>({...m,status:statusFor(m.expiry)})),[members])
  const active=normalized.filter(m=>m.status==='active').length
  const expiring=normalized.filter(m=>m.status==='expiring').length
  const expired=normalized.filter(m=>m.status==='expired').length
  const collected=payments.reduce((a,p)=>a+Number(p.amount||0),0)
  const revenue=normalized.filter(m=>m.status!=='expired').reduce((a,m)=>a+Number(m.fee||0),0)

  async function saveMember(data){
    setError('')
    if(!data.name || !data.phone || !data.fee) return setError('Name, phone and fee are required.')
    const payload={...data,fee:Number(data.fee),ownerId:user?.uid||'demo',updatedAt:serverTimestamp()}
    try{
      if(firebaseReady && user){
        if(editMember) await updateDoc(doc(db,'members',editMember.id),payload)
        else await addDoc(collection(db,'members'),{...payload,createdAt:serverTimestamp()})
      } else {
        const id=editMember?.id||`demo${Date.now()}`
        setMembers(x=>editMember?x.map(m=>m.id===id?{...m,...payload,id}:m):[...x,{...payload,id}])
      }
      setShowForm(false);setEditMember(null)
    }catch(e){setError(e.message)}
  }
  async function renew(m){
    const start = today(); const expiry=addDays(start,PLAN_DAYS[m.plan]||30)
    const updated={...m,start,expiry,status:'active'}
    try{
      if(firebaseReady && user){ await updateDoc(doc(db,'members',m.id),{start,expiry,updatedAt:serverTimestamp()}); await addDoc(collection(db,'payments'),{ownerId:user.uid,memberId:m.id,amount:Number(m.fee),date:start,type:'renewal',createdAt:serverTimestamp()}) }
      else { setMembers(x=>x.map(a=>a.id===m.id?updated:a)); setPayments(x=>[...x,{id:`p${Date.now()}`,amount:m.fee,date:start}]) }
    }catch(e){setError(e.message)}
  }
  async function remove(m){ if(!confirm(`Delete ${m.name}?`)) return; try{ if(firebaseReady&&user) await deleteDoc(doc(db,'members',m.id)); else setMembers(x=>x.filter(a=>a.id!==m.id)); setSelected(null) }catch(e){setError(e.message)} }
  async function saveSettings(){ if(firebaseReady&&user) await setDoc(doc(db,'settings',user.uid),settings,{merge:true}) }

  if(firebaseReady && !user) return <Auth error={error} setError={setError}/>
  if(loading) return <div className="loading">Loading…</div>
  return <div className="app">
    <main>
      {error && <div className="error">{error}<button onClick={()=>setError('')}>×</button></div>}
      {page==='home' && <Home revenue={revenue} collected={collected} total={normalized.length} active={active} expiring={expiring} expired={expired} members={normalized} onMember={setSelected} onPage={setPage}/>} 
      {page==='members' && <Members members={normalized} onAdd={()=>{setEditMember(null);setShowForm(true)}} onEdit={m=>{setEditMember(m);setShowForm(true)}} onDelete={remove} onRenew={renew} onSelect={setSelected}/>} 
      {page==='payments' && <Payments payments={payments} members={normalized}/>}
      {page==='settings' && <Settings settings={settings} setSettings={setSettings} save={saveSettings} user={user} signOut={()=>firebaseReady&&signOut(auth)} demo={!firebaseReady}/>} 
    </main>
    <nav><Nav active={page} icon="⌂" label="HOME" click={()=>setPage('home')}/><Nav active={page} icon="♟" label="MEMBERS" click={()=>setPage('members')}/><Nav active={page} icon="⚙" label="SETTINGS" click={()=>setPage('settings')}/></nav>
    {showForm && <MemberForm member={editMember} close={()=>{setShowForm(false);setEditMember(null)}} save={saveMember}/>} 
    {selected && <MemberModal member={selected} close={()=>setSelected(null)} renew={()=>renew(selected)} edit={()=>{setEditMember(selected);setSelected(null);setShowForm(true)}} delete={()=>remove(selected)}/>} 
  </div>
}

function Auth({error,setError}){
 const [mode,setMode]=useState('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false)
 async function submit(e){e.preventDefault();setBusy(true);setError('');try{if(mode==='login')await signInWithEmailAndPassword(auth,email,password);else await createUserWithEmailAndPassword(auth,email,password)}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <div className="auth"><div className="brand">PF</div><h1>Platinum Fitness Gym</h1><p>Members, fees & renewals in one place</p><form onSubmit={submit}><input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/><input type="password" placeholder="Password" minLength="6" value={password} onChange={e=>setPassword(e.target.value)} required/><button className="primary">{busy?'Please wait…':mode==='login'?'SIGN IN':'CREATE ACCOUNT'}</button></form>{error&&<div className="autherror">{error}</div>}<button className="link" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'Create owner account':'Back to sign in'}</button></div>
}

function Nav({active,label,click}){return <button className={active===label.toLowerCase()?'nav active':'nav'} onClick={click}><span>{label==='HOME'?'⌂':label==='MEMBERS'?'♟':'⚙'}</span>{label}</button>}
function Home({revenue,collected,total,active,expiring,expired,members,onMember,onPage}){return <div className="page"><section className="hero"><div>REVENUE THIS MONTH</div><strong>{money(revenue)}</strong><small>Total collected: {money(collected)}</small></section><h3>MEMBERS</h3><div className="stats"><Stat label="TOTAL" value={total}/><Stat label="ACTIVE" value={active} green/><Stat label="EXPIRING" value={expiring} orange/><Stat label="EXPIRED" value={expired} red/></div><h3>ATTENTION NEEDED</h3>{members.filter(m=>m.status!=='active').map(m=><MemberRow key={m.id} m={m} onClick={()=>onMember(m)}/>)}{!members.some(m=>m.status!=='active')&&<div className="empty">All memberships are up to date.</div>}<button className="wide secondary" onClick={()=>onPage('members')}>VIEW ALL MEMBERS</button><button className="wide secondary" onClick={()=>onPage('payments')}>PAYMENT HISTORY</button></div>}
function Stat({label,value,green,orange,red}){return <div className="stat"><span>{label}</span><b className={green?'green':orange?'orange':red?'red':''}>{value}</b></div>}
function MemberRow({m,onClick}){const d=daysLeft(m.expiry);return <button className="memberrow" onClick={onClick}><div className="avatar">{initials(m.name)}</div><div className="memberinfo"><strong>{m.name}</strong><small>{m.status==='expired'?`Expired ${Math.abs(d)}d ago`:d===0?'Expires today':`Expires in ${d}d`} • {money(m.fee)}</small></div><Status status={m.status}/></button>}
function Status({status}){return <span className={'status '+status}>{status.toUpperCase()}</span>}


function Payments({payments,members}){const rows=[...payments].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));return <div className="page"><header className="pagehead"><h1>Payments</h1><div className="totalpill">{money(payments.reduce((a,p)=>a+Number(p.amount||0),0))}</div></header><div className="list">{rows.map(p=>{const m=members.find(x=>x.id===p.memberId);return <article className="card payment" key={p.id}><div className="avatar">₹</div><div className="memberinfo"><strong>{m?.name||'Member'}</strong><small>{p.type||'payment'} • {p.date||'—'}</small></div><strong>{money(p.amount)}</strong></article>})}{!rows.length&&<div className="empty">No payments recorded yet. Renew a membership to create a payment.</div>}</div></div>}

function Members({members,onAdd,onEdit,onDelete,onRenew,onSelect}){const [q,setQ]=useState(''),[filter,setFilter]=useState('all');const list=members.filter(m=>(filter==='all'||m.status===filter)&&(m.name.toLowerCase().includes(q.toLowerCase())||m.phone.includes(q)));return <div className="page"><header className="pagehead"><h1>Members</h1><button className="add" onClick={onAdd}>+ ADD</button></header><input className="search" placeholder="Search by name or phone" value={q} onChange={e=>setQ(e.target.value)}/><div className="filters">{['all','active','expiring','expired'].map(x=><button className={filter===x?'selected':''} onClick={()=>setFilter(x)} key={x}>{x[0].toUpperCase()+x.slice(1)}</button>)}</div><div className="list">{list.map(m=><article className="card" key={m.id} onClick={()=>onSelect(m)}><div className="avatar">{initials(m.name)}</div><div className="memberinfo"><strong>{m.name}</strong><small>{m.phone} • {m.plan} • {money(m.fee)}</small><small>{m.status==='expired'?`Expired ${Math.abs(daysLeft(m.expiry))}d ago`:`${Math.max(0,daysLeft(m.expiry))}d left`}</small></div><Status status={m.status}/></article>)}{!list.length&&<div className="empty">No members found.</div>}</div></div>}

function MemberForm({member,close,save}){const [f,setF]=useState(member||{name:'',phone:'',plan:'Monthly',fee:1500,start:today(),expiry:addDays(today(),30)});function set(k,v){setF({...f,[k]:v})}function plan(v){setF({...f,plan:v,expiry:addDays(f.start||today(),PLAN_DAYS[v])})}return <div className="overlay"><div className="modal"><header><h2>{member?'Edit Member':'Add Member'}</h2><button onClick={close}>×</button></header><label>Name<input value={f.name} onChange={e=>set('name',e.target.value)} /></label><label>Phone<input value={f.phone} onChange={e=>set('phone',e.target.value)} /></label><label>Plan<select value={f.plan} onChange={e=>plan(e.target.value)}>{Object.keys(PLAN_DAYS).map(x=><option key={x}>{x}</option>)}</select></label><label>Fee<input type="number" value={f.fee} onChange={e=>set('fee',e.target.value)} /></label><label>Start date<input type="date" value={f.start} onChange={e=>{set('start',e.target.value);set('expiry',addDays(e.target.value,PLAN_DAYS[f.plan]))}} /></label><label>Expiry date<input type="date" value={f.expiry} onChange={e=>set('expiry',e.target.value)} /></label><button className="primary" onClick={()=>save(f)}>SAVE MEMBER</button></div></div>}
function MemberModal({member,close,renew,edit,delete:del}){return <div className="overlay"><div className="modal"><header><div><div className="avatar big">{initials(member.name)}</div><h2>{member.name}</h2></div><button onClick={close}>×</button></header><div className="details"><p><b>Phone</b><span>{member.phone}</span></p><p><b>Plan</b><span>{member.plan}</span></p><p><b>Fee</b><span>{money(member.fee)}</span></p><p><b>Start</b><span>{member.start}</span></p><p><b>Expiry</b><span>{member.expiry}</span></p><p><b>Status</b><span><Status status={statusFor(member.expiry)}/></span></p></div><div className="actions"><button className="primary" onClick={()=>renew(selected)}>RENEW</button><button className="secondary" onClick={edit}>EDIT</button><button className="danger" onClick={del}>DELETE</button></div></div></div>}
function Settings({settings,setSettings,save,user,signOut,demo}){return <div className="page settings"><h1>Settings</h1><p>{settings.gymName}</p><h3>ACCOUNT</h3><div className="settingcard"><div className="avatar">@</div><div><b>Signed in as</b><small>{demo?'Demo mode':user?.email}</small></div></div><h3>GYM</h3><label>Gym name<input value={settings.gymName||''} onChange={e=>setSettings({...settings,gymName:e.target.value})}/></label><button className="primary" onClick={save}>SAVE SETTINGS</button><h3>ABOUT</h3><div className="settingcard"><div className="avatar">i</div><div><b>Platinum Fitness Gym</b><small>Members, fees & renewals in one place • v2.0</small></div></div>{!demo&&<button className="danger wide" onClick={signOut}>SIGN OUT</button>}</div>}

createRoot(document.getElementById('root')).render(<App />)
