// Logique API indépendante du stockage : utilisée par les fonctions Vercel (Redis)
// et par le serveur de dev Vite (mémoire).
import { createHash } from 'crypto'
import { MASTERY_IDS, PLAYERS, PLAYER_IDS, WEAPON_IDS } from '../src/data/weapons'

export interface Store {
  get(key: string): Promise<string | null>
  setNx(key: string, value: string): Promise<boolean>
  del(key: string): Promise<void>
  hgetall(key: string): Promise<Record<string, number>>
  hset(key: string, field: string, value: number): Promise<void>
  hdel(key: string, field: string): Promise<void>
  incrWithTtl(key: string, ttlSeconds: number): Promise<number>
}

export interface Result {
  status: number
  body: unknown
}

const k = {
  pin: (p: string) => `33k:pin:${p}`,
  fails: (p: string) => `33k:fails:${p}`,
  progress: (p: string) => `33k:progress:${p}`,
  mastery: (p: string) => `33k:mastery:${p}`,
}

const MAX_FAILS = 8
const LOCK_SECONDS = 15 * 60

const hashPin = (player: string, pin: string) =>
  createHash('sha256').update(`33k:${player}:${pin}`).digest('hex')

type PinCheck = 'ok' | 'created' | 'bad' | 'locked' | 'missing'

async function checkPin(store: Store, player: string, pin: string, allowCreate: boolean): Promise<PinCheck> {
  const fails = Number((await store.get(k.fails(player))) ?? 0)
  if (fails >= MAX_FAILS) return 'locked'
  const hash = hashPin(player, pin)
  let stored = await store.get(k.pin(player))
  if (!stored) {
    if (!allowCreate) return 'missing'
    if (await store.setNx(k.pin(player), hash)) return 'created'
    stored = await store.get(k.pin(player))
  }
  if (stored === hash) {
    if (fails) await store.del(k.fails(player))
    return 'ok'
  }
  await store.incrWithTtl(k.fails(player), LOCK_SECONDS)
  return 'bad'
}

function parseAuth(body: unknown): { player: string; pin: string } | null {
  const b = (body ?? {}) as Record<string, unknown>
  if (typeof b.player !== 'string' || !PLAYER_IDS.has(b.player)) return null
  if (typeof b.pin !== 'string' || !/^\d{4}$/.test(b.pin)) return null
  return { player: b.player, pin: b.pin }
}

const pinError = (r: PinCheck): Result | null => {
  if (r === 'ok' || r === 'created') return null
  if (r === 'locked') return { status: 429, body: { error: 'Trop d’essais. Réessaie dans 15 minutes.' } }
  if (r === 'missing') return { status: 401, body: { error: 'Ce joueur n’a pas encore de code.' } }
  return { status: 401, body: { error: 'Code incorrect.' } }
}

export async function getState(store: Store): Promise<Result> {
  const entries = await Promise.all(
    PLAYERS.map(async (p) => {
      const [progress, mastery, pin] = await Promise.all([
        store.hgetall(k.progress(p.id)),
        store.hgetall(k.mastery(p.id)),
        store.get(k.pin(p.id)),
      ])
      return [p.id, { progress, mastery, hasPin: Boolean(pin) }] as const
    }),
  )
  return { status: 200, body: { players: Object.fromEntries(entries) } }
}

export async function auth(store: Store, body: unknown): Promise<Result> {
  const a = parseAuth(body)
  if (!a) return { status: 400, body: { error: 'Choisis un joueur et un code à 4 chiffres.' } }
  const r = await checkPin(store, a.player, a.pin, true)
  return pinError(r) ?? { status: 200, body: { ok: true, created: r === 'created' } }
}

export async function setProgress(store: Store, body: unknown): Promise<Result> {
  const a = parseAuth(body)
  if (!a) return { status: 400, body: { error: 'Session invalide.' } }
  const b = body as Record<string, unknown>
  const { kind, id, level } = b
  if (typeof id !== 'string' || typeof level !== 'number' || !Number.isInteger(level)) {
    return { status: 400, body: { error: 'Requête invalide.' } }
  }
  let key: string
  if (kind === 'weapon' && WEAPON_IDS.has(id) && level >= 0 && level <= 3) key = k.progress(a.player)
  else if (kind === 'mastery' && MASTERY_IDS.has(id) && (level === 0 || level === 1)) key = k.mastery(a.player)
  else return { status: 400, body: { error: 'Requête invalide.' } }

  const err = pinError(await checkPin(store, a.player, a.pin, false))
  if (err) return err

  if (level === 0) await store.hdel(key, id)
  else await store.hset(key, id, level)
  return { status: 200, body: { ok: true } }
}

export function memoryStore(): Store {
  const kv = new Map<string, string>()
  const h = new Map<string, Map<string, number>>()
  return {
    async get(key) { return kv.get(key) ?? null },
    async setNx(key, value) { if (kv.has(key)) return false; kv.set(key, value); return true },
    async del(key) { kv.delete(key) },
    async hgetall(key) { return Object.fromEntries(h.get(key) ?? []) },
    async hset(key, field, value) { if (!h.has(key)) h.set(key, new Map()); h.get(key)!.set(field, value) },
    async hdel(key, field) { h.get(key)?.delete(field) },
    async incrWithTtl(key) { const n = Number(kv.get(key) ?? 0) + 1; kv.set(key, String(n)); return n },
  }
}
