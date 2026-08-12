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
| `main-404.html` | Contenu de la page 404 |
| `build.sh` | Script de génération |
| `webp.sh` | Génération des versions WebP des images |

Fichiers statiques à la racine de `public/`, écrits à la main et copiés tels
quels : `robots.txt`, `sitemap.xml`, `.htaccess`.

### Générer les pages

```bash
bash ~/Documents/Claude/public/_src/build.sh
```

Le script extrait chaque vue de `site.html` par marqueurs (`<main id="…">`),
l'enveloppe dans un squelette HTML complet avec ses propres métadonnées et ses
données structurées JSON-LD, injecte le pied de page, convertit les anciens
gestionnaires JavaScript en vrais liens, et écrit le résultat dans
`public/_pages/`.

Le bloc JSON-LD `ProfessionalService` est défini une seule fois en tête de
`build.sh` : **toutes ses valeurs proviennent des mentions légales et de la page
contact**. Ne rien y ajouter sans source vérifiable.

Dernière étape du script : tout `<img>` dont la source possède un jumeau `.webp`
est enveloppé dans un `<picture>`. Rien à écrire à la main — poser ou retirer un
fichier `.webp` suffit à activer ou désactiver le repli.

### Régénérer les WebP

```bash
bash ~/Documents/Claude/public/_src/webp.sh   # puis relancer build.sh
```

Le script ne traite que les images réellement affichées, listées depuis les
sources HTML : la racine de `public/` contient aussi de vieux originaux
(`portrait.JPG`, `Sport.jpeg`…) qui ne sont pas déployés. Il essaie chaque image
avec et sans perte, garde la plus légère, et **écarte tout gain inférieur à 10 %**
pour ne pas multiplier les fichiers sans raison. `og-image.jpg` est exclue : les
robots d'aperçu des réseaux sociaux ne lisent pas tous le WebP.

Nécessite `cwebp` : `brew install webp` (installé le 12 août 2026, avec
`libtiff` qui lui manquait).

Il affiche un tableau de contrôle : nombre de `<main>`, gestionnaires obsolètes
restants, équilibre des commentaires HTML. **Tout écart signale un problème.**

### Déployer

```bash
cd ~/Documents/Claude/public
bash _src/build.sh
cp _pages/*.html .                       # aperçu local
DST=~/Documents/alban-production-site
for f in index sport corporate a-propos contact mentions-legales politique-de-confidentialite 404; do
  cp "$f.html" "$DST/"
done
cp assets/styles.css assets/app.js assets/fonts.css "$DST/assets/"
cp robots.txt sitemap.xml .htaccess "$DST/"
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
| *(erreur 404)* | 404.html | `legal` | `legal` |

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

### Phase 2.4 — référencement
- `robots.txt` (avec renvoi au sitemap) et `sitemap.xml` (7 URLs)
- Page **404 personnalisée** reprenant la mise en forme des pages légales,
  en `noindex` et sans canonical ; `ErrorDocument` activé dans `.htaccess`
- **Données structurées JSON-LD** : `ProfessionalService` sur toutes les pages,
  `BreadcrumbList` sur les six pages internes — validés par analyse JSON à la
  génération
- **`<h1>` manquants** : accueil (titre restitué en `.sr-only`, le titre visible
  étant le logo) et contact (`.contact-title` passée de `h2` à `h1`, sélecteurs
  CSS adaptés, rendu identique)

### Phase 2.5 — formulaire de contact
- **Anti-spam sans captcha** : champ piège `_gotcha` hors écran et hors parcours
  clavier (écarté d'office par Formspree) + refus de tout envoi survenant moins
  de trois secondes après l'affichage de la page. Aucun service tiers ajouté.

### Phase 2.3 — accessibilité
- Zone d'état du formulaire en `role="status"` : chaque message est annoncé sans
  voler le focus ; le champ fautif est relié au message par `aria-describedby`
  et marqué `aria-invalid`, puis délié dès correction
- Contraste du lien d'évitement : **2,87:1 → 6,6:1** (texte encre sur l'orange
  de marque, au lieu de blanc)
- Audit automatisé des contrastes sur les 8 pages : résultats en § 5

### Phase 2.2 — poids des pages
- **Images en WebP** : 1 940 Ko → 592 Ko, soit **−69 %** sur les images
  déployées. Repli automatique en `<picture>` produit par le build : les
  navigateurs qui ne lisent pas le WebP reçoivent toujours le JPEG ou le PNG.
  Un seul logo écarté, `fce-france-ain.png`, dont le gain n'atteignait pas 10 %.
- **Vidéos d'arrière-plan Sport et Corporate** : le lecteur Vimeo était écrit en
  dur dans le HTML et démarrait avec la page. Il est désormais créé après le
  premier rendu, et **pas du tout** si le visiteur a demandé
  `prefers-reduced-data`, `prefers-reduced-motion` ou activé le mode économie de
  données. **URL et identifiant de lecteur repris à l'octet près.**
- **Vignettes Vimeo** : les appels à l'API oEmbed partaient tous au chargement
  (quatre sur la page Corporate). Ils partent maintenant quand la vignette
  approche de l'écran — un seul avant le premier écran.
- **Image de remplissage retirée** : le hero corporate contenait une photo
  `picsum.photos` dans un bloc masqué. Invisible, mais téléchargée à chaque
  visite : le navigateur récupère les images en `display:none`. C'était un
  transfert d'IP vers un service tiers, du même ordre que les polices Google
  supprimées en phase 1. Le bloc est conservé, vide, pour une vraie photo.

---

## 5. Ce qui reste à faire

### 2.2 — image d'attente des héros
Quand la vidéo ne se charge pas (économie de données, animations réduites,
Vimeo bloqué), le hero affiche son fond peint : sombre côté Sport, papier côté
Corporate. C'est cohérent — l'habillage du titre est de toute façon posé
par-dessus — mais une vraie image d'attente serait plus riche.
Il faut pour cela **un export local d'une image des deux vidéos**
— [[À COMPLÉTER : deux images fixes, hero Sport et hero Corporate]]. Ne pas la
tirer d'un service tiers : cela réintroduirait la requête que le chargement
différé vient d'éviter.

**Ce qui n'a pas pu être mesuré** : le volume réellement diffusé par les
lecteurs Vimeo. Le contenu d'une iframe d'un autre domaine est invisible aux
outils de mesure de la page, et Vimeo ne renvoie pas d'en-tête d'autorisation
de mesure. Ce qui est établi : sur le site en ligne, sept requêtes vers des
domaines Vimeo partaient avant le premier écran ; il n'en reste qu'une.

### 2.3 — contrastes : ce qui dépend des couleurs de marque
L'audit a été mené sur les 8 pages, en calculant le ratio réel de chaque texte
contre son fond effectif. Ce qui restait sous le seuil WCAG AA après correction
du lien d'évitement touche **les couleurs choisies par le client** : ces points
demandent son arbitrage avant toute modification.

| Où | Texte | Ratio | Seuil | Cause |
|---|---|---|---|---|
| Sport | boutons « Play showreel », « Ouvrir le formulaire » | 2,87:1 | 4,5:1 | blanc sur l'orange `#ff6a1a` |
| Corporate | libellés `N° 01`, `LIVRABLE` (10 px) | 2,51:1 | 4,5:1 | orange `#ff6a1a` sur fond clair |
| Accueil | bandeau défilant, mentions non accentuées (11 px) | 4,21:1 | 4,5:1 | gris légèrement trop clair |

Deux correctifs possibles, tous deux sans refonte :
- texte encre `#111113` au lieu de blanc sur les aplats orange → **6,6:1**
- variante d'orange assombrie (`--accent-muted` `#cc4e0d` existe déjà) réservée
  aux textes orange de petite taille sur fond clair

**Faux positifs écartés** : les titres posés sur photo (`about-hero-title`,
`sport-project-title`, `sport-project-sub`) et les textes en contour
(`.outlined`). Un calcul automatique ne sait pas lire un fond photographique ;
vérification visuelle faite, ils restent lisibles grâce au dégradé de surimpression.

### 2.4 — référencement restant
- **`VideoObject` sur les projets** : bloqué. Google exige une `uploadDate` au
  format ISO ; le site ne connaît que l'année (`data-year`). Il faut la **date de
  publication réelle de chaque vidéo Vimeo** — [[À COMPLÉTER : dates de mise en
  ligne des projets]]. Le reste des champs est déjà disponible dans le HTML
  (titre, client, vignette, URL Vimeo).
- Le `<h1>` de la page Sport est « Absolute Cinema » : fort visuellement mais
  ne cible aucune requête. Alternative à proposer au client avant modification.

### 2.5 — formulaire de contact
- Vérifier qu'un message arrive réellement sur `contact@alban-production.fr`
  (le compte Formspree pointait auparavant vers une adresse Gmail). Test non
  effectué ici : il enverrait un vrai message au client.

### Contenus manquants
- **Photo du hero corporate** : le bloc existe, masqué et vide, en attente d'une
  vraie photo de tournage et de sa légende.
- **Images d'attente des vidéos de fond** (voir 2.2).
- **Dates de publication des vidéos Vimeo** (voir 2.4).

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

**Les sélecteurs CSS liés à la balise.** Le titre de la page contact était visé
par `#contact-view h2.contact-title`. Passer la balise en `<h1>` sans corriger
le sélecteur aurait effacé toute sa mise en forme. Après tout changement de
balise, chercher l'ancienne dans `assets/styles.css` **et** dans le `<style>` de
`site.html`.

**Tester le formulaire sans rien envoyer.** Neutraliser `window.fetch` dans la
console avant d'appeler `handleContactSubmit` : les garde-fous se vérifient sans
qu'un message parte réellement chez le client.

**Un `<source>` l'emporte sur `img.src`.** L'enveloppe `<picture>` du WebP a
failli neutraliser la synchronisation des vignettes Vimeo : le script réécrivait
bien `img.src`, mais le navigateur continuait d'afficher le `<source>`.
`syncVimeoThumbnails()` retire donc les `<source>` avant de poser la nouvelle
image. À garder en tête pour toute image locale pilotée par JavaScript.

**Une image en `display:none` est quand même téléchargée.** Le bloc masqué du
hero corporate appelait picsum.photos à chaque visite. Masquer ne suffit pas :
pour qu'une requête ne parte pas, il faut retirer l'attribut `src`.

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
