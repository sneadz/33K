import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CLASSES, MASTERY, PLAYERS, TIERS, type WeaponClass } from '../data/weapons'
import { SPECIALS } from '../data/specials'
import { ApiError, fetchState, save, type AppState, type PlayerState, type Session } from '../lib/api'
import { classCount, classStage, counts, globalStage, levelOf, type Progress } from '../lib/rules'

const POLL_MS = 5000
const DESKTOP_QUERY = '(min-width: 1100px) and (pointer: fine)'

/** Vue ordi : écran large + souris. Téléphone et tablette gardent la vue mobile. */
function useDesktop() {
  const get = () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches
  const [desktop, setDesktop] = useState(get)
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY)
    const on = () => setDesktop(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return desktop
}
const TIER_NAME = ['', 'Gold', 'Platinum', 'Harmonic Break', 'Terminé']
const PREFS_KEY = '33k:prefs'

type Pending = Record<string, number> // "weapon:han-86" -> niveau en cours d'envoi

type Prefs = { remaining: boolean; team: boolean }
const DEFAULT_PREFS: Prefs = { remaining: true, team: false }
function readPrefs(): Prefs {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') } } catch { return DEFAULT_PREFS }
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
  const [teamOpen, setTeamOpen] = useState(readPrefs().team)
  const [filter, setFilter] = useState<string>('all') // 'all' | id de classe
  const pick = (id: string) => setFilter((f) => (f === id ? 'all' : id))
  const pendingRef = useRef(pending)
  pendingRef.current = pending

  const meId = session.player
  const meName = PLAYERS.find((p) => p.id === meId)!.name

  const state = useMemo(() => withPending(server, meId, pending), [server, meId, pending])
  const me = state.players[meId]

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
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ remaining, team: teamOpen })) } catch { /* ignore */ }
  }, [remaining, teamOpen])

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
  const desktop = useDesktop()
  const [detail, setDetail] = useState(
    () => (CLASSES.find((c) => classStage(c, initial.players[meId].progress) < 4) ?? CLASSES[0]).id,
  )

  const toggleTeam = () => setTeamOpen((o) => !o)
  const board = (
    <section
      className="board"
      role="button"
      tabIndex={0}
      aria-expanded={teamOpen}
      aria-label={teamOpen ? "Replier l'équipe" : "Déplier l'équipe"}
      onClick={toggleTeam}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTeam() }
      }}
    >
      <MyLine name={meName} state={me} />
      <span className="team-toggle" aria-hidden="true">
        Équipe <span>{teamOpen ? '▴' : '▾'}</span>
      </span>
      {teamOpen && <TeamRacks meId={meId} state={state} />}
    </section>
  )

  const catGrid = (selected: string, onPick: (id: string) => void) => (
    <nav className="cats" aria-label="Catégories">
      {CLASSES.map((c) => {
        const stage = classStage(c, me.progress)
        return (
          <button key={c.id} className="cat" aria-pressed={selected === c.id} onClick={() => onPick(c.id)}>
            <span>{c.short}</span>
            <small className={stage === 4 ? 'done' : `t${stage}`}>
              {stage === 4 ? '✓' : `${classCount(c, me.progress, stage)}/${c.weapons.length}`}
            </small>
          </button>
        )
      })}
    </nav>
  )

  const mastery = (
    <section className="cls">
      <header className="cls-head">
        <h2 title={masteryOpen ? undefined : "S'ouvrent avec Harmonic Break sur les 33 armes."}>Mastery</h2>
      </header>
      {!masteryOpen && !desktop && <p className="challenge">S'ouvrent avec Harmonic Break sur les 33 armes.</p>}
      {MASTERY.map((m) => {
        const done = Boolean(me.mastery[m.id])
        return (
          <div key={m.id} className="row" title={desktop ? `${m.mode}, ${m.challenge}` : undefined}>
            <div className="row-name">
              <span>{m.name}</span>
              {!desktop && <small>{m.mode}, {m.challenge}</small>}
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
  )

  if (desktop) {
    const cls = CLASSES.find((c) => c.id === detail)!
    return (
      <div className="app desk">
        <aside className="side">
          <header className="top">
            <span className="wordmark">33K</span>
            <button className="link" onClick={onSignOut} title="Changer de joueur">{meName}</button>
          </header>
          <section className="board static" aria-label="Progression">
            <MyLine name={meName} state={me} />
            <TeamRacks meId={meId} state={state} />
          </section>
          <ClassDetail cls={cls} me={me.progress} />
        </aside>
        <div className="desk-main">
          <main className="desk-cols">
            {CLASSES.map((c) => (
              <ClassSection key={c.id} cls={c} me={me.progress} remaining={false} onTap={tapTier} compact selected={c.id === detail} />
            ))}
            {mastery}
          </main>
          {catGrid(detail, setDetail)}
        </div>
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    )
  }

  return (
    <div className="app">
      <header className="top">
        <span className="wordmark">33K</span>
        <button className="link" onClick={onSignOut} title="Changer de joueur">{meName}</button>
      </header>

      {board}

      {catGrid(filter, pick)}

      <label className="switch">
        <input type="checkbox" checked={remaining} onChange={(e) => setRemaining(e.target.checked)} />
        <span>Masquer ce qui est fait</span>
      </label>

      <main>
        {CLASSES.filter((c) => filter === 'all' || filter === c.id).map((c) => (
          <ClassSection key={c.id} cls={c} me={me.progress} remaining={remaining} onTap={tapTier} />
        ))}

        {filter === 'all' && mastery}
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}

function stageCount(p: Progress) {
  const stage = globalStage(p)
  const c = counts(p)
  return { stage, done: stage === 4 ? 33 : [0, c.gold, c.platinum, c.harmonic][stage] }
}

/** 33 carrés identiques sur une ligne, avec un petit espace entre les catégories. */
const RACK_COLUMNS = CLASSES.map((c) => `repeat(${c.weapons.length}, 1fr)`).join(' var(--cat-gap) ')

function Racks({ progress, big = false }: { progress: Progress; big?: boolean }) {
  return (
    <div className={`racks ${big ? 'big' : ''}`} style={{ gridTemplateColumns: RACK_COLUMNS }} aria-hidden="true">
      {CLASSES.map((c, ci) => [
        ci > 0 && <b key={`sep-${c.id}`} />,
        ...c.weapons.map((w) => <i key={w.id} className={`l${levelOf(progress, w.id)}`} />),
      ])}
    </div>
  )
}

function MyLine({ name, state }: { name: string; state: PlayerState }) {
  const { stage, done } = stageCount(state.progress)
  return (
    <div className="me">
      <div className="me-head">
        <span className="pname">{name}</span>
        <span className="me-count">
          <b>{done}</b>/33 {stage < 4 ? TIER_NAME[stage] : 'Divergence'}
        </span>
      </div>
      <Racks progress={state.progress} big />
    </div>
  )
}

function TeamRacks({ meId, state }: { meId: string; state: AppState }) {
  return (
    <div className="team">
      {PLAYERS.filter((p) => p.id !== meId).map((p) => {
        const { stage, done } = stageCount(state.players[p.id].progress)
        return (
          <div key={p.id} className="mate">
            <div className="mate-head">
              <span>{p.name}</span>
              <span>{done}/33 {stage < 4 ? TIER_NAME[stage] : 'Divergence'}</span>
            </div>
            <Racks progress={state.players[p.id].progress} />
          </div>
        )
      })}
    </div>
  )
}

function ClassSection({ cls, me, remaining, onTap, compact = false, selected = false }: {
  cls: WeaponClass
  me: Progress
  remaining: boolean
  onTap: (weaponId: string, tier: number) => void
  compact?: boolean
  selected?: boolean
}) {
  const stage = classStage(cls, me)
  const total = cls.weapons.length
  const visible = remaining ? cls.weapons.filter((w) => levelOf(me, w.id) < stage) : cls.weapons
  const ch = stage < 4 ? [cls.gold, cls.platinum, cls.harmonic][stage - 1] : null

  return (
    <section className={`cls ${selected ? 'sel' : ''}`}>
      <header className="cls-head">
        <h2 title={compact && ch ? `${ch.mp} en MP, ${ch.dmz} en DMZ` : undefined}>{cls.name}</h2>
        <span className={`stage t${Math.min(stage, 3)} ${stage === 4 ? 'done' : ''}`}>
          {stage === 4 ? 'Terminé' : `${TIER_NAME[stage]} ${classCount(cls, me, stage)}/${total}`}
        </span>
      </header>
      {ch && !compact && <p className="challenge">{ch.mp} en MP, {ch.dmz} en DMZ</p>}

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

/** Fiche complète d'une catégorie (vue ordi) : les 3 camos spéciaux de chaque arme, à finir avant le Gold. */
function ClassDetail({ cls, me }: { cls: WeaponClass; me: Progress }) {
  const stage = classStage(cls, me)
  const ch = stage < 4 ? [cls.gold, cls.platinum, cls.harmonic][stage - 1] : null
  return (
    <section className="detail" aria-label={`Défis ${cls.name}`}>
      <header className="detail-head">
        <h2>{cls.name}</h2>
        {ch && (
          <p>
            <b className={`t${stage}`}>{TIER_NAME[stage]} :</b> {ch.mp} en MP, {ch.dmz} en DMZ
          </p>
        )}
      </header>
      <p className="detail-sub">Camos spéciaux à finir avant le Gold (défis MP)</p>
      <div className="detail-grid">
        {cls.weapons.map((w) => {
          const gold = levelOf(me, w.id) >= 1
          return (
            <div key={w.id} className={`dw ${gold ? 'gold' : ''}`}>
              <h3>{w.name}{gold && <span className="dw-ok">Gold</span>}</h3>
              <ul>
                {(SPECIALS[w.id] ?? []).map((sp) => (
                  <li key={sp.name}><span>{sp.name}</span>{sp.mp}</li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
