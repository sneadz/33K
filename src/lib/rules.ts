import { WEAPONS, TOTAL, type WeaponClass } from '../data/weapons'

export type Progress = Record<string, number>

export const levelOf = (p: Progress, id: string) => p[id] ?? 0

export function counts(p: Progress) {
  let gold = 0, platinum = 0, harmonic = 0
  for (const w of WEAPONS) {
    const l = levelOf(p, w.id)
    if (l >= 1) gold++
    if (l >= 2) platinum++
    if (l >= 3) harmonic++
  }
  return { gold, platinum, harmonic, divergence: harmonic >= TOTAL }
}

export const classCount = (c: WeaponClass, p: Progress, level: number) =>
  c.weapons.filter((w) => levelOf(p, w.id) >= level).length

/**
 * Palier en cours d'une classe : Gold tant qu'une arme n'est pas Gold,
 * puis Platinum (ouvert quand toute la classe est Gold), puis Harmonic Break.
 * 4 = classe terminée.
 */
export function classStage(c: WeaponClass, p: Progress): 1 | 2 | 3 | 4 {
  for (const level of [1, 2, 3] as const) {
    if (classCount(c, p, level) < c.weapons.length) return level
  }
  return 4
}

/** Palier en cours sur l'ensemble des 33 armes, pour le résumé. */
export function globalStage(p: Progress): 1 | 2 | 3 | 4 {
  const c = counts(p)
  if (c.gold < TOTAL) return 1
  if (c.platinum < TOTAL) return 2
  if (c.harmonic < TOTAL) return 3
  return 4
}
