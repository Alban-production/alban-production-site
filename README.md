# Alban Production — Site officiel

Site portfolio statique pour Alban Production.
Production audiovisuelle haut de gamme — Lyon · Jasseron.

## Structure

- `index.html` — page unique (toutes les vues : Landing / Corporate / Sport / À propos / Contact)
- `logos/` — logos des clients affichés dans la section « Ils nous ont fait confiance »
- `icone.svg`, `logo.svg` — marque AP
- `portrait.JPG`, `Signature.JPG`, `Sport.jpeg`, `Corporate.jpeg`, `entente-gymnique.jpg` — visuels de la page À propos et des projets

## Déploiement

Site 100 % statique. Aucune compilation requise.
Uploader directement le contenu du repo à la racine de l'hébergement (`public_html/` sur Hostinger).

## Modifier le site

Éditer `index.html` — toute la page est dans ce seul fichier (HTML + CSS + JS inline).

### Changer une vidéo de projet
Dans `index.html`, chercher l'article correspondant et modifier :
- `data-video="https://vimeo.com/XXXXXXX"` — URL Vimeo
- L'`<img src>` est synchronisée automatiquement avec la miniature Vimeo officielle (oEmbed)

### Ajouter un logo client
1. Déposer le fichier dans `logos/`
2. Dans `index.html`, dans les blocs `<div class="clients-scatter">` (présents 2 fois — sport + corporate), ajouter :
   ```html
   <div class="logo"><img src="logos/nom-du-logo.png" alt="Nom Client" loading="lazy"></div>
   ```
3. Classes de taille disponibles : `compact` (0.78), `tight` (0.88), défaut (1.0), `wide` (1.18), `xl` (1.38), `xxl` (2.0)

## Contact

- alban.product@gmail.com
- 07 69 48 79 26
