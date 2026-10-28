import type { PlayerId } from '../data/weapons'

export interface PlayerState {
  progress: Record<string, number>
  mastery: Record<string, number>
  hasPin: boolean
}
export type AppState = { players: Record<PlayerId, PlayerState> }

export interface Session {
  player: PlayerId
  pin: string
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json' } })
  } catch {
    throw new ApiError(0, 'Pas de connexion. Vérifie ton réseau.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Erreur serveur.')
  return data as T
}

export const fetchState = () => call<AppState>('/api/state')

export const login = (s: Session) =>
  call<{ ok: true; created: boolean }>('/api/auth', { method: 'POST', body: JSON.stringify(s) })

export const save = (s: Session, kind: 'weapon' | 'mastery', id: string, level: number) =>
  call<{ ok: true }>('/api/progress', {
    method: 'POST',
    body: JSON.stringify({ ...s, kind, id, level }),
  })

const SESSION_KEY = '33k:session'
export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}
export function storeSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* stockage indisponible : la session reste en mémoire */
  }
}
