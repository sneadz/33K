// Catalogue statique MW4 (roster de lancement : 33 armes, 9 classes).
// Une seule piste de camos par arme : chaque palier se valide via le défi MP OU le défi DMZ.

export type Tier = 0 | 1 | 2 | 3 // 0 rien, 1 Gold, 2 Platinum, 3 Harmonic Break

export const TIERS = [
  { level: 1, key: 'gold', name: 'Gold', short: 'G' },
  { level: 2, key: 'platinum', name: 'Platinum', short: 'P' },
  { level: 3, key: 'harmonic', name: 'Harmonic Break', short: 'H' },
] as const

export interface Challenge {
  mp: string
  dmz: string
}

export interface WeaponClass {
  id: string
  name: string
  short: string
  gold: Challenge
  platinum: Challenge
  harmonic: Challenge
  weapons: { id: string; name: string }[]
}

const GOLD: Challenge = { mp: '15 kills en un match', dmz: '100 kills en un déploiement' }

const w = (name: string) => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  name,
})

export const CLASSES: WeaponClass[] = [
  {
    id: 'ar',
    name: "Fusils d'assaut",
    short: 'AR',
    gold: GOLD,
    platinum: { mp: '50 headshots', dmz: '100 headshots' },
    harmonic: { mp: '25 doublés', dmz: '50 doublés' },
    weapons: ['Han 86', 'M4', 'Hyeon Burst', 'Patriot XMR', 'Kastov 762', 'Oden', 'Axion', 'Cronen Squall'].map(w),
  },
  {
    id: 'smg',
    name: 'Mitraillettes',
    short: 'SMG',
    gold: GOLD,
    platinum: { mp: '25 kills de dos', dmz: '75 kills de dos' },
    harmonic: { mp: '50 kills sans viser', dmz: '100 kills sans viser' },
    weapons: ['ISO Nightshade', 'VEL 46', 'WZ.55 Striga', 'PPSh-41', 'X-58 Nyx'].map(w),
  },
  {
    id: 'shotgun',
    name: 'Fusils à pompe',
    short: 'Pompe',
    gold: GOLD,
    platinum: { mp: '50 kills sans viser', dmz: '125 kills sans viser' },
    harmonic: { mp: '2 kills sans recharger, 25 fois', dmz: '2 kills sans recharger, 50 fois' },
    weapons: ['Rezi 12', 'Warlord'].map(w),
  },
  {
    id: 'lmg',
    name: 'Mitrailleuses',
    short: 'LMG',
    gold: GOLD,
    platinum: { mp: '3 kills sans mourir, 15 fois', dmz: '3 kills sans dégâts, 50 fois' },
    harmonic: { mp: '2 kills sans lâcher la détente, 25 fois', dmz: '2 kills sans lâcher la détente, 75 fois' },
    weapons: ['FiNN LMG', 'Type 73', 'APOC-338'].map(w),
  },
  {
    id: 'marksman',
    name: 'Fusils tactiques',
    short: 'DMR',
    gold: GOLD,
    platinum: { mp: '75 kills couché', dmz: '150 kills couché' },
    harmonic: { mp: '75 kills en un tir', dmz: '150 kills en un tir' },
    weapons: ['MAR-9', 'Oris 8.6', 'Mosin-Nagant'].map(w),
  },
  {
    id: 'sniper',
    name: 'Fusils de précision',
    short: 'Sniper',
    gold: GOLD,
    platinum: { mp: '75 kills couché', dmz: '150 kills couché' },
    harmonic: { mp: '75 kills en un tir', dmz: '150 kills en un tir' },
    weapons: ['KG-7 Vulcan', 'Astaroth .57', 'Signal 50'].map(w),
  },
  {
    id: 'pistol',
    name: 'Pistolets',
    short: 'Pistolet',
    gold: GOLD,
    platinum: { mp: '20 kills de dos', dmz: '75 kills de dos' },
    harmonic: { mp: '40 kills sans viser', dmz: '100 kills sans viser' },
    weapons: ['SANG 9mm', 'Krait P68', '.50 GS', 'Mojave .357'].map(w),
  },
  {
    id: 'launcher',
    name: 'Lanceurs',
    short: 'Lanceur',
    gold: { mp: '15 kills en un match', dmz: '50 kills en un déploiement' },
    platinum: { mp: '2 kills sans dégâts, 15 fois', dmz: '2 kills sans dégâts, 50 fois' },
    harmonic: { mp: '10 kills en un match, 7 fois', dmz: '10 kills en un match, 15 fois' },
    weapons: ['PILA', 'RPG-8', 'JOKR', 'PM-40 Anvil'].map(w),
  },
  {
    id: 'melee',
    name: 'Corps à corps',
    short: 'Mêlée',
    gold: GOLD,
    platinum: { mp: '3 kills sans mourir, 15 fois', dmz: '3 kills sans dégâts, 50 fois' },
    harmonic: { mp: '25 kills de dos', dmz: '75 kills de dos' },
    weapons: ['FSS Carbon Edge 1095'].map(w),
  },
]

export const WEAPONS = CLASSES.flatMap((c) => c.weapons.map((wp) => ({ ...wp, classId: c.id })))
export const WEAPON_IDS = new Set(WEAPONS.map((wp) => wp.id))
export const TOTAL = WEAPONS.length // 33

export const MASTERY = [
  { id: 'mercurial-drift', mode: 'MP', name: 'Mercurial Drift', challenge: '10 kills en un match, 250 fois' },
  { id: 'polyatomic-reforged', mode: 'MP', name: 'Polyatomic Reforged', challenge: '3 kills sans dégâts, 300 fois' },
  { id: 'orion-reforged', mode: 'MP', name: 'Orion Reforged', challenge: '5 kills sans mourir, 500 fois' },
  { id: 'chiral', mode: 'DMZ', name: 'Chiral', challenge: '2 500 kills d’ennemis tier 3+' },
  { id: 'ripple-tide', mode: 'DMZ', name: 'Ripple Tide', challenge: 'Exfil 2 plaques de LT en un déploiement, 50 fois' },
  { id: 'helio', mode: 'DMZ', name: 'Helio', challenge: '25 000 kills avec armes légendaires, opérateur niveau max' },
] as const
export const MASTERY_IDS = new Set<string>(MASTERY.map((m) => m.id))

export const PLAYERS = [
  { id: 'robin', name: 'Robin' },
  { id: 'joueur2', name: 'Joueur 2' },
] as const
export type PlayerId = (typeof PLAYERS)[number]['id']
export const PLAYER_IDS = new Set<string>(PLAYERS.map((p) => p.id))
