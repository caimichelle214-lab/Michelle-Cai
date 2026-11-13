/* =========================================================
   李杜 · 诗句互文
   data: assets/data.js  (window.LD)
   ========================================================= */
(function () {
  'use strict';

  var D = window.LD;
  if (!D) return;
  var M = D.meta, LP = D.lp, DP = D.dp, PAIRS = D.pairs;

  /* ---------- utils ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fmt = function (n) { return n.toLocaleString('en-US'); };
  var sim3 = function (s) { return (s / 10000).toFixed(3); };
  var pad2 = function (n) { return n < 10 ? '0' + n : '' + n; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function hi(text, q) {
    var t = esc(text);
    if (!q) return t;
    var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'g');
    return t.replace(re, '<mark>$1</mark>');
  }
  function debounce(fn, ms) {
    var t;
    return function () {
      var a = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, a); }, ms);
    };
  }
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- derived indices ---------- */
  var pairLineL = new Map(); // "poemIdx:lineIdx" -> [pairIdx]
  var pairLineD = new Map();
  for (var i = 0; i < PAIRS.length; i++) {
    var p = PAIRS[i];
    var kl = p[1] + ':' + p[2], kd = p[3] + ':' + p[4];
    if (!pairLineL.has(kl)) pairLineL.set(kl, []);
    pairLineL.get(kl).push(i);
    if (!pairLineD.has(kd)) pairLineD.set(kd, []);
    pairLineD.get(kd).push(i);
  }

  /* ---------- state ---------- */
  var state = {
    q: '',
    thr: 7000,
    sort: 'sim-desc',
    shown: 0,
    perPage: 24,
    focus: null,     // {poet:'l'|'d', idx:int}
    list: []         // pair indices currently filtered+sorted
  };

  /* =========================================================
     reveal & counters
     ========================================================= */
  var revealEls = $$('.reveal');
  revealEls.forEach(function (el, i) {
    el.style.setProperty('--d', Math.min(i % 6, 5) * 60 + 'ms');
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  revealEls.forEach(function (el) { io.observe(el); });

  var counted = new WeakSet();
  function animateCount(el) {
    if (counted.has(el)) return;
    counted.add(el);
    var target = parseFloat(el.getAttribute('data-count'));
    var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
    if (reduceMotion) {
      el.textContent = dec ? target.toFixed(dec) : fmt(target);
      return;
    }
    var start = performance.now(), dur = 1500;
    function frame(t) {
      var k = clamp((t - start) / dur, 0, 1);
      var e = 1 - Math.pow(1 - k, 3);
      var v = target * e;
      el.textContent = dec ? v.toFixed(dec) : fmt(Math.round(v));
      if (k < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { animateCount(en.target); cio.unobserve(en.target); }
    });
  }, { threshold: 0.4 });
  $$('[data-count]').forEach(function (el) { cio.observe(el); });

  /* =========================================================
     nav / progress / parallax
     ========================================================= */
  var nav = $('#nav'), progress = $('#progress');
  var cover = $('#cover');
  var figL = $('.cover__figure--libai'), figD = $('.cover__figure--dufu');

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    nav.classList.toggle('is-stuck', y > 40);
    var h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    if (!reduceMotion && cover && y < window.innerHeight * 1.4) {
      var k = Math.min(y / window.innerHeight, 1);
      figL.style.transform = 'translate3d(0,' + (k * 54) + 'px,0)';
      figD.style.transform = 'translate3d(0,' + (k * 54) + 'px,0)';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var navToggle = $('#navToggle');
  navToggle.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  $$('.nav__links a').forEach(function (a) {
    a.addEventListener('click', function () {
      nav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  var sections = $$('main section[id]');
  var navLinks = $$('.nav__links a');
  var activeObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var id = en.target.id;
      navLinks.forEach(function (a) {
        a.classList.toggle('is-on', a.getAttribute('href') === '#' + id);
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(function (s) { activeObs.observe(s); });

  /* =========================================================
     custom selects
     ========================================================= */
  $$('[data-select]').forEach(function (sel) {
    var btn = $('.select__btn', sel), list = $('.select__list', sel);
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = sel.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      $$('[data-select]').forEach(function (o) { if (o !== sel) o.classList.remove('is-open'); });
    });
    $$('li', list).forEach(function (li) {
      li.addEventListener('click', function () {
        $$('li', list).forEach(function (o) { o.setAttribute('aria-selected', 'false'); });
        li.setAttribute('aria-selected', 'true');
        sel.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  });
  document.addEventListener('click', function () {
    $$('[data-select]').forEach(function (s) { s.classList.remove('is-open'); });
  });

  /* =========================================================
     HISTOGRAM
     ========================================================= */
  var histCanvas = $('#histCanvas');
  var histTip = $('#histTip');
  var histCtx = histCanvas.getContext('2d');
  var histGeom = null;
  var histHover = -1;

  function drawHist() {
    var box = histCanvas.parentElement.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = Math.max(260, box.width), H = Math.max(180, box.height);
    histCanvas.width = Math.round(W * dpr);
    histCanvas.height = Math.round(H * dpr);
    histCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    histCtx.clearRect(0, 0, W, H);

    var pad = { l: 34, r: 6, t: 24, b: 30 };
    var iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    var n = D.hist.length, slot = iw / n, max = Math.max.apply(null, D.hist);
    var sqrtMax = Math.sqrt(max);
    var thrIdx = (state.thr - 7000) / 100;
    histGeom = { W: W, H: H, pad: pad, slot: slot, iw: iw, ih: ih };

    // gridlines (labels are counts, positions sqrt-scaled)
    histCtx.font = '9.5px "Iowan Old Style", Palatino, Georgia, serif';
    histCtx.textAlign = 'right';
    histCtx.textBaseline = 'middle';
    [0, 2000, 4000, 6000].forEach(function (v) {
      if (v > max) return;
      var y = pad.t + ih - (Math.sqrt(v) / sqrtMax) * ih;
      histCtx.strokeStyle = 'rgba(33,29,25,.07)';
      histCtx.lineWidth = 1;
      histCtx.beginPath();
      histCtx.moveTo(pad.l, Math.round(y) + .5);
      histCtx.lineTo(W - pad.r, Math.round(y) + .5);
      histCtx.stroke();
      histCtx.fillStyle = 'rgba(33,29,25,.34)';
      histCtx.fillText(fmt(v), pad.l - 8, y);
    });

    // bars
    for (var i = 0; i < n; i++) {
      var c = D.hist[i];
      var bh = c === 0 ? 0 : Math.max(1.5, (Math.sqrt(c) / sqrtMax) * ih * 0.92);
      var x = pad.l + i * slot;
      var y = pad.t + ih - bh;
      var w = Math.max(2, slot - 2.2);
      var active = (i + 1) > thrIdx;
      if (!active) {
        histCtx.fillStyle = i === histHover ? 'rgba(120,105,85,.7)' : 'rgba(120,105,85,.30)';
      } else {
        histCtx.fillStyle = i === histHover ? '#211d19' : '#a3352b';
        histCtx.globalAlpha = 0.9;
      }
      histCtx.fillRect(x + 1, y, w, bh);
      histCtx.globalAlpha = 1;
    }

    // baseline
    histCtx.strokeStyle = 'rgba(33,29,25,.35)';
    histCtx.lineWidth = 1;
    histCtx.beginPath();
    histCtx.moveTo(pad.l, pad.t + ih + .5);
    histCtx.lineTo(W - pad.r, pad.t + ih + .5);
    histCtx.stroke();

    // threshold line
    var tx = pad.l + clamp(thrIdx, 0, n) * slot;
    histCtx.strokeStyle = 'rgba(163,53,43,.75)';
    histCtx.setLineDash([3, 4]);
    histCtx.beginPath();
    histCtx.moveTo(tx, pad.t - 4);
    histCtx.lineTo(tx, pad.t + ih);
    histCtx.stroke();
    histCtx.setLineDash([]);
    histCtx.fillStyle = '#a3352b';
    histCtx.beginPath();
    histCtx.arc(tx, pad.t + ih, 3, 0, Math.PI * 2);
    histCtx.fill();
    histCtx.font = '10px "Iowan Old Style", Palatino, Georgia, serif';
    histCtx.textAlign = tx > W - 60 ? 'right' : 'left';
    histCtx.textBaseline = 'top';
    histCtx.fillStyle = '#a3352b';
    histCtx.fillText((state.thr / 10000).toFixed(3), tx + (tx > W - 60 ? -6 : 6), pad.t - 10);

    // x ticks
    histCtx.fillStyle = 'rgba(33,29,25,.4)';
    histCtx.textAlign = 'center';
    histCtx.textBaseline = 'top';
    histCtx.font = '9.5px "Iowan Old Style", Palatino, Georgia, serif';
    for (var t = 0; t <= 30; t += 5) {
      var xx = pad.l + t * slot;
      histCtx.fillText((0.70 + t / 100).toFixed(2), clamp(xx, pad.l + 12, W - 18), pad.t + ih + 9);
    }
  }

  function histPos(e) {
    var r = histCanvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function thrFromX(x) {
    var g = histGeom; if (!g) return state.thr;
    var idx = (x - g.pad.l) / g.slot;
    return clamp(Math.round(7000 + idx * 100), 7000, 10000);
  }

  histCanvas.addEventListener('pointermove', function (e) {
    if (!histGeom) return;
    var pos = histPos(e), g = histGeom;
    var idx = Math.floor((pos.x - g.pad.l) / g.slot);
    var inside = idx >= 0 && idx < D.hist.length && pos.y < g.H - g.pad.b + 12 && pos.y > 0;
    if (!inside) { histTip.hidden = true; if (histHover !== -1) { histHover = -1; drawHist(); } return; }
    if (idx !== histHover) { histHover = idx; drawHist(); }
    var lo = 0.70 + idx / 100, hi = lo + 0.01;
    histTip.innerHTML = '<b>' + fmt(D.hist[idx]) + ' 组</b><span>相似度 ' +
      lo.toFixed(2) + ' — ' + hi.toFixed(2) + '</span>';
    histTip.hidden = false;
    histTip.style.left = (g.pad.l + (idx + 0.5) * g.slot) + 'px';
    histTip.style.top = (pos.y - 6) + 'px';
  });
  histCanvas.addEventListener('pointerleave', function () {
    histTip.hidden = true;
    if (histHover !== -1) { histHover = -1; drawHist(); }
  });

  var dragging = false;
  histCanvas.addEventListener('pointerdown', function (e) {
    dragging = true;
    histCanvas.setPointerCapture(e.pointerId);
    var p = histPos(e);
    setThreshold(thrFromX(p.x));
  });
  histCanvas.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var p = histPos(e);
    setThreshold(thrFromX(p.x));
  });
  histCanvas.addEventListener('pointerup', function (e) {
    dragging = false;
    try { histCanvas.releasePointerCapture(e.pointerId); } catch (err) {}
  });
  histCanvas.addEventListener('pointercancel', function () { dragging = false; });

  /* =========================================================
     THRESHOLD plumbing
     ========================================================= */
  var thr = $('#thresh'), thr2 = $('#thresh2');
  var thrVal = $('#threshVal'), thrVal2 = $('#threshVal2');
  var thrCount = $('#threshCount');

  function countAt(thrRaw) {
    var c = 0;
    for (var i = 0; i < PAIRS.length; i++) if (PAIRS[i][0] >= thrRaw) c++;
    return c;
  }
  function setThreshold(v) {
    v = clamp(Math.round(v), 7000, 10000);
    if (v === state.thr) return;
    state.thr = v;
    var label = (v / 10000).toFixed(3);
    thr.value = v; thr2.value = v;
    thrVal.textContent = label; thrVal2.textContent = label;
    thrCount.textContent = fmt(countAt(v));
    drawHist();
    scheduleResults();
    if (renderChips) renderChips();
  }

  thr.addEventListener('input', function () { setThreshold(+thr.value); });
  thr2.addEventListener('input', function () { setThreshold(+thr2.value); });
  thrVal.textContent = thrVal2.textContent = (state.thr / 10000).toFixed(3);
  thrCount.textContent = fmt(PAIRS.length);

  /* =========================================================
     EXPLORER
     ========================================================= */
  var cardsEl = $('#cards'), moreBtn = $('#more'), moreCount = $('#moreCount'),
      resultCount = $('#resultCount'), loadNote = $('#loadNote'),
      activeChips = $('#activeChips'), searchEl = $('#search'), searchClear = $('#searchClear');

  function matchesQuery(p, q) {
    var L = LP[p[1]], Dp = DP[p[3]];
    return (L.t + L.lines[p[2]] + Dp.t + Dp.lines[p[4]]).indexOf(q) !== -1 ||
      (String(L.id).indexOf(q) !== -1) || (String(Dp.id).indexOf(q) !== -1);
  }

  function computeList() {
    var q = state.q.trim();
    var out = [];
    for (var i = 0; i < PAIRS.length; i++) {
      var p = PAIRS[i];
      if (p[0] < state.thr) continue;
      if (state.focus) {
        if (state.focus.poet === 'l' ? p[1] !== state.focus.idx : p[3] !== state.focus.idx) continue;
      }
      if (q && !matchesQuery(p, q)) continue;
      out.push(i);
    }
    var s = state.sort;
    if (s === 'sim-desc') out.sort(function (a, b) { return PAIRS[b][0] - PAIRS[a][0] || a - b; });
    else if (s === 'sim-asc') out.sort(function (a, b) { return PAIRS[a][0] - PAIRS[b][0] || a - b; });
    else if (s === 'l-id') out.sort(function (a, b) {
      return LP[PAIRS[a][1]].id - LP[PAIRS[b][1]].id || PAIRS[a][2] - PAIRS[b][2];
    });
    else if (s === 'd-id') out.sort(function (a, b) {
      return DP[PAIRS[a][3]].id - DP[PAIRS[b][3]].id || PAIRS[a][4] - PAIRS[b][4];
    });
    state.list = out;
    state.shown = 0;
  }

  function cardHTML(pi, q) {
    var p = PAIRS[pi], L = LP[p[1]], Dp = DP[p[3]];
    var sw = ((p[0] - 7000) / 3000) * 100;
    return '<article class="card" role="button" tabindex="0" data-pi="' + pi + '" aria-label="对照：' +
      esc(L.t) + ' 与 ' + esc(Dp.t) + '">' +
      '<div class="card__side">' +
        '<div class="card__meta"><span class="card__poet">李白</span>' +
        '<span class="card__title" title="' + esc(L.t) + '">' + hi(L.t, q) + '</span>' +
        '<span class="card__no" title="全唐诗序号">' + L.id + '</span></div>' +
        '<p class="card__line">' + hi(L.lines[p[2]], q) + '</p>' +
      '</div>' +
      '<div class="card__mid">' +
        '<div class="card__sim">' + sim3(p[0]) + '</div>' +
        '<div class="card__bar"><span style="width:' + sw.toFixed(1) + '%"></span></div>' +
      '</div>' +
      '<div class="card__side">' +
        '<div class="card__meta"><span class="card__poet card__poet--d">杜甫</span>' +
        '<span class="card__title" title="' + esc(Dp.t) + '">' + hi(Dp.t, q) + '</span>' +
        '<span class="card__no" title="全唐诗序号">' + Dp.id + '</span></div>' +
        '<p class="card__line">' + hi(Dp.lines[p[4]], q) + '</p>' +
      '</div>' +
    '</article>';
  }

  function appendCards(count) {
    var q = state.q.trim();
    var end = Math.min(state.list.length, state.shown + count);
    var html = '';
    for (var i = state.shown; i < end; i++) html += cardHTML(state.list[i], q);
    cardsEl.insertAdjacentHTML('beforeend', html);
    state.shown = end;
    var remain = state.list.length - state.shown;
    moreBtn.hidden = remain <= 0;
    moreCount.textContent = remain > 0 ? '（还剩 ' + fmt(remain) + ' 组）' : '';
    loadNote.textContent = state.list.length > 0
      ? '已显示 ' + fmt(state.shown) + ' / ' + fmt(state.list.length) + ' 组'
      : '';
  }

  function renderResults() {
    computeList();
    var q = state.q.trim();
    cardsEl.innerHTML = '';
    appendCards(state.perPage);
    resultCount.textContent = fmt(state.list.length) + ' 组对照' +
      (state.list.length !== PAIRS.length ? '（全部 ' + fmt(PAIRS.length) + ' 组）' : '');
    cardsEl.offsetHeight; // reflow for stagger
    // stagger animation
    Array.prototype.forEach.call(cardsEl.children, function (el, i) {
      el.style.animationDelay = Math.min(i, 12) * 22 + 'ms';
    });
    searchClear.hidden = !q;
  }

  var scheduleResults = debounce(renderResults, 70);

  moreBtn.addEventListener('click', function () { appendCards(state.perPage * 2); });

  cardsEl.addEventListener('click', function (e) {
    var card = e.target.closest('.card');
    if (card) openPair(+card.getAttribute('data-pi'));
  });
  cardsEl.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var card = e.target.closest('.card');
    if (!card) return;
    e.preventDefault();
    openPair(+card.getAttribute('data-pi'));
  });

  searchEl.addEventListener('input', debounce(function () {
    state.q = searchEl.value;
    renderResults();
    renderChips();
  }, 220));
  searchClear.addEventListener('click', function () {
    searchEl.value = ''; state.q = ''; renderResults(); renderChips(); searchEl.focus();
  });

  $$('#sortList li').forEach(function (li) {
    li.addEventListener('click', function () {
      state.sort = li.getAttribute('data-sort');
      $('#sortLabel').textContent = li.textContent;
      renderResults();
    });
  });

  var pickIdx = PAIRS.findIndex(function (p) {
    return LP[p[1]].lines[p[2]] === '何时一杯酒，' && DP[p[3]].lines[p[4]] === '何时一尊酒，';
  });
  var pickBtn = $('#pickPair');
  if (pickBtn) {
    pickBtn.addEventListener('click', function () {
      if (pickIdx >= 0) openPair(pickIdx);
    });
  }

  $('#shuffle').addEventListener('click', function () {
    if (!state.list.length) return;
    var pi = state.list[Math.floor(Math.random() * state.list.length)];
    openPair(pi);
  });

  function renderChips() {
    var chips = [];
    if (state.q.trim()) chips.push({ k: 'q', label: '检索「' + state.q.trim() + '」' });
    if (state.focus) {
      var poem = state.focus.poet === 'l' ? LP[state.focus.idx] : DP[state.focus.idx];
      chips.push({ k: 'focus', label: (state.focus.poet === 'l' ? '李白' : '杜甫') + '《' + poem.t + '》' });
    }
    if (state.thr > 7000) chips.push({ k: 'thr', label: '相似度 ≥ ' + (state.thr / 10000).toFixed(3) });
    activeChips.innerHTML = '';
    chips.forEach(function (c) {
      var el = document.createElement('span');
      el.className = 'chip';
      el.innerHTML = esc(c.label) + '<button aria-label="移除筛选">×</button>';
      el.querySelector('button').addEventListener('click', function () {
        if (c.k === 'q') { state.q = ''; searchEl.value = ''; }
        if (c.k === 'focus') { state.focus = null; }
        if (c.k === 'thr') { setThreshold(7000); }
        renderResults();
        renderChips();
      });
      activeChips.appendChild(el);
    });
    activeChips.hidden = chips.length === 0;
  }

  /* =========================================================
     POEM / PAIR detail modal
     ========================================================= */
  var modal = $('#modal'), modalBody = $('#modalBody'), panel = $('.modal__panel');
  var lastFocus = null;
  var modalStack = [];

  function openModal(html, variant) {
    lastFocus = document.activeElement;
    if (modalStack.length > 1) {
      html = '<button class="modal__back" type="button">← 返回上一组</button>' + html;
    }
    panel.classList.toggle('modal__panel--poem', variant === 'poem');
    modalBody.innerHTML = html;
    modal.hidden = false;
    var sw = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (sw > 0) document.body.style.paddingRight = sw + 'px';
    panel.scrollTop = 0;
    var back = $('.modal__back', modalBody);
    if (back) back.addEventListener('click', goBack);
    $('.modal__close').focus({ preventScroll: true });
  }

  function goBack() {
    if (modalStack.length < 2) return;
    modalStack.pop();
    var prev = modalStack[modalStack.length - 1];
    if (prev.kind === 'pair') openPair(prev.args[0], true);
    else openPoem(prev.args[0], prev.args[1], { back: true });
  }
  function closeModal() {
    modalStack = [];
    modal.hidden = true;
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  modal.addEventListener('click', function (e) {
    if (e.target.hasAttribute('data-close')) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });
  panel.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || modal.hidden) return;
    var f = Array.prototype.filter.call(
      panel.querySelectorAll('button,[href],input,[tabindex]:not([tabindex="-1"])'),
      function (el) { return el.offsetParent !== null; }
    );
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  function poemHTML(poet, poemIdx, hitLine) {
    var poem = poet === 'l' ? LP[poemIdx] : DP[poemIdx];
    var side = poet === 'l' ? pairLineL : pairLineD;
    var out = '';
    for (var k = 0; k < poem.lines.length; k++) {
      var key = poemIdx + ':' + k;
      var hits = side.get(key);
      var cls = 'poem__line';
      if (hits) cls += ' hit';
      if (k === hitLine) cls += ' is-pair';
      out += '<p class="' + cls + '"><span class="ln">' + pad2(k + 1) + '</span>' +
        esc(poem.lines[k]) + (hits ? '<span class="dot"></span>' : '') + '</p>';
    }
    return '<div class="poem ' + (poet === 'd' ? 'poem--d' : 'poem--l') + '" data-poet="' + poet + '" data-idx="' + poemIdx + '">' +
      '<div class="poem__head">' +
        '<div class="poem__poet"><i></i>' + (poet === 'l' ? '李白' : '杜甫') + '</div>' +
        '<h4 class="poem__title">' + esc(poem.t) + '</h4>' +
        '<div class="poem__meta">全唐诗 ' + poem.id + ' · ' + poem.n + ' 句 · 对照 ' + poem.m + ' 组</div>' +
      '</div>' +
      '<div class="poem__lines">' + out + '</div>' +
    '</div>';
  }

  function openPair(pi, isBack) {
    if (!isBack) modalStack.push({ kind: 'pair', args: [pi] });
    var p = PAIRS[pi], L = LP[p[1]], Dp = DP[p[3]];
    var w = ((p[0] - 7000) / 3000) * 100;
    var html =
      '<div class="detail">' +
        '<div class="detail__top">' +
          '<div>' +
            '<p class="detail__eyebrow">句级对照 · 全唐诗 ' + L.id + ' / ' + Dp.id + '</p>' +
            '<h3 class="detail__title">' + esc(L.t) + ' <span style="color:var(--ink-4)">×</span> ' + esc(Dp.t) + '</h3>' +
            '<p class="detail__sub">两边原诗并置，朱色为参与本次对照的诗句</p>' +
          '</div>' +
          '<div class="detail__sim"><b>' + sim3(p[0]) + '</b><span>相似度</span>' +
            '<i style="--w:' + w.toFixed(1) + '%"></i></div>' +
        '</div>' +
        '<div class="detail__cols">' +
          poemHTML('l', p[1], p[2]) +
          poemHTML('d', p[3], p[4]) +
        '</div>' +
        '<p class="detail__note">点击任一标记诗句，进入原诗查看该句的全部对照。</p>' +
      '</div>';
    openModal(html);
    // scroll to aligned line
    var target = modalBody.querySelector('.poem--l .is-pair') || modalBody.querySelector('.poem__line.hit');
    if (target && panel.clientWidth > 720) {
      requestAnimationFrame(function () {
        var pr = panel.getBoundingClientRect(), tr = target.getBoundingClientRect();
        var top = panel.scrollTop + (tr.top - pr.top) - panel.clientHeight * 0.3;
        panel.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
        target.classList.add('flash');
        setTimeout(function () { target.classList.remove('flash'); }, 1700);
      });
    }
    bindPoemLines();
  }

  /* ---------- single poem view ---------- */
  function openPoem(poet, poemIdx, opts) {
    opts = opts || {};
    if (!opts.back) modalStack.push({ kind: 'poem', args: [poet, poemIdx] });
    var poem = poet === 'l' ? LP[poemIdx] : DP[poemIdx];
    var side = poet === 'l' ? pairLineL : pairLineD;
    var lines = '';
    var firstHit = -1;
    for (var k = 0; k < poem.lines.length; k++) {
      var hits = side.get(poemIdx + ':' + k);
      if (hits && firstHit < 0) firstHit = k;
      lines += '<p class="' + (hits ? 'hit' : '') + '" data-k="' + k + '">' +
        '<span class="ln">' + pad2(k + 1) + '</span>' + esc(poem.lines[k]) +
        (hits ? '<span class="cnt">' + hits.length + '</span>' : '') + '</p>';
    }
    var label = poet === 'l' ? '李白' : '杜甫';
    var html =
      '<div class="pdetail">' +
        '<div class="pdetail__top">' +
          '<p class="detail__eyebrow">' + label + ' · 全唐诗 ' + poem.id + '</p>' +
          '<h3>' + esc(poem.t) + '</h3>' +
          '<div class="pdetail__meta">' +
            '<span>' + poem.n + ' 句</span>' +
            '<span>参与对照 <b>' + poem.m + '</b> 组</span>' +
            '<span>最高相似度 <b>' + (poem.b ? poem.b.toFixed(3) : '—') + '</b></span>' +
            '<span>对照句 ' + Array.from(side.keys()).filter(function (key) {
              return poemIdx === +key.split(':')[0];
            }).length + ' 处</span>' +
          '</div>' +
        '</div>' +
        '<div class="pdetail__body">' +
          '<div class="pdetail__lines">' + lines + '</div>' +
          '<div class="pdetail__side">' +
            '<h4>句级对照</h4>' +
            '<h5 id="sideTitle">点选左侧带标记的诗句</h5>' +
            '<div class="matchlist" id="sideList"><p class="side-empty">每一句都可能与另一首诗的某一句「撞」上。点击加亮行，看看对方写了什么。</p></div>' +
            '<div class="side-actions">' +
              '<button class="btn btn--ghost" id="focusBtn">在对照阅读中筛选此诗</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    openModal(html, 'poem');

    var lineEls = $$('.pdetail__lines p', modalBody);
    var sideList = $('#sideList', modalBody);
    var sideTitle = $('#sideTitle', modalBody);

    function showLine(k) {
      lineEls.forEach(function (el) { el.classList.toggle('is-on', +el.getAttribute('data-k') === k); });
      var hits = side.get(poemIdx + ':' + k) || [];
      sideTitle.textContent = '第 ' + (k + 1) + ' 句 · ' + hits.length + ' 组对照';
      var html2 = '';
      hits.slice().sort(function (a, b) { return PAIRS[b][0] - PAIRS[a][0]; }).forEach(function (pi) {
        var p = PAIRS[pi];
        var otherIsL = poet === 'd';
        var other = otherIsL ? LP[p[1]] : DP[p[3]];
        var otherLine = otherIsL ? LP[p[1]].lines[p[2]] : DP[p[3]].lines[p[4]];
        html2 += '<div class="match" data-pi="' + pi + '">' +
          '<div class="match__line">' + esc(otherLine) + '</div>' +
          '<div class="match__meta"><span>' + (otherIsL ? '李白' : '杜甫') + '《' + esc(other.t) + '》</span>' +
          '<em>' + sim3(p[0]) + '</em></div>' +
        '</div>';
      });
      sideList.innerHTML = html2 || '<p class="side-empty">此句未进入对照表。</p>';
      sideList.querySelectorAll('.match').forEach(function (m) {
        m.addEventListener('click', function () { openPair(+m.getAttribute('data-pi')); });
      });
    }
    lineEls.forEach(function (el) {
      el.addEventListener('click', function () {
        var k = +el.getAttribute('data-k');
        if (!side.get(poemIdx + ':' + k)) return;
        showLine(k);
      });
    });
    if (firstHit >= 0) showLine(firstHit);

    $('#focusBtn', modalBody).addEventListener('click', function () {
      state.focus = { poet: poet, idx: poemIdx };
      closeModal();
      renderResults();
      renderChips();
      document.getElementById('read').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* clicking a highlighted line in pair view opens its poem */
  function bindPoemLines() {
    $$('.poem__line.hit', modalBody).forEach(function (el) {
      el.addEventListener('click', function () {
        var poemEl = el.closest('.poem');
        openPoem(poemEl.getAttribute('data-poet'), +poemEl.getAttribute('data-idx'));
      });
    });
  }

  /* =========================================================
     NETWORK
     ========================================================= */
  var netCanvas = $('#netCanvas'), netStage = $('.net__stage'), netTip = $('#netTip');
  var netCtx = netCanvas.getContext('2d');
  var netNodes = [], netEdges = [], netHover = -1, netW = 0, netH = 0;
  var netAnim = 0, netStarted = false;

  function buildNet() {
    var rect = netStage.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    netW = Math.max(280, rect.width);
    netH = Math.max(400, rect.height);
    netCanvas.width = Math.round(netW * dpr);
    netCanvas.height = Math.round(netH * dpr);
    netCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var compact = netW < 720;
    var padY = compact ? 34 : 46;
    var xL = compact ? 54 : Math.max(150, netW * 0.19);
    var xR = compact ? netW - 54 : Math.min(netW - 150, netW * 0.81);

    var L = D.network.l.slice(0, 22).map(function (n) { return { idx: n[0], title: n[1], deg: n[2] }; });
    var R = D.network.d.slice(0, 22).map(function (n) { return { idx: n[0], title: n[1], deg: n[2] }; });
    var lById = new Map(), rById = new Map();
    L.forEach(function (n) { lById.set(n.idx, n); });
    R.forEach(function (n) { rById.set(n.idx, n); });

    var edges = D.network.e
      .filter(function (e) { return lById.has(e[0]) && rById.has(e[1]); })
      .map(function (e) { return { a: e[0], b: e[1], w: e[2], sim: e[3] }; });

    // barycentric ordering — pull strongly linked pairs into level bundles
    var lOrder = L.slice(), rOrder = R.slice();
    function bary(order, otherRank, pick) {
      var sum = new Map(), wsum = new Map();
      edges.forEach(function (e) {
        var me = pick === 'l' ? e.a : e.b;
        var other = pick === 'l' ? e.b : e.a;
        var r = otherRank.get(other);
        if (r == null) return;
        sum.set(me, (sum.get(me) || 0) + r * e.w);
        wsum.set(me, (wsum.get(me) || 0) + e.w);
      });
      order.forEach(function (n) {
        if (wsum.get(n.idx)) n.bary = sum.get(n.idx) / wsum.get(n.idx);
      });
      order.sort(function (a, b) { return (a.bary == null ? 1e9 : a.bary) - (b.bary == null ? 1e9 : b.bary); });
    }
    lOrder.forEach(function (n, i) { n.bary = i; });
    rOrder.forEach(function (n, i) { n.bary = i; });
    for (var it = 0; it < 4; it++) {
      bary(lOrder, new Map(rOrder.map(function (n, i) { return [n.idx, i]; })), 'l');
      bary(rOrder, new Map(lOrder.map(function (n, i) { return [n.idx, i]; })), 'r');
    }

    var maxDegL = Math.max.apply(null, L.map(function (n) { return n.deg; })) || 1;
    var maxDegD = Math.max.apply(null, R.map(function (n) { return n.deg; })) || 1;
    var nodes = [];
    lOrder.forEach(function (n, i) {
      nodes.push({
        x: xL, y: padY + (i + 0.5) * ((netH - padY * 2) / lOrder.length),
        side: 'l', idx: n.idx, title: n.title, deg: n.deg,
        r: 3.4 + Math.sqrt(n.deg / maxDegL) * 12
      });
    });
    rOrder.forEach(function (n, i) {
      nodes.push({
        x: xR, y: padY + (i + 0.5) * ((netH - padY * 2) / rOrder.length),
        side: 'd', idx: n.idx, title: n.title, deg: n.deg,
        r: 3.4 + Math.sqrt(n.deg / maxDegD) * 12
      });
    });
    netNodes = nodes;

    var li = new Map(), di = new Map();
    lOrder.forEach(function (n, i) { li.set(n.idx, i); });
    rOrder.forEach(function (n, i) { di.set(n.idx, i + lOrder.length); });
    netEdges = edges.map(function (e) {
      return { a: li.get(e.a), b: di.get(e.b), w: e.w, sim: e.sim };
    }).filter(function (e) { return e.a != null && e.b != null; });
    netEdges.sort(function (a, b) { return a.w - b.w; });
  }

  function drawNet(progress) {
    if (!netW) return;
    var ctx = netCtx, pr = progress == null ? 1 : progress;
    var compact = netW < 720;
    ctx.clearRect(0, 0, netW, netH);

    // side labels
    if (!compact) {
      ctx.font = '11px "Songti SC","Source Han Serif SC",serif';
      ctx.fillStyle = 'rgba(33,29,25,.28)';
      ctx.textAlign = 'left';
      ctx.fillText('李 白', 24, 30);
      ctx.textAlign = 'right';
      ctx.fillText('杜 甫', netW - 24, 30);
    }

    var maxW = netEdges.reduce(function (m, e) { return Math.max(m, e.w); }, 1);
    // edges
    netEdges.forEach(function (e) {
      var a = netNodes[e.a], b = netNodes[e.b];
      if (!a || !b) return;
      var hot = netHover === e.a || netHover === e.b;
      var alpha = (0.045 + Math.pow(e.w / maxW, 0.7) * 0.34) * pr;
      if (netHover >= 0) alpha = hot ? Math.min(0.75, alpha * 2.6) : alpha * 0.26;
      var t = clamp((e.sim - 0.75) / 0.16, 0, 1);
      ctx.strokeStyle = 'rgba(' + Math.round(120 + 43 * t) + ',' +
        Math.round(104 - 51 * t) + ',' + Math.round(84 - 41 * t) + ',' + alpha.toFixed(3) + ')';
      ctx.lineWidth = hot ? 0.7 + Math.pow(e.w / maxW, 0.8) * 3.4 : 0.45 + Math.pow(e.w / maxW, 0.8) * 2.4;
      var mx = (a.x + b.x) / 2;
      var my = (a.y + b.y) / 2 + (b.y - a.y) * 0.08;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx, my, b.x, b.y);
      ctx.stroke();
    });

    // nodes
    netNodes.forEach(function (n, i) {
      var hot = netHover === i;
      var related = netHover < 0 || hot || netEdges.some(function (e) {
        return (e.a === netHover && e.b === i) || (e.b === netHover && e.a === i);
      });
      var alpha = related ? 1 : 0.22;
      ctx.globalAlpha = alpha * pr;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * (hot ? 1.18 : 1), 0, Math.PI * 2);
      ctx.fillStyle = n.side === 'l' ? '#3a342d' : '#a3352b';
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(245,239,228,.9)';
      ctx.stroke();
      if (hot) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 5.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(163,53,43,.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    });

    // labels
    if (!compact) {
      ctx.font = '11.5px "Songti SC","Source Han Serif SC",serif';
      ctx.textBaseline = 'middle';
      netNodes.forEach(function (n, i) {
        var isL = n.side === 'l';
        var hot = netHover === i;
        var lit = netHover < 0 || hot;
        var label = n.title.length > 13 ? n.title.slice(0, 12) + '…' : n.title;
        ctx.textAlign = isL ? 'right' : 'left';
        ctx.fillStyle = lit
          ? (hot ? '#a3352b' : 'rgba(58,52,45,.82)')
          : 'rgba(58,52,45,.16)';
        ctx.fillText(label, n.x + (isL ? -(n.r + 10) : n.r + 10), n.y);
      });
    }
  }

  function startNet() {
    if (netStarted) return;
    netStarted = true;
    if (reduceMotion) { drawNet(1); return; }
    var t0 = performance.now();
    (function step(t) {
      var k = clamp((t - t0) / 1100, 0, 1);
      drawNet(1 - Math.pow(1 - k, 3));
      if (k < 1) requestAnimationFrame(step);
    })(performance.now());
  }

  var netIo = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { startNet(); if (!reduceMotion) netIo.disconnect(); }
    });
  }, { threshold: 0.15 });
  netIo.observe(netStage);

  function netHit(x, y) {
    var best = -1, bd = 24;
    for (var i = 0; i < netNodes.length; i++) {
      var n = netNodes[i];
      var d = Math.hypot(x - n.x, y - n.y) - n.r;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  netCanvas.addEventListener('pointermove', function (e) {
    var r = netCanvas.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    var hit = netHit(x, y);
    if (hit !== netHover) {
      netHover = hit;
      netCanvas.style.cursor = hit >= 0 ? 'pointer' : 'default';
      drawNet(1);
    }
    if (hit >= 0) {
      var n = netNodes[hit];
      var poem = n.side === 'l' ? LP[n.idx] : DP[n.idx];
      netTip.innerHTML = '<b>' + esc(poem.t) + '</b>' +
        '<em>' + (n.side === 'l' ? '李白' : '杜甫') + ' · 全唐诗 ' + poem.id + '</em>' +
        '<em>' + poem.n + ' 句 · 参与对照 ' + poem.m + ' 组' + (poem.b ? ' · 最高 ' + poem.b.toFixed(3) : '') + '</em>';
      netTip.hidden = false;
      netTip.style.left = clamp(x, 130, netW - 130) + 'px';
      netTip.style.top = y + 'px';
    } else {
      netTip.hidden = true;
    }
  });
  netCanvas.addEventListener('pointerleave', function () {
    netHover = -1; netTip.hidden = true; drawNet(1);
  });
  netCanvas.addEventListener('click', function (e) {
    var r = netCanvas.getBoundingClientRect();
    var hit = netHit(e.clientX - r.left, e.clientY - r.top);
    if (hit >= 0) {
      var n = netNodes[hit];
      openPoem(n.side, n.idx);
    }
  });

  /* =========================================================
     RANKINGS / WORDS / LIBRARY
     ========================================================= */
  function renderRank() {
    function rows(list, el, poet) {
      el.innerHTML = list.slice(0, 6).map(function (n) {
        var poem = poet === 'l' ? LP[n[0]] : DP[n[0]];
        return '<li data-poet="' + poet + '" data-idx="' + n[0] + '">' +
          '<span>' + esc(poem.t) + '</span><b>' + poem.m + '</b></li>';
      }).join('');
    }
    rows(D.network.l, $('#topL'), 'l');
    rows(D.network.d, $('#topD'), 'd');
    $$('.rank li').forEach(function (li) {
      li.addEventListener('click', function () {
        openPoem(li.getAttribute('data-poet'), +li.getAttribute('data-idx'));
      });
    });
  }

  function renderWords() {
    var cloud = $('#wordCloud');
    var max = D.bigrams[0][1], min = D.bigrams[D.bigrams.length - 1][1];
    var html = D.bigrams.map(function (b, i) {
      var k = Math.pow((b[1] - min) / Math.max(1, max - min), 0.62);
      var size = 13 + k * 34;
      var color = i < 3 ? 'var(--red)' : (b[1] > max * 0.35 ? 'var(--ink)' : 'var(--ink-2)');
      return '<button class="word" data-w="' + esc(b[0]) + '" title="' + b[1] +
        ' 组对照 · 平均相似度 ' + b[2].toFixed(3) + '" style="font-size:' + size.toFixed(1) +
        'px;color:' + color + ';opacity:' + (0.62 + k * 0.38).toFixed(2) + '">' +
        esc(b[0]) + '<sup>' + b[1] + '</sup></button>';
    }).join('');
    cloud.innerHTML = html;
    $$('.word', cloud).forEach(function (w) {
      w.addEventListener('click', function () {
        var word = w.getAttribute('data-w');
        state.q = word;
        state.focus = null;
        searchEl.value = word;
        setThreshold(7000);
        renderResults();
        renderChips();
        $('#read').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    });
  }

  var lib = { poet: 'l', q: '', sort: 'id', shown: 0, per: 45 };

  function libList() {
    var arr = (lib.poet === 'l' ? LP : DP).slice();
    if (lib.q.trim()) {
      var q = lib.q.trim();
      arr = arr.filter(function (p) {
        return p.t.indexOf(q) !== -1 || p.lines.some(function (l) { return l.indexOf(q) !== -1; }) ||
          String(p.id) === q;
      });
    }
    if (lib.sort === 'match') arr.sort(function (a, b) { return b.m - a.m || a.id - b.id; });
    else if (lib.sort === 'len') arr.sort(function (a, b) { return b.n - a.n || a.id - b.id; });
    else arr.sort(function (a, b) { return a.id - b.id; });
    return arr;
  }

  function renderLib(reset) {
    var arr = libList();
    var grid = $('#libGrid');
    if (reset) { grid.innerHTML = ''; lib.shown = 0; }
    var end = Math.min(arr.length, lib.shown + lib.per);
    var html = '';
    for (var i = lib.shown; i < end; i++) {
      var p = arr[i];
      html += '<article class="lib-card" data-idx="' + (lib.poet === 'l' ? LP.indexOf(p) : DP.indexOf(p)) + '" tabindex="0" role="button">' +
        '<h4 class="lib-card__t">' + esc(p.t) + '</h4>' +
        '<div class="lib-card__f"><span>全唐诗 <em>' + p.id + '</em></span>' +
        '<span class="lib-card__m' + (p.m ? '' : ' zero') + '"><i></i><em>' + p.m + '</em> 组</span></div>' +
      '</article>';
    }
    grid.insertAdjacentHTML('beforeend', html);
    lib.shown = end;
    var remain = arr.length - lib.shown;
    $('#libMore').hidden = remain <= 0;
    $('#libMoreCount').textContent = remain > 0 ? '（还剩 ' + fmt(remain) + ' 首）' : '';
    $('#libNote').textContent = arr.length
      ? '已显示 ' + fmt(lib.shown) + ' / ' + fmt(arr.length) + ' 首'
      : '没有找到匹配的诗作';
  }

  $('#libGrid').addEventListener('click', function (e) {
    var card = e.target.closest('.lib-card');
    if (card) openPoem(lib.poet, +card.getAttribute('data-idx'));
  });
  $('#libGrid').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var card = e.target.closest('.lib-card');
    if (card) openPoem(lib.poet, +card.getAttribute('data-idx'));
  });
  $('#libMore').addEventListener('click', function () { renderLib(false); });
  $('#libSearch').addEventListener('input', debounce(function () {
    lib.q = $('#libSearch').value; renderLib(true);
  }, 220));
  $$('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      $$('.tab').forEach(function (t) { t.classList.remove('is-on'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('is-on'); tab.setAttribute('aria-selected', 'true');
      lib.poet = tab.getAttribute('data-poet');
      renderLib(true);
    });
  });
  $$('#libSortList li').forEach(function (li) {
    li.addEventListener('click', function () {
      lib.sort = li.getAttribute('data-sort');
      $('#libSortLabel').textContent = li.textContent;
      renderLib(true);
    });
  });

  /* =========================================================
     INIT
     ========================================================= */
  function init() {
    drawHist();
    renderResults();
    renderChips();
    renderRank();
    renderWords();
    renderLib(true);
    buildNet();
    drawNet(1);
  }

  var rz = debounce(function () {
    drawHist();
    buildNet();
    drawNet(1);
  }, 180);
  window.addEventListener('resize', rz);
  new ResizeObserver(debounce(function () { drawHist(); }, 160)).observe(histCanvas.parentElement);
  new ResizeObserver(debounce(function () { buildNet(); drawNet(1); }, 160)).observe(netStage);

  init();
})();
