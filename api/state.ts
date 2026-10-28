import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getState } from './_core'
import { send } from './_redis'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET uniquement.' })
  return send(res, getState)
}
