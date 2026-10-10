(function () {
  var run = function (ALP) {
  'use strict';
  var S = ALP.state, K = ALP.canvas, T = ALP.tokens, C = T.color, px = ALP.px, E = ALP.vr, TOUR = ALP.tour, U = ALP.util;
  function P() { return ALP.project() || {}; }

  U.extend(ALP.icons, {
    minimize: 'M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
    doorOpen: 'M13 4v16H4V6l9-2zM13 4h6v16h-6M10 12v1.5',
    trendUp: 'M3 17l6-6 4 4 8-8M15 7h6v6',
    ruler: 'M3 15L15 3l6 6L9 21zM7 11l2 2M11 7l2 2M13 15l2 2',
    square: 'M4 4h16v16H4z',
    maximize: 'M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5',
    zap: 'M13 2L4 14h7l-1 8 9-12h-7z',
    sparkles: 'M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8zM19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z',
    chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    users: 'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-2a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8',
    arrowUp: 'M12 20V4M5 11l7-7 7 7',
    sides: 'M3 5h4v14H3zM17 5h4v14h-4zM10 12h4',
    sound: 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
    soundOff: 'M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6',
    layout: 'M3 4h18v16H3zM3 10h18M9 10v10',
    sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
    layoutGrid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    calculator: 'M6 2h12v20H6zM9 6h6M8.5 11h.5M12 11h.5M15.5 11h.5M8.5 15h.5M12 15h.5M15.5 15h.5M8.5 19h7',
    phone: 'M5 3h4l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z',
    mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
    zoom: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5M8.5 11h5M11 8.5v5',
    arrowL: 'M19 12H5M11 6l-6 6 6 6'
  });

  /* ---------- widgets, tuned to the Parklinks glass language ---------- */
  var W = ALP.ui = {};
  W.font = function (deg, weight, family) { return (weight || 400) + ' ' + px(deg) + 'px ' + (family || T.font.ui); };
  W.wa = function (a, b, t) { return a + (b - a) * t; };
  W.alpha = function (a) { return 'rgba(255,255,255,' + a + ')'; };
  W.cream = function (a) { return 'rgba(245,242,236,' + a + ')'; };
  W.pop = function (ctx, x, y, w, h, grow, shrink) {
    var s = 1 + grow - shrink, cx = x + w / 2, cy = y + h / 2;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
  };

  W.text = function (ctx, str, x, y, o) {
    o = o || {};
    ctx.font = W.font(o.size || T.size.body, o.weight, o.family);
    K.spacing(ctx, o.track === undefined ? 0 : o.track * px(o.size || T.size.body));
    ctx.fillStyle = o.color || C.text;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'alphabetic';
    var s = String(str === undefined || str === null ? '' : str);
    if (o.upper) s = s.toUpperCase();
    if (o.maxW) s = K.fit(ctx, s, o.maxW);
    ctx.fillText(s, x, y);
    var w = ctx.measureText(s).width;
    K.spacing(ctx, 0);
    return w;
  };
  W.measure = function (ctx, str, o) {
    o = o || {};
    ctx.font = W.font(o.size || T.size.body, o.weight, o.family);
    K.spacing(ctx, o.track === undefined ? 0 : o.track * px(o.size || T.size.body));
    var w = ctx.measureText(o.upper ? String(str).toUpperCase() : String(str)).width;
    K.spacing(ctx, 0);
    return w;
  };
  W.para = function (ctx, str, x, y, maxW, o) {
    o = o || {};
    ctx.font = W.font(o.size || T.size.body, o.weight || 300, o.family);
    var lines = K.wrap(ctx, str, maxW), lh = o.lh || Math.round(px(o.size || T.size.body) * 1.75);
    if (o.maxLines && lines.length > o.maxLines) { lines = lines.slice(0, o.maxLines); lines[lines.length - 1] = K.fit(ctx, lines[lines.length - 1] + ' ...', maxW); }
    ctx.fillStyle = o.color || W.cream(0.8); ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'alphabetic';
    for (var i = 0; i < lines.length; i++) ctx.fillText(lines[i], o.align === 'center' ? x : x, y + i * lh);
    return lines.length * lh;
  };
  W.paraHeight = function (ctx, str, maxW, o) {
    o = o || {};
    ctx.font = W.font(o.size || T.size.body, o.weight || 300, o.family);
    var n = K.wrap(ctx, str, maxW).length;
    if (o.maxLines) n = Math.min(n, o.maxLines);
    return n * (o.lh || Math.round(px(o.size || T.size.body) * 1.75));
  };

  // dark glass plate: fill, hairline border, inner top highlight, soft drop shadow
  W.glass = function (ctx, x, y, w, h, r, o) {
    o = o || {};
    r = r === undefined ? T.radius : r;
    ctx.save();
    if (o.shadow !== false) { ctx.shadowColor = 'rgba(0,0,0,' + (o.shadowAlpha || 0.6) + ')'; ctx.shadowBlur = o.shadowBlur || 46; ctx.shadowOffsetY = o.shadowY || 16; }
    K.roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = o.fill || C.panel; ctx.fill();
    ctx.restore();
    ctx.save();
    K.roundRect(ctx, x, y, w, h, r); ctx.clip();
    var g = ctx.createLinearGradient(0, y, 0, y + Math.min(h, 4));
    g.addColorStop(0, W.alpha(o.highlight === undefined ? 0.1 : o.highlight)); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, 4);
    ctx.restore();
    K.roundRect(ctx, x, y, w, h, r);
    ctx.lineWidth = o.lineWidth || 2; ctx.strokeStyle = o.line || C.line; ctx.stroke();
  };

  // stadium button. kinds: ghost (dark glass), invert (cream on dark text), accent (mint), plain
  W.pill = function (ctx, ui, id, x, y, w, h, label, o) {
    o = o || {};
    var hov = ui.lift(id, x, y, w, h) * (o.disabled ? 0 : 1);
    var prs = ui.press(id) * (o.disabled ? 0 : 1);
    var kind = o.kind || 'ghost', r = o.radius === undefined ? h / 2 : o.radius;
    W.pop(ctx, x, y, w, h, hov * 0.018, prs * 0.05);
    ctx.save();
    if (kind === 'accent' && !o.disabled) { ctx.shadowColor = 'rgba(52,211,153,' + (0.35 + 0.1 * hov) + ')'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; }
    K.roundRect(ctx, x, y, w, h, r);
    var txt;
    if (kind === 'accent') { ctx.fillStyle = C.accent; txt = C.onAccent; }
    else if (kind === 'invert') { ctx.fillStyle = 'rgb(' + Math.round(W.wa(242, 255, hov)) + ',' + Math.round(W.wa(241, 255, hov)) + ',' + Math.round(W.wa(238, 255, hov)) + ')'; txt = '#0C0C0D'; }
    else if (kind === 'plain') { ctx.fillStyle = W.alpha(W.wa(0.03, 0.1, hov)); txt = C.text; }
    else { ctx.fillStyle = 'rgba(10,10,10,' + W.wa(0.85, 0.95, hov * 0) + ')'; txt = C.text; }
    ctx.fill();
    ctx.restore();
    if (kind === 'ghost' && hov > 0.01) {
      K.roundRect(ctx, x, y, w, h, r);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.95 * hov) + ')'; ctx.fill();
      txt = '#000000';
    }
    if (prs > 0.01) { K.roundRect(ctx, x, y, w, h, r); ctx.fillStyle = W.alpha(0.18 * prs); ctx.fill(); }
    if (kind !== 'accent' && kind !== 'invert') {
      K.roundRect(ctx, x, y, w, h, r);
      ctx.lineWidth = 2; ctx.strokeStyle = kind === 'ghost' ? W.alpha(W.wa(0.12, 1, hov)) : W.alpha(W.wa(0.1, 0.3, hov));
      ctx.stroke();
    }
    if (o.disabled) txt = C.text3;
    var size = o.size || T.size.button, iconS = Math.round(px(size) * 1.3), tw = 0;
    var lbl = o.upper === false ? String(label) : String(label).toUpperCase();
    tw = W.measure(ctx, lbl, { size: size, weight: o.weight || 500, track: o.track === undefined ? 0.15 : o.track }) + (o.icon ? iconS + 14 : 0);
    var sx = o.align === 'left' ? x + (o.pad || 24) : x + (w - tw) / 2;
    if (o.icon) { ALP.drawIcon(ctx, o.icon, sx, y + (h - iconS) / 2, iconS, txt, 1.7); sx += iconS + 14; }
    W.text(ctx, lbl, sx, y + h / 2 + px(size) * 0.36, { size: size, weight: o.weight || 500, track: o.track === undefined ? 0.15 : o.track, color: txt });
    ctx.restore();
    return hov > 0.5;
  };

  W.roundBtn = function (ctx, ui, id, cx, cy, r, icon, o) {
    o = o || {};
    var hov = o.disabled ? 0 : ui.lift(id, cx - r - 8, cy - r - 8, r * 2 + 16, r * 2 + 16);
    var prs = o.disabled ? 0 : ui.press(id);
    var rr = r * (1 + hov * 0.07 - prs * 0.1);
    ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.fillStyle = o.active ? C.accent : (hov > 0.01 ? W.alpha(W.wa(0.06, 0.95, hov)) : 'rgba(10,10,10,.85)');
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = o.active ? C.accent : W.alpha(W.wa(0.15, 1, hov)); ctx.stroke();
    var col = o.active ? C.onAccent : (hov > 0.5 ? '#000000' : C.text);
    var sz = Math.round(rr * 1.0);
    ctx.save();
    if (o.rotate) { ctx.translate(cx, cy); ctx.rotate(o.rotate * hov); ctx.translate(-cx, -cy); }
    ALP.drawIcon(ctx, icon, cx - sz / 2, cy - sz / 2, sz, col, 1.9);
    ctx.restore();
    return hov > 0.5;
  };

  W.divider = function (ctx, x, y, w, a) { ctx.fillStyle = W.alpha(a === undefined ? 0.08 : a); ctx.fillRect(x, y, w, 2); };
  W.rule = function (ctx, cx, y, w) { ctx.fillStyle = W.alpha(0.2); ctx.fillRect(cx - w / 2, y, w, 2); };

  W.chip = function (ctx, ui, id, x, y, w, h, label, o) {
    o = o || {};
    var hov = id ? ui.lift(id, x, y, w, h) : 0, prs = id ? ui.press(id) : 0;
    K.roundRect(ctx, x, y, w, h, o.radius === undefined ? h / 2 : o.radius);
    if (o.active) { ctx.fillStyle = C.accent; }
    else { ctx.fillStyle = W.alpha(W.wa(0.06, 0.16, hov) + 0.1 * prs); }
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = o.active ? C.accent : W.alpha(W.wa(0.14, 0.32, hov)); ctx.stroke();
    W.text(ctx, label, x + w / 2, y + h / 2 + px(o.size || T.size.small) * 0.36, {
      size: o.size || T.size.small, weight: o.active ? 700 : 400, align: 'center',
      color: o.active ? C.onAccent : C.text, maxW: w - 20, upper: o.upper, track: o.track
    });
    return hov > 0.5;
  };

  W.eyebrow = function (ctx, label, x, y, o) {
    o = o || {};
    return W.text(ctx, label, x, y, { size: o.size || T.size.micro, weight: 500, track: 0.16, upper: true, color: o.color || C.text3, align: o.align, maxW: o.maxW });
  };

  W.statCard = function (ctx, x, y, w, h, icon, label, value) {
    K.roundRect(ctx, x, y, w, h, 16);
    ctx.fillStyle = W.alpha(0.04); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = W.alpha(0.07); ctx.stroke();
    var is = px(T.size.small);
    ALP.drawIcon(ctx, icon, x + 18, y + 16, is, C.text3, 1.8);
    W.eyebrow(ctx, label, x + 18 + is + 10, y + 16 + is * 0.82, { maxW: w - 40 - is });
    W.text(ctx, value, x + 18, y + h - 18, { size: T.size.value, weight: 500, color: C.text, maxW: w - 36 });
  };

  W.wordmark = function (ctx, str, cx, y, deg, track) {
    return W.text(ctx, str, cx, y, { size: deg, weight: 400, family: T.font.brand, track: track === undefined ? 0.3 : track, align: 'center', color: C.white });
  };

  // a picture with a canvas filter applied once and kept; filtering on every repaint is slow in a headset browser
  var filteredCache = {};
  W.filtered = function (url, filter) {
    var e = ALP.img(url);
    if (!e || e.state !== 'ok') return null;
    var key = filter + '|' + url;
    if (filteredCache[key]) return filteredCache[key];
    var c = document.createElement('canvas');
    c.width = e.el.naturalWidth; c.height = e.el.naturalHeight;
    var g = c.getContext('2d');
    g.filter = filter;
    g.drawImage(e.el, 0, 0);
    filteredCache[key] = c;
    return c;
  };
  W.logo = function (ctx, url, x, y, w, h, alpha) {
    var src = W.filtered(url, 'brightness(0) invert(1)');
    if (!src) return false;
    var iw = src.width, ih = src.height, sc = Math.min(w / iw, h / ih);
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.drawImage(src, x + (w - iw * sc) / 2, y + (h - ih * sc) / 2, iw * sc, ih * sc);
    ctx.restore();
    return true;
  };

  W.FURNISH_H = 142;
  W.furnishBar = function (ctx, ui, x, y, w) {
    var h = 116, bw = (w - 36) / 2;
    W.glass(ctx, x + 2, y + 2, w - 4, h - 4, (h - 4) / 2, { fill: 'rgba(12,10,9,.9)', line: W.alpha(0.09), shadowBlur: 54, shadowY: 22 });
    W.chip(ctx, ui, 'fur:on', x + 14, y + 18, bw, 80, 'Furnished', { active: ALP.state.furnished, size: T.size.small, track: 0.14, upper: true });
    W.chip(ctx, ui, 'fur:off', x + 22 + bw, y + 18, bw, 80, 'Unfurnished', { active: !ALP.state.furnished, size: T.size.small, track: 0.14, upper: true });
    return W.FURNISH_H;
  };

  W.widthFor = function (p, fallbackDeg) {
    var o = (ALP.config.layout && ALP.config.layout[p.id]) || null;
    // 'design' is the size the panel was drawn for; 'deg' is how big it is shown. Without 'design' they are the same.
    var deg = (o && (o.design || o.deg)) || (p.layout && (p.layout.design || p.layout.deg)) || fallbackDeg || 30;
    return Math.round(deg * T.ppd);
  };

  var mctx = null;
  W.mctx = function () { return mctx || (mctx = document.createElement('canvas').getContext('2d')); };

  /* ---------- one journey: the playlist index is the single source of truth ---------- */
  var A = ALP.actions = {};
  A.places = function () { return P().places || []; };
  A.place = function (id) {
    var l = A.places();
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  };
  A.current = function () { return A.place(S.placeId) || A.places()[0] || null; };
  A.indexOf = function (id) {
    var l = A.places();
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return i;
    return -1;
  };
  A.hasPair = function (pl) { return !!pl && pl.dressed !== undefined && pl.undressed !== undefined; };
  A.mediaOf = function (pl, furnished) {
    if (!pl) return null;
    return A.hasPair(pl) ? (furnished ? pl.dressed : pl.undressed) : pl.media;
  };
  A.placeForMedia = function (i) {
    var l = A.places();
    for (var k = 0; k < l.length; k++) {
      var pl = l[k];
      if (pl.media === i) return { place: pl, furnished: null };
      if (pl.dressed === i) return { place: pl, furnished: true };
      if (pl.undressed === i) return { place: pl, furnished: false };
      // a place shown in one finish only: any other panorama of it sends you to the one that is shown
      if (pl.instead && pl.instead.indexOf(i) !== -1) return { place: pl, furnished: null, redirect: pl.media };
    }
    return null;
  };
  A.section = function (id) {
    var s = P().sections || [];
    for (var i = 0; i < s.length; i++) if (s[i].id === id) return s[i];
    return { id: id, label: '' };
  };
  A.floor = function (id) {
    var l = P().floors || [];
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  };
  A.unit = function (id) {
    var l = P().units || [];
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  };
  A.currentFloor = function () { var pl = A.current(); return pl && pl.floor ? A.floor(pl.floor) : null; };
  A.currentUnit = function () { var pl = A.current(); return pl && pl.unit ? A.unit(pl.unit) : null; };
  A.blueprint = function (u, id) {
    if (!u) return null;
    for (var i = 0; i < u.blueprints.length; i++) if (u.blueprints[i].id === id) return u.blueprints[i];
    return null;
  };
  A.lot = function (id) {
    var l = P().lots || [];
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  };

  // the veil dims the panorama (never the interface) while the tour swaps scenes
  var pending = null, veilTimer = null, liftTimer = null;
  function veil(amount) {
    S.veil = amount;
    clearTimeout(veilTimer);
    if (amount) veilTimer = setTimeout(function () { S.veil = 0; pending = null; }, 2600);
  }
  function liftVeil(delay) {
    clearTimeout(liftTimer);
    liftTimer = setTimeout(function () { S.veil = 0; clearTimeout(veilTimer); }, delay === undefined ? 320 : delay);
  }
  A.arrive = function (pl, quiet) {
    if (!pl || quiet || S.screen !== 'tour') return;
    S.arrival = { id: pl.id, until: Date.now() + 3400 };
    E.dirty('arrival');
  };
  A.sync = function (i) {
    var r = A.placeForMedia(i);
    if (pending !== null && i === pending) { pending = null; liftVeil(); }
    if (!r) return;
    if (r.redirect !== undefined && r.redirect !== null) { pending = r.redirect; TOUR.goMediaKeepView(r.redirect); }
    var moved = r.place.id !== S.placeId;
    S.placeId = r.place.id;
    if (r.furnished !== null) S.furnished = r.furnished;
    var u = A.currentUnit();
    if (moved || !S.blueprintId) S.blueprintId = u && u.blueprints.length ? u.blueprints[0].id : '';
    if (moved) {
      S.lotOverride = '';
      S.detailOpen = !!r.place.unit;
      S.infoOn = false;
      S.calcOn = S.calcOn && !!r.place.unit;
      A.arrive(r.place);
    }
    E.wake();
    ALP.bus.emit('change', { placeId: S.placeId, furnished: S.furnished });
  };
  A.go = function (id) {
    var pl = A.place(id); if (!pl) return;
    var target = A.mediaOf(pl, S.furnished);
    if (target === null || target === undefined) return;
    if (target === TOUR.playlistIndex()) { A.arrive(pl); return; }
    if (S.mapOn && ALP.mall3d) ALP.mall3d.close();
    pending = target;
    veil(1);
    setTimeout(function () { TOUR.goMedia(target); }, 230);
  };
  A.step = function (dir) {
    var l = A.places(), i = A.indexOf(S.placeId);
    var n = U.clamp(i + dir, 0, l.length - 1);
    if (n !== i) A.go(l[n].id);
  };
  A.setFurnished = function (v) {
    var pl = A.current();
    if (!A.hasPair(pl)) { ALP.toast(pl.label + ' has one finish only'); return; }
    if (S.furnished === !!v) return;
    S.furnished = !!v;
    var target = A.mediaOf(pl, S.furnished);
    pending = target;
    veil(0.55);
    setTimeout(function () { TOUR.goMediaKeepView(target); }, 160);
    ALP.bus.emit('change', { furnished: S.furnished });
  };
  A.setBlueprint = function (id) {
    var u = A.currentUnit(), bp = A.blueprint(u, id);
    if (!bp || bp.disabled) { ALP.toast((bp ? bp.label : 'That fit-out') + ' is not available yet'); return; }
    S.blueprintId = id;
    if (!S.furnished) A.setFurnished(true);
    ALP.bus.emit('change', { blueprintId: id });
  };
  A.openOnly = function (key) {
    S.galleryOn = key === 'gallery'; S.aboutOn = key === 'about'; S.contactOn = key === 'contact';
    S.unitInfoOn = key === 'unitinfo'; S.videoOn = key === 'video';
    if (key !== 'gallery') S.galleryIndex = -1;
    if (key) { S.uiHidden = false; if (S.mapOn && ALP.mall3d) ALP.mall3d.close(); }
    ALP.bus.emit('change', { overlayKey: key });
  };
  A.openMap = function () {
    if (ALP.mall3d) ALP.mall3d.toggle();
    else ALP.toast('The 3D mall map is not loaded');
  };
  A.syncDesktopLanding = function () {
    try {
      var b = document.getElementsByTagName('button'), i;
      for (i = 0; i < b.length; i++) {
        var t = (b[i].innerText || '').toUpperCase();
        if (t.indexOf('SKIP DIRECTLY TO TOUR') === 0) { b[i].click(); return true; }
      }
      if (typeof window.renderParklinksHUDMenus === 'function') window.renderParklinksHUDMenus();
    } catch (e) {}
    return false;
  };
  A.enterTour = function () {
    A.syncDesktopLanding();
    ALP.go('tour');
    var i = TOUR.playlistIndex();
    if (i < 0 || !A.placeForMedia(i)) { A.go('overview'); return; }
    A.sync(i);
    A.arrive(A.current());
  };

  TOUR.onMediaChange(function (i) { if (i >= 0) A.sync(i); });

  /* ---------- keep the tour's own globals working, both ways ---------- */
  var mine = {};
  A.mirror = function (name, args) {
    var f = mine[name] && mine[name].prev;
    if (typeof f === 'function') { try { f.apply(window, args || []); } catch (e) {} }
  };
  function wrap(name, after) {
    var cur = window[name];
    if (cur === (mine[name] && mine[name].self)) return;
    var prev = typeof cur === 'function' ? cur : null;
    var self = function () {
      if (prev) { try { prev.apply(window, arguments); } catch (e) {} }
      try { after.apply(null, arguments); } catch (e) { ALP.warn(name, e); }
    };
    mine[name] = { self: self, prev: prev };
    window[name] = self;
  }
  function hookGlobals() {
    // 3DVista calls this on every scene for its desktop popup; in the headset the place card waits for Info instead
    wrap('revealLotPopup', function (id) { S.lastLot = id; });
    wrap('hideLotPopup', function () { if (S.lotOverride) { S.lotOverride = ''; ALP.bus.emit('change', { lot: '' }); } });
    wrap('showMallInfoPopup', function (d) { S.unitInfoData = d || null; A.openOnly('unitinfo'); });
    wrap('closeMallInfoPopup', function () { if (S.unitInfoOn) A.openOnly(null); });
    wrap('enterFloorNavigation', function () { S.detailOpen = true; ALP.bus.emit('change', {}); });
    wrap('enterUnitNavigation', function () { S.detailOpen = true; ALP.bus.emit('change', {}); });
    wrap('toggleImmersiveCalculator', function () { S.calcOn = !S.calcOn; });
    wrap('openParklinksMediaGalleryPopup', function () { A.openOnly('gallery'); });
    wrap('openParklinksAboutPopupLegacy', function () { A.openOnly('about'); });
    wrap('openParklinksContactLeasingPopup', function () { A.openOnly('contact'); });
  }
  hookGlobals();
  setTimeout(hookGlobals, 600);
  setTimeout(hookGlobals, 1800);
  setInterval(hookGlobals, 4000);

  /* ---------- offline copy: the same download as the page button (alp-offline.js), pressed from inside the headset ---------- */
  if (!ALP.icons.download) ALP.icons.download = 'M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14';
  if (!ALP.icons.pause) ALP.icons.pause = 'M9 6v12M15 6v12';
  function offApi() { var o = window.ALPOffline; try { return o && o.status && o.status().supported ? o : null; } catch (e) { return null; } }
  function offSize(n) {
    if (n >= 1073741824) return (n / 1073741824).toFixed(1) + ' GB';
    return n >= 10485760 ? Math.round(n / 1048576) + ' MB' : (n / 1048576).toFixed(1) + ' MB';
  }
  function offInfo() {
    var o = offApi();
    if (!o) return null;
    var s = o.status(), r = { state: s.state, label: 'Download for offline', sub: 'Saves the whole tour on this headset, to open without internet', icon: 'download', bar: -1 };
    if (s.state === 'working') {
      r.label = s.total ? 'Downloading ' + s.percent + '%' : 'Preparing download';
      r.sub = s.note || (offSize(s.done) + ' of ' + offSize(s.total) + '. Press to pause, or keep exploring');
      r.icon = 'pause'; r.bar = s.total ? s.percent : 0;
    } else if (s.state === 'paused') { r.label = 'Resume download'; r.sub = s.note || 'Carries on where it stopped'; }
    else if (s.state === 'error') { r.label = 'Try the download again'; r.sub = s.note || 'The download stopped'; r.icon = 'alert'; }
    else if (s.state === 'update') { r.label = 'Update offline copy'; r.sub = 'The tour online is newer than the copy on this headset'; }
    else if (s.state === 'ready') { r.label = navigator.onLine === false ? 'Offline copy in use' : 'Available offline'; r.sub = 'Saved on this headset. It opens without internet'; r.icon = 'check'; }
    return r;
  }
  A.offlineInfo = offInfo;
  A.offlinePress = function () {
    var o = offApi();
    if (!o) return;
    var s = o.status().state;
    if (s === 'working') { o.stop(); ALP.toast('Download paused'); }
    else if (s === 'ready') ALP.toast(navigator.onLine === false ? 'Using the copy saved on this headset' : 'The tour is saved on this headset');
    else { o.start(); ALP.toast('Downloading the tour. You can keep exploring'); }
    E.dirty();
  };
  // one row: the button, a thin progress line while it works, and a short line under it
  W.offline = function (ctx, ui, id, x, y, w, h) {
    var r = offInfo();
    if (!r) return 0;
    W.pill(ctx, ui, id, x, y, w, h, r.label, { kind: 'plain', icon: r.icon, size: T.size.micro, weight: 500, track: 0.2 });
    if (r.state === 'ready') { K.roundRect(ctx, x, y, w, h, h / 2); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(52,211,153,.8)'; ctx.stroke(); }
    if (r.bar >= 0) {
      var bx = x + h / 2, bw = w - h, by = y + h - 9;
      K.roundRect(ctx, bx, by, bw, 4, 2); ctx.fillStyle = W.alpha(0.12); ctx.fill();
      K.roundRect(ctx, bx, by, Math.max(4, bw * r.bar / 100), 4, 2); ctx.fillStyle = C.accent; ctx.fill();
    }
    W.text(ctx, r.sub, x + w / 2, y + h + 36, { size: T.size.micro, weight: 300, color: W.alpha(0.55), align: 'center', maxW: w + 120 });
    return 1;
  };
  W.offlineHeight = function (h) { return offApi() ? h + 52 + 30 : 0; };
  // repaint the panels showing it when the download moves on, and say when it ends while the visitor is in the tour
  var offWatch = { t: 0, key: '', state: '' };
  E.addFrame(function () {
    var now = Date.now();
    if (now - offWatch.t < 400) return;
    offWatch.t = now;
    var o = offApi();
    if (!o) return;
    var s = o.status(), key = s.state + '|' + s.percent + '|' + s.note;
    if (key === offWatch.key) return;
    offWatch.key = key;
    E.dirty('landing'); E.dirty('help');
    if (offWatch.state === 'working' && s.state !== 'working') {
      if (s.state === 'ready') ALP.toast('Download complete. The tour now opens without internet', 5000);
      else if (s.state === 'error') ALP.toast('The download stopped: ' + (s.note || 'try again from Help'), 5000);
    }
    offWatch.state = s.state;
  });

  /* ---------- landing ---------- */
  var LD = { pad: 64 };
  E.panel('landing', {
    order: 56, modal: true, dim: 0.62,
    layout: { yaw: 0, y: -0.01, dist: 1.95, deg: 46 },
    show: function (s) { return s.screen === 'start' && !s.videoOn ? 1 : 0; },
    measure: function () {
      var w = W.widthFor(this, 46), L = P().landing || {};
      var th = W.paraHeight(W.mctx(), L.story || '', w - LD.pad * 2 - 120, { size: T.size.body });
      this.px = [w, LD.pad * 2 + px(T.size.display) + 34 + px(T.size.micro) + 30 + 2 + 30 + th + 44 + 104 + 22 + 74 + 40 + W.offlineHeight(74) + 70];
    },
    draw: function (ctx, ui) {
      var w = this.px[0], h = this.px[1], L = P().landing || {}, cx = w / 2, i;
      ctx.save();
      K.roundRect(ctx, 2, 2, w - 4, h - 4, 26); ctx.clip();
      var zoom = 1 + ui.anim('zoom', 0.06, 0.6), bg = W.filtered(L.image, 'brightness(0.5) saturate(120%)');
      if (bg) {
        var bx = -w * 0.08, by = -h * 0.08, bw = w * 1.16, bh = h * 1.16;
        var bs = Math.max(bw / bg.width, bh / bg.height) * zoom, dw = bg.width * bs, dh = bg.height * bs;
        ctx.drawImage(bg, bx + (bw - dw) / 2, by + (bh - dh) / 2, dw, dh);
      } else K.image(ctx, L.image, -w * 0.08, -h * 0.08, w * 1.16, h * 1.16, 'cover', zoom);
      var rg = ctx.createRadialGradient(cx, h / 2, 0, cx, h / 2, Math.max(w, h) * 0.62);
      rg.addColorStop(0, 'rgba(5,5,5,.55)'); rg.addColorStop(1, 'rgba(5,5,5,.88)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
      ctx.restore();
      K.roundRect(ctx, 2, 2, w - 4, h - 4, 26);
      ctx.lineWidth = 2; ctx.strokeStyle = W.alpha(0.07); ctx.stroke();

      var y = LD.pad + px(T.size.display) * 0.82;
      W.wordmark(ctx, L.title || 'PARKLINKS', cx + px(T.size.display) * 0.15, y, T.size.display, 0.3);
      y += 34;
      W.text(ctx, L.tagline || '', cx, y + px(T.size.micro), { size: T.size.micro, track: 0.4, upper: true, align: 'center', color: W.alpha(0.45) });
      y += px(T.size.micro) + 30;
      W.rule(ctx, cx, y, 88);
      y += 2 + 30;
      ctx.textAlign = 'center';
      y += W.para(ctx, L.story || '', cx, y + px(T.size.body), w - LD.pad * 2 - 120, { size: T.size.body, align: 'center', color: W.alpha(0.78), lh: Math.round(px(T.size.body) * 1.8) });
      ctx.textAlign = 'left';
      y += 44;
      var bw = Math.round(W.measure(ctx, L.watch || 'WATCH INTRODUCTION', { size: T.size.button, weight: 600, track: 0.27 }) + 120);
      W.pill(ctx, ui, 'watch', cx - bw / 2, y, bw, 104, L.watch || 'WATCH INTRODUCTION', { kind: 'invert', size: T.size.button, weight: 600, track: 0.27 });
      y += 104 + 22;
      W.pill(ctx, ui, 'skip', cx - 290, y, 580, 74, L.skip || 'SKIP DIRECTLY TO TOUR', { kind: 'plain', size: T.size.micro, weight: 500, track: 0.28 });
      y += 74 + 40;
      if (W.offline(ctx, ui, 'offline', cx - 290, y - 10, 580, 74)) y += W.offlineHeight(74);
      W.divider(ctx, LD.pad, y, w - LD.pad * 2, 0.08);
      var logos = L.logos || [], lw = 150, gap = 70, total = logos.length * lw + (logos.length - 1) * gap, lx = cx - total / 2;
      for (i = 0; i < logos.length; i++) { W.logo(ctx, logos[i], lx, y + 18, lw, 46, 0.68); lx += lw + gap; }
    },
    onPress: function (id) {
      if (id === 'watch') { A.openOnly('video'); return; }
      if (id === 'skip') A.enterTour();
      if (id === 'offline') A.offlinePress();
    }
  });

  /* ---------- project selection: first screen, and from the side menu ---------- */
  function projects() { return P().projects || []; }
  function projectById(id) { var l = projects(), i; for (i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  function currentProject() { var l = projects(), i; for (i = 0; i < l.length; i++) if (l[i].current) return l[i]; return l[0] || null; }
  function hashParam(key) {
    var h = (location.hash || '').slice(1).split('&'), i;
    for (i = 0; i < h.length; i++) { var kv = h[i].split('='); if (kv[0] === key) return kv.length > 1 ? decodeURIComponent(kv[1]) : ''; }
    return null;
  }
  // someone who already picked this project on another tour's picker lands straight on the welcome card
  function pickerWanted() {
    var cfg = P().projectPicker, cur = currentProject();
    if (!cfg || !cfg.first || projects().length < 2) return false;
    if (cur && hashParam('alp-project') === cur.id) return false;
    return true;
  }
  var PJ = { dom: null, leaving: null };
  function inTour(pj) { return !!(pj && !pj.current && ALP.scopes && ALP.scopes[pj.id] && ALP.activate); }
  function projectUrl(pj) {
    var inVR = E.isPresenting();
    return pj.url.split('#')[0] + '#alp-project=' + encodeURIComponent(pj.id) + (inVR ? '&alp-vr=1' : '');
  }
  A.navigate = function (url) { window.location.assign(url); };
  function stopLeaving(msg) {
    if (!PJ.leaving) return;
    var name = PJ.leaving.name;
    PJ.leaving = null; S.leaving = '';
    clearTimeout(PJ.guard);
    if (S.overlay === 'leaving') ALP.closeOverlay();
    if (PJ.dom) { PJ.dom.className = 'on'; var n = PJ.dom.getElementsByClassName('pj-note')[0]; if (n) n.textContent = msg ? msg.replace('%s', name) : ''; }
    if (msg) ALP.toast(msg.replace('%s', name), 3200);
  }
  A.chooseProject = function (id) {
    var pj = projectById(id);
    if (!pj || PJ.leaving) return;
    if (pj.current) {
      hideDomPicker();
      if (S.overlay === 'projects') ALP.closeOverlay();
      if (S.screen === 'projects') ALP.go('start', {}, { replace: true });
      ALP.bus.emit('projects:chosen', { id: id });
      return;
    }
    // a project whose files are pasted into this same tour opens in place: no page change, VR stays on
    if (inTour(pj)) {
      hideDomPicker();
      if (S.overlay === 'projects') ALP.closeOverlay();
      ALP.log('opening project inside this tour:', pj.id);
      ALP.activate(pj.id, { chosen: true });
      return;
    }
    PJ.leaving = pj;
    S.leaving = pj.name;
    if (E.isPresenting()) ALP.openOverlay('leaving');
    domLeaving(pj);
    var target = projectUrl(pj);
    ALP.log('opening project', pj.id, target);
    ALP.bus.emit('projects:leaving', { id: pj.id, url: target });
    setTimeout(function () { A.navigate(target); }, E.isPresenting() ? 700 : 260);
    // still here after a while: the connection dropped, so hand the choice back
    clearTimeout(PJ.guard);
    PJ.guard = setTimeout(function () { stopLeaving('%s did not open. Check the connection and try again.'); }, 15000);
  };
  // coming back with the browser's Back button can restore this page as it was left
  window.addEventListener('pageshow', function (ev) { if (ev && ev.persisted) stopLeaving(''); });
  A.openProjects = function () { ALP.openOverlay('projects'); };

  // the same choice on the page itself, above the tour's own welcome card
  function ensureFonts() {
    if (document.getElementById('alp-pj-fonts')) return;
    var l = document.createElement('link');
    l.id = 'alp-pj-fonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Marcellus&family=Inter:wght@300;400;500;600&display=swap';
    document.head.appendChild(l);
  }
  function domCss() {
    return [
      '#alp-projects{position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:28px;box-sizing:border-box;',
      'background:radial-gradient(ellipse at center,rgba(12,12,12,.74) 0%,rgba(5,5,5,.95) 70%);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);',
      'font-family:Inter,Arial,sans-serif;color:#F2F0EC;opacity:0;transition:opacity .5s ease;overflow:auto}',
      '#alp-projects.on{opacity:1}',
      '#alp-projects .pj-wrap{width:100%;max-width:1080px;text-align:center}',
      '#alp-projects .pj-eyebrow{font-size:11px;letter-spacing:.34em;text-transform:uppercase;color:rgba(242,240,236,.5)}',
      '#alp-projects .pj-title{font-family:Marcellus,Georgia,serif;font-size:44px;letter-spacing:.18em;text-transform:uppercase;margin:18px 0 12px;font-weight:400}',
      '#alp-projects .pj-rule{width:88px;height:1px;background:rgba(255,255,255,.22);margin:0 auto 14px}',
      '#alp-projects .pj-sub{font-size:14px;font-weight:300;color:rgba(242,240,236,.7);margin-bottom:34px}',
      '#alp-projects .pj-grid{display:flex;gap:28px;justify-content:center}',
      '#alp-projects .pj-card{flex:1 1 0;max-width:500px;border-radius:26px;overflow:hidden;background:rgba(18,18,18,.86);border:1px solid rgba(255,255,255,.1);',
      'box-shadow:0 30px 70px rgba(0,0,0,.5);cursor:pointer;text-align:left;transition:transform .25s ease,border-color .25s ease;padding:0;color:inherit;font:inherit}',
      '#alp-projects .pj-card:hover{transform:translateY(-4px);border-color:rgba(255,255,255,.35)}',
      '#alp-projects .pj-img{height:230px;background-size:cover;background-position:center;position:relative}',
      '#alp-projects .pj-img:after{content:"";position:absolute;left:0;right:0;bottom:0;height:60%;background:linear-gradient(to top,rgba(18,18,18,.95),rgba(18,18,18,0))}',
      '#alp-projects .pj-badge{position:absolute;left:18px;top:18px;z-index:1;background:#34D399;color:#062B1E;font-size:10px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;padding:7px 12px;border-radius:999px}',
      '#alp-projects .pj-body{padding:4px 28px 28px}',
      '#alp-projects .pj-brand{font-size:11px;letter-spacing:.26em;text-transform:uppercase;color:rgba(242,240,236,.5)}',
      '#alp-projects .pj-name{font-family:Marcellus,Georgia,serif;font-size:30px;letter-spacing:.1em;text-transform:uppercase;margin:8px 0 4px}',
      '#alp-projects .pj-place{font-size:13px;font-weight:300;color:rgba(242,240,236,.65);margin-bottom:22px}',
      '#alp-projects .pj-go{display:inline-block;background:#F2F1EE;color:#0C0C0D;border-radius:999px;padding:13px 26px;font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase}',
      '#alp-projects .pj-card.alt .pj-go{background:transparent;color:#F2F0EC;border:1px solid rgba(255,255,255,.35)}',
      '#alp-projects .pj-note{margin-top:26px;min-height:16px;font-size:12px;color:rgba(242,240,236,.55);letter-spacing:.12em;text-transform:uppercase}',
      '#alp-projects.leaving .pj-card{pointer-events:none;opacity:.55}',
      '#alp-projects .pj-close{position:absolute;right:26px;top:22px;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(18,18,18,.7);color:#F2F0EC;font-size:24px;line-height:40px;cursor:pointer;padding:0}',
      '#alp-projects .pj-close:hover{border-color:rgba(255,255,255,.6)}',
      '#alp-projects .pj-vr{display:inline-flex;align-items:center;gap:12px;margin:0 auto 30px;padding:13px 28px 13px 22px;border-radius:999px;border:1px solid rgba(255,255,255,.35);background:rgba(18,18,18,.7);',
      'color:#F2F0EC;font-family:Inter,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;cursor:pointer;transition:background .2s ease,color .2s ease,border-color .2s ease}',
      '#alp-projects .pj-vr:hover{background:#F2F1EE;color:#0C0C0D;border-color:#F2F1EE}',
      '#alp-projects .pj-vr svg{display:block}',
      '@media (max-width:760px){#alp-projects .pj-grid{flex-direction:column;align-items:center}#alp-projects .pj-card{width:100%}#alp-projects .pj-title{font-size:30px}#alp-projects .pj-img{height:170px}}'
    ].join('');
  }
  function buildDomPicker(mode) {
    if (!document.body) return;
    if (PJ.dom) { var old = PJ.dom; PJ.dom = null; if (old.parentNode) old.parentNode.removeChild(old); }
    ensureFonts();
    if (!document.getElementById('alp-projects-css')) { var st = document.createElement('style'); st.id = 'alp-projects-css'; st.textContent = domCss(); document.head.appendChild(st); }
    var cfg = P().projectPicker || {}, list = projects(), i, menu = mode === 'menu';
    var root = document.createElement('div'); root.id = 'alp-projects';
    var html = (menu ? '<button type="button" class="pj-close" aria-label="Close">' + String.fromCharCode(215) + '</button>' : '') +
      '<div class="pj-wrap"><button type="button" class="pj-vr"><svg viewBox="0 0 24 24" width="22" height="22"><path d="' + ALP.icons.vr + '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path></svg><span>Enter VR</span></button>' +
      '<div class="pj-eyebrow">' + (cfg.eyebrow || '') + '</div><div class="pj-title">' + (cfg.title || 'Choose a Project') + '</div>' +
      '<div class="pj-rule"></div><div class="pj-sub">' + (cfg.subtitle || '') + '</div><div class="pj-grid">';
    for (i = 0; i < list.length; i++) {
      var pj = list[i];
      html += '<button type="button" class="pj-card' + (pj.current ? '' : ' alt') + '" data-pj="' + pj.id + '">' +
        '<div class="pj-img" style="background-image:url(' + U.rawUrl(ALP.cardImage(pj) || '') + '),linear-gradient(135deg,#232325,#0c0c0d)">' + (pj.current ? '<span class="pj-badge">You are here</span>' : '') + '</div>' +
        '<div class="pj-body"><div class="pj-brand">' + (pj.brand || '') + '</div><div class="pj-name">' + pj.name + '</div>' +
        '<div class="pj-place">' + (pj.place || '') + '</div><span class="pj-go">' + (pj.current ? (menu ? 'Continue Tour' : 'Enter Tour') : 'Open Tour') + '</span></div></button>';
    }
    html += '</div><div class="pj-note"></div></div>';
    root.innerHTML = html;
    var cards = root.getElementsByClassName('pj-card');
    for (i = 0; i < cards.length; i++) {
      cards[i].onclick = (function (id) { return function (ev) { if (ev) ev.stopPropagation(); A.chooseProject(id); }; })(cards[i].getAttribute('data-pj'));
    }
    // always here, on every device: a headset goes straight in, anything else is told how to get there
    root.getElementsByClassName('pj-vr')[0].onclick = function (ev) { if (ev) ev.stopPropagation(); if (E.enterFromPage) E.enterFromPage(); else E.enterVR(); };
    if (menu) {
      root.getElementsByClassName('pj-close')[0].onclick = function (ev) { if (ev) ev.stopPropagation(); hideDomPicker(); };
      root.onclick = function (ev) { if (ev && ev.target === root && !PJ.leaving) hideDomPicker(); };
    }
    PJ.dom = root; PJ.mode = mode || 'first';
    mountDom();
    setTimeout(function () { if (PJ.dom === root) root.className = 'on'; }, 30);
    if (!PJ.timer) PJ.timer = setInterval(mountDom, 800);
  }
  // the tour moves its interface into the fullscreen element; follow it so the picker stays on top
  function mountDom() {
    var d = PJ.dom;
    if (!d) return;
    var host = document.fullscreenElement || document.webkitFullscreenElement || document.body;
    if (d.parentNode !== host) { try { host.appendChild(d); } catch (e) {} }
  }
  function hideDomPicker() {
    var d = PJ.dom;
    if (!d) return;
    PJ.dom = null;
    d.className = '';
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 520);
  }
  function domLeaving(pj) {
    if (!PJ.dom) buildDomPicker('menu');
    var d = PJ.dom;
    if (!d) return;
    d.className = 'on leaving';
    var n = d.getElementsByClassName('pj-note')[0];
    if (n) n.textContent = 'Opening ' + pj.name + String.fromCharCode(8230);
  }
  A.openDomPicker = function () { buildDomPicker('menu'); };
  A.closeDomPicker = hideDomPicker;
  // for a button in the tour itself: Execute JavaScript  openParklinksProjectPicker()
  // whichever project is open shows its own picker
  window.openParklinksProjectPicker = function () { var AA = (window.ALP && window.ALP.actions && window.ALP.actions.openDomPicker) ? window.ALP.actions : A; if (E.isPresenting()) AA.openProjects(); else AA.openDomPicker(); };
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && PJ.dom && PJ.mode === 'menu' && !PJ.leaving) hideDomPicker(); });
  // a small Projects button on the page, so the choice is always one click away outside VR too
  var PB = { el: null, skip: null };
  function landingOpen() {
    if (!PB.skip || !PB.skip.isConnected) {
      PB.skip = null;
      var b = document.getElementsByTagName('button'), i;
      for (i = 0; i < b.length; i++) if ((b[i].innerText || '').toUpperCase().indexOf('SKIP DIRECTLY TO TOUR') === 0) { PB.skip = b[i]; break; }
    }
    return !!(PB.skip && shown(PB.skip));
  }
  function pageButton() {
    var cfg = P().projectPicker || {};
    if (cfg.pageButton !== true || !document.body) return;
    if (!PB.el) {
      var css = document.createElement('style'); css.id = 'alp-pj-btn-css';
      css.textContent = '#alp-pj-btn{position:fixed;left:20px;top:20px;z-index:2147483000;display:flex;align-items:center;gap:10px;padding:11px 18px 11px 14px;border-radius:999px;' +
        'border:1px solid rgba(255,255,255,.16);background:rgba(20,20,20,.84);color:#F2F0EC;font-family:Inter,Arial,sans-serif;font-size:11px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;' +
        'cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.35);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);transition:opacity .3s ease,border-color .2s ease}' +
        '#alp-pj-btn:hover{border-color:rgba(255,255,255,.5)}#alp-pj-btn svg{display:block}';
      document.head.appendChild(css);
      var el = document.createElement('button'); el.id = 'alp-pj-btn'; el.type = 'button'; el.setAttribute('aria-label', 'Choose a project');
      el.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="' + ALP.icons.layoutGrid + '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"></path></svg><span>' + (cfg.buttonLabel || 'Projects') + '</span>';
      el.onclick = function (ev) { if (ev) ev.stopPropagation(); A.openDomPicker(); };
      PB.el = el;
    }
    var show = !PJ.dom && !E.isPresenting() && S.screen !== 'projects' && !landingOpen() && ALP.isActive();
    var host = document.fullscreenElement || document.webkitFullscreenElement || document.body;
    if (PB.el.parentNode !== host) { try { host.appendChild(PB.el); } catch (e) {} }
    PB.el.style.display = show ? 'flex' : 'none';
  }
  if (projects().length > 1) setInterval(pageButton, 700);

  // this project's page interface steps aside while another project of the same tour is open
  try {
    var roots = P().pageRoots || [], rcss = '', ri;
    for (ri = 0; ri < roots.length; ri++) rcss += 'html[data-alp-project]:not([data-alp-project="' + ALP.scopeId + '"]) ' + roots[ri] + '{display:none !important}';
    if (rcss && !document.getElementById('alp-roots-' + ALP.scopeId)) { var rst = document.createElement('style'); rst.id = 'alp-roots-' + ALP.scopeId; rst.textContent = rcss; document.head.appendChild(rst); }
  } catch (e) {}

  // the first screen. chosen: this project was picked on another project's picker in the same tour, so go straight to the welcome card
  function boot(chosen) {
    if (!chosen && pickerWanted()) {
      ALP.go('projects', {}, { replace: true });
      if (document.body) buildDomPicker('first'); else document.addEventListener('DOMContentLoaded', function () { buildDomPicker('first'); });
      return;
    }
    if (chosen) {
      ALP.go('start', {}, { replace: true });
      TOUR.goMedia(P().startMedia);
      ALP.bus.emit('projects:chosen', { id: (currentProject() || {}).id });
    }
  }
  if (ALP.isActive()) boot(false);
  ALP.bus.on('project:enter', function (d) { boot(!!(d && d.opts && d.opts.chosen)); });
  ALP.bus.on('project:leave', function () {
    hideDomPicker();
    A.openOnly(null);
    if (S.mapOn && ALP.mall3d) ALP.mall3d.close();
    S.veil = 0; S.onboard = null; S.detailOpen = false; S.infoOn = false; S.calcOn = false; S.lotOverride = '';
    // leaving Parklinks stops the intro film downloading, as entering the tour does
    if (vid && !unloaded) { S.videoOn = false; unloaded = true; vidState = 'idle'; try { vid.pause(); vid.removeAttribute('src'); vid.load(); } catch (e) {} }
  });

  // in the headset
  var PK = { pad: 60, gap: 40 };
  function pickerCard(ctx, ui, pj, x, y, cw, chh, i) {
    var id = 'pj:' + pj.id, hov = ui.lift(id, x, y, cw, chh), prs = ui.press(id), ent = ui.stagger(i, 0.08);
    ctx.save(); ctx.globalAlpha = ent;
    var lift = hov * 8 - prs * 4, ih = Math.round(cw * 0.52);
    ctx.save();
    K.roundRect(ctx, x, y - lift, cw, chh, 28); ctx.clip();
    ctx.fillStyle = 'rgba(18,18,18,.92)'; ctx.fillRect(x, y - lift, cw, chh);
    var ie = ALP.img(ALP.cardImage(pj));
    if (!ie || ie.state === 'error') {
      var fg = ctx.createLinearGradient(x, y - lift, x + cw, y - lift + ih);
      fg.addColorStop(0, '#232325'); fg.addColorStop(1, '#0c0c0d');
      ctx.fillStyle = fg; ctx.fillRect(x, y - lift, cw, ih);
      W.text(ctx, (pj.name || '').toUpperCase(), x + cw / 2, y - lift + ih * 0.5, { size: T.size.heading, family: T.font.brand, track: 0.24, align: 'center', color: W.alpha(0.16), maxW: cw - 60 });
    } else K.image(ctx, ALP.cardImage(pj), x, y - lift, cw, ih, 'cover', 1 + hov * 0.05);
    var g = ctx.createLinearGradient(0, y - lift + ih, 0, y - lift + ih * 0.35);
    g.addColorStop(0, 'rgba(18,18,18,1)'); g.addColorStop(1, 'rgba(18,18,18,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y - lift + ih * 0.35, cw, ih * 0.65 + 2);
    ctx.restore();
    K.roundRect(ctx, x, y - lift, cw, chh, 28);
    ctx.lineWidth = 2; ctx.strokeStyle = W.alpha(W.wa(0.1, 0.45, hov)); ctx.stroke();
    if (pj.current) W.chip(ctx, null, null, x + 26, y - lift + 26, 230, 52, 'You are here', { active: true, size: T.size.micro, upper: true, track: 0.16 });
    var ty = y - lift + ih + 6;
    W.eyebrow(ctx, pj.brand || '', x + 34, ty + px(T.size.micro));
    W.text(ctx, pj.name, x + 34, ty + px(T.size.micro) + 20 + px(T.size.heading), { size: T.size.heading, family: T.font.brand, track: 0.1, upper: true, color: C.white, maxW: cw - 68 });
    W.text(ctx, pj.place || '', x + 34, ty + px(T.size.micro) + 20 + px(T.size.heading) + 20 + px(T.size.small), { size: T.size.small, weight: 300, color: C.text2 });
    var bw = 290;
    W.pill(ctx, ui, 'go:' + pj.id, x + 34, y - lift + chh - 34 - 84, bw, 84, pj.current ? 'Enter Tour' : 'Open Tour', { kind: pj.current ? 'invert' : 'ghost', size: T.size.micro, weight: 600, track: 0.2 });
    ctx.restore();
  }
  E.panel('projects', {
    order: 58, modal: true, dim: 0.66,
    layout: { yaw: 0, y: 0, dist: 2.0, deg: 58 },
    show: function (s) { return (s.screen === 'projects' || s.overlay === 'projects') && s.overlay !== 'leaving' && s.overlay !== 'audio' ? 1 : 0; },
    measure: function () {
      var w = W.widthFor(this, 58), n = Math.max(1, projects().length);
      var cw = (w - PK.pad * 2 - PK.gap * (n - 1)) / n;
      this.cardH = Math.round(cw * 0.52) + 6 + px(T.size.micro) + 20 + px(T.size.heading) + 20 + px(T.size.small) + 40 + 84 + 34;
      this.px = [w, PK.pad + 200 + this.cardH + PK.pad];
    },
    draw: function (ctx, ui) {
      var w = this.px[0], h = this.px[1], cfg = P().projectPicker || {}, list = projects(), i;
      W.glass(ctx, 2, 2, w - 4, h - 4, 30, { fill: 'rgba(10,10,10,.92)', line: W.alpha(0.1), shadowBlur: 70, shadowY: 26 });
      W.text(ctx, cfg.eyebrow || '', w / 2, PK.pad + px(T.size.micro), { size: T.size.micro, track: 0.34, upper: true, align: 'center', color: W.alpha(0.5) });
      W.wordmark(ctx, (cfg.title || 'Choose a Project').toUpperCase(), w / 2, PK.pad + px(T.size.micro) + 30 + px(T.size.heading), T.size.heading, 0.2);
      W.rule(ctx, w / 2, PK.pad + px(T.size.micro) + 30 + px(T.size.heading) + 28, 88);
      W.text(ctx, cfg.subtitle || '', w / 2, PK.pad + px(T.size.micro) + 30 + px(T.size.heading) + 28 + 26 + px(T.size.small), { size: T.size.small, weight: 300, align: 'center', color: C.text2 });
      if (S.overlay === 'projects') W.roundBtn(ctx, ui, 'close', w - 60, 60, 32, 'close');
      var n = list.length, cw = (w - PK.pad * 2 - PK.gap * (n - 1)) / n;
      for (i = 0; i < n; i++) pickerCard(ctx, ui, list[i], PK.pad + i * (cw + PK.gap), PK.pad + 200, cw, this.cardH, i);
    },
    onPress: function (id) {
      if (id === 'close' || id === '__outside') { if (S.overlay === 'projects') ALP.closeOverlay(); return; }
      if (id.indexOf('pj:') === 0) A.chooseProject(id.slice(3));
      else if (id.indexOf('go:') === 0) A.chooseProject(id.slice(3));
    }
  });
  E.panel('leaving', {
    order: 90, modal: true, dim: 0.9,
    layout: { yaw: 0, y: 0, dist: 2.0, deg: 30 },
    show: function (s) { return s.overlay === 'leaving' ? 1 : 0; },
    measure: function () { this.px = [W.widthFor(this, 30), 300]; },
    draw: function (ctx, ui) {
      var w = this.px[0], h = this.px[1], t = ui.now();
      W.glass(ctx, 2, 2, w - 4, h - 4, 28, { fill: 'rgba(10,10,10,.94)', line: W.alpha(0.1) });
      W.eyebrow(ctx, 'Opening', w / 2, 86, { align: 'center' });
      W.text(ctx, (S.leaving || '').toUpperCase(), w / 2, 86 + 28 + px(T.size.heading), { size: T.size.heading, family: T.font.brand, track: 0.14, align: 'center', color: C.white });
      for (var i = 0; i < 3; i++) {
        var a = 0.25 + 0.75 * Math.max(0, Math.sin(t * 5 - i * 0.9));
        ctx.beginPath(); ctx.arc(w / 2 - 36 + i * 36, h - 70, 8, 0, Math.PI * 2); ctx.fillStyle = 'rgba(52,211,153,' + a.toFixed(2) + ')'; ctx.fill();
      }
      this.spin = true;
    },
    onPress: function () {}
  });

  /* ---------- sound: the browser only lets the tour play audio after a press ---------- */
  var AUD = { asked: false, timer: null, seen: false, answeredAt: 0 };
  function tourMuted() { try { var rp = TOUR.root(); return rp && rp.get ? !!rp.get('mute') : !S.soundOn; } catch (e) { return !S.soundOn; } }
  // 3DVista asks "Enable audio?" in a page window with YES and NO buttons; the headset cannot show it
  var YES_LABELS = ['YES'], NO_LABELS = ['NO'];
  function shown(el) {
    if (!el || !el.isConnected) return false;
    try { if (el.checkVisibility) return el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }); } catch (e) {}
    var p = el;
    while (p && p !== document.body) {
      var cs = getComputedStyle(p);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
      p = p.parentElement;
    }
    return true;
  }
  function promptButtons() {
    var cfg = P().audio || {}, ys = cfg.yesLabels || YES_LABELS, ns = cfg.noLabels || NO_LABELS;
    var list = document.querySelectorAll('[tdvclass="Button"][aria-label]'), yes = null, no = null, i;
    for (i = 0; i < list.length; i++) {
      var lab = String(list[i].getAttribute('aria-label') || '').toUpperCase();
      if (!yes && ys.indexOf(lab) !== -1) yes = list[i];
      else if (!no && ns.indexOf(lab) !== -1) no = list[i];
    }
    return yes ? { yes: yes, no: no } : null;
  }
  // in VR the tour may hide its page interface, so also ask the tour's message window directly when this build exposes it
  function messageWindowOpen() {
    try { var pm = TOUR.root().PM; return !!(pm && typeof pm.get === 'function' && pm.get('visible') === true && pm.xs && pm.xs.length); } catch (e) { return false; }
  }
  function domAudioPrompt() {
    var b = promptButtons();
    if (!b) return null;
    return shown(b.yes) || messageWindowOpen() ? b : null;
  }
  function fireMouse(el, type) {
    var r = el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }));
  }
  function fireKey(code) {
    try { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); } catch (e) {}
    try { document.body.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, code: code, key: code })); } catch (e) {}
  }
  // the tour's buttons react to mousedown then mouseup; Enter or Escape on the keyboard is its own fallback
  function answerPrompt(b, on) {
    var el = on ? b.yes : b.no;
    if (el) { try { fireMouse(el, 'mousedown'); fireMouse(el, 'mouseup'); } catch (e) {} }
    setTimeout(function () {
      if (domAudioPrompt()) { ALP.log('audio prompt still open, answering with the keyboard'); fireKey(on ? 'Enter' : 'Escape'); }
    }, 450);
  }
  // a click the tour's audio unlock listens for; it runs inside the controller press, which the browser counts as a user gesture
  function pokeUserAction() {
    try { var sp = document.createElement('span'); sp.style.display = 'none'; document.body.appendChild(sp); sp.click(); document.body.removeChild(sp); } catch (e) {}
  }
  A.setSound = function (on, quiet) {
    if (on) pokeUserAction();
    var pr = domAudioPrompt();
    if (pr) answerPrompt(pr, on);
    try { var rp = TOUR.root(); if (rp && rp.set) rp.set('mute', !on); } catch (e) {}
    if (on) {
      var au = document.querySelectorAll('audio,video'), i;
      for (i = 0; i < au.length; i++) { if (au[i].paused && au[i].autoplay && (au[i].currentSrc || au[i].src)) { try { var pp = au[i].play(); if (pp && pp.catch) pp.catch(function () {}); } catch (e) {} } }
    }
    S.soundOn = !!on; AUD.asked = true; AUD.answeredAt = Date.now(); AUD.seen = !!pr;
    if (S.overlay === 'audio') ALP.closeOverlay();
    if (!quiet) ALP.toast(on ? 'Sound is on' : 'Sound is off. You will be asked again next time you enter VR.', on ? 1800 : 3600);
    ALP.bus.emit('sound', { on: !!on });
    E.dirty('dock');
  };
  A.soundPrompt = domAudioPrompt;
  function askSound(delay) {
    var cfg = P().audio;
    if (!cfg || !cfg.prompt || AUD.asked || !E.isPresenting()) return;
    clearTimeout(AUD.timer);
    AUD.timer = setTimeout(function () {
      if (AUD.asked || !E.isPresenting() || S.screen === 'projects' || S.overlay || S.videoOn) return;
      ALP.openOverlay('audio');
    }, delay || 900);
  }
  ALP.bus.on('vr:enter', function () { S.soundOn = !tourMuted(); askSound(1400); });
  ALP.bus.on('vr:exit', function () { if (!S.soundOn) AUD.asked = false; });
  ALP.bus.on('projects:chosen', function () { askSound(900); });
  ALP.bus.on('screen', function (d) { if (d && d.to === 'tour') askSound(1200); });
  ALP.bus.on('overlay', function (d) { if (d && !d.name && !AUD.asked) askSound(700); });
  // when the tour itself asks while you are in the headset, ask the same question in VR
  setInterval(function () {
    if (!ALP.isActive()) return;
    if (!E.isPresenting()) { AUD.seen = false; return; }
    var pr = domAudioPrompt();
    if (!pr) { AUD.seen = false; return; }
    if (AUD.seen || S.overlay === 'audio' || Date.now() - AUD.answeredAt < 2500) return;
    if (S.overlay || S.screen === 'projects' || S.videoOn) return;
    AUD.asked = false; AUD.seen = true;
    ALP.log('the tour is asking to enable audio; showing the question in VR');
    ALP.openOverlay('audio');
  }, 900);
  E.panel('audio', {
    order: 88, modal: true, dim: 0.55,
    layout: { yaw: 0, y: 0.02, dist: 2.0, deg: 30 },
    show: function (s) { return s.overlay === 'audio' ? 1 : 0; },
    measure: function () { this.px = [W.widthFor(this, 30), 470]; },
    draw: function (ctx, ui) {
      var w = this.px[0], h = this.px[1], cfg = P().audio || {}, t = ui.now();
      W.glass(ctx, 2, 2, w - 4, h - 4, 28, { fill: C.panelSolid, line: W.alpha(0.12) });
      ALP.drawIcon(ctx, 'sound', w / 2 - 32, 44, 64, C.accentLine, 1.8);
      for (var i = 0; i < 3; i++) {
        var a = Math.max(0, Math.sin(t * 3 - i * 0.8)) * 0.35;
        ctx.beginPath(); ctx.arc(w / 2 + 6, 76, 46 + i * 16, -0.6, 0.6); ctx.strokeStyle = 'rgba(52,211,153,' + a.toFixed(2) + ')'; ctx.lineWidth = 3; ctx.stroke();
      }
      this.spin = true;
      W.text(ctx, cfg.title || 'Turn on sound?', w / 2, 176, { size: T.size.heading, family: T.font.brand, track: 0.04, align: 'center' });
      W.text(ctx, cfg.text || '', w / 2, 232, { size: T.size.small, weight: 300, color: C.text2, align: 'center', maxW: w - 90 });
      W.pill(ctx, ui, 'off', 44, h - 44 - 92, (w - 108) / 2, 92, 'Stay Muted', { kind: 'plain', icon: 'soundOff', size: T.size.small, weight: 500, track: 0.1, radius: 20 });
      W.pill(ctx, ui, 'on', 64 + (w - 108) / 2, h - 44 - 92, (w - 108) / 2, 92, 'Sound On', { kind: 'accent', icon: 'sound', size: T.size.small, weight: 600, track: 0.1, radius: 20 });
    },
    onPress: function (id) {
      if (id === 'on') A.setSound(true);
      else if (id === 'off' || id === '__outside') A.setSound(false);
    }
  });

  /* ---------- intro video on a floating screen ---------- */
  // the film is 24 MB, so it is only downloaded while it can be watched: from the first tap before the tour, or when
  // Watch Introduction is pressed. In the tour the element is kept (it stays unlocked for playback) but holds no source.
  var vid = null, vidState = 'idle', primed = false, unloaded = false, filmTry = 0;
  // the site's own film first, then the fallbacks in the data file (a 3DVista preview has no alp-assets folder)
  function films() { var L = P().landing || {}; return (L.video ? [L.video] : []).concat(L.videoFallbacks || []); }
  function filmUrl() { var l = films(); return l.length ? ALP.util.rawUrl(l[Math.min(filmTry, l.length - 1)]) : ''; }
  function nextFilm() {
    if (!vid || filmTry >= films().length - 1) return false;
    filmTry++;
    vidState = 'idle';
    try { vid.src = filmUrl(); vid.load(); if (S.videoOn) { var pp = vid.play(); if (pp && pp.catch) pp.catch(function () {}); } } catch (e) { return false; }
    ALP.log('intro film: trying ' + filmUrl());
    return true;
  }
  function video(noFilm) {
    if (vid) {
      if (unloaded && !noFilm) { unloaded = false; vidState = 'idle'; vid.src = filmUrl(); try { vid.load(); } catch (e) {} }
      return vid;
    }
    if (!filmUrl()) return null;
    vid = document.createElement('video');
    vid.crossOrigin = 'anonymous';
    vid.playsInline = true;
    vid.setAttribute('playsinline', '');
    vid.preload = 'auto';
    vid.style.position = 'fixed';
    vid.style.width = '2px'; vid.style.height = '2px';
    // inside the page and barely visible: Firefox-based browsers (Wolvic) stop decoding the picture of a video they consider
    // hidden, while the sound plays on
    vid.style.opacity = '0.01'; vid.style.pointerEvents = 'none'; vid.style.zIndex = '-1';
    vid.style.left = '0px'; vid.style.bottom = '0px';
    vid.addEventListener('loadeddata', function () { if (unloaded) return; vidState = 'ready'; E.dirty('video'); });
    vid.addEventListener('canplay', function () { if (unloaded) return; vidState = 'ready'; E.dirty('video'); });
    vid.addEventListener('ended', function () { if (unloaded) return; vidState = 'ended'; A.openOnly(null); A.enterTour(); });
    vid.addEventListener('error', function () { if (unloaded || !vid.getAttribute('src')) return; if (nextFilm()) return; vidState = 'error'; E.dirty('video'); });
    try { document.body.appendChild(vid); } catch (e) {}
    if (noFilm) unloaded = true;
    else { vid.src = filmUrl(); try { vid.load(); } catch (e) {} }
    return vid;
  }
  // a controller trigger is not a DOM gesture, so unlock playback on the last real tap (on a headset that is usually Enter VR).
  // In the tour the tap still unlocks the element, but without fetching the film, which would only compete with the panoramas.
  function primeVideo() {
    if (primed) return;
    var v = video(S.screen === 'tour'); if (!v) return;
    primed = true;
    try {
      var pr = v.play();
      if (pr && pr.then) pr.then(function () { if (S.videoOn) return; v.pause(); try { v.currentTime = 0; } catch (e) {} }, function () {});
      else if (!S.videoOn) { v.pause(); }
    } catch (e) {}
  }
  try { document.addEventListener('pointerdown', primeVideo, true); document.addEventListener('click', primeVideo, true); } catch (e) {}
  A.videoInfo = function () {
    return { state: vidState, primed: primed, src: vid ? vid.src : '', ready: vid ? vid.readyState : -1, err: vid && vid.error ? vid.error.code : 0 };
  };
  E.panel('video', {
    order: 70, modal: true, dim: 0.9, px: [1920, 1160], fadeSpeed: 3,
    layout: { yaw: 0, y: 0.02, dist: 2.3, deg: 72 },
    show: function (s) { return s.videoOn ? 1 : 0; },
    draw: function (ctx, ui) {
      var w = 1920, h = 1160, v = S.videoOn ? video() : vid;
      ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, w, h);
      var vh = 1080, vy = 0, onScreen = A.filmOnScreen();
      if (v && v.videoWidth && onScreen) {
        // the picture itself is on the film screen just above this panel (drawn by WebGL); this panel keeps the frame and the button
      } else if (v && v.videoWidth) {
        try { ctx.drawImage(v, 0, vy, w, vh); }
        catch (e) { vidState = 'error'; }
      } else {
        W.text(ctx, vidState === 'error' ? 'The introduction video could not be loaded' : 'Loading introduction', w / 2, vh / 2, { size: T.size.body, color: C.text3, align: 'center' });
        if (vidState === 'error') W.text(ctx, 'Press Skip Intro to continue', w / 2, vh / 2 + 60, { size: T.size.small, color: C.text3, align: 'center' });
      }
      var bw = 300;
      W.pill(ctx, ui, 'skipvid', w - 60 - bw, h - 70, bw, 66, 'SKIP INTRO', { kind: 'invert', size: T.size.micro, weight: 600, track: 0.25 });
    },
    onPress: function (id) {
      if (id === 'skipvid' || id === '__outside') {
        try { if (vid) { vid.pause(); vid.currentTime = 0; } } catch (e) {}
        A.openOnly(null); A.enterTour();
      }
    }
  });
  // the film's picture, uploaded straight from the video element by WebGL and laid exactly over the top of the video panel.
  // If a browser refuses that upload, the panel below falls back to drawing the film itself.
  function filmFrame() { return S.videoOn && vid && vid.readyState >= 2 && vid.videoWidth ? vid : null; }
  E.panel('filmscreen', {
    order: 71, interactive: false, fadeSpeed: 3, px: [1920, 1080],
    layout: { yaw: 0, y: 0.02 + 2 * 2.3 * Math.tan(36 * Math.PI / 180) * 40 / 1920, dist: 2.3, deg: 72 },
    show: function (s, p) { return filmFrame() && E.mediaPanels && (!p || p.mediaOk !== false) ? 1 : 0; },
    media: filmFrame,
    draw: function (ctx) { ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, 1920, 1080); }
  });
  // only once the engine has really put a frame on the film screen; until then (or with an older engine) this panel draws the film
  A.filmOnScreen = function () { var p = E.get('filmscreen'); return !!(E.mediaPanels && p && p.mediaOk === true && filmFrame()); };
  // drawing a frame now and then also tells Firefox-based browsers the picture is in use, so they keep decoding it
  var keepAwake = { t: 0, c: null };
  E.addFrame(function () {
    if (!S.videoOn || !vid || vid.paused || !vid.videoWidth) return;
    var now = Date.now();
    if (now - keepAwake.t < 700) return;
    keepAwake.t = now;
    try { if (!keepAwake.c) { keepAwake.c = document.createElement('canvas'); keepAwake.c.width = keepAwake.c.height = 2; } keepAwake.c.getContext('2d').drawImage(vid, 0, 0, 2, 2); } catch (e) {}
  });
  // once the visitor is in the tour, stop the film downloading; the same (already unlocked) element fetches it again if Watch Introduction is pressed
  // (if the film screen is still fading out in the headset, wait for the fade so its last frame stays on screen)
  var unloadPending = false;
  function unloadFilm() {
    if (!vid || unloaded || S.videoOn) return;
    var p = E.get('video');
    if (p && p.opacity > 0.002 && E.isPresenting()) { unloadPending = true; return; }
    unloadPending = false; unloaded = true; vidState = 'idle';
    try { vid.pause(); vid.removeAttribute('src'); vid.load(); } catch (e) {}
  }
  ALP.bus.on('screen', function (d) { if (d && d.to === 'tour') unloadFilm(); });
  E.addFrame(function () {
    if (!unloadPending) return;
    if (S.videoOn || S.screen !== 'tour') { unloadPending = false; return; }
    var p = E.get('video');
    if (!p || p.opacity <= 0.002) unloadFilm();
  });
  ALP.bus.on('change', function (d) {
    if (!d || d.overlayKey === undefined) return;
    var v = S.videoOn ? video() : vid;
    if (!v) { if (S.videoOn) { S.videoOn = false; ALP.toast('The introduction video is not available'); } return; }
    if (S.videoOn) { try { v.play(); } catch (e) {} }
    else { try { v.pause(); } catch (e) {} }
  });
  E.addFrame(function () { if (S.videoOn && vid && vid.videoWidth) E.dirty('video'); });


  var bound = false;
  function bindPlaylist() {
    if (bound) return;
    try {
      var rp = TOUR.root();
      if (rp && rp.mainPlayList && rp.mainPlayList.bind) {
        rp.mainPlayList.bind('change', function () { A.sync(TOUR.playlistIndex()); });
        bound = true;
      }
    } catch (e) {}
  }
  bindPlaylist(); setTimeout(bindPlaylist, 1500); setTimeout(bindPlaylist, 5000);

  /* ---------- the veil: a quick dip to black between scenes ---------- */
  E.panel('veil', {
    order: 19, px: [4, 4], fullscreen: true, interactive: false, fadeSpeed: 4.2,
    show: function (s) { return s.screen === 'tour' ? (s.veil || 0) : 0; },
    draw: function (ctx) { ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, 4, 4); }
  });

  /* ---------- arrival title: the place names itself as you land ---------- */
  E.panel('arrival', {
    order: 21, interactive: false, fadeSpeed: 2.2, enterRise: 0.05,
    layout: { yaw: 0, y: 0.24, dist: 2.3, deg: 40 },
    show: function (s) { return s.screen === 'tour' && s.arrival && Date.now() < s.arrival.until && !s.uiHidden && !s.mapOn && !s.galleryOn && !s.videoOn ? 1 : 0; },
    measure: function () { this.px = [W.widthFor(this, 40), 230]; },
    draw: function (ctx, ui) {
      var w = this.px[0], pl = A.place((S.arrival || {}).id) || A.current() || {};
      var sec = A.section(pl.section).label, fl = pl.floor ? (A.floor(pl.floor) || {}).levelLabel : '';
      var e = ALP.anim.ease(ui.enter() / 0.9);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.75)'; ctx.shadowBlur = 26;
      W.text(ctx, sec + (fl ? '   ' + String.fromCharCode(183) + '   ' + fl : ''), w / 2, 58, { size: T.size.small, weight: 500, track: 0.42, upper: true, align: 'center', color: W.alpha(0.82) });
      ctx.globalAlpha = e;
      W.text(ctx, pl.label || '', w / 2 + px(T.size.display) * 0.1, 58 + 26 + px(T.size.display) * 0.8, { size: T.size.display, family: T.font.brand, track: 0.2 + (1 - e) * 0.12, upper: true, align: 'center', color: C.white, maxW: w - 60 });
      ctx.restore();
      ctx.fillStyle = W.alpha(0.55); ctx.fillRect(w / 2 - 60 * e, 58 + 26 + px(T.size.display) + 26, 120 * e, 2);
    }
  });

  /* ---------- the dock: the highlight reel and the control bar, one panel low in front of you ---------- */
  // Built like the Park Villas bar, so a first-time visitor has one place to look: the place cards on top (with the section
  // names to jump), and one row under them with the arrows around the place name, Furnished / Unfurnished where a place has
  // both, the 3D Mall Map, the Gallery, Info, Help and the eye button that hides everything.
  var DK = { pad: 22, row: 88, gap: 14, y: -0.88, dist: 1.4, deg: 56 };
  var RL = { pad: 22, tabsH: 56, gap: 14, arrow: 58, visible: 6 };
  var reel = { first: 0, lastPlace: null };
  function sectionsInUse() {
    var out = [], seen = {}, l = A.places(), i;
    for (i = 0; i < l.length; i++) if (!seen[l[i].section]) { seen[l[i].section] = 1; out.push(A.section(l[i].section)); }
    return out;
  }
  function firstOfSection(id) { var l = A.places(), i; for (i = 0; i < l.length; i++) if (l[i].section === id) return i; return 0; }
  function clampFirst(f) { return Math.max(0, Math.min(f, Math.max(0, A.places().length - RL.visible))); }
  function cardSize(w) {
    var cw = Math.floor((w - RL.pad * 2 - RL.arrow * 2 - RL.gap * (RL.visible + 1)) / RL.visible);
    return { w: cw, h: Math.round(cw * 0.6) };
  }
  function reelHeight(w) { return RL.pad + RL.tabsH + 10 + cardSize(w).h + 20; }
  function dockBusy(s) { return !!(s.overlay || s.infoOn || s.calcOn || s.unitInfoOn || s.aboutOn || s.contactOn); }
  A.openInfo = function () { S.lotOverride = ''; ALP.set({ infoOn: !S.infoOn, calcOn: false }); };
  A.closeInfo = function () { S.lotOverride = ''; ALP.set({ infoOn: false, calcOn: false }); };

  function drawReel(ctx, ui, w) {
    var list = A.places(), n = list.length, i, c = cardSize(w), cur = A.indexOf(S.placeId);
    // keep the place you are in on screen
    if (S.placeId !== reel.lastPlace) {
      reel.lastPlace = S.placeId;
      if (cur >= 0 && (cur < reel.first || cur >= reel.first + RL.visible)) reel.first = clampFirst(cur - Math.floor(RL.visible / 2));
    }
    // section names: press one to jump to its first place
    var secs = sectionsInUse(), tx = RL.pad + RL.arrow + RL.gap, ty = RL.pad, th = RL.tabsH - 12, curSec = cur >= 0 ? list[cur].section : '';
    for (i = 0; i < secs.length; i++) {
      var lab = String(secs[i].label || secs[i].id).toUpperCase();
      var tw = Math.round(W.measure(ctx, lab, { size: T.size.micro, weight: 600, track: 0.18 }) + 48);
      if (tx + tw > w - RL.pad) break;
      var on = secs[i].id === curSec, hv = ui.lift('s:' + secs[i].id, tx, ty, tw, th);
      K.roundRect(ctx, tx, ty, tw, th, th / 2);
      ctx.fillStyle = on ? W.alpha(0.14) : W.alpha(0.04 + 0.1 * hv); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = on ? W.alpha(0.85) : W.alpha(0.1 + 0.3 * hv); ctx.stroke();
      W.text(ctx, lab, tx + tw / 2, ty + th / 2 + px(T.size.micro) * 0.36, { size: T.size.micro, weight: 600, track: 0.18, align: 'center', color: on ? C.white : C.text2 });
      tx += tw + 10;
    }
    // the cards
    var y = RL.pad + RL.tabsH + 10, x0 = RL.pad + RL.arrow + RL.gap;
    var off = ui.anim('first', reel.first, 10);
    ctx.save();
    ctx.beginPath(); ctx.rect(x0 - 10, y - 14, w - x0 * 2 + 20, c.h + 28); ctx.clip();
    var lo = Math.max(0, Math.floor(off) - 1), hi = Math.min(n, Math.ceil(off) + RL.visible + 1);
    for (i = lo; i < hi; i++) {
      var pl = list[i], x = x0 + (i - off) * (c.w + RL.gap);
      if (x > w || x + c.w < 0) continue;
      var act = i === cur, hov = ui.lift('p:' + pl.id, x, y, c.w, c.h), prs = ui.press('p:' + pl.id);
      var lift = hov * 6 - prs * 3 + (act ? 2 : 0);
      ctx.save();
      K.roundRect(ctx, x, y - lift, c.w, c.h, 22); ctx.clip();
      ctx.fillStyle = '#111111'; ctx.fillRect(x, y - lift, c.w, c.h);
      ctx.globalAlpha = act ? 1 : W.wa(0.62, 0.95, hov);
      var pim = ALP.img(pl.img);
      if (pim && pim.state === 'error') {
        // no picture anywhere: a quiet card with the place name, rather than a broken-image sign
        var pg = ctx.createLinearGradient(x, y - lift, x + c.w, y - lift + c.h);
        pg.addColorStop(0, '#2A2723'); pg.addColorStop(1, '#121110');
        ctx.fillStyle = pg; ctx.fillRect(x, y - lift, c.w, c.h);
      } else K.image(ctx, pl.img, x, y - lift, c.w, c.h, 'cover', 1 + hov * 0.05);
      ctx.globalAlpha = 1;
      var g = ctx.createLinearGradient(0, y - lift + c.h, 0, y - lift + c.h * 0.3);
      g.addColorStop(0, 'rgba(0,0,0,.88)'); g.addColorStop(1, 'rgba(0,0,0,.08)');
      ctx.fillStyle = g; ctx.fillRect(x, y - lift, c.w, c.h);
      ctx.font = W.font(T.size.micro, 600); K.spacing(ctx, 0.08 * px(T.size.micro));
      var lines = K.wrap(ctx, String(pl.short || pl.label).toUpperCase(), c.w - 24);
      if (lines.length > 2) { lines = lines.slice(0, 2); lines[1] = K.fit(ctx, lines[1] + ' ...', c.w - 24); }
      K.spacing(ctx, 0);
      var lh = Math.round(px(T.size.micro) * 1.2), ly = y - lift + c.h - 18 - (lines.length - 1) * lh;
      for (var q = 0; q < lines.length; q++) W.text(ctx, lines[q], x + c.w / 2, ly + q * lh, { size: T.size.micro, weight: 600, track: 0.08, align: 'center', color: act ? C.white : W.alpha(0.9) });
      ctx.restore();
      K.roundRect(ctx, x, y - lift, c.w, c.h, 22);
      ctx.lineWidth = act ? 4 : 2;
      ctx.strokeStyle = act ? '#FFFFFF' : W.alpha(W.wa(0.14, 0.6, hov));
      if (act) { ctx.shadowColor = 'rgba(255,255,255,.3)'; ctx.shadowBlur = 20; }
      ctx.stroke(); ctx.shadowBlur = 0;
    }
    ctx.restore();
    // arrows page through the places
    var ay = y + c.h / 2;
    W.roundBtn(ctx, ui, 'rprev', RL.pad + RL.arrow / 2, ay, 26, 'chevL', { disabled: reel.first <= 0 });
    W.roundBtn(ctx, ui, 'rnext', w - RL.pad - RL.arrow / 2, ay, 26, 'chevR', { disabled: reel.first >= n - RL.visible });
  }

  // one row: the arrows around the place name, Furnished / Unfurnished, then 3D Map, Gallery, Info, Help and the eye
  var dockInfo = { compact: false };
  A.dockInfo = function () { return dockInfo; };
  function drawBar(ctx, ui, w, top) {
    var P0 = DK.pad, y = top + DK.pad, rh = DK.row, mid = y + rh / 2, i;
    var pl = A.current() || {}, list = A.places(), cur = A.indexOf(S.placeId), pair = A.hasPair(pl), unit = !!pl.unit;
    var items = [
      { id: 'map', icon: 'map', label: '3D Map' },
      { id: 'gallery', icon: 'image', label: 'Gallery' },
      { id: 'info', icon: 'info', label: unit ? 'Unit Info' : 'Info', active: !!(S.infoOn || S.calcOn), accent: unit && !S.infoOn && !S.calcOn },
      { id: 'help', icon: 'help', label: 'Help', active: S.overlay === 'help' }
    ];
    // the right side first, so the place name gets whatever is left
    var total = 0, iconS = Math.round(px(T.size.micro) * 1.3);
    for (i = 0; i < items.length; i++) { items[i].w = Math.round(W.measure(ctx, items[i].label, { size: T.size.micro, weight: 600, track: 0.14, upper: true }) + iconS + 14 + 40); total += items[i].w + DK.gap; }
    var segH = rh - 16, fw = pair ? Math.round(Math.max(W.measure(ctx, 'Furnished', { size: T.size.micro, weight: 700, track: 0.14, upper: true }), W.measure(ctx, 'Unfurnished', { size: T.size.micro, weight: 700, track: 0.14, upper: true })) + 56) : 0;
    var segW = pair ? fw * 2 + 16 : 0, eyeW = 76;
    var rightW = total + (segW ? segW + DK.gap * 2 + 2 : 0) + eyeW + DK.gap + 2;
    var leftW = 64 + DK.gap + 64 + DK.gap * 2;
    dockInfo.compact = w - P0 * 2 - rightW - leftW < 190;
    if (dockInfo.compact) { total = 0; for (i = 0; i < items.length; i++) { items[i].w = rh - 8; total += items[i].w + DK.gap; } rightW = total + (segW ? segW + DK.gap * 2 + 2 : 0) + eyeW + DK.gap + 2; }

    // where you are, with the arrows either side
    W.roundBtn(ctx, ui, 'prev', P0 + 32, mid, 30, 'chevL', { disabled: cur <= 0 });
    var lx = P0 + 64 + DK.gap, lw = Math.max(160, w - P0 - rightW - lx - 64 - DK.gap * 2);
    W.text(ctx, A.section(pl.section).label + '   ' + (cur + 1) + ' / ' + list.length, lx + 4, mid - 12, { size: T.size.micro, weight: 500, track: 0.2, upper: true, color: C.text3, maxW: lw - 8 });
    W.text(ctx, pl.label || '', lx + 4, mid + px(T.size.body) * 0.9, { size: T.size.body, weight: 600, color: C.white, maxW: lw - 8 });
    W.roundBtn(ctx, ui, 'next', lx + lw + DK.gap + 32, mid, 30, 'chevR', { disabled: cur >= list.length - 1 });

    var bx = w - P0 - rightW;
    if (segW) {
      // Furnished / Unfurnished, only where the place has both
      K.roundRect(ctx, bx, y + 8, segW, segH, segH / 2); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = W.alpha(0.1); ctx.stroke();
      W.chip(ctx, ui, 'fur:on', bx + 6, y + 14, fw, segH - 12, 'Furnished', { active: !!S.furnished, size: T.size.micro, upper: true, track: 0.14 });
      W.chip(ctx, ui, 'fur:off', bx + 10 + fw, y + 14, fw, segH - 12, 'Unfurnished', { active: !S.furnished, size: T.size.micro, upper: true, track: 0.14 });
      bx += segW + DK.gap;
      ctx.fillStyle = W.alpha(0.12); ctx.fillRect(bx, y + 16, 2, rh - 32);
      bx += 2 + DK.gap;
    }
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      if (dockInfo.compact) W.roundBtn(ctx, ui, it.id, bx + it.w / 2, mid, it.w / 2 - 6, it.icon, { active: it.active || it.accent });
      else W.pill(ctx, ui, it.id, bx, y + 6, it.w, rh - 12, it.label, { kind: it.active ? 'invert' : (it.accent ? 'accent' : 'ghost'), icon: it.icon, size: T.size.micro, weight: 600, track: 0.14 });
      bx += it.w + DK.gap;
    }
    ctx.fillStyle = W.alpha(0.12); ctx.fillRect(bx, y + 16, 2, rh - 32);
    W.roundBtn(ctx, ui, 'hide', w - P0 - eyeW / 2, mid, 32, 'eyeOff');
  }

  E.panel('dock', {
    order: 22, pinGroup: 'dock',
    layout: { yaw: 0, y: DK.y, dist: DK.dist, deg: DK.deg },
    show: function (s) {
      if (s.screen !== 'tour' || s.uiHidden || s.mapOn || s.galleryOn || s.videoOn) return 0;
      return dockBusy(s) && !s.infoOn && !s.calcOn ? 0.35 : 1;
    },
    measure: function () {
      var w = W.widthFor(this, DK.deg), rh = reelHeight(w);
      this.reelH = rh;
      this.px = [w, rh + DK.pad * 2 + DK.row];
    },
    draw: function (ctx, ui) {
      var w = this.px[0], h = this.px[1], rh = this.reelH || 0;
      W.glass(ctx, 2, 2, w - 4, h - 4, 36, { fill: 'rgba(10,10,10,.9)', line: W.alpha(0.12), shadowBlur: 50, shadowY: 20 });
      drawReel(ctx, ui, w);
      W.divider(ctx, DK.pad + 10, rh - 1, w - DK.pad * 2 - 20, 0.1);
      drawBar(ctx, ui, w, rh);
    },
    onPress: function (id) {
      if (id === 'rprev') { reel.first = clampFirst(reel.first - (RL.visible - 1)); E.dirty('dock'); return; }
      if (id === 'rnext') { reel.first = clampFirst(reel.first + (RL.visible - 1)); E.dirty('dock'); return; }
      if (id.indexOf('s:') === 0) { reel.first = clampFirst(firstOfSection(id.slice(2))); E.dirty('dock'); return; }
      if (id.indexOf('p:') === 0) {
        var pl = A.place(id.slice(2));
        if (!pl) return;
        if (pl.id === S.placeId) { ALP.toast('You are at ' + pl.label); return; }
        A.go(pl.id);
        return;
      }
      if (id === 'prev') A.step(-1);
      else if (id === 'next') A.step(1);
      else if (id === 'fur:on' || id === 'fur:off') A.setFurnished(id === 'fur:on');
      else if (id === 'map') { A.closeInfo(); A.openMap(); }
      else if (id === 'gallery') { A.closeInfo(); A.openOnly('gallery'); }
      else if (id === 'info') A.openInfo();
      else if (id === 'help') { A.closeInfo(); ALP.openOverlay('help'); }
      else if (id === 'hide') { A.closeInfo(); ALP.set({ uiHidden: true }); ALP.toast('Interface hidden. Press Show interface below, or B or Y, to bring it back.', 3600); }
    },
    // the thumbstick pages the reel while you point at the cards, and steps from place to place anywhere else on the bar
    onStickX: function (dx) {
      var hid = this.hoverId || '';
      if (hid.indexOf('p:') === 0 || hid.indexOf('s:') === 0 || hid === 'rprev' || hid === 'rnext') { reel.first = clampFirst(reel.first + (dx > 0 ? 1 : -1) * (RL.visible - 1)); E.dirty('dock'); return; }
      A.step(dx > 0 ? 1 : -1);
    }
  });
  // the side menu and Side View are gone; kept as a no-op for anything that still asks
  A.isSideView = function () { return false; };

  // the starting placement changed (panels now sit farther away and wider apart): positions saved on a headset
  // by an earlier version are dropped once, so every visitor starts from the new layout
  try {
    var layoutKey = 'alp-layout:' + (location.host || '') + (location.pathname || '');
    if (window.localStorage.getItem(layoutKey) !== '3') { E.clearPins(); window.localStorage.setItem(layoutKey, '3'); }
  } catch (e) {}
  // back to how the interface started: positions, size and Side View
  A.resetLayout = function () {
    E.clearPins();
    if (Math.abs((S.uiScale || 1) - 1) > 0.001) ALP.setUiScale(1);
    E.recenterAll();
    ALP.toast('Interface restored to its original layout');
  };
  // first-time tips, remembered on the headset
  function tipOnce(key, text, delay) {
    var seen = false;
    try { seen = !!window.localStorage.getItem('alp-tip:' + key); } catch (e) {}
    if (seen) return;
    setTimeout(function () {
      if (!E.isPresenting() || S.screen !== 'tour' || S.overlay || S.onboard) return;
      ALP.toast(text, 5200);
      try { window.localStorage.setItem('alp-tip:' + key, '1'); } catch (e) {}
    }, delay || 0);
  }
  ALP.bus.on('screen', function (d) {
    if (d && d.to === 'tour') tipOnce('grab', 'Tip: squeeze the grip on any panel to move it. Click the thumbstick to bring panels back.', 7000);
  });
  ALP.bus.on('change', function (d) {
    if (d && d.map === true) tipOnce('pinch', 'Tip: pull both triggers on the model and move your hands apart to resize it.', 2500);
  });
  ALP.bus.on('vr:recenter', function () { ALP.toast('Panels brought back in front of you', 1800); });

  E.panel('reveal', {
    order: 22,
    layout: { yaw: 0, y: -0.88, dist: 1.4, deg: 13, design: 15 }, pinGroup: 'dock',
    show: function (s) { return s.screen === 'tour' && s.uiHidden ? 1 : 0; },
    measure: function () { this.px = [W.widthFor(this, 15), 110]; },
    draw: function (ctx, ui) {
      var w = this.px[0], h = this.px[1];
      var hov = ui.button('show', 0, 0, w, h);
      W.glass(ctx, 2, 2, w - 4, h - 4, (h - 4) / 2, { fill: hov ? 'rgba(20,20,20,.94)' : 'rgba(10,10,10,.88)', line: hov ? C.lineHi : C.line });
      ALP.drawIcon(ctx, 'eye', 36, h / 2 - 18, 36, C.text, 1.8);
      W.text(ctx, 'Show interface', 92, h / 2 + 10, { size: T.size.small, weight: 500 });
    },
    onPress: function () { ALP.set({ uiHidden: false }); }
  });

  ALP.log('parklinks screens A ready');
  return true;
  };
  if (window.ALP && window.ALP.define) window.ALP.define('vr-screens-a', ['core', 'data', 'vr-engine'], run, 'parklinks');
  else (window.__ALPQ = window.__ALPQ || []).push(['vr-screens-a', ['core', 'data', 'vr-engine'], run, 'parklinks']);
})();
