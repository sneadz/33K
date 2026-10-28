import { useState, type FormEvent } from 'react'
import { PLAYERS, type PlayerId } from '../data/weapons'
import { login, type AppState, type Session } from '../lib/api'

export default function Login({ state, onSignIn }: { state: AppState; onSignIn: (s: Session) => void }) {
  const [player, setPlayer] = useState<PlayerId | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const creating = player ? !state.players[player].hasPin : false

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!player || pin.length !== 4) return
    setBusy(true)
    setError(null)
    try {
      await login({ player, pin })
      onSignIn({ player, pin })
    } catch (err) {
      setError((err as Error).message)
      setPin('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login">
      <h1 className="wordmark big">33K</h1>
      <p className="tagline">33 armes. Toute l'équipe. Tout en or.</p>

      <p className="login-q">Qui joue ?</p>
      <div className="player-pick">
        {PLAYERS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="player-card"
            aria-pressed={player === p.id}
            onClick={() => { setPlayer(p.id); setPin(''); setError(null) }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {player && (
        <form onSubmit={submit} className="pin-form">
          <label htmlFor="pin">
            {creating ? 'Choisis ton code à 4 chiffres' : 'Ton code à 4 chiffres'}
          </label>
          <input
            id="pin"
            className="pin-input"
            inputMode="numeric"
            autoComplete="off"
            pattern="\d{4}"
            maxLength={4}
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
          {creating && <p className="hint">Tu le taperas sur chaque nouvel appareil. Les autres ne pourront pas cocher à ta place.</p>}
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn gold" disabled={pin.length !== 4 || busy}>
            {creating ? 'Créer mon code' : 'Entrer'}
          </button>
        </form>
      )}
    </main>
  )
}
