# Alban Production — état du site et reprise de mission

Document de reprise. Il décrit l'architecture, ce qui a été fait, ce qui reste,
et les pièges rencontrés. À lire en entier avant toute modification.

---

## 1. Où sont les fichiers

Deux dossiers, deux rôles distincts :

| Dossier | Rôle |
|---|---|
| `~/Documents/Claude/public/` | **Espace de travail.** Contient la source, le script de build et les originaux d'images. |
| `~/Documents/alban-production-site/` | **Dépôt git déployé.** Seul son contenu part en ligne via GitHub → Hostinger. |

Le site en ligne : <https://alban-production.fr>
Dépôt : <https://github.com/Alban-production/alban-production-site>

---

## 2. Comment le site est construit

Le site était à l'origine **un seul fichier** contenant cinq vues masquées/affichées
en JavaScript, donc **une seule URL** — invisible pour Google. Il a été découpé en
pages réelles, générées par un script.

### Source de vérité

`public/site.html` — fichier historique mono-page. **C'est lui qu'on modifie**
pour tout ce qui touche au contenu des pages Sport, Corporate, À propos, Contact
et à la page d'accueil.

Fragments séparés dans `public/_src/` :

| Fichier | Contenu |
|---|---|
| `footer.html` | Pied de page unique, injecté dans toutes les pages |
| `main-mentions.html` | Contenu des mentions légales |
| `main-confidentialite.html` | Contenu de la politique de confidentialité |
| `build.sh` | Script de génération |

### Générer les pages

```bash
bash ~/Documents/Claude/public/_src/build.sh
```

Le script extrait chaque vue de `site.html` par marqueurs (`<main id="…">`),
l'enveloppe dans un squelette HTML complet avec ses propres métadonnées, injecte
le pied de page, convertit les anciens gestionnaires JavaScript en vrais liens,
et écrit le résultat dans `public/_pages/`.

Il affiche un tableau de contrôle : nombre de `<main>`, gestionnaires obsolètes
restants, équilibre des commentaires HTML. **Tout écart signale un problème.**

### Déployer

```bash
cd ~/Documents/Claude/public
bash _src/build.sh
cp _pages/*.html .                       # aperçu local
DST=~/Documents/alban-production-site
for f in index sport corporate a-propos contact mentions-legales politique-de-confidentialite; do
  cp "$f.html" "$DST/"
done
cp assets/styles.css assets/app.js assets/fonts.css "$DST/assets/"
cd "$DST" && git add -A && git commit -m "…" && git push
```

Hostinger récupère automatiquement chaque push (quelques secondes).

Le push nécessite un jeton GitHub à créer sur
<https://github.com/settings/tokens/new> (portée `repo`, expiration 1 jour),
à révoquer après usage.

### Aperçu local

```bash
cd ~/Documents/Claude/public && python3 -m http.server 4173
```

---

## 3. Architecture des pages

| URL | Fichier | `data-page` | `<main id>` |
|---|---|---|---|
| `/` | index.html | `landing` | `landing` |
| `/sport` | sport.html | `sport` | `sport` |
| `/corporate` | corporate.html | `corporate` | `corporate` |
| `/a-propos` | a-propos.html | `about` | `about` |
| `/contact` | contact.html | `contact` | `contact-view` |
| `/mentions-legales` | mentions-legales.html | `legal` | `legal` |
| `/politique-de-confidentialite` | politique-de-confidentialite.html | `legal` | `legal` |

`assets/app.js` lit `document.body.dataset.page` au chargement et en déduit le
thème de la barre de navigation, l'intensité du grain et les liens affichés.

Les URLs sans `.html` sont produites par `.htaccess` (réécriture Apache).

---

## 4. Ce qui a été fait

### Phase 0 — audit
Rapport complet : SPA mono-URL, aucune mention légale, formulaire sans
consentement, 10 Mo d'images, aucune donnée structurée.

### Phase 1 — corrections bloquantes
- **Migration multi-pages** : 7 URLs réelles, chacune avec `title`, `description`,
  `canonical` et balises Open Graph propres
- **Conformité RGPD et LCEN** : pages mentions légales et politique de
  confidentialité, case de consentement obligatoire non pré-cochée dans le
  formulaire, liens légaux dans le pied de page de toutes les pages
- **Polices auto-hébergées** : 32 fichiers woff2 servis depuis le site,
  plus aucun appel aux serveurs de Google (transfert d'IP hors UE supprimé)
- **Navigation harmonisée** : mêmes liens partout, lien de la page courante
  masqué, bouton de bascule d'univers à droite
- **Modale projet** : champs vides masqués au lieu d'un tiret, focus piégé
  puis restitué, cartes activables au clavier
- **Accessibilité** : lien d'évitement, focus visible, animations figées si
  `prefers-reduced-motion`
- **Wording juridique** : « Présent sur des productions pour » →
  « Expérience de tournage sur des projets diffusés sur »

### Phase 2.1 — assets
- Images : **12,6 Mo → 2,2 Mo** (portrait 6,8 Mo → 449 Ko)
- Fichiers renommés en minuscules ASCII sans espaces ni accents
- `width` et `height` sur les 72 images (suppression des décalages)
- Image de partage dédiée `og-image.jpg` en 1200×630
- Attributs `alt` génériques remplacés par le nom réel des marques
- Originaux conservés dans `public/_originaux/` (hors dépôt)

---

## 5. Ce qui reste à faire

### 2.2 — vidéos Vimeo en arrière-plan
Deux lecteurs se lancent en autoplay sur les pages Sport et Corporate.
Mesurer leur impact sur le premier affichage et le volume mobile. Si l'impact
est net : chargement différé après le premier rendu, image d'attente, et
désactivation si `prefers-reduced-data` ou `prefers-reduced-motion`.

### 2.3 — accessibilité restante
- Vérifier les contrastes sur fond sombre (`#0a0a0b`), en particulier les textes
  secondaires et les libellés de formulaire
- Messages d'erreur du formulaire reliés aux champs via `aria-describedby`

### 2.4 — référencement
- `robots.txt` et `sitemap.xml`
- Données structurées JSON-LD : `LocalBusiness` sur toutes les pages,
  `VideoObject` sur les projets, `BreadcrumbList` sur les pages internes
- Page 404 personnalisée (la ligne `ErrorDocument` est déjà présente en
  commentaire dans `.htaccess`, à réactiver)
- Deux pages n'ont pas de `<h1>` : l'accueil et le contact
- Le `<h1>` de la page Sport est « Absolute Cinema » : fort visuellement mais
  ne cible aucune requête. Alternative à proposer au client avant modification.

### 2.5 — formulaire de contact
- Protection anti-spam sans captcha : champ piège et horodatage
- Vérifier qu'un message arrive réellement sur `contact@alban-production.fr`
  (le compte Formspree pointait auparavant vers une adresse Gmail)

### Décision en attente
**Conversion WebP** : gain estimé de 600 Ko sur les 2,2 Mo restants. Nécessite
d'installer `cwebp` (`sips`, seul outil présent sur la machine, lit le WebP mais
ne l'écrit pas). Le client n'a pas encore tranché.

---

## 6. Pièges rencontrés — à ne pas reproduire

**Ne jamais ajouter d'`id` à un `<main>`.** Ils en portent déjà un, utilisé par
le CSS (`#corporate`, `#contact-view`, `#landing.active`). Un second attribut
`id` écrase le premier et fait tomber toute la mise en forme de la page.

**Le cache navigateur.** Les CSS et JS sont appelés avec une empreinte de leur
contenu (`?v=a5b6d3c7`) calculée par le build ; le HTML est en `no-cache`. Ne pas
supprimer ce mécanisme : sans lui, les visiteurs déjà venus ne voient plus les
mises à jour.

**La casse des noms de fichiers.** macOS ne distingue pas `TF1.png` de `tf1.png`,
le serveur Linux si. Après tout renommage ne touchant qu'à la casse, forcer
l'enregistrement : `git mv --force ancien nouveau`.

**Vérifier au-delà de la modification.** Après toute intervention sur le build,
recharger les pages principales — pas seulement celle qu'on vient de toucher.
Le bug d'`id` en double est passé parce que seul le lien d'évitement avait été
testé.

**Les numéros de ligne.** Le script extrait les blocs par marqueurs et non par
numéros de ligne, précisément parce que toute édition de `site.html` décale
tout le reste.

---

## 7. Consignes du client

- Le design est abouti : **aucune refonte esthétique**, uniquement des
  corrections fonctionnelles, juridiques, techniques et de référencement
- Ne jamais inventer de donnée factuelle : tout élément inconnu devient un
  `[[À COMPLÉTER : …]]` explicite, listé en fin de mission
- Une tâche = un commit, message en français
- Ne pas toucher aux fichiers vidéo, aux intégrations Vimeo ni aux
  identifiants de lecteur
- Demander l'accord avant d'ajouter une dépendance
- En cas d'arbitrage ambigu, poser la question plutôt que trancher seul
