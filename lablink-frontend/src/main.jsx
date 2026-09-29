import { createRoot } from 'react-dom/client'
import './style.css'

export function App() {
  return <main className="shell"><p className="eyebrow">Connected Virtual Laboratory</p><h1>LabLink</h1><p>Networking experiments for the CNT course.</p></main>
}

createRoot(document.getElementById('root')).render(<App />)
