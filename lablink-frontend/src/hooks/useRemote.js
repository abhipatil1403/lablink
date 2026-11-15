import { useEffect, useRef, useState } from 'react'

export function useRemote(load, key, options = {}) {
  const { interval = 0 } = typeof options === 'number' ? { interval: options } : options
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const activeRef = useRef(true)
  const keyString = typeof key === 'object' && key !== null ? JSON.stringify(key) : key

  useEffect(() => {
    activeRef.current = true

    const fetchData = (isBackground = false) => {
      if (!isBackground) setLoading(true)
      return load(key)
        .then(value => {
          if (activeRef.current) {
            setData(value)
            setError('')
          }
        })
        .catch(failure => {
          if (activeRef.current && !isBackground) {
            setError(failure.message)
          }
        })
        .finally(() => {
          if (activeRef.current && !isBackground) {
            setLoading(false)
          }
        })
    }

    fetchData(false)

    let timer = null
    if (interval > 0) {
      timer = setInterval(() => {
        if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
          fetchData(true)
        }
      }, interval)
    }

    return () => {
      activeRef.current = false
      if (timer) clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, keyString, revision, interval])

  return {
    data,
    loading,
    error,
    reload: () => {
      setLoading(true)
      setRevision(value => value + 1)
    }
  }
}
