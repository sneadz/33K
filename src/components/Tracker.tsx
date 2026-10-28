import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CLASSES, MASTERY, PLAYERS, TIERS, type WeaponClass } from '../data/weapons'
import { ApiError, fetchState, save, type AppState, type PlayerState, type Session } from '../lib/api'
import { classCount, classStage, counts, globalStage, levelOf, type Progress } from '../lib/rules'

const POLL_MS = 5000
const TIER_NAME = ['', 'Gold', 'Platinum', 'Harmonic Break', 'Terminé']
const PREFS_KEY = '33k:prefs'

type Pending = Record<string, number> // "weapon:han-86" -> niveau en cours d'envoi

function readPrefs(): { remaining: boolean } {
  try { return { remaining: true, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') } } catch { return { remaining: true } }
}

function withPending(state: AppState, me: string, pending: Pending): AppState {
  if (!Object.keys(pending).length) return state
  const mine = state.players[me as keyof AppState['players']]
  const progress = { ...mine.progress }
  const mastery = { ...mine.mastery }
  for (const [key, level] of Object.entries(pending)) {
    const [kind, id] = key.split(':')
    const target = kind === 'weapon' ? progress : mastery
    if (level === 0) delete target[id]
    else target[id] = level
  }
  return { players: { ...state.players, [me]: { ...mine, progress, mastery } } }
}

export default function Tracker({ session, initial, onSignOut }: { session: Session; initial: AppState; onSignOut: () => void }) {
  const [server, setServer] = useState(initial)
  const [pending, setPending] = useState<Pending>({})
  const [toast, setToast] = useState<string | null>(null)
  const [remaining, setRemaining] = useState(readPrefs().remaining)
  const pendingRef = useRef(pending)
  pendingRef.current = pending

  const meId = session.player
  const meName = PLAYERS.find((p) => p.id === meId)!.name
  const friend = PLAYERS.find((p) => p.id !== meId)!

  const state = useMemo(() => withPending(server, meId, pending), [server, meId, pending])
  const me = state.players[meId]
  const them = state.players[friend.id]

  // Synchro : toutes les 5 s quand l'onglet est visible, et dès qu'on revient dessus.
  const refresh = useCallback(() => {
    fetchState().then(setServer, () => { /* on garde le dernier état connu */ })
  }, [])
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') refresh() }, POLL_MS)
    const onVis = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis) }
  }, [refresh])

  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ remaining })) } catch { /* ignore */ }
  }, [remaining])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const commit = async (kind: 'weapon' | 'mastery', id: string, level: number) => {
    const key = `${kind}:${id}`
    setPending((p) => ({ ...p, [key]: level }))
    try {
      await save(session, kind, id, level)
      setServer((s) => withPending(s, meId, { [key]: level }))
    } catch (e) {
      setToast(e instanceof ApiError ? e.message : 'Pas enregistré. Réessaie.')
      if (e instanceof ApiError && e.status === 401) onSignOut()
    } finally {
      setPending((p) => {
        if (p[key] !== level) return p
        const { [key]: _drop, ...rest } = p
        return rest
      })
    }
  }

  const tapTier = (weaponId: string, tier: number) => {
    const current = levelOf(me.progress, weaponId)
    commit('weapon', weaponId, current === tier ? tier - 1 : tier)
  }

  const masteryOpen = counts(me.progress).divergence

  return (
    <div className="app">
      <header className="top">
        <span className="wordmark">33K</span>
        <button className="link" onClick={onSignOut} title="Changer de joueur">{meName}</button>
      </header>

      <section className="board" aria-label="Progression">
        <Summary name={meName} state={me} />
        <Summary name={friend.name} state={them} small />
      </section>

      <label className="switch">
        <input type="checkbox" checked={remaining} onChange={(e) => setRemaining(e.target.checked)} />
        <span>Masquer ce qui est fait</span>
      </label>

      <main>
        {CLASSES.map((c) => (
          <ClassSection key={c.id} cls={c} me={me.progress} remaining={remaining} onTap={tapTier} />
        ))}

        <section className="cls">
          <header className="cls-head">
            <h2>Mastery</h2>
          </header>
          {!masteryOpen && <p className="challenge">S'ouvrent avec Harmonic Break sur les 33 armes.</p>}
          {MASTERY.map((m) => {
            const done = Boolean(me.mastery[m.id])
            return (
              <div key={m.id} className="row">
                <div className="row-name">
                  <span>{m.name}</span>
                  <small>{m.mode}, {m.challenge}</small>
                </div>
                <button
                  className={`tier t3 ${done ? 'on' : ''}`}
                  aria-pressed={done}
                  aria-label={`${m.name} : ${done ? 'fait' : 'pas fait'}`}
                  onClick={() => commit('mastery', m.id, done ? 0 : 1)}
                >
                  ✓
                </button>
              </div>
            )
          })}
        </section>
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}

function Summary({ name, state, small = false }: { name: string; state: PlayerState; small?: boolean }) {
  const stage = globalStage(state.progress)
  const c = counts(state.progress)
  const done = stage === 4 ? 33 : [0, c.gold, c.platinum, c.harmonic][stage]
  return (
    <div className={`sum ${small ? 'small' : ''}`}>
      <div className="sum-head">
        <span className="pname">{name}</span>
        <span className={`sum-count t${Math.min(stage, 3)}`}>
          <b>{done}</b>/33 {stage < 4 ? TIER_NAME[stage] : 'Divergence'}
        </span>
      </div>
      <div className="cells" aria-hidden="true">
        {CLASSES.flatMap((cls) => cls.weapons).map((w) => (
          <i key={w.id} className={`l${levelOf(state.progress, w.id)}`} />
        ))}
      </div>
    </div>
  )
}

function ClassSection({ cls, me, remaining, onTap }: {
  cls: WeaponClass
  me: Progress
  remaining: boolean
  onTap: (weaponId: string, tier: number) => void
}) {
  const stage = classStage(cls, me)
  const total = cls.weapons.length
  const visible = remaining ? cls.weapons.filter((w) => levelOf(me, w.id) < stage) : cls.weapons
  const ch = stage < 4 ? [cls.gold, cls.platinum, cls.harmonic][stage - 1] : null

  return (
    <section className="cls">
      <header className="cls-head">
        <h2>{cls.name}</h2>
        <span className={`stage t${Math.min(stage, 3)} ${stage === 4 ? 'done' : ''}`}>
          {stage === 4 ? 'Terminé' : `${TIER_NAME[stage]} ${classCount(cls, me, stage)}/${total}`}
        </span>
      </header>
      {ch && <p className="challenge">{ch.mp} en MP, {ch.dmz} en DMZ</p>}

      {visible.map((w) => {
        const lvl = levelOf(me, w.id)
        return (
          <div key={w.id} className="row">
            <div className="row-name"><span>{w.name}</span></div>
            <div className="tiers" role="group" aria-label={`${w.name}, ${TIER_NAME[lvl] || 'rien'}`}>
              {TIERS.map((t) => (
                <button
                  key={t.key}
                  className={`tier t${t.level} ${lvl >= t.level ? 'on' : ''}`}
                  aria-pressed={lvl >= t.level}
                  aria-label={`${t.name}${lvl === t.level ? ' (retirer)' : ''}`}
                  onClick={() => onTap(w.id, t.level)}
                >
                  {t.short}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}
