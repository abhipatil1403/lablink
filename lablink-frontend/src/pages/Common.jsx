export function DataState({loading,error,children}) {
  if(loading)return <div className="state-card" role="status">Loading LabLink data…</div>
  if(error)return <div className="state-card state-error" role="alert">{error}</div>
  return children
}
export function Header({eyebrow='LABLINK',title,description,action}) {
  return <div className="page-heading heading-row"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</div>
}
export function Status({value}) {
  const isSuccess = ['ACTIVE','ONLINE','REVIEWED','TESTED','READY'].includes(value)
  const isWarning = ['RUNNING','CONNECTING','STARTING'].includes(value)
  const isDanger = ['FAILED','OFFLINE','REJECTED','DEGRADED','SUSPENDED'].includes(value)
  const badgeClass = isSuccess ? 'badge-success' : isWarning ? 'badge-warning badge-live' : isDanger ? 'badge-danger' : 'badge-muted'
  return <span className={'badge ' + badgeClass}>{value || 'UNKNOWN'}</span>
}
export function TestResults({results=[]}) {
  const list = Array.isArray(results) ? results : []
  return list.length?<div className="table-wrap"><table><thead><tr><th>Test</th><th>Weight</th><th>Result</th><th>Details</th></tr></thead><tbody>{list.map((result, i)=><tr key={result.testCaseId || result.name || i}><td>{result.name}</td><td>{result.weight}</td><td><span className={'badge '+(result.passed?'badge-success':result.status==='ERROR'?'badge-danger':'badge-warning')}>{result.status||(result.passed?'PASSED':'FAILED')}</span></td><td>{result.output}</td></tr>)}</tbody></table></div>:<p className="subtle-note">Test results appear after you run the automated tests.</p>
}
export function WorkEvidence({work}) {
  if (!work) return null
  return <><section className="content-card"><h2>Submitted solution</h2><pre className="code-output">{work.solution || 'No code recorded'}</pre></section><section className="content-card"><h2>Execution output</h2><pre className="code-output">{work.executionOutput || 'No output recorded'}</pre></section><section className="content-card"><h2>Network transcript</h2><pre className="code-output">{work.networkLog || 'No network traffic recorded'}</pre></section><section className="content-card"><h2>Automated score: {work.automatedScore ?? '—'} / 100</h2><TestResults results={work.testResults}/></section></>
}
