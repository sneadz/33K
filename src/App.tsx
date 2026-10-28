import { useCallback, useEffect, useState } from 'react'
import { fetchState, loadSession, storeSession, type AppState, type Session } from './lib/api'
import Login from './components/Login'
import Tracker from './components/Tracker'

export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession)
  const [initial, setInitial] = useState<AppState | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    fetchState().then(setInitial, (e: Error) => setError(e.message))
  }, [])
  useEffect(load, [load])

  const signIn = (s: Session) => {
    storeSession(s)
    setSession(s)
  }
  const signOut = () => {
    storeSession(null)
    setSession(null)
    load()
  }

  if (error && !initial) {
    return (
      <main className="screen-center">
        <p className="wordmark">33K</p>
        <p className="muted">{error}</p>
        <button className="btn" onClick={load}>Réessayer</button>
      </main>
    )
  }
  if (!initial) {
    return (
      <main className="screen-center">
        <p className="wordmark pulse">33K</p>
      </main>
    )
  }
  if (!session) return <Login state={initial} onSignIn={signIn} />
  return <Tracker session={session} initial={initial} onSignOut={signOut} />
}
