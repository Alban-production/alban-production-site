#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  Génère une version WebP à côté de chaque image locale.
#
#  Le HTML n'est pas modifié : build.sh enveloppe automatiquement en
#  <picture> tout <img> dont la source possède un jumeau .webp. Le fichier
#  d'origine reste donc servi aux navigateurs qui ne lisent pas le WebP.
#
#  Idempotent : relancer le script réécrit simplement les .webp.
#  Nécessite cwebp  (brew install webp)
# ════════════════════════════════════════════════════════════════
set -e
PUB="$(cd "$(dirname "$0")/.." && pwd)"

command -v cwebp >/dev/null || { echo "ERREUR: cwebp introuvable (brew install webp)"; exit 1; }

# On ne convertit que les images réellement affichées par le site, listées
# depuis les sources HTML. La racine de public/ contient aussi d'anciens
# originaux (portrait.JPG, Sport.jpeg…) qui ne sont pas déployés.
images_du_site () {
  {
    # Balises <img src="…">
    grep -ho 'src="[^"]*\.\(jpg\|jpeg\|png\|JPG\|JPEG\|PNG\)"' \
         "$PUB/site.html" "$PUB/_src/"*.html 2>/dev/null \
      | sed 's/^src="//; s/"$//'
    # Fonds CSS : url('…') — les images d'attente des héros arrivent par là,
    # elles n'ont pas de balise <img> et seraient sinon oubliées.
    grep -hoE "url\('?[^')]*\.(jpg|jpeg|png)'?\)" "$PUB/assets/styles.css" 2>/dev/null \
      | sed -E "s/^url\('?//; s/'?\)$//"
  } \
    | grep -v '^https\?:' \
    | sed 's|^/||' \
    | sort -u
}

# og-image.jpg est exclue : l'aperçu des réseaux sociaux et des messageries
# est lu par des robots dont beaucoup ne gèrent toujours pas le WebP.
EXCLUES="og-image.jpg"

# Seuil de conservation : en dessous, le gain ne justifie pas un second fichier.
GAIN_MINIMAL=10

total_avant=0; total_apres=0; gardes=0; ignores=0

convertir () {
  local src="$1" rel="${1#$PUB/}" dst="${1%.*}.webp"

  for e in $EXCLUES; do [ "$(basename "$src")" = "$e" ] && { echo "  ignorée (exclue)      $rel"; return; }; done

  local avant; avant=$(stat -f%z "$src")

  # Deux encodages concurrents, on garde le plus léger :
  #  · avec perte, réglage haut  → efficace sur les photographies
  #  · sans perte                → souvent imbattable sur les logos à aplats
  cwebp -quiet -q 82 -m 6 -sharp_yuv -alpha_q 100 "$src" -o "$dst.lossy" 2>/dev/null
  cwebp -quiet -lossless -z 9 -m 6 "$src" -o "$dst.lossless" 2>/dev/null

  local a b
  a=$(stat -f%z "$dst.lossy"); b=$(stat -f%z "$dst.lossless")
  if [ "$b" -lt "$a" ]; then mv "$dst.lossless" "$dst"; rm -f "$dst.lossy"
  else mv "$dst.lossy" "$dst"; rm -f "$dst.lossless"; fi

  local apres gain
  apres=$(stat -f%z "$dst")
  gain=$(( (avant - apres) * 100 / avant ))

  if [ "$gain" -lt "$GAIN_MINIMAL" ]; then
    rm -f "$dst"
    printf '  ignorée (gain %2s%%)    %s\n' "$gain" "$rel"
    ignores=$((ignores + 1))
    return
  fi

  printf '  %6s Ko → %6s Ko  (-%2s%%)  %s\n' \
    "$((avant / 1024))" "$((apres / 1024))" "$gain" "$rel"
  total_avant=$((total_avant + avant)); total_apres=$((total_apres + apres))
  gardes=$((gardes + 1))
}

echo "Conversion WebP :"
while IFS= read -r rel; do
  [ -z "$rel" ] && continue
  if [ ! -f "$PUB/$rel" ]; then echo "  ABSENTE               $rel"; continue; fi
  convertir "$PUB/$rel"
done < <(images_du_site)

echo
if [ "$gardes" -gt 0 ]; then
  echo "$gardes fichiers convertis, $ignores écartés"
  printf 'Total : %s Ko → %s Ko  (-%s%%)\n' \
    "$((total_avant / 1024))" "$((total_apres / 1024))" \
    "$(( (total_avant - total_apres) * 100 / total_avant ))"
else
  echo "Aucun fichier converti."
fi
