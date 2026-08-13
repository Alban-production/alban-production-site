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
sources HTML **et depuis les `url()` de `assets/styles.css`** (les images
d'attente des héros n'ont pas de balise `<img>`) : la racine de `public/`
contient aussi de vieux originaux
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

> **Phases 2.2 à 2.5 mises en ligne le 13 août 2026** — 29 commits poussés d'un
> seul coup. Vérifié en ligne : les 7 URLs répondent, la 404 sert bien la page
> personnalisée, `robots.txt` et `sitemap.xml` sont servis, le JSON-LD est
> présent sur toutes les pages, les images sont en WebP et le lecteur Vimeo ne
> démarre plus qu'après le premier rendu.

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
- **Préchargement des polices corrigé** : le build préchargeait
  `montserrat-400.woff2` et `montserrat-600.woff2`, soit **133 Ko en priorité
  haute sur chaque page** — pour rien. Ces fichiers portent le jeu latin
  étendu, dont aucun caractère du site n'a besoin ; le texte est rendu par les
  fichiers nommés `-ext`. Les préchargements pointent désormais vers ceux-là :
  plus aucun octet de latin étendu n'est téléchargé, et le préchargement joue
  enfin son rôle. Voir le piège des noms inversés en § 6.
- **Images d'attente des héros** (fournies par le client le 13 août 2026) :
  `hero-sport` et `hero-corporate`, posées en `background-image` sous l'iframe,
  qui les recouvre au démarrage du lecteur. Elles couvrent les trois cas où la
  vidéo n'est pas là : pendant son chargement, en permanence pour qui a demandé
  l'économie de données ou la réduction des animations, et si Vimeo est
  indisponible. Servies en WebP via `image-set()`, avec le JPEG en repli sur la
  déclaration précédente : 89 et 102 Ko au lieu de 322 et 320 Ko.

---

## 5. Ce qui reste à faire

### 2.2 — dégradé du hero Sport : arbitré
Le titre « Absolute Cinema » ressort un peu moins sur l'image d'attente que sur
la vidéo sombre. **Le client ne veut pas de retouche du dégradé (13 août 2026).**
Ne pas y revenir.

### Bloc photo du hero corporate
`.corp-hero-media` est toujours masqué (`hidden` + `display:none`). Le visuel
retenu par le client est noté dans `data-visuel-retenu="alban-portrait.jpg"`,
**sans attribut `src`** : une image reste téléchargée même dans un bloc masqué,
c'est ce qui a fait retirer l'ancienne image picsum.photos. Le mode d'emploi
pour l'afficher est en commentaire juste au-dessus, dans `site.html`. Deux
points à trancher au moment de le faire : `.corp-hero` est en une seule colonne
(l'image se placerait sous le texte), et le cadre 4/5 recadre sévèrement une
photo 3/2. À noter aussi que `alban-portrait` sert déjà de fond au hero de la
page À propos : la réutiliser ici fait doublon.

**Ce qui n'a pas pu être mesuré** : le volume réellement diffusé par les
lecteurs Vimeo. Le contenu d'une iframe d'un autre domaine est invisible aux
outils de mesure de la page, et Vimeo ne renvoie pas d'en-tête d'autorisation
de mesure. Ce qui est établi : sur le site en ligne, sept requêtes vers des
domaines Vimeo partaient avant le premier écran ; il n'en reste qu'une.

### 2.3 — contrastes : arbitré, on ne touche pas aux couleurs
**Décision du client du 13 août 2026 : les couleurs restent telles quelles.**
Les écarts ci-dessous sont donc assumés et ne doivent pas être « corrigés » lors
d'une reprise. Ils sont documentés pour mémoire, au cas où un audit
d'accessibilité les remonterait plus tard.

L'audit a été mené sur les 8 pages, en calculant le ratio réel de chaque texte
contre son fond effectif. Ce qui restait sous le seuil WCAG AA après correction
du lien d'évitement tient aux couleurs de marque :

| Où | Texte | Ratio | Seuil | Cause |
|---|---|---|---|---|
| Sport | boutons « Play showreel », « Ouvrir le formulaire » | 2,87:1 | 4,5:1 | blanc sur l'orange `#ff6a1a` |
| Corporate | libellés `N° 01`, `LIVRABLE` (10 px) | 2,51:1 | 4,5:1 | orange `#ff6a1a` sur fond clair |
| Accueil | bandeau défilant, mentions non accentuées (11 px) | 4,21:1 | 4,5:1 | gris légèrement trop clair |

Si la question revient un jour, deux correctifs sont possibles sans refonte :
texte encre `#111113` au lieu de blanc sur les aplats orange (**6,6:1**), ou
variante d'orange assombrie (`--accent-muted` `#cc4e0d`, déjà définie) réservée
aux textes orange de petite taille sur fond clair.

**Faux positifs écartés** : les titres posés sur photo (`about-hero-title`,
`sport-project-title`, `sport-project-sub`) et les textes en contour
(`.outlined`). Un calcul automatique ne sait pas lire un fond photographique ;
vérification visuelle faite, ils restent lisibles grâce au dégradé de surimpression.

### 2.4 — référencement restant
- **`VideoObject` : abandonné.** Le client ne souhaite pas fournir les dates de
  publication des vidéos (13 août 2026), or Google exige une `uploadDate` au
  format ISO et le site ne connaît que l'année. Sans elle, le balisage serait
  rejeté ou inventé : on s'en passe. Ne pas rouvrir le sujet sans les dates.
- Le `<h1>` de la page Sport, « Absolute Cinema », ne cible aucune requête mais
  **le client le garde tel quel (13 août 2026)**. Ne pas le remettre en cause.

### 2.5 — formulaire de contact : clos
Les messages arrivent sur l'adresse Gmail du client, et non sur
`contact@alban-production.fr`. **Le client s'en accommode (13 août 2026)** : ne
pas modifier la destination Formspree. La politique de confidentialité annonce
`contact@alban-production.fr` comme adresse de contact du responsable de
traitement, ce qui reste exact — c'est la boîte de réception technique qui
diffère, pas l'interlocuteur.

### Contenus manquants
- **Photo du hero corporate** : le bloc `.corp-hero-media` existe, masqué et
  vide, en attente d'une vraie photo de tournage et de sa légende. Sans rapport
  avec l'image d'attente de la vidéo, qui est en place.

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

**Les noms des fichiers de polices sont inversés.** Les 16 fichiers nommés
`…-ext.woff2` contiennent le **jeu latin de base** — celui qui écrit le texte
français. Les 16 fichiers **sans** suffixe contiennent le **latin étendu**,
qu'aucun caractère du site n'utilise. Se fier au `unicode-range` déclaré dans
`assets/fonts.css`, **jamais au nom du fichier** : `U+0000-00FF…` = latin,
`U+0100-02BA…` = latin étendu. C'est ce piège qui faisait précharger 133 Ko
inutiles sur chaque page. Renommer les fichiers serait plus sain, mais macOS
ne distingue pas la casse et un renommage croisé est risqué — voir le piège
suivant.

**L'enveloppe `<picture>` casse les grilles si on l'oublie.** Le build enveloppe
les images en `<picture>` pour le repli WebP. Cette enveloppe devient alors
l'élément de grille ou de flexbox à la place de l'image, et les pourcentages de
l'image se résolvent contre elle : `.clients-scatter .logo img { max-height:
100% }` se calculait contre un `<picture>` sans hauteur, et 17 logos débordaient
de leur case. La règle `picture { display: contents; }` efface la boîte de
l'enveloppe et rétablit le comportement d'origine. **Ne pas la supprimer.**

**Vérifier en large, pas seulement en étroit.** Ce bug est passé parce que la
vérification s'était faite dans une fenêtre de 800 px, où la grille des logos
passe à 3 ou 4 colonnes et masquait le problème. Il n'apparaissait qu'au-delà
de 900 px. Contrôler au moins deux largeurs : ~375 px et ~1900 px.

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
