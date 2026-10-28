import { CLASSES, TOTAL, WEAPONS, type WeaponClass } from '../data/weapons'

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

/** Platinum s'ouvre sur une classe quand toutes ses armes sont Gold. */
export const platinumOpen = (c: WeaponClass, p: Progress) => classCount(c, p, 1) === c.weapons.length

/** Premier palier pas encore terminé sur les 33 armes : c'est l'objectif par défaut. */
export function currentObjective(p: Progress): 1 | 2 | 3 {
  const c = counts(p)
  if (c.gold < TOTAL) return 1
  if (c.platinum < TOTAL) return 2
  return 3
}

/** Ordre fixe des armes, pour la barre de 33 segments. */
export const ORDERED = CLASSES.flatMap((c) => c.weapons)
