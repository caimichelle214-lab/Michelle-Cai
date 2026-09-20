/* ==========================================================================
   main.js — 语言切换 / 移动端导航 / 图片灯箱 / 页脚年份
   Language switching · mobile nav · gallery lightbox · footer year
   ========================================================================== */
(function () {
  'use strict';

  var STORAGE_KEY = 'cm-lang';
  var dict = window.I18N || { zh: {}, en: {} };

  /* ---------- language ---------- */

  function detectLang() {
    // 1) ?lang=xx in the URL   2) saved choice   3) browser language
    try {
      var q = new URLSearchParams(window.location.search).get('lang');
      if (q && dict[q]) return q;
    } catch (e) { /* very old browsers */ }

    try {
      var saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && dict[saved]) return saved;
    } catch (e) { /* private mode */ }

    var nav = (navigator.language || 'zh').toLowerCase();
    return nav.indexOf('zh') === 0 ? 'zh' : 'en';
  }

  function t(key, lang) {
    var table = dict[lang] || {};
    if (table[key] != null) return table[key];
    return (dict.zh && dict.zh[key]) || key;
  }

  function applyLang(lang) {
    if (!dict[lang]) lang = 'zh';

    document.documentElement.lang = (lang === 'zh' ? 'zh-CN' : 'en');
    document.documentElement.setAttribute('data-lang', lang);

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'), lang);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder'), lang));
    });

    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'), lang));
    });

    // <title> — the page declares which key it uses
    var titleKey = document.body && document.body.getAttribute('data-title-key');
    if (titleKey) {
      document.title = t(titleKey, lang) + ' · ' + t('site.name', lang);
    }

    // language buttons
    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      var on = btn.getAttribute('data-lang-btn') === lang;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    // gallery captions
    document.querySelectorAll('[data-cap-zh]').forEach(function (fig) {
      var cap = fig.querySelector('.cap-main');
      var sub = fig.querySelector('.cap-sub');
      var key = fig.getAttribute(lang === 'zh' ? 'data-cap-zh' : 'data-cap-en');
      var subKey = fig.getAttribute(lang === 'zh' ? 'data-capsub-zh' : 'data-capsub-en');
      if (cap && key) cap.textContent = t(key, lang);
      if (sub && subKey) sub.textContent = t(subKey, lang);
    });

    try { window.localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    document.documentElement.classList.add('i18n-ready');
    window.__lang = lang;
  }

  function initLang() {
    var lang = detectLang();
    applyLang(lang);
    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = btn.getAttribute('data-lang-btn');
        if (next !== window.__lang) applyLang(next);
      });
    });
  }

  /* ---------- mobile navigation ---------- */
  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    document.querySelectorAll('.nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        document.body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', function (e) {
      if (!document.body.classList.contains('nav-open')) return;
      if (e.target.closest('.nav') || e.target.closest('.nav-toggle')) return;
      document.body.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 820) document.body.classList.remove('nav-open');
    });
  }

  /* ---------- gallery lightbox ---------- */
  function initLightbox() {
    var figures = Array.prototype.slice.call(document.querySelectorAll('.gallery figure'));
    if (!figures.length) return;

    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.innerHTML =
      '<button class="lb-close" type="button" aria-label="Close">✕</button>' +
      '<button class="lb-nav lb-prev" type="button" aria-label="Previous">‹</button>' +
      '<button class="lb-nav lb-next" type="button" aria-label="Next">›</button>' +
      '<div><img alt=""><div class="lb-cap"></div></div>';
    document.body.appendChild(box);

    var img = box.querySelector('img');
    var cap = box.querySelector('.lb-cap');
    var index = 0;
    var lastFocus = null;

    function captionOf(fig) {
      var lang = window.__lang === 'en' ? 'en' : 'zh';
      var key = fig.getAttribute(lang === 'en' ? 'data-cap-en' : 'data-cap-zh');
      return key ? t(key, lang) : '';
    }

    function show(i) {
      index = (i + figures.length) % figures.length;
      var fig = figures[index];
      var source = fig.querySelector('img');
      if (!source) return;
      img.src = source.getAttribute('data-full') || source.src;
      img.alt = source.alt || '';
      cap.textContent = captionOf(fig);
    }

    function open(i) {
      lastFocus = document.activeElement;
      show(i);
      box.classList.add('open');
      document.body.style.overflow = 'hidden';
      box.querySelector('.lb-close').focus();
    }

    function close() {
      box.classList.remove('open');
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    figures.forEach(function (fig, i) {
      fig.setAttribute('tabindex', '0');
      fig.setAttribute('role', 'button');
      fig.addEventListener('click', function () { open(i); });
      fig.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
      });
    });

    box.querySelector('.lb-close').addEventListener('click', close);
    box.querySelector('.lb-prev').addEventListener('click', function (e) { e.stopPropagation(); show(index - 1); });
    box.querySelector('.lb-next').addEventListener('click', function (e) { e.stopPropagation(); show(index + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });

    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
  }

  /* ---------- footer year ---------- */
  function initYear() {
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    initLang();
    initNav();
    initLightbox();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
