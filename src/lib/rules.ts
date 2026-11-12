import { WEAPONS, TOTAL, baseWeapons, type WeaponClass } from '../data/weapons'

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

/**
 * Nombre d'armes de la catégorie au moins à ce palier, armes de saison comprises,
 * plafonné au nombre d'armes de base : c'est ce nombre qui ouvre le palier suivant.
 * Ex. SMG : 5 armes en Gold (n'importe lesquelles) ouvrent le Platinum.
 */
export const classCount = (c: WeaponClass, p: Progress, level: number) =>
  Math.min(classSize(c), c.weapons.filter((w) => levelOf(p, w.id) >= level).length)

/** Nombre d'armes à avoir au palier pour ouvrir le suivant : le nombre d'armes de base. */
export const classSize = (c: WeaponClass) => baseWeapons(c).length

/**
 * Palier en cours d'une classe : Gold tant qu'il manque des armes en Gold,
 * puis Platinum, puis Harmonic Break (seuil = nombre d'armes de base).
 * 4 = classe terminée.
 */
export function classStage(c: WeaponClass, p: Progress): 1 | 2 | 3 | 4 {
  for (const level of [1, 2, 3] as const) {
    if (classCount(c, p, level) < classSize(c)) return level
  }
  return 4
}

/** Palier en cours vers Divergence : 33 armes au palier, armes de saison comprises. */
export function globalStage(p: Progress): 1 | 2 | 3 | 4 {
  const c = counts(p)
  if (c.gold < TOTAL) return 1
  if (c.platinum < TOTAL) return 2
  if (c.harmonic < TOTAL) return 3
  return 4
}
