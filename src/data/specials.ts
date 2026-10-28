// Les 3 camos spéciaux de chaque arme (à finir avant le Gold), défis multijoueur.
// Source : Destructoid, recoupé avec CODMunity sur 6 armes.

export interface Special {
  name: string
  mp: string
}

const s = (...list: [string, string][]): Special[] => list.map(([name, mp]) => ({ name, mp }))

export const SPECIALS: Record<string, Special[]> = {
  // Fusils d'assaut
  'han-86': s(['Smoke', '20 kills en appui'], ['Stormwave', '50 kills avec silencieux'], ['Red', '3 kills sans mourir, 15 fois']),
  m4: s(['Myriad', '20 kills à bout portant'], ['Night Ops', '20 kills en appui'], ['Green', '25 kills de dos']),
  'hyeon-burst': s(['Ponderosa', '2 kills sans recharger, 10 fois'], ['Red Rain', '20 kills à longue distance'], ['Kitty Kaos', '100 kills avec silencieux']),
  'patriot-xmr': s(['Dune Sea', '20 kills sans viser'], ['Scorch', '50 kills avec silencieux'], ['Disperse', '30 kills à longue distance']),
  'kastov-762': s(['SAMNIM', '3 kills sans mourir'], ['Raster AUX', '20 kills à longue distance'], ['Yellow', '30 kills sans viser']),
  oden: s(['Dark Moss', '25 kills au lance-grenades Miri'], ['Shale', '2 kills sans recharger, 10 fois'], ['Hot Rod', '100 kills en visée']),
  axion: s(['Splinter Rock', '20 kills à longue distance'], ['Sunset Tropic', '25 kills au lance-grenades Miri'], ['Cyan', '2 kills sans recharger, 25 fois']),
  'cronen-squall': s(['Oni', '20 kills à bout portant'], ['Urban Smoke', '20 kills en appui'], ['Optical Reverb', '3 kills sans mourir, 15 fois']),

  // Mitraillettes
  'iso-nightshade': s(['Asphalt', '50 kills en visée'], ['Black Topo', '10 doublés'], ['Brown', '3 kills sans mourir, 15 fois']),
  'vel-46': s(['Jungle Shadow', '50 kills en visée'], ['Ghast', '20 kills couché'], ['Gunmetal', '20 headshots']),
  'wz-55-striga': s(['Stellation', '50 kills avec silencieux'], ['Rattlesnake', '20 kills en sautant'], ['Dark Tan', '40 kills à bout portant']),
  'ppsh-41': s(['Blackwell', '10 doublés'], ['Iron', '20 kills à longue distance'], ['Currents', '100 kills en visée']),
  'x-58-nyx': s(['Sniper Veil', '20 kills en mouvement'], ['Carbonated', '20 kills à longue distance'], ['Lime', '40 headshots']),

  // Fusils à pompe
  'rezi-12': s(['Struck Oil', '20 kills à bout portant'], ['Brushstroke', '10 kills à longue distance'], ['White Pine', '40 kills en sautant']),
  warlord: s(['Redshift', '20 kills en mouvement'], ['Corrupted Clay', '10 doublés'], ['Magma Ire', '50 kills couché']),

  // Mitrailleuses
  'finn-lmg': s(['Desert Tactics', '20 kills à bout portant'], ['Thunderhead', '30 kills à longue distance'], ['Green Tiger', '2 kills sans recharger, 10 fois']),
  'type-73': s(['Outcrop', '10 doublés'], ['Foxtrail', '40 headshots'], ['Ash Pine', '20 kills en appui']),
  'apoc-338': s(['Phantom Flux', '20 kills sans viser'], ['Mineral', '20 kills à longue distance'], ['Tiger Swipe', '100 kills couché']),

  // Fusils tactiques
  'mar-9': s(['Mangrove', '20 kills en appui'], ['Fungal Grid', '25 kills accroupi'], ['White', '30 kills à longue distance']),
  'oris-8-6': s(['Hibiscus', '10 kills en quickscope'], ['Fire Topo', '20 doublés'], ['Deep Space', '3 kills sans mourir, 15 fois']),
  'mosin-nagant': s(['Ice Sheer', '25 headshots'], ['Fractal Snow', '2 kills sans recharger, 10 fois'], ['Sticker Shock', '100 kills en concentration']),

  // Fusils de précision
  'kg-7-vulcan': s(['Treeline', '10 kills sans viser'], ['Spidersilk', '20 headshots'], ['Tension', '2 kills sans dégâts, 20 fois']),
  'astaroth-57': s(['Dry Brush', '3 kills sans mourir, 10 fois'], ['Backcountry', '20 kills en appui'], ['Dread Plague', '2 kills en 5 s, 20 fois']),
  'signal-50': s(['Anaconda', '2 kills en 5 s, 10 fois'], ['Ripplewave', '20 kills en quickscope'], ['Sunburn', '40 kills à longue distance']),

  // Pistolets
  'sang-9mm': s(['Autumn', '25 kills en visée'], ['Snakeskin', '3 kills sans dégâts, 5 fois'], ['Space Time', '50 kills en akimbo']),
  'krait-p68': s(['Off Grid', '15 kills accroché à un rebord'], ['Urban Flamingo', '15 kills à bout portant'], ['Smokescreen', '50 kills avec silencieux']),
  '50-gs': s(['Frosted', '20 headshots'], ['Splatter Ops', '7 doublés'], ['Red Tiger', '30 kills à bout portant']),
  'mojave-357': s(['Miami', '15 kills en un tir'], ['Wallpaper', '2 kills sans recharger, 10 fois'], ['Garland', '30 kills à bout portant']),

  // Lanceurs
  pila: s(['Frontier', '10 kills en tir direct'], ['Sandwash', '5 doublés'], ['Digital Fall', 'Détruire 30 séries ou véhicules']),
  'rpg-8': s(['Digi Bark', '10 kills couché'], ['Stone Bits', '10 kills à longue distance'], ['Bubblegum Ops', 'Détruire 30 séries ou véhicules']),
  jokr: s(['Thicket', '5 doublés'], ['Tectonic', '10 kills à longue distance'], ['Blue Tiger', 'Détruire 30 séries ou véhicules']),
  'pm-40-anvil': s(['Night Snow', '25 kills en tir direct'], ['Recursive', '2 kills sans recharger, 5 fois'], ['Urban Standard', '40 kills en mouvement']),

  // Corps à corps
  'fss-carbon-edge-1095': s(['Raster Lite', '25 kills en sautant'], ['Stockpile', '25 kills au coup lourd'], ['Deathbed', '2 kills en 5 s, 25 fois']),
}
