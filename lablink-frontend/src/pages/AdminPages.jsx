import {useState} from 'react'
import {Activity,BookOpen,ClipboardList,Server,Users} from 'lucide-react'
import {useRemote} from '../hooks/useRemote'
import {adminAudit,adminDashboard,adminServers,adminUsers,createFaculty,setServerStatus,setUserStatus} from '../services/adminService'
import {DataState,Header,Status} from './Common'

export function AdminDashboard() {
  const {data,loading,error,reload}=useRemote(adminDashboard)
  const metrics=data?[
    ['Users',data.totalUsers,Users],['Students',data.students,Users],['Faculty',data.faculty,Users],['Admins',data.admins,Users],['Pending reviews',data.pendingReviews,ClipboardList],
    ['Assignments',data.experiments,BookOpen],['Active assignments',data.activeExperiments,BookOpen],
    ['Active attempts',data.activeSessions,Activity],['Submissions',data.submissions,ClipboardList],['Network services',data.experimentServers,Server]
  ]:[]
  return <><Header eyebrow="ADMINISTRATION" title="System overview" description="Database counts and live network gateway health." action={<button className="secondary-button" onClick={reload}>Refresh status</button>}/><DataState loading={loading} error={error}><div className="metric-grid admin-metrics">{metrics.map(([label,value,Icon])=><article className="metric-card" key={label}><span className="metric-icon"><Icon size={21}/></span><strong>{value}</strong><span>{label}</span></article>)}</div><div className="section-heading"><h2>System status</h2></div><div className="system-grid">{data&&[['REST API',data.systemStatus.api],['PostgreSQL database',data.systemStatus.database],['Network gateway',data.systemStatus.networkService]].map(([label,value])=><section className="content-card system-card" key={label}><strong>{label}</strong><Status value={value}/></section>)}</div></DataState></>
}
export function AdminSystemStatus() {
  const {data,loading,error,reload}=useRemote(adminDashboard)
  return <><Header title="System status" description="The API checks PostgreSQL and the network gateway when this page loads." action={<button className="secondary-button" onClick={reload}>Check now</button>}/><DataState loading={loading} error={error}><div className="system-grid">{data&&Object.entries(data.systemStatus).map(([name,value])=><section className="content-card system-card" key={name}><strong>{name}</strong><Status value={value}/></section>)}</div></DataState></>
}
export function AdminUsers() {
  const [query,setQuery]=useState(''),[filters,setFilters]=useState({search:'',role:'',status:''})
  const {data,loading,error,reload}=useRemote(adminUsers,query)
  const [form,setForm]=useState(null),[failure,setFailure]=useState(''),[busy,setBusy]=useState('')
  async function status(id,value){
    setBusy(id);setFailure('')
    try{await setUserStatus(id,value);reload()}catch(e){setFailure(e.message)}finally{setBusy('')}
  }
  async function create(e){
    e.preventDefault();setBusy('create');setFailure('')
    try{await createFaculty(form);setForm(null);reload()}catch(e){setFailure(e.message)}finally{setBusy('')}
  }
  return <><Header eyebrow="ADMINISTRATION" title="Users" description="Manage account access and create faculty accounts." action={<button className="primary-button" onClick={()=>{setFailure('');setForm({name:'',email:'',password:''})}}>Create Faculty</button>}/>
    {form&&<form className="content-card experiment-form" onSubmit={create}><h2>Create faculty account</h2><label>Full name<input required maxLength={120} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Email<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Temporary password<input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label><div className="terminal-actions"><button className="primary-button" disabled={!!busy}>Create account</button><button type="button" className="secondary-button" onClick={()=>setForm(null)}>Cancel</button></div></form>}
    {failure&&<p className="form-error" role="alert">{failure}</p>}
    <form className="filter-bar" onSubmit={e=>{e.preventDefault();setQuery(new URLSearchParams(Object.entries(filters).filter(([,v])=>v)).toString())}}><input placeholder="Search name or email" aria-label="Search users" value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})}/><select aria-label="Role filter" value={filters.role} onChange={e=>setFilters({...filters,role:e.target.value})}><option value="">All roles</option>{['STUDENT','FACULTY','ADMIN'].map(r=><option key={r}>{r}</option>)}</select><select aria-label="User status filter" value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">All statuses</option>{['ACTIVE','INACTIVE','SUSPENDED'].map(s=><option key={s}>{s}</option>)}</select><button className="secondary-button">Search</button></form>
    <DataState loading={loading} error={error}><div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Set access</th></tr></thead><tbody>{data?.map(u=><tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td><Status value={u.status}/></td><td>{new Date(u.createdAt).toLocaleDateString()}</td><td><select aria-label={'Status for '+u.name} value={u.status} disabled={busy===u.id||u.role==='ADMIN'} onChange={e=>status(u.id,e.target.value)}>{['ACTIVE','INACTIVE','SUSPENDED'].map(s=><option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table></div></DataState></>
}
export function AdminServers() {
  const {data,loading,error,reload}=useRemote(adminServers)
  const [busy,setBusy]=useState(''),[failure,setFailure]=useState('')
  async function toggle(server){setBusy(server.id);setFailure('');try{await setServerStatus(server.id,server.status==='ACTIVE'?'INACTIVE':'ACTIVE');reload()}catch(e){setFailure(e.message)}finally{setBusy('')}}
  return <><Header title="Network services" description="Real service ports and gateway heartbeats. Disabling a service prevents assignment execution." action={<button className="secondary-button" onClick={reload}>Refresh</button>}/>{failure&&<p className="form-error" role="alert">{failure}</p>}<DataState loading={loading} error={error}><div className="table-wrap"><table><thead><tr><th>Name</th><th>Host</th><th>Port</th><th>Protocol</th><th>Access</th><th>Heartbeat</th><th>Health</th><th>Active sessions</th><th></th></tr></thead><tbody>{data?.map(s=><tr key={s.id}><td>{s.name}</td><td>{s.address}</td><td>{s.port||'Pending'}</td><td>{s.supportedProtocols.join(', ')}</td><td><Status value={s.status}/></td><td>{s.lastHeartbeat?new Date(s.lastHeartbeat).toLocaleString():'Not received'}</td><td><Status value={s.health}/></td><td>{s.activeSessions}</td><td><button disabled={busy===s.id} onClick={()=>toggle(s)}>{s.status==='ACTIVE'?'Disable':'Enable'}</button></td></tr>)}</tbody></table></div></DataState></>
}
export function AdminAudit() {
  const {data,loading,error}=useRemote(adminAudit)
  return <><Header title="Audit history" description="Recent administrative changes, assignment attempts and reviews."/><DataState loading={loading} error={error}><div className="table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Resource</th><th>Details</th></tr></thead><tbody>{data?.map(a=><tr key={a.id}><td>{new Date(a.createdAt).toLocaleString()}</td><td>{a.actor?.name||'System'}</td><td>{a.action}</td><td><code>{a.resource}</code></td><td>{a.details}</td></tr>)}</tbody></table></div></DataState></>
}
