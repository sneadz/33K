import { Redis } from '@upstash/redis'
import type { VercelResponse } from '@vercel/node'
import type { Result, Store } from './_core'

// L'intégration Upstash de la Marketplace Vercel injecte KV_REST_API_URL / KV_REST_API_TOKEN.
export function redisStore(): Store {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('Base Upstash non connectée (KV_REST_API_URL manquant).')
  const r = new Redis({ url, token, automaticDeserialization: false })
  const toNumbers = (o: Record<string, unknown> | null) =>
    Object.fromEntries(Object.entries(o ?? {}).map(([f, v]) => [f, Number(v)]))
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
