import { Redis } from '@upstash/redis'
import type { VercelResponse } from '@vercel/node'
import type { Result, Store } from './_core.js'

// L'intégration Upstash de la Marketplace Vercel injecte KV_REST_API_URL / KV_REST_API_TOKEN.
export function redisStore(): Store {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('Base Upstash non connectée (KV_REST_API_URL manquant).')
  const r = new Redis({ url, token, automaticDeserialization: false })
  // Sans désérialisation auto, HGETALL renvoie la liste brute [champ, valeur, champ, valeur…].
  const toNumbers = (raw: unknown): Record<string, number> => {
    const out: Record<string, number> = {}
    if (Array.isArray(raw)) {
      for (let i = 0; i + 1 < raw.length; i += 2) out[String(raw[i])] = Number(raw[i + 1])
    } else if (raw && typeof raw === 'object') {
      for (const [f, v] of Object.entries(raw)) out[f] = Number(v)
    }
    return out
  }
  return {
    async get(key) { return (await r.get<string>(key)) ?? null },
    async setNx(key, value) { return (await r.set(key, value, { nx: true })) === 'OK' },
    async del(key) { await r.del(key) },
    async hgetall(key) { return toNumbers(await r.hgetall(key)) },
    async hset(key, field, value) { await r.hset(key, { [field]: value }) },
    async hdel(key, field) { await r.hdel(key, field) },
    async incrWithTtl(key, ttl) {
      const n = await r.incr(key)
      if (n === 1) await r.expire(key, ttl)
      return n
    },
  }
}

export async function send(res: VercelResponse, run: (store: Store) => Promise<Result>) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    const { status, body } = await run(redisStore())
    res.status(status).json(body)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur.' })
  }
}
