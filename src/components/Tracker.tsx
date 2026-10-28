import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { CLASSES, MASTERY, PLAYERS, TIERS, TOTAL, type WeaponClass } from '../data/weapons'
import { ApiError, fetchState, save, type AppState, type PlayerState, type Session } from '../lib/api'
import { classCount, counts, currentObjective, levelOf, ORDERED, platinumOpen, type Progress } from '../lib/rules'

const POLL_MS = 5000
const TIER_NAME = ['Rien', 'Gold', 'Platinum', 'Harmonic Break']
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
  const friend = PLAYERS.find((p) => p.id !== meId)!
  const meName = PLAYERS.find((p) => p.id === meId)!.name

  const state = useMemo(() => withPending(server, meId, pending), [server, meId, pending])
  const me = state.players[meId]
  const them = state.players[friend.id]

  const [objective, setObjective] = useState<1 | 2 | 3>(() => currentObjective(initial.players[meId].progress))

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

  return (
    <div className="app">
      <header className="top">
        <span className="wordmark">33K</span>
        <button className="link" onClick={onSignOut} title="Changer de joueur">
          {meName}
        </button>
      </header>

      <section className="board" aria-label="Progression">
        <PlayerLine name={meName} state={me} mine />
        <PlayerLine name={friend.name} state={them} />
      </section>

      <div className="controls">
        <div className="seg" role="radiogroup" aria-label="Objectif">
          {TIERS.map((t) => (
            <button
              key={t.key}
              role="radio"
              aria-checked={objective === t.level}
              className={`seg-btn t${t.level}`}
              onClick={() => setObjective(t.level)}
            >
              {t.name}
            </button>
          ))}
        </div>
        <label className="switch">
          <input type="checkbox" checked={remaining} onChange={(e) => setRemaining(e.target.checked)} />
          <span>Reste à faire</span>
        </label>
      </div>

      <nav className="jump" aria-label="Classes">
        {CLASSES.map((c) => {
          const done = classCount(c, me.progress, objective) === c.weapons.length
          return (
            <a key={c.id} href={`#${c.id}`} className={done ? 'done' : ''}>
              {c.short}
              <small>{classCount(c, me.progress, objective)}/{c.weapons.length}</small>
            </a>
          )
        })}
        <a href="#mastery">Mastery</a>
      </nav>

      <main>
        {CLASSES.map((c) => (
          <ClassSection
            key={c.id}
            cls={c}
            me={me.progress}
            them={them.progress}
            friendName={friend.name}
            objective={objective}
            remaining={remaining}
            onTap={tapTier}
          />
        ))}

        <section id="mastery" className="cls">
          <header className="cls-head">
            <h2>Camos mastery</h2>
            <p className="cls-note">
              {counts(me.progress).harmonic >= TOTAL
                ? 'Ouverts : tu as Harmonic Break sur les 33 armes.'
                : `S'ouvrent avec Harmonic Break sur les 33 armes (${counts(me.progress).harmonic}/33).`}
            </p>
          </header>
          {(['MP', 'DMZ'] as const).map((mode) => (
            <div key={mode} className="mastery-group">
              <h3>{mode === 'MP' ? 'Multijoueur' : 'DMZ'}</h3>
              {MASTERY.filter((m) => m.mode === mode).map((m) => {
                const mine = Boolean(me.mastery[m.id])
                const theirs = Boolean(them.mastery[m.id])
                return (
                  <div key={m.id} className="row">
                    <div className="row-name">
                      <span>{m.name}</span>
                      <small>{m.challenge}</small>
                    </div>
                    <button
                      className="check"
                      aria-pressed={mine}
                      aria-label={`${m.name} : ${mine ? 'fait' : 'pas fait'}`}
                      onClick={() => commit('mastery', m.id, mine ? 0 : 1)}
                    >
                      {mine ? '✓' : ''}
                    </button>
                    <span className={`friend ${theirs ? 'f-on' : ''}`} title={`${friend.name} : ${theirs ? 'fait' : 'pas fait'}`}>
                      {theirs ? '✓' : '–'}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </section>
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}

function PlayerLine({ name, state, mine = false }: { name: string; state: PlayerState; mine?: boolean }) {
  const c = counts(state.progress)
  const masteryDone = MASTERY.filter((m) => state.mastery[m.id]).length
  return (
    <div className={`pline ${mine ? 'mine' : ''}`}>
      <div className="pline-head">
        <span className="pname">{name}</span>
        <span className="gold-count">
          <b>{c.gold}</b>/33
        </span>
      </div>
      <div className="ingot" aria-hidden="true">
        {CLASSES.map((cls) => (
          <span key={cls.id} className="ingot-group" style={{ '--n': cls.weapons.length } as CSSProperties}>
            {cls.weapons.map((w) => (
              <i key={w.id} className={`seg-${levelOf(state.progress, w.id)}`} />
            ))}
          </span>
        ))}
      </div>
      <p className="pline-stats">
        <span className="st t2">Platinum {c.platinum}</span>
        <span className="st t3">Harmonic {c.harmonic}</span>
        <span className={`st t4 ${c.divergence ? 'on' : ''}`}>Divergence {c.divergence ? 'débloqué' : 'verrouillé'}</span>
        <span className="st">Mastery {masteryDone}/6</span>
      </p>
      <span className="sr-only">
        {name} : {c.gold} Gold, {c.platinum} Platinum, {c.harmonic} Harmonic Break sur {ORDERED.length} armes.
      </span>
    </div>
  )
}

function ClassSection(props: {
  cls: WeaponClass
  me: Progress
  them: Progress
  friendName: string
  objective: number
  remaining: boolean
  onTap: (weaponId: string, tier: number) => void
}) {
  const { cls, me, them, friendName, objective, remaining, onTap } = props
  const total = cls.weapons.length
  const mineDone = classCount(cls, me, objective)
  const theirsDone = classCount(cls, them, objective)
  const platOpen = platinumOpen(cls, me)
  const visible = remaining ? cls.weapons.filter((w) => levelOf(me, w.id) < objective) : cls.weapons
  const ch = [cls.gold, cls.platinum, cls.harmonic]

  return (
    <section id={cls.id} className="cls">
      <header className="cls-head">
        <h2>{cls.name}</h2>
        <p className="cls-score">
          <span className="you">Toi {mineDone}/{total}</span>
          <span className="them">{friendName} {theirsDone}/{total}</span>
        </p>
        <p className="challenge">
          <b className={`t${objective}`}>{TIER_NAME[objective]} :</b> {ch[objective - 1].mp} en MP, ou {ch[objective - 1].dmz} en DMZ
        </p>
        {platOpen ? (
          <p className="cls-note ok">Platinum ouvert sur cette classe.</p>
        ) : (
          <p className="cls-note">Platinum s'ouvre quand les {total} armes sont Gold ({classCount(cls, me, 1)}/{total}).</p>
        )}
      </header>

      {visible.length === 0 ? (
        <p className="cls-done">Classe terminée en {TIER_NAME[objective]}.</p>
      ) : (
        visible.map((w) => {
          const lvl = levelOf(me, w.id)
          const fl = levelOf(them, w.id)
          return (
            <div key={w.id} className="row">
              <div className="row-name">
                <span>{w.name}</span>
              </div>
              <div className="tiers" role="group" aria-label={`${w.name}, niveau ${TIER_NAME[lvl]}`}>
                {TIERS.map((t) => (
                  <button
                    key={t.key}
                    className={`tier t${t.level} ${lvl >= t.level ? 'on' : ''} ${t.level === 2 && !platOpen && lvl < 2 ? 'locked' : ''}`}
                    aria-pressed={lvl >= t.level}
                    aria-label={`${t.name}${lvl === t.level ? ' (retirer)' : ''}`}
                    title={t.level === 2 && !platOpen ? 'Platinum pas encore ouvert sur cette classe' : t.name}
                    onClick={() => onTap(w.id, t.level)}
                  >
                    {t.short}
                  </button>
                ))}
              </div>
              <span className={`friend f${fl}`} title={`${friendName} : ${TIER_NAME[fl]}`}>
                {fl ? TIERS[fl - 1].short : '–'}
              </span>
            </div>
          )
        })
      )}
    </section>
  )
}
