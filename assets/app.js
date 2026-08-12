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
      clientEl.textContent = article.getAttribute('data-client') || '—';
      formatEl.textContent = article.getAttribute('data-format') || '—';
      briefEl.textContent = article.getAttribute('data-brief') || '—';
      challengesEl.textContent = article.getAttribute('data-challenges') || '—';
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('sp-locked');
    }

    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('sp-locked');
      videoSlot.innerHTML = '';
    }

    document.querySelectorAll('.sport-project').forEach(article => {
      article.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openModal(article);
      });
    });

    modal.querySelectorAll('[data-sp-close]').forEach(el => el.addEventListener('click', closeModal));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });
  })();

  // ——— Contact form → Formspree ———
  window.handleContactSubmit = async function(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const note = form.querySelector('.form-note');
    const originalNoteText = note ? note.textContent : '';
    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : '';

    // Garde-fou RGPD : pas d'envoi sans consentement explicite
    const consent = form.querySelector('#c-consent');
    if (consent && !consent.checked) {
      if (note) {
        note.textContent = 'Merci de cocher la case de consentement avant d’envoyer votre message.';
        note.style.color = '#c0392b';
      }
      consent.focus();
      return;
    }

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
        if (note) {
          note.textContent = '✓ Message envoyé — réponse sous 24h ouvrées';
          note.style.color = 'var(--accent)';
        }
        if (submitBtn) {
          submitBtn.innerHTML = 'Merci, à très vite !';
          submitBtn.style.opacity = '1';
        }
      } else {
        throw new Error('Échec envoi (' + res.status + ')');
      }
    } catch (err) {
      if (note) {
        note.textContent = '⚠ Une erreur est survenue. Réessaie ou écris à contact@alban-production.fr';
        note.style.color = '#c0392b';
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.innerHTML = originalBtnHTML;
      }
    }
  };

})();
