/* ═══════════════════════════════════════════════════════════════
   ALBAN PRODUCTION — app.js
   Script partagé par toutes les pages.
   La page courante est déclarée via <body data-page="…">
   Valeurs possibles : landing | sport | corporate | about | contact
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const PAGE = document.body.dataset.page || 'landing';

  /* ——— URLs des pages ——— */
  const URLS = {
    landing:   '/',
    sport:     '/sport',
    corporate: '/corporate',
    about:     '/a-propos',
    contact:   '/contact'
  };

  /* ——— Navigation : liens du menu central ———
     Pas de "Sport" / "Corporate" : le bouton switch à droite gère la bascule d'univers.
     Le lien de la page courante est masqué. */
  const NAV_ITEMS = [
    { label: 'À propos', page: 'about'   },
    { label: 'Contact',  page: 'contact' }
  ];

  const nav       = document.getElementById('topnav');
  const navMiddle = document.getElementById('nav-middle');
  const navRight  = document.getElementById('nav-right');
  const grain     = document.getElementById('grain');

  const NAV_BACK_HTML =
    '<a class="nav-back" href="' + URLS.landing + '" title="Accueil" aria-label="Accueil">' +
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
    '<path d="M3 12l9-9 9 9M5 10v10h14V10"/></svg></a>';

  function buildNavMiddle() {
    if (!navMiddle) return;
    navMiddle.innerHTML = NAV_ITEMS
      .filter(item => item.page !== PAGE)
      .map(item => '<a class="nav-link" href="' + URLS[item.page] + '">' + item.label + '</a>')
      .join('');
  }

  function buildNavRight() {
    if (!navRight) return;
    if (PAGE === 'sport') {
      navRight.innerHTML =
        '<a class="nav-switch" href="' + URLS.corporate + '"><span class="dot"></span>→ Corporate</a>' +
        NAV_BACK_HTML;
    } else if (PAGE === 'corporate') {
      navRight.innerHTML =
        '<a class="nav-switch" href="' + URLS.sport + '"><span class="dot"></span>→ Sport</a>' +
        NAV_BACK_HTML;
    } else {
      // about / contact : accès aux deux univers
      navRight.innerHTML =
        '<a class="nav-switch" href="' + URLS.sport + '"><span class="dot"></span>→ Sport</a>' +
        '<a class="nav-switch" href="' + URLS.corporate + '"><span class="dot"></span>→ Corporate</a>' +
        NAV_BACK_HTML;
    }
  }

  /* ——— Thème de la barre de navigation + grain ——— */
  function applyChrome() {
    if (PAGE === 'landing') {
      if (nav) nav.style.setProperty('display', 'none', 'important');
      if (grain) grain.className = 'grain';
      return;
    }
    if (nav) {
      nav.className = (PAGE === 'sport') ? 'topnav sport' : 'topnav corp';
      nav.style.display = 'grid';
    }
    if (grain) grain.className = (PAGE === 'sport') ? 'grain on-dark' : 'grain on-light';
    buildNavMiddle();
    buildNavRight();
  }

  applyChrome();

  // Live clock
  function tick() {
    const d = new Date();
    const z = n => String(n).padStart(2,'0');
    const t = `${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`;
    const el = document.getElementById('clock');
    if (el) el.textContent = t;
    const dateEl = document.getElementById('sport-hero-date');
    if (dateEl) {
      const fmt = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
      dateEl.textContent = fmt.toUpperCase();
    }
  }
  setInterval(tick, 1000); tick();
  { const y = document.getElementById('reel-year'); if (y) y.textContent = new Date().getFullYear(); }

  // Intersection observer for reveals
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // ——— Video embed system ———
  // Accepts: https://vimeo.com/123456789 · https://player.vimeo.com/video/123
  //          https://youtu.be/abc · https://www.youtube.com/watch?v=abc
  function toEmbedUrl(raw) {
    if (!raw) return null;
    const url = raw.trim();
    const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1&title=0&byline=0&portrait=0`;
    const ytShort = url.match(/youtu\.be\/([\w-]+)/);
    if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}?autoplay=1&rel=0`;
    const ytLong = url.match(/youtube\.com\/(?:watch\?v=|embed\/)([\w-]+)/);
    if (ytLong) return `https://www.youtube.com/embed/${ytLong[1]}?autoplay=1&rel=0`;
    return url;
  }

  // Sync thumbnails with the official Vimeo thumbnail (oEmbed API)
  // Anytime the user updates a custom thumbnail on Vimeo, the site reflects it.
  function syncVimeoThumbnails() {
    document.querySelectorAll('[data-video]').forEach(host => {
      const raw = host.getAttribute('data-video');
      if (!raw) return;
      const m = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      if (!m) return;
      const id = m[1];
      const img = host.tagName === 'IMG' ? host : host.querySelector('img');
      if (!img) return;
      // Fetch the latest thumbnail URL from Vimeo's oEmbed API
      fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${id}&width=1600`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && data.thumbnail_url) {
            // Vimeo returns _640 or _1280 — strip suffix to get max-res
            const maxUrl = data.thumbnail_url.replace(/_\d+x\d+(?=\.\w+($|\?))/, '');
            img.src = maxUrl;
          }
        })
        .catch(() => {/* fail silently → vumbnail fallback in src */});
    });
  }
  syncVimeoThumbnails();

  document.querySelectorAll('[data-video]').forEach(host => {
    host.addEventListener('click', (e) => {
      if (host.classList.contains('sport-project')) return; // handled by modal below
      if (host.querySelector('.video-frame')) return;
      const raw = host.getAttribute('data-video');
      if (!raw) {
        // No URL yet — visual feedback
        host.animate(
          [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }],
          { duration: 280, easing: 'ease-out' }
        );
        return;
      }
      e.preventDefault();
      const src = toEmbedUrl(raw);
      const iframe = document.createElement('iframe');
      iframe.className = 'video-frame';
      iframe.src = src;
      iframe.allow = 'autoplay; fullscreen; picture-in-picture';
      iframe.allowFullscreen = true;
      const close = document.createElement('button');
      close.className = 'video-close';
      close.setAttribute('aria-label', 'Fermer');
      close.textContent = '×';
      close.addEventListener('click', (ev) => {
        ev.stopPropagation();
        iframe.remove();
        close.remove();
      });
      host.appendChild(iframe);
      host.appendChild(close);
    });
  });

  // ——— Sport project modal ———
  (function () {
    const modal = document.getElementById('sp-modal');
    let lastFocused = null;   // élément à re-focaliser à la fermeture
    if (!modal) return;
    const videoSlot = modal.querySelector('#sp-modal-video');
    const titleEl = modal.querySelector('#sp-modal-title');
    const subEl = modal.querySelector('#sp-modal-sub');
    const numEl = modal.querySelector('#sp-modal-num');
    const clientEl = modal.querySelector('#sp-modal-client');
    const formatEl = modal.querySelector('#sp-modal-format');
    const briefEl = modal.querySelector('#sp-modal-brief');
    const challengesEl = modal.querySelector('#sp-modal-challenges');

    function openModal(article) {
      const raw = article.getAttribute('data-video');
      videoSlot.innerHTML = '';
      videoSlot.classList.toggle('is-empty', !raw);
      modal.classList.toggle('is-corp', article.classList.contains('corp-project'));
      if (raw) {
        const iframe = document.createElement('iframe');
        iframe.src = toEmbedUrl(raw);
        iframe.allow = 'autoplay; fullscreen; picture-in-picture';
        iframe.allowFullscreen = true;
        videoSlot.appendChild(iframe);
      }
      const titleNode = article.querySelector('.sport-project-title');
      titleEl.textContent = titleNode
        ? titleNode.innerHTML.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
        : '—';
      subEl.textContent = article.querySelector('.sport-project-sub')?.textContent?.trim() || '';
      const metaSpans = article.querySelectorAll('.sport-project-meta span');
      numEl.textContent = metaSpans[0]?.textContent?.trim() || '';
      // Un champ vide masque sa ligne plutôt que d'afficher un tiret
      fillRow(clientEl,     article.getAttribute('data-client'));
      fillRow(formatEl,     article.getAttribute('data-format'));
      fillRow(briefEl,      article.getAttribute('data-brief'));
      fillRow(challengesEl, article.getAttribute('data-challenges'));

      lastFocused = document.activeElement;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('sp-locked');

      // Le focus entre dans la modale et y reste tant qu'elle est ouverte
      const closeBtn = modal.querySelector('.sp-modal-close');
      if (closeBtn) closeBtn.focus();
      document.addEventListener('keydown', trapFocus, true);
    }

    // Renseigne une valeur, ou masque la ligne entière si la donnée est absente
    function fillRow(el, value) {
      if (!el) return;
      const row = el.closest('div');
      const clean = (value || '').trim();
      const empty = !clean || clean === '—';
      if (row) row.hidden = empty;
      el.textContent = empty ? '' : clean;
    }

    // Maintient la tabulation à l'intérieur de la modale
    function trapFocus(e) {
      if (e.key !== 'Tab' || !modal.classList.contains('is-open')) return;
      const focusables = modal.querySelectorAll(
        'button, [href], iframe, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last  = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }

    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('sp-locked');
      videoSlot.innerHTML = '';
      document.removeEventListener('keydown', trapFocus, true);
      // Le focus revient sur la carte d'où l'on vient
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
      lastFocused = null;
    }

    document.querySelectorAll('.sport-project').forEach(article => {
      // Les cartes sont des <article> : on les rend focalisables et activables
      // au clavier, comme un bouton, puisqu'elles ouvrent une fenêtre de détail.
      article.setAttribute('role', 'button');
      article.setAttribute('tabindex', '0');
      const titre = article.querySelector('.sport-project-title')?.textContent.trim();
      if (titre) article.setAttribute('aria-label', 'Voir le détail du projet : ' + titre);

      article.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openModal(article);
      });
      article.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(article);
        }
      });
    });

    modal.querySelectorAll('[data-sp-close]').forEach(el => el.addEventListener('click', closeModal));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });
  })();

  // ——— Contact form → Formspree ———

  /* Anti-spam sans captcha, en deux garde-fous complémentaires :
     1. le champ piège « _gotcha », invisible, qu'un robot remplit et pas un humain ;
     2. le délai de remplissage : un envoi en moins de trois secondes après
        l'affichage de la page est le fait d'un script, pas d'une personne.
     Aucun service tiers, aucune donnée supplémentaire collectée. */
  const FORM_LOADED_AT = Date.now();
  const DELAI_MINIMAL_MS = 3000;

  /* ——— Zone d'état du formulaire ———
     Un seul élément porte les messages (attente, erreur, succès). Il est déclaré
     role="status" dans le HTML : tout changement de son texte est annoncé par les
     lecteurs d'écran sans déplacer le focus.
     Quand un champ précis est en cause, il est relié à ce message par
     aria-describedby et signalé par aria-invalid, pour que l'erreur soit lue
     au moment où l'on revient sur le champ. */
  const STATUT_ID = 'form-status';

  function relierErreur(champ, note) {
    if (!champ || !note || !note.id) return;
    champ.setAttribute('aria-invalid', 'true');
    const decrit = (champ.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (!decrit.includes(note.id)) {
      champ.setAttribute('aria-describedby', decrit.concat(note.id).join(' '));
    }
  }

  function delierErreur(champ, note) {
    if (!champ || !note || !note.id) return;
    champ.removeAttribute('aria-invalid');
    const decrit = (champ.getAttribute('aria-describedby') || '')
      .split(/\s+/).filter(id => id && id !== note.id);
    if (decrit.length) champ.setAttribute('aria-describedby', decrit.join(' '));
    else champ.removeAttribute('aria-describedby');
  }

  function afficherStatut(note, texte, couleur) {
    if (!note) return;
    note.textContent = texte;
    note.style.color = couleur;
  }

  window.handleContactSubmit = async function(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const note = form.querySelector('#' + STATUT_ID) || form.querySelector('.form-note');
    const consent = form.querySelector('#c-consent');
    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : '';

    // Champ piège rempli : on s'arrête sans rien envoyer ni rien signaler,
    // pour ne pas indiquer au robot ce qui l'a fait échouer.
    const piege = form.querySelector('[name="_gotcha"]');
    if (piege && piege.value.trim() !== '') return;

    // Envoi trop rapide : on invite simplement à réessayer.
    if (Date.now() - FORM_LOADED_AT < DELAI_MINIMAL_MS) {
      afficherStatut(note, 'Merci de patienter un instant avant d’envoyer votre message.', '#c0392b');
      return;
    }

    // Garde-fou RGPD : pas d'envoi sans consentement explicite
    if (consent && !consent.checked) {
      afficherStatut(note, 'Merci de cocher la case de consentement avant d’envoyer votre message.', '#c0392b');
      relierErreur(consent, note);
      consent.focus();
      return;
    }
    delierErreur(consent, note);

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.65';
      submitBtn.innerHTML = 'Envoi en cours…';
    }

    try {
      const data = new FormData(form);
      const res = await fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        form.reset();
        afficherStatut(note, '✓ Message envoyé — réponse sous 24h ouvrées', 'var(--accent)');
        if (submitBtn) {
          submitBtn.innerHTML = 'Merci, à très vite !';
          submitBtn.style.opacity = '1';
        }
      } else {
        throw new Error('Échec envoi (' + res.status + ')');
      }
    } catch (err) {
      afficherStatut(note, '⚠ Une erreur est survenue. Réessaie ou écris à contact@alban-production.fr', '#c0392b');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.innerHTML = originalBtnHTML;
      }
    }
  };

})();
