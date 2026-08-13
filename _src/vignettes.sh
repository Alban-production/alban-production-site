#!/bin/bash
# ════════════════════════════════════════════════════════════════
#  Récupère la vignette officielle de chaque vidéo Vimeo et l'héberge
#  sur le site, dans public/vignettes/.
#
#  Pourquoi : les vignettes venaient de vumbnail.com, un service tiers
#  distinct de Vimeo, appelé à chaque visite. Il recevait donc l'adresse IP
#  de chaque visiteur sans figurer dans la politique de confidentialité, et
#  constituait un point de panne pour l'affichage des projets.
#
#  Le rafraîchissement est désormais une étape de fabrication, plus une
#  requête du visiteur : après avoir changé une vignette sur Vimeo, relancer
#  ce script, puis webp.sh et build.sh.
#
#  Les identifiants sont lus dans site.html : rien à tenir à jour ici.
# ════════════════════════════════════════════════════════════════
set -e
PUB="$(cd "$(dirname "$0")/.." && pwd)"
DST="$PUB/vignettes"
mkdir -p "$DST"

ids=$(grep -o 'data-video="https://vimeo\.com/[0-9]\{6,\}"' "$PUB/site.html" \
      | grep -o '[0-9]\{6,\}' | sort -u)

[ -z "$ids" ] && { echo "Aucun identifiant Vimeo trouvé dans site.html"; exit 1; }

echo "Vignettes Vimeo :"
for id in $ids; do
  # oEmbed renvoie l'URL de la vignette courante, y compris une vignette
  # personnalisée posée depuis l'interface Vimeo.
  url=$(curl -sS --max-time 20 \
        "https://vimeo.com/api/oembed.json?url=https://vimeo.com/$id&width=1600" \
        | python3 -c 'import sys,json
try:
    print(json.load(sys.stdin).get("thumbnail_url",""))
except Exception:
    print("")')

  if [ -z "$url" ]; then
    printf '  %-12s ÉCHEC — vidéo privée, supprimée, ou API indisponible\n' "$id"
    continue
  fi

  # Vimeo suffixe la taille (_640x360) : la retirer donne la résolution maximale.
  url=$(printf '%s' "$url" | sed -E 's/_[0-9]+x[0-9]+(\.[a-z]+)?(\?|$)/\1\2/')

  if curl -sS --max-time 30 -o "$DST/$id.jpg" "$url"; then
    printf '  %-12s %5s Ko\n' "$id" "$(( $(stat -f%z "$DST/$id.jpg") / 1024 ))"
  else
    printf '  %-12s ÉCHEC au téléchargement\n' "$id"
    rm -f "$DST/$id.jpg"
  fi
done

echo
echo "Enchaîner avec :  bash _src/webp.sh  puis  bash _src/build.sh"
