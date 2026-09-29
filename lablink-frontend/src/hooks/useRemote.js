import { useEffect, useState } from 'react'

export function useRemote(load, key) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    load(key).then(value => { if (active) { setData(value); setError('') } })
      .catch(failure => { if (active) setError(failure.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [load, key, revision])
  return { data, loading, error, reload: () => { setLoading(true); setRevision(value => value + 1) } }
}
