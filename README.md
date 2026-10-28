# 33K

33k is a shared gold camo tracker for two players chasing all 33 weapons in Modern Warfare 4: tick, sync, and see what's left at a glance.

## Fonctionnement

- Une piste de camos par arme : **Gold → Platinum → Harmonic Break**, chaque palier se valide via le défi MP *ou* le défi DMZ.
- Platinum s'ouvre sur une classe quand toutes ses armes sont Gold (indiqué, pas bloqué).
- Divergence est calculé : débloqué à 33 Harmonic Break.
- Camos mastery MP (Mercurial Drift, Polyatomic Reforged, Orion Reforged) et DMZ (Chiral, Ripple Tide, Helio) en cases à cocher.
- Plusieurs joueurs, un code à 4 chiffres chacun (créé à la première connexion). Chacun voit l'autre, ne modifie que lui-même.
- Synchro toutes les 5 s et au retour sur l'onglet. PWA installable (« Ajouter à l'écran d'accueil »).

## Stack

- Vite + React + TypeScript, `vite-plugin-pwa`
- Fonctions Vercel dans `api/` + Upstash Redis (intégration Marketplace Vercel)

```
src/data/weapons.ts   catalogue des armes, classes, défis, joueurs
src/lib/rules.ts      règles (compteurs, ouverture Platinum, objectif courant)
api/_core.ts          logique API, indépendante du stockage
api/_redis.ts         stockage Upstash
api/{state,auth,progress}.ts  routes
```

Données Redis :

```
33k:progress:<joueur>  hash { arme: 1|2|3 }
33k:mastery:<joueur>   hash { camo: 1 }
33k:pin:<joueur>       sha256 du code
```

## Dev

```bash
npm install
npm run dev     # les routes /api tournent en mémoire, pas besoin de Redis
npm run build
```

## Déploiement

1. Projet Vercel lié à ce repo (framework : Vite).
2. Onglet **Storage** → **Upstash for Redis** (plan gratuit) → connecter au projet. Les variables `KV_REST_API_URL` / `KV_REST_API_TOKEN` sont injectées automatiquement.
3. Redéployer.

Ajouter ou renommer un joueur : `PLAYERS` dans `src/data/weapons.ts` (ne jamais changer un `id` existant, il porte les données).
