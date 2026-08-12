#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  Génère les 5 pages HTML depuis site.html (source mono-fichier)
#  Idempotent : peut être relancé autant de fois que nécessaire.
# ════════════════════════════════════════════════════════════════
set -e
PUB="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$PUB/site.html"
OUT="$PUB/_pages"
rm -rf "$OUT" && mkdir -p "$OUT"

# ——— Empreintes de contenu : forcent le navigateur à recharger un fichier modifié
#     tout en conservant un cache long pour les fichiers inchangés ———
V_CSS=$(md5 -q "$PUB/assets/styles.css" | cut -c1-8)
V_JS=$(md5 -q "$PUB/assets/app.js"     | cut -c1-8)
V_FONTS=$(md5 -q "$PUB/assets/fonts.css" | cut -c1-8)
export V_CSS V_JS V_FONTS
echo "Empreintes  css:$V_CSS  js:$V_JS  fonts:$V_FONTS"

# ——— Extraction par marqueurs (robuste aux décalages de lignes) ———
# extract_block <fichier> <regex début> <ligne de fin exacte> <sortie>
extract_block () {
  awk -v start="$2" -v stop="$3" '
    $0 ~ start { inblk = 1 }
    inblk      { print }
    inblk && $0 == stop { exit }
  ' "$1" > "$4"
  if [ ! -s "$4" ]; then echo "ERREUR: bloc introuvable ($2) dans $1"; exit 1; fi
}

grep '^<div class="grain"' "$SRC" > /tmp/frag-grain.html
extract_block "$SRC" '^<nav class="topnav"'          '</nav>' /tmp/frag-nav.html
extract_block "$SRC" '^<div class="sp-modal"'        '</div>' /tmp/frag-modal.html

extract_block "$SRC" '^<main id="landing"'           '</main>' /tmp/main-landing.html
extract_block "$SRC" '^<main id="corporate"'         '</main>' /tmp/main-corporate.html
extract_block "$SRC" '^<main id="sport"'             '</main>' /tmp/main-sport.html
extract_block "$SRC" '^<main id="about"'             '</main>' /tmp/main-about.html
extract_block "$SRC" '^<main id="contact-view"'      '</main>' /tmp/main-contact.html

# ——— Garde-fou : aucun commentaire HTML non fermé dans les fragments ———
for f in /tmp/frag-*.html /tmp/main-*.html; do
  o=$(grep -o '<!--' "$f" | wc -l); c=$(grep -o '\-\->' "$f" | wc -l)
  if [ "$o" -ne "$c" ]; then echo "ERREUR: commentaire non fermé dans $f ($o ouverts / $c fermés)"; exit 1; fi
done

# make_page  fichier  data-page  title  description  canonical  main  og-image  [noindex]
# Le 8e argument, s'il vaut "noindex", supprime le canonical et demande aux moteurs
# de ne pas indexer la page (utilisé pour la 404, qui n'a pas d'URL propre).
make_page () {
  local FILE="$1" PAGE="$2" TITLE="$3" DESC="$4" CANON="$5" MAIN="$6" OGIMG="$7" NOINDEX="$8"
  local CANON_TAG="<link rel=\"canonical\" href=\"https://alban-production.fr${CANON}\">"
  [ "$NOINDEX" = "noindex" ] && CANON_TAG='<meta name="robots" content="noindex, follow">'
  {
    cat <<HEAD
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${TITLE}</title>
<meta name="description" content="${DESC}">
<meta name="author" content="Alban Dubois">
${CANON_TAG}

<meta property="og:type" content="website">
<meta property="og:site_name" content="Alban Production">
<meta property="og:title" content="${TITLE}">
<meta property="og:description" content="${DESC}">
<meta property="og:locale" content="fr_FR">
<meta property="og:url" content="https://alban-production.fr${CANON}">
<meta property="og:image" content="https://alban-production.fr/${OGIMG}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${TITLE}">
<meta name="twitter:description" content="${DESC}">
<meta name="twitter:image" content="https://alban-production.fr/${OGIMG}">

<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="alternate icon" href="/favicon.svg">
<link rel="apple-touch-icon" href="/favicon.svg">
<meta name="theme-color" content="#0a0a0b">

<link rel="preload" href="/assets/fonts/montserrat-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/montserrat-600.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/fonts.css?v=${V_FONTS}">
<link rel="stylesheet" href="/assets/styles.css?v=${V_CSS}">
</head>
<body data-page="${PAGE}">
<a class="skip-link" href="#contenu">Aller au contenu principal</a>

HEAD
    cat /tmp/frag-grain.html
    echo ""
    cat /tmp/frag-nav.html
    echo ""
    cat "$MAIN"
    echo ""
    if [ "$PAGE" != "landing" ]; then cat /tmp/frag-modal.html; echo ""; fi
    printf '<script src="/assets/app.js?v=%s" defer></script>\n</body>\n</html>\n' "$V_JS"
  } > "$OUT/$FILE"
}

make_page "index.html" "landing" \
  "Alban Production — Production audiovisuelle, Bourg-en-Bresse" \
  "Alban Production · Production audiovisuelle haut de gamme à Bourg-en-Bresse (Ain, Auvergne-Rhône-Alpes). Films d'entreprise, brand films, captations sportives et événementielles." \
  "/" "/tmp/main-landing.html" "og-image.jpg"

make_page "sport.html" "sport" \
  "Vidéaste sport &amp; événementiel — Bourg-en-Bresse | Alban Production" \
  "Captations sportives et événementielles à Bourg-en-Bresse et en Auvergne-Rhône-Alpes. Aftermovies, films de club, contenus réseaux sociaux : une écriture cinématique au service de l'intensité du sport." \
  "/sport" "/tmp/main-sport.html" "og-image.jpg"

make_page "corporate.html" "corporate" \
  "Film d'entreprise &amp; brand film — Bourg-en-Bresse | Alban Production" \
  "Films d'entreprise, brand films et interviews à Bourg-en-Bresse (Ain). Une production audiovisuelle haut de gamme pour mettre en valeur votre savoir-faire, votre identité et votre message." \
  "/corporate" "/tmp/main-corporate.html" "og-image.jpg"

make_page "a-propos.html" "about" \
  "À propos — Alban Dubois, réalisateur &amp; chef opérateur | Alban Production" \
  "Alban Dubois, fondateur d'Alban Production. Sportif de haut niveau devenu réalisateur : une signature visuelle cinématique au service du sport et des entreprises, depuis Bourg-en-Bresse." \
  "/a-propos" "/tmp/main-about.html" "og-image.jpg"

make_page "contact.html" "contact" \
  "Contact &amp; devis gratuit — Alban Production, Bourg-en-Bresse" \
  "Parlons de votre projet vidéo. Devis gratuit sous 24 h ouvrées pour vos films d'entreprise, brand films et captations sportives à Bourg-en-Bresse et en Auvergne-Rhône-Alpes." \
  "/contact" "/tmp/main-contact.html" "og-image.jpg"

make_page "mentions-legales.html" "legal" \
  "Mentions légales — Alban Production" \
  "Mentions légales du site Alban Production : éditeur, directeur de publication, hébergeur et propriété intellectuelle." \
  "/mentions-legales" "$PUB/_src/main-mentions.html" "og-image.jpg"

make_page "politique-de-confidentialite.html" "legal" \
  "Politique de confidentialité — Alban Production" \
  "Comment vos données personnelles sont collectées, utilisées et protégées sur le site Alban Production, conformément au RGPD." \
  "/politique-de-confidentialite" "$PUB/_src/main-confidentialite.html" "og-image.jpg"

make_page "404.html" "legal" \
  "Page introuvable — Alban Production" \
  "Cette page n'existe pas ou a été déplacée. Retrouvez l'accueil, les univers Sport et Corporate, ou contactez Alban Production." \
  "/404" "$PUB/_src/main-404.html" "og-image.jpg" "noindex"

# ════════════════════════════════════════════════
#  Post-traitement : liens réels + chemins absolus
# ════════════════════════════════════════════════
for f in "$OUT"/*.html; do
  # Logo AP de la nav : <button> → <a href="/">
  perl -0pi -e 's{<button class="brand" onclick="goLanding\(\)" aria-label="Accueil">(.*?)</button>}{<a class="brand" href="/" aria-label="Accueil">$1</a>}gs' "$f"
  # CTA contact
  perl -pi -e 's{href="#contact" onclick="event\.preventDefault\(\); goContact\(\);"}{href="/contact"}g' "$f"
  # Meta-bar de la landing
  perl -pi -e 's{href="#" onclick="event\.preventDefault\(\); goAbout\(\);"}{href="/a-propos"}g' "$f"
  perl -pi -e 's{href="#" onclick="event\.preventDefault\(\); goContact\(\);"}{href="/contact"}g' "$f"
  # Chemins d'assets en absolu (robuste vis-à-vis des URLs propres)
  perl -pi -e 's{(\ssrc=")(?!https?:|/|data:)}{$1/}g; s{(\shref=")(?!https?:|/|#|mailto:|tel:)}{$1/}g' "$f"
  # Chaque page n'a qu'un seul <main> : il doit toujours être visible
  # (la classe .active était pilotée par le JS dans l'ancien système SPA)
  perl -pi -e 's{(<main[^>]*class="view)(?![^"]*\bactive\b)}{$1 active}' "$f"
  # Le lien d'évitement pointe vers l'identifiant deja porte par le <main>
  # (ne jamais ajouter d'id au <main> : cela ecraserait le sien et casserait
  #  toutes les regles CSS de la forme #corporate, #contact-view, #landing…)
  MAIN_ID=$(grep -o '<main[^>]*>' "$f" | head -1 | sed -n 's/.*id="\([^"]*\)".*/\1/p')
  if [ -n "$MAIN_ID" ]; then
    sed -i '' "s|skip-link\" href=\"#contenu\"|skip-link\" href=\"#$MAIN_ID\"|" "$f"
  fi
done

# ——— Footer : source unique injectée dans toutes les pages ———
# (supprime la duplication ×4 et garantit la présence des liens légaux partout)
FOOTER=$(cat "$PUB/_src/footer.html")
export FOOTER
for f in "$OUT"/*.html; do
  [ "$(basename "$f")" = "index.html" ] && continue   # la landing n'a pas de footer
  perl -0pi -e '
    my $footer = $ENV{FOOTER};
    if (m{<footer class="site-footer">.*?</footer>}s) {
      s{<footer class="site-footer">.*?</footer>}{$footer}s;   # remplace celui présent
    } else {
      s{(\n</main>)}{\n$footer$1};                             # ou l’insère avant </main>
    }
  ' "$f"
done

# Landing : les deux panneaux deviennent des liens
perl -0pi -e 's{<section class="split-side split-sport" onclick="goSport\(\)">(.*?)</section>}{<a class="split-side split-sport" href="/sport">$1</a>}gs;
              s{<section class="split-side split-corp" onclick="goCorporate\(\)">(.*?)</section>}{<a class="split-side split-corp" href="/corporate">$1</a>}gs' "$OUT/index.html"

# ——— Contrôles finaux ———
echo "Pages générées :"
for f in "$OUT"/*.html; do
  n=$(basename "$f")
  mains=$(grep -c '<main' "$f" || true)
  onclicks=$(grep -c 'goSport()\|goCorporate()\|goAbout()\|goContact()\|goLanding()' "$f" || true)
  o=$(grep -o '<!--' "$f" | wc -l | tr -d ' '); c=$(grep -o '\-\->' "$f" | wc -l | tr -d ' ')
  printf '  %-18s %5s Ko | <main>: %s | handlers obsolètes: %s | commentaires: %s/%s\n' \
    "$n" "$(( $(stat -f%z "$f") / 1024 ))" "$mains" "$onclicks" "$o" "$c"
done
