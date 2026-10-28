import type { VercelRequest, VercelResponse } from '@vercel/node'
import { auth } from './_core.js'
import { send } from './_redis.js'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST uniquement.' })
  return send(res, (store) => auth(store, req.body))
}
