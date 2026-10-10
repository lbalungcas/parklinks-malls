(function (tdvThis) {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.ALP && window.ALP.__core) return;

  var ALP = window.ALP = window.ALP || {};
  ALP.__core = true;
  ALP.version = '0.2.0';
  ALP.tdvThis = tdvThis;

  // settings: one object for the whole tour. With several projects in one tour each project keeps its own on top of it,
  // and ALP.config reads the settings of the project that is open.
  var C = ALP.config || {};
  try {
    Object.defineProperty(ALP, 'config', {
      configurable: true, enumerable: true,
      get: function () { return ALP.scope && ALP.scope.config ? ALP.scope.config : C; },
      set: function (v) { if (this === ALP) C = v || {}; else Object.defineProperty(this, 'config', { value: v, writable: true, configurable: true, enumerable: true }); }
    });
  } catch (e) { ALP.config = C; }
  C.debug = C.debug !== undefined ? C.debug : true;
  C.projectId = C.projectId || 'enara';

  C.oculusQuest1Fix = C.oculusQuest1Fix !== undefined ? C.oculusQuest1Fix : true;

  C.hide3DVistaVRMenu = C.hide3DVistaVRMenu !== undefined ? C.hide3DVistaVRMenu : true;

  ALP.stats = { lastError: '' };
  ALP.log = function () {
    if (!C.debug || !window.console) return;
    var a = Array.prototype.slice.call(arguments); a.unshift('[alp]');
    try { console.log.apply(console, a); } catch (e) {}
  };
  ALP.warn = function () {
    try { ALP.stats.lastError = Array.prototype.slice.call(arguments).map(String).join(' ').slice(0, 180); } catch (e) {}
    if (!window.console) return;
    var a = Array.prototype.slice.call(arguments); a.unshift('[alp]');
    try { console.warn.apply(console, a); } catch (e) {}
  };

  var mods = {}, pending = [];
  ALP.modules = mods;
  // scope is the id of the project a file belongs to; files without one are shared by every project in the tour
  ALP.define = function (name, deps, fn, scope) {
    pending.push({ name: scope ? scope + ':' + name : name, deps: deps || [], fn: fn, scope: scope || '' });
    resolve();
  };
  ALP.has = function (name) { return !!mods[name]; };
  function resolve() {
    var progressed = true;
    while (progressed) {
      progressed = false;
      for (var i = 0; i < pending.length; i++) {
        var m = pending[i], ok = true;
        for (var d = 0; d < m.deps.length; d++) if (!mods[m.deps[d]] && !(m.scope && mods[m.scope + ':' + m.deps[d]])) { ok = false; break; }
        if (!ok) continue;
        pending.splice(i, 1); i--;
        try {
          var target = m.scope ? scopeFor(m.scope) : ALP;
          mods[m.name] = m.fn(target) || true;
          if (m.scope) settleScope(target);
          ALP.log('module ready:', m.name);
        }
        catch (e) { mods[m.name] = { failed: true }; ALP.warn('module failed:', m.name, e && e.message ? e.message : e); }
        progressed = true;
      }
    }
  }
  setTimeout(function () {
    for (var i = 0; i < pending.length; i++) ALP.warn('module waiting for dependencies:', pending[i].name, pending[i].deps.join(', '));
  }, 6000);

  var handlers = {};
  ALP.bus = {
    on: function (ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); return fn; },
    off: function (ev, fn) { var l = handlers[ev] || []; var i = l.indexOf(fn); if (i !== -1) l.splice(i, 1); },
    emit: function (ev, data) {
      var l = (handlers[ev] || []).slice();
      for (var i = 0; i < l.length; i++) { try { l[i](data); } catch (e) { ALP.warn('handler error for', ev, e); } }
      try { document.dispatchEvent(new CustomEvent('alp:' + ev, { detail: data })); } catch (e) {}
    }
  };

  var U = ALP.util = {};
  U.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  U.angleDiff = function (a, b) {
    var d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  U.extend = function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (src) for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
    }
    return target;
  };

  U.rawUrl = function (url) {
    var prefix = 'https://github.com/';
    if (!url || url.indexOf(prefix) !== 0) return url;
    var parts = url.slice(prefix.length).split('?')[0].split('/');
    if (parts.length < 5 || (parts[2] !== 'blob' && parts[2] !== 'raw')) return url;
    return 'https://raw.githubusercontent.com/' + parts[0] + '/' + parts[1] + '/' + parts.slice(3).join('/');
  };
  U.M4 = {
    identity: function () { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); },
    mul: function (a, b) {
      var o = new Float32Array(16), i, j;
      for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) {
        o[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3];
      }
      return o;
    },
    translate: function (x, y, z) { var m = U.M4.identity(); m[12] = x; m[13] = y; m[14] = z; return m; },
    scale: function (x, y, z) { var m = U.M4.identity(); m[0] = x; m[5] = y; m[10] = z; return m; },
    rotY: function (a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]); },
    rotX: function (a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]); },
    rotZ: function (a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]); },
    invRigid: function (m) {
      var o = new Float32Array(16);
      o[0] = m[0]; o[1] = m[4]; o[2] = m[8];
      o[4] = m[1]; o[5] = m[5]; o[6] = m[9];
      o[8] = m[2]; o[9] = m[6]; o[10] = m[10];
      o[12] = -(o[0] * m[12] + o[4] * m[13] + o[8] * m[14]);
      o[13] = -(o[1] * m[12] + o[5] * m[13] + o[9] * m[14]);
      o[14] = -(o[2] * m[12] + o[6] * m[13] + o[10] * m[14]);
      o[15] = 1;
      return o;
    },
    xformPoint: function (m, p) {
      return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
    },
    xformDir: function (m, d) {
      return [m[0] * d[0] + m[4] * d[1] + m[8] * d[2], m[1] * d[0] + m[5] * d[1] + m[9] * d[2], m[2] * d[0] + m[6] * d[1] + m[10] * d[2]];
    }
  };

  ALP.tokens = {
    color: {
      bg: '#0B1624', panel: 'rgba(12,24,40,.88)', panelSolid: '#0E1A2B', panelHi: 'rgba(22,40,64,.95)',
      line: 'rgba(255,255,255,.14)', lineHi: 'rgba(255,255,255,.32)',
      text: '#FFFFFF', text2: 'rgba(255,255,255,.66)', text3: 'rgba(255,255,255,.42)',
      accent: '#3D7BFF', accentSoft: 'rgba(61,123,255,.22)', accentLine: 'rgba(110,160,255,.85)',
      ok: '#57D98A', warn: '#F5C451', danger: '#FF6B6B'
    },
    font: {
      ui: 'Inter, "Segoe UI", system-ui, Arial, sans-serif',
      brand: 'Montserrat, Inter, "Segoe UI", Arial, sans-serif'
    },
    radius: 18,
    ppd: 36,
    size: { title: 1.45, heading: 1.12, body: 0.98, small: 0.8, micro: 0.66, button: 0.94, icon: 1.15 }
  };
  ALP.px = function (deg) { return Math.round(deg * ALP.tokens.ppd); };

  var AN = ALP.anim = {};
  var av = {}, clock = 0;
  AN.owner = null;
  AN.now = function () { return clock; };
  AN.ease = function (t) { return t <= 0 ? 0 : (t >= 1 ? 1 : 1 - Math.pow(1 - t, 3)); };
  AN.to = function (key, target, speed) {
    var v = av[key];
    if (!v) { av[key] = { cur: target, target: target, speed: speed || 12, owner: AN.owner, seen: clock }; return target; }
    v.target = target; if (speed) v.speed = speed; v.seen = clock;
    if (AN.owner) v.owner = AN.owner;
    return v.cur;
  };
  AN.set = function (key, value) {
    var v = av[key] || (av[key] = { cur: value, target: value, speed: 12, owner: AN.owner, seen: clock });
    v.cur = value; v.seen = clock;
  };
  AN.flash = function (key, speed) {
    var v = av[key] || (av[key] = { cur: 0, target: 0, speed: speed || 5, owner: AN.owner, seen: clock });
    v.cur = 1; v.target = 0; v.speed = speed || 5; v.seen = clock;
  };
  AN.stagger = function (key, index, step) {
    var t = clock - (av[key] ? av[key].t0 : clock);
    return AN.ease((t - index * (step || 0.045)) / 0.34);
  };
  AN.mark = function (key) { var v = av[key]; if (!v) av[key] = { cur: 0, target: 0, speed: 1, owner: AN.owner, seen: clock, t0: clock }; else v.seen = clock; };
  AN.reset = function (key) { var v = av[key]; if (v) v.t0 = clock; };
  AN.tick = function (dt) {
    clock += dt;
    var moving = null;
    for (var k in av) {
      var v = av[k];
      if (clock - v.seen > 6) { delete av[k]; continue; }
      var d = v.target - v.cur;
      if (d > -0.002 && d < 0.002) { v.cur = v.target; continue; }
      v.cur += d * Math.min(1, dt * v.speed);
      if (v.owner) { moving = moving || {}; moving[v.owner] = 1; }
    }
    return moving;
  };


  ALP.icons = {
    back: 'M15 5l-7 7 7 7',
    chevL: 'M15 5l-7 7 7 7',
    chevR: 'M9 5l7 7-7 7',
    chevD: 'M5 9l7 7 7-7',
    next: 'M5 12h14M13 6l6 6-6 6',
    menu: 'M4 7h16M4 12h16M4 17h16',
    map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
    info: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 11v6M12 7.6v.4',
    layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
    pin: 'M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    vr: 'M3 8h18v8h-6l-2-3h-2l-2 3H3z',
    close: 'M6 6l12 12M18 6L6 18',
    check: 'M5 12l5 5 9-10',
    play: 'M8 5l11 7-11 7z',
    help: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.4',
    reset: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5',
    alert: 'M12 3l10 18H2zM12 10v5M12 18v.4',
    star: 'M12 3l2.8 5.9 6.2.8-4.5 4.3 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.7l6.2-.8z',
    building: 'M5 21V4h9v17M14 9h5v12M8 8h3M8 12h3M8 16h3M3 21h18',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    eyeOff: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6A17 17 0 0 0 2 12s4 7 10 7a9.6 9.6 0 0 0 4.4-1.1',
    compass: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM15.5 8.5l-2 5-5 2 2-5z',
    home: 'M4 11l8-7 8 7v9H4z',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    steps: 'M4 6h16M4 12h10M4 18h6',
    view360: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
    sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
    image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5a1.5 1.5 0 1 0 0-.01z',
    bed: 'M3 18V8M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11.5a1.5 1.5 0 1 0 0-.01z',
    bath: 'M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM6 12V6a2 2 0 0 1 4 0',
    area: 'M4 4h16v16H4zM4 9h5V4M20 15h-5v5'
  };
  function iconDrawer(icons) {
    var pathCache = {};
    return function (ctx, name, x, y, size, color, weight) {
      var d = icons[name];
      if (!d || typeof Path2D === 'undefined') return;
      var e = pathCache[name];
      if (!e || e.d !== d) e = pathCache[name] = { d: d, p: new Path2D(d) };
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(size / 24, size / 24);
      ctx.lineWidth = weight || 1.8;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = color || '#fff';
      ctx.stroke(e.p);
      ctx.restore();
    };
  }
  ALP.drawIcon = iconDrawer(ALP.icons);

  var images = {};
  // a second address for a picture: when the first cannot be loaded (a 3DVista preview has no alp-assets folder, for example),
  // the same entry quietly loads this one instead. Projects fill it in: ALP.imgFallback['alp-assets/x.jpg'] = 'https://...'
  ALP.imgFallback = ALP.imgFallback || {};
  ALP.img = function (url) {
    url = U.rawUrl(url);
    if (!url) return null;
    var e = images[url];
    if (e) return e;
    e = images[url] = { el: new Image(), state: 'loading' };
    e.el.crossOrigin = 'anonymous';
    e.el.decoding = 'async';
    e.el.onload = function () {
      try {
        var t = document.createElement('canvas'); t.width = t.height = 2;
        var c = t.getContext('2d'); c.drawImage(e.el, 0, 0, 2, 2); c.getImageData(0, 0, 1, 1);
        e.state = 'ok';
      } catch (err) {
        var fb = ALP.imgFallback[url];
        if (fb && !e.fellBack) { e.fellBack = true; e.el.src = U.rawUrl(fb); return; }
        e.state = 'error'; ALP.warn('image blocked by CORS (not usable in VR):', url);
      }
      ALP.bus.emit('images');
    };
    e.el.onerror = function () {
      var fb = ALP.imgFallback[url];
      if (fb && !e.fellBack) { e.fellBack = true; e.el.src = U.rawUrl(fb); return; }
      e.state = 'error'; ALP.bus.emit('images');
    };
    e.el.src = url;
    return e;
  };

  var K = ALP.canvas = {};
  K.roundRect = function (ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  K.wrap = function (ctx, text, maxW) {
    var words = String(text || '').split(' ').filter(function (w) { return w.length > 0; }), lines = [], line = '', i;
    for (i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = words[i]; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  };
  K.spacing = function (ctx, px) { try { ctx.letterSpacing = px + 'px'; } catch (e) {} };
  K.fit = function (ctx, text, maxW) {
    text = String(text || '');
    if (ctx.measureText(text).width <= maxW) return text;
    while (text.length > 1 && ctx.measureText(text + '...').width > maxW) text = text.slice(0, -1);
    return text + '...';
  };
  K.white = function (a) { return 'rgba(255,255,255,' + a + ')'; };
  // a big picture drawn small (reel cards, gallery thumbnails) is drawn from a reduced copy made once: much cheaper per repaint in a headset
  function smallOf(e) {
    if (e.small !== undefined) return e.small;
    var iw = e.el.naturalWidth, ih = e.el.naturalHeight, k = 640 / Math.max(iw, ih, 1);
    e.small = null;
    if (k >= 0.8) return null;
    try {
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(iw * k)); c.height = Math.max(1, Math.round(ih * k));
      var g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(e.el, 0, 0, c.width, c.height);
      e.small = c;
    } catch (err) { e.small = null; }
    return e.small;
  }
  K.image = function (ctx, url, x, y, w, h, fit, zoom) {
    var e = ALP.img(url);
    if (!e || e.state !== 'ok') {
      var g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, '#16263B'); g.addColorStop(1, '#0B1624');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      ALP.drawIcon(ctx, 'image', x + w / 2 - Math.min(w, h) * 0.12, y + h / 2 - Math.min(w, h) * 0.12, Math.min(w, h) * 0.24, K.white(e && e.state === 'error' ? 0.3 : 0.18));
      return false;
    }
    var iw = e.el.naturalWidth, ih = e.el.naturalHeight;
    var s = fit === 'contain' ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
    s *= zoom || 1;
    var dw = iw * s, dh = ih * s;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (fit === 'contain') { ctx.fillStyle = '#0a0a0a'; ctx.fillRect(x, y, w, h); }
    var src = (dw <= 560 && dh <= 560) ? (smallOf(e) || e.el) : e.el;
    ctx.drawImage(src, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    ctx.restore();
    return true;
  };

  var initial = function () {
    return {
      screen: 'start', params: {}, history: [],
      overlay: null, overlayParams: {},
      mode: 'customer',
      uiHidden: false,
      uiScale: 1,                  // 0.8 - 1.4, set from the dock
      sidebar: true,               // masterplan side panel visible
      transition: null,
      toast: null,
      lobbyIndex: 0,
      layers: {},
      locationId: null, viewIndex: 0,
      env: {},
      unitId: null,
      vertical: { tower: 0, floor: 0, stack: -1 },
      guided: { active: false, step: 0 },
      amenIndex: 0
    };
  };
  ALP.state = initial();
  var S = ALP.state;

  // a project file can add its own state keys; they are restored on reset
  ALP.stateExtras = null;
  ALP.extendState = function (obj) {
    ALP.stateExtras = U.extend(ALP.stateExtras || {}, obj);
    for (var k in obj) if (S[k] === undefined) S[k] = obj[k];
  };

  ALP.set = function (patch) {
    U.extend(S, patch);
    ALP.bus.emit('change', patch);
  };

  var LOC_SCREENS = { location: 1, viewer360: 1, environment: 1 };
  function syncParams(screen, params) {
    if (!params) return;
    if (LOC_SCREENS[screen] && params.id) S.locationId = params.id;
    if (screen === 'property' && params.unit) S.unitId = params.unit;
    if (params.room !== undefined) S.roomId = params.room;
    if (params.dressed !== undefined) S.dressed = params.dressed;
  }
  ALP.go = function (screen, params, opts) {
    opts = opts || {};
    if (!opts.replace && S.screen && S.screen !== screen) S.history.push({ screen: S.screen, params: S.params });
    if (S.history.length > 40) S.history.shift();
    var prev = S.screen;
    S.screen = screen; S.params = params || {}; S.overlay = null;
    syncParams(screen, S.params);
    ALP.log('screen:', prev, '->', screen);
    ALP.bus.emit('screen', { from: prev, to: screen, params: S.params });
    ALP.bus.emit('change', { screen: screen });
  };
  ALP.back = function () {
    if (S.overlay) { ALP.closeOverlay(); return; }
    var h = S.history.pop();
    if (!h) return;
    var prev = S.screen;
    S.screen = h.screen; S.params = h.params || {};
    syncParams(S.screen, S.params);
    ALP.bus.emit('screen', { from: prev, to: S.screen, params: S.params, back: true });
    ALP.bus.emit('change', { screen: S.screen });
  };
  ALP.openOverlay = function (name, params) {
    S.overlay = name; S.overlayParams = params || {};
    ALP.bus.emit('overlay', { name: name });
    ALP.bus.emit('change', { overlay: name });
  };
  ALP.closeOverlay = function () {
    if (!S.overlay) return;
    var was = S.overlay;
    S.overlay = null; S.overlayParams = {};
    ALP.bus.emit('overlay', { name: null, was: was });
    ALP.bus.emit('change', { overlay: null });
  };
  ALP.toast = function (text, ms) {
    S.toast = { text: text, until: Date.now() + (ms || 2600) };
    ALP.bus.emit('change', { toast: text });
  };
  ALP.setUiScale = function (v) {
    S.uiScale = U.clamp(Math.round(v * 20) / 20, 0.8, 1.4);
    try { sessionStorage.setItem('alpUiScale', String(S.uiScale)); } catch (e) {}
    if (ALP.vr) { ALP.vr.dirty(); ALP.vr.recenter(); }
    ALP.bus.emit('change', { uiScale: S.uiScale });
  };
  try {
    var savedScale = parseFloat(sessionStorage.getItem('alpUiScale'));
    if (savedScale > 0.5 && savedScale < 2) S.uiScale = savedScale;
  } catch (e) {}
  ALP.reset = function () {
    var fresh = initial(), keepScale = S.uiScale, k;
    for (k in fresh) S[k] = fresh[k];
    if (ALP.stateExtras) for (k in ALP.stateExtras) S[k] = ALP.stateExtras[k];
    S.uiScale = keepScale;
    ALP.bus.emit('screen', { from: null, to: 'start', params: {} });
    ALP.bus.emit('change', { reset: true });
    (ALP.scope ? ALP.scope.tour : ALP.tour).goMedia(ALP.project() && ALP.project().startMedia);
  };

  ALP.data = ALP.data || {};
  ALP.platform = function () { return (ALP.scope ? ALP.scope.data.platform : ALP.data.platform) || { brand: {}, projects: [] }; };
  ALP.project = function () { return (ALP.scope ? ALP.scope.data.project : ALP.data.project) || null; };
  ALP.findLocation = function (id) {
    var p = ALP.project(); if (!p || !p.locations) return null;
    for (var i = 0; i < p.locations.length; i++) if (p.locations[i].id === id) return p.locations[i];
    return null;
  };
  ALP.findUnit = function (id) {
    var p = ALP.project(); if (!p || !p.units) return null;
    for (var i = 0; i < p.units.length; i++) if (p.units[i].id === id) return p.units[i];
    return p.units[0] || null;
  };

  var T = ALP.tour = {};
  T.root = function () {
    try { var rp = window.tour && window.tour.locManager && window.tour.locManager.rootPlayer; if (rp) return rp; } catch (e) {}
    try { if (tdvThis && (tdvThis.mainPlayList || tdvThis.getComponentByName)) return tdvThis; } catch (e) {}
    return null;
  };
  T.seesHeadset = function () {
    try { return !!(window.tour && typeof window.tour.isVRDevice === 'function' && window.tour.isVRDevice()); } catch (e) { return false; }
  };
  T.playlistIndex = function () {
    var rp = T.root();
    try { var v = rp.mainPlayList.get('selectedIndex'); if (typeof v === 'number') return v; } catch (e) {}
    return -1;
  };
  T.mediaByName = function (name) {
    var rp = T.root();
    try { if (rp && typeof rp.getMediaByName === 'function') return rp.getMediaByName(name) || null; } catch (e) {}
    return null;
  };
  T.mediaName = function (media) {
    try { return media.get('label') || media.get('data') && media.get('data').label || ''; } catch (e) { return ''; }
  };
  T.currentMediaName = function () {
    var rp = T.root();
    try { var item = rp.mainPlayList.get('items')[T.playlistIndex()]; return T.mediaName(item.get('media')); } catch (e) { return ''; }
  };

  T.goMedia = function (ref) {
    if (ref === undefined || ref === null || ref === '') return false;
    var rp = T.root(); if (!rp) return false;
    try {
      if (typeof ref === 'number') { rp.mainPlayList.set('selectedIndex', ref); return true; }
      var media = T.mediaByName(ref);
      if (!media) { ALP.warn('no media named', ref); return false; }
      var items = rp.mainPlayList.get('items') || [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].get('media') === media) { rp.mainPlayList.set('selectedIndex', i); return true; }
      }
      if (typeof rp.setMainMediaByName === 'function') { rp.setMainMediaByName(ref); return true; }
    } catch (e) { ALP.warn('goMedia failed', ref, e); }
    return false;
  };
  T.mediaExists = function (ref) {
    if (typeof ref === 'number') return true;
    return !!T.mediaByName(ref);
  };

  // swap panorama but keep where the visitor is looking (used by Bare / Dressed)
  T.goMediaKeepView = function (index) {
    var rp = T.root(); if (!rp) return false;
    try {
      var items = rp.mainPlayList.get('items') || [], item = items[index];
      if (!item) return T.goMedia(index);
      if (typeof rp.setPanoramaCameraWithCurrentSpot === 'function') rp.setPanoramaCameraWithCurrentSpot(item);
      rp.mainPlayList.set('selectedIndex', index);
      return true;
    } catch (e) { ALP.warn('goMediaKeepView failed', e); }
    return T.goMedia(index);
  };

  T.setTagsVisible = function (tags, visible) {
    var rp = T.root();
    if (!rp || !tags || !tags.length) return false;
    try {
      if (typeof rp.setOverlaysVisibilityByTags === 'function') { rp.setOverlaysVisibilityByTags(tags, !!visible); return true; }
    } catch (e) { ALP.warn('setOverlaysVisibilityByTags failed', e); }
    return false;
  };
  T.hideVRMenu = function () {
    if (!C.hide3DVistaVRMenu) return 0;
    var rp = T.root(), list = [], n = 0;
    try { if (rp && typeof rp.getByClassName === 'function') list = rp.getByClassName('Panorama') || []; } catch (e) {}
    for (var j = 0; j < list.length; j++) {
      try {
        if (list[j].get('vrMenu') || list[j].get('cardboardMenu')) { list[j].set('cardboardMenu', null); list[j].set('vrMenu', null); n++; }
      } catch (e) {}
    }
    if (n) ALP.log('hid 3DVista VR menu on ' + n + ' panorama(s)');
    return n;
  };
  T.onMediaChange = function (fn) {
    var last = -2;
    setInterval(function () {
      var i = T.playlistIndex();
      if (i !== last) { last = i; try { fn(i, T.currentMediaName()); } catch (e) {} }
    }, 400);
  };

  T.openProjectUrl = function (url, inVR) {
    if (!url) return false;
    var mark = inVR ? 'alp-vr=1' : 'alp-start=intro';
    var sep = url.indexOf('#') === -1 ? '#' : '&';
    setTimeout(function () { window.location.href = url + sep + mark; }, 900);
    return true;
  };
  T.arrivedFromLobby = function () {
    var h = location.hash || '';
    return { vr: h.indexOf('alp-vr=1') !== -1, intro: h.indexOf('alp-vr=1') !== -1 || h.indexOf('alp-start=intro') !== -1 };
  };

  /* ---------- finding panoramas by name ---------- */
  // a project can list its panoramas by the names they have in 3DVista. Its own numbering (0, 1, 2 ... in the order of that list)
  // then stays the same wherever those panoramas sit in the tour's playlist, and whatever else is in the tour.
  T.items = function () {
    var rp = T.root();
    try { return rp.mainPlayList.get('items') || []; } catch (e) { return []; }
  };
  T.labelAt = function (i) {
    try { return T.mediaName(T.items()[i].get('media')); } catch (e) { return ''; }
  };
  T.thumbAt = function (i) {
    try {
      var m = T.items()[i].get('media'), u = m.get('thumbnailUrl');
      return u || null;
    } catch (e) { return null; }
  };
  var BARE_WORDS = ['bare', 'unfurnished', 'undressed', 'undress', 'unfurnish', 'unfur', 'empty', 'shell'];
  var DRESSED_WORDS = ['dressed', 'dress', 'furnished', 'furnish', 'fur', 'staged', 'styled'];
  var NOISE_WORDS = ['pv', 'parkvillas', 'pano', 'panorama', 'copy'];
  function isDigits(w) { for (var i = 0; i < w.length; i++) { var c = w.charCodeAt(i); if (c < 48 || c > 57) return false; } return w.length > 0; }
  // lower-case words only; 01 and 1 read the same
  function words(str) {
    var t = String(str === undefined || str === null ? '' : str).toLowerCase(), out = [], cur = '', i, c;
    for (i = 0; i <= t.length; i++) {
      c = i < t.length ? t.charCodeAt(i) : 32;
      if ((c >= 48 && c <= 57) || (c >= 97 && c <= 122)) cur += t.charAt(i);
      else if (cur) { out.push(isDigits(cur) ? String(parseInt(cur, 10)) : cur); cur = ''; }
    }
    return out;
  }
  T.words = words;
  function readLabel(label) {
    var w = words(label), rest = [], variant = null, i;
    for (i = 0; i < w.length; i++) {
      // the listed words, and anything that starts like them, so a typing slip such as unfurnised still reads as bare
      if (BARE_WORDS.indexOf(w[i]) !== -1 || w[i].indexOf('unfurn') === 0 || w[i].indexOf('undress') === 0) variant = 'bare';
      else if (DRESSED_WORDS.indexOf(w[i]) !== -1 || w[i].indexOf('furnis') === 0 || w[i].indexOf('dresse') === 0) { if (variant !== 'bare') variant = 'dressed'; }
      else if (NOISE_WORDS.indexOf(w[i]) === -1) rest.push(w[i]);
    }
    var keys = [rest.join(' ')];
    if (rest.length > 1 && isDigits(rest[0])) keys.push(rest.slice(1).join(' '));
    // the same names written without spaces (LiftCar, Lift_Car) still match
    keys.push(rest.join(''));
    if (rest.length > 1 && isDigits(rest[0])) keys.push(rest.slice(1).join(''));
    return { exact: w.join(' '), keys: keys, variant: variant };
  }
  function scopedTour(X) {
    var t = Object.create(T), spec = null, l2a = null, a2l = null, builtAt = 0, builtN = -1, whole = false, told = false;
    // items: [{ names: [...], variant: 'dressed' | 'bare' | undefined }]. Without a variant the whole name has to match.
    t.setPlaylist = function (sp) { spec = sp || null; l2a = null; a2l = null; whole = false; told = false; };
    function build() {
      var items = T.items(), n = items.length, i, j, k;
      builtAt = Date.now();
      if (!n) return false;
      builtN = n;
      var exact = {}, area = {}, list = spec.items || [];
      for (i = 0; i < list.length; i++) {
        var names = list[i].names || [];
        for (j = 0; j < names.length; j++) {
          var nw = words(names[j]), key = nw.join(' ');
          if (!key) continue;
          if (list[i].variant) {
            (area[key] = area[key] || {})[list[i].variant] = i;
            var key2 = nw.join('');
            if (key2 !== key) { area[key2] = area[key2] || {}; if (area[key2][list[i].variant] === undefined) area[key2][list[i].variant] = i; }
          }
          else if (exact[key] === undefined) exact[key] = i;
        }
      }
      var L2A = {}, A2L = {}, loose = [];
      function take(li, ai) { if (L2A[li] === undefined && A2L[ai] === undefined) { L2A[li] = ai; A2L[ai] = li; return true; } return false; }
      for (i = 0; i < n; i++) {
        var lab = T.labelAt(i);
        if (!lab) continue;
        var rd = readLabel(lab);
        if (exact[rd.exact] !== undefined) { take(exact[rd.exact], i); continue; }
        for (k = 0; k < rd.keys.length; k++) {
          var a = area[rd.keys[k]];
          if (!a) continue;
          if (rd.variant && a[rd.variant] !== undefined) take(a[rd.variant], i);
          else if (!rd.variant) loose.push([a, i]);
          break;
        }
      }
      // a name with no bare or dressed word in it fills whichever of the two is still missing, dressed first
      for (i = 0; i < loose.length; i++) {
        var la = loose[i][0];
        if (la.dressed !== undefined && L2A[la.dressed] === undefined) take(la.dressed, loose[i][1]);
        else if (la.bare !== undefined && L2A[la.bare] === undefined) take(la.bare, loose[i][1]);
      }
      if (spec.fallbackIndex) for (i = 0; i < list.length; i++) if (L2A[i] === undefined && i < n) take(i, i);
      l2a = L2A; a2l = A2L;
      var missing = 0;
      for (i = 0; i < list.length; i++) if (L2A[i] === undefined) missing++;
      whole = missing === 0;
      if (!told && (whole || Date.now() - (t.since || builtAt) > 9000)) {
        told = true;
        if (missing) ALP.warn(X.scopeId + ': ' + missing + ' of ' + list.length + ' panoramas were not found by name. Run alpPanoramaCheck() in the console for the list.');
        else ALP.log(X.scopeId + ': all ' + list.length + ' panoramas found by name');
      }
      return true;
    }
    function ready() {
      if (!spec) return false;
      if (!t.since) t.since = Date.now();
      if (!l2a || T.items().length !== builtN || (!whole && Date.now() - builtAt > 1500)) build();
      return !!l2a;
    }
    t.actual = function (i) {
      if (typeof i !== 'number' || !spec) return i;
      if (!ready()) return spec.fallbackIndex ? i : -1;
      var a = l2a[i];
      return a === undefined ? -1 : a;
    };
    t.logical = function (a) {
      if (typeof a !== 'number' || !spec) return a;
      if (!ready()) return spec.fallbackIndex ? a : -1;
      var l = a2l[a];
      return l === undefined ? -1 : l;
    };
    t.known = function () { return !spec || ready(); };
    t.playlistIndex = function () { return t.logical(T.playlistIndex()); };
    t.mediaExists = function (ref) {
      if (typeof ref !== 'number') return T.mediaExists(ref);
      if (!spec) return true;
      if (!ready()) return true;
      return l2a[ref] !== undefined;
    };
    t.goMedia = function (ref) {
      if (typeof ref !== 'number' || !spec) return T.goMedia(ref);
      var a = t.actual(ref);
      if (a < 0) { ALP.warn(X.scopeId + ': panorama ' + ref + ' is not in the tour (' + ((spec.items[ref] || {}).names || []).slice(0, 1).join('') + ')'); return false; }
      return T.goMedia(a);
    };
    t.goMediaKeepView = function (ref) {
      if (typeof ref !== 'number' || !spec) return T.goMediaKeepView(ref);
      var a = t.actual(ref);
      if (a < 0) return false;
      return T.goMediaKeepView(a);
    };
    t.thumb = function (ref) { var a = t.actual(ref); return typeof a === 'number' && a >= 0 ? T.thumbAt(a) : null; };
    t.onMediaChange = function (fn) {
      T.onMediaChange(function (i, name) { if (ALP.scope === X) fn(t.logical(i), name); });
    };
    // what was matched to what: for checking the names given to the panoramas in 3DVista
    t.report = function () {
      var out = [], list = spec ? spec.items || [] : [], i;
      ready();
      for (i = 0; i < list.length; i++) {
        var a = l2a ? l2a[i] : undefined;
        out.push({ project: X.scopeId, number: i, wanted: (list[i].names || [])[0] + (list[i].variant ? ' (' + list[i].variant + ')' : ''), found: a === undefined ? 'NOT FOUND' : T.labelAt(a), playlist: a === undefined ? '' : a });
      }
      return out;
    };
    return t;
  }
  // in the browser console: alpPanoramaCheck() lists every panorama each project asks for and the one it found
  window.alpPanoramaCheck = function () {
    var all = [], k;
    for (k in ALP.scopes) { try { all = all.concat(ALP.scopes[k].tour.report()); } catch (e) {} }
    try { if (window.console && console.table) console.table(all); } catch (e) {}
    return all;
  };

  /* ---------- several projects in one tour ---------- */
  // Each project's files run against their own copy of the things a project changes: colours and type, icons, settings,
  // data, its widgets and actions. Only the project that is open draws, listens and follows the tour. A tour with one
  // project works exactly as before.
  ALP.scopes = {};
  ALP.scopeList = [];
  ALP.scope = null;
  function hashValue(key) {
    var h = (location.hash || '').slice(1).split('&'), i;
    for (i = 0; i < h.length; i++) { var kv = h[i].split('='); if (kv[0] === key) return kv.length > 1 ? decodeURIComponent(kv[1]) : ''; }
    return '';
  }
  var wantedScope = hashValue('alp-project') || C.startProject || '';
  function cloneDeep(o) {
    if (!o || typeof o !== 'object') return o;
    var c = Array.isArray(o) ? [] : {}, k;
    for (k in o) if (Object.prototype.hasOwnProperty.call(o, k)) c[k] = cloneDeep(o[k]);
    return c;
  }
  var exposed = {};
  function scopeFor(id) {
    var X = ALP.scopes[id];
    if (X) return X;
    X = Object.create(ALP);
    X.scopeId = id;
    X.tokens = cloneDeep(ALP.tokens);
    X.px = function (deg) { return Math.round(deg * X.tokens.ppd); };
    X.icons = Object.create(ALP.icons);
    X.drawIcon = iconDrawer(X.icons);
    Object.defineProperty(X, 'config', { value: Object.create(C), writable: true, configurable: true, enumerable: true });
    X.vrOverrides = {};
    X.data = {};
    X.platform = function () { return X.data.platform || { brand: {}, projects: [] }; };
    X.project = function () { return X.data.project || null; };
    X.findLocation = function (lid) {
      var p = X.project(); if (!p || !p.locations) return null;
      for (var i = 0; i < p.locations.length; i++) if (p.locations[i].id === lid) return p.locations[i];
      return null;
    };
    X.findUnit = function (uid) {
      var p = X.project(); if (!p || !p.units) return null;
      for (var i = 0; i < p.units.length; i++) if (p.units[i].id === uid) return p.units[i];
      return p.units[0] || null;
    };
    X.isActive = function () { return ALP.scope === X; };
    X.has = function (name) { return !!(mods[id + ':' + name] || mods[name]); };
    X.bus = {
      on: function (ev, fn) { var g = function (d) { if (ALP.scope === X) fn(d); }; fn.__alpGate = g; ALP.bus.on(ev, g); return fn; },
      off: function (ev, fn) { ALP.bus.off(ev, fn && fn.__alpGate ? fn.__alpGate : fn); },
      emit: function (ev, d) { ALP.bus.emit(ev, d); }
    };
    X.tour = scopedTour(X);
    // the engine hands each project its own view of the panels once it is there
    Object.defineProperty(X, 'vr', {
      configurable: true, enumerable: false,
      get: function () {
        var base = Object.getPrototypeOf(X).vr;
        if (!base) return base;
        if (!X.__vr || X.__vrBase !== base) { X.__vr = base.scoped ? base.scoped(X) : base; X.__vrBase = base; }
        return X.__vr;
      }
    });
    ALP.scopes[id] = X;
    ALP.scopeList.push(id);
    if (!ALP.scope && (!wantedScope || wantedScope === id)) { ALP.scope = X; markProject(id); }
    return X;
  }
  function markProject(id) { try { document.documentElement.setAttribute('data-alp-project', id); } catch (e) {} }
  // after one of a project's files has run: its engine settings are kept aside for the engine to apply while that project is open,
  // and anything it added to ALP (its actions, widgets, map) can still be reached as ALP.<name> for whichever project is open
  function settleScope(X) {
    var cfg = X.config, k;
    if (Object.prototype.hasOwnProperty.call(cfg, 'vr')) {
      var v = cfg.vr, base = C.vr || {};
      for (k in v) if (Object.prototype.hasOwnProperty.call(v, k) && v[k] !== base[k]) X.vrOverrides[k] = v[k];
      delete cfg.vr;
    }
    var keys = Object.keys(X);
    for (var i = 0; i < keys.length; i++) expose(keys[i]);
  }
  function expose(k) {
    if (exposed[k] || k.charAt(0) === '_' || Object.prototype.hasOwnProperty.call(ALP, k)) return;
    exposed[k] = true;
    try {
      Object.defineProperty(ALP, k, {
        configurable: true, enumerable: false,
        get: function () { var sc = ALP.scope; return sc && Object.prototype.hasOwnProperty.call(sc, k) ? sc[k] : undefined; },
        set: function (v) { Object.defineProperty(this, k, { value: v, writable: true, configurable: true, enumerable: true }); }
      });
    } catch (e) {}
  }
  // open another project of this tour. Each project listens for project:leave and project:enter on its own bus.
  ALP.activate = function (id, opts) {
    var X = ALP.scopes[id], prev = ALP.scope;
    if (!X) return false;
    if (prev === X) return true;
    opts = opts || {};
    if (prev) ALP.bus.emit('project:leave', { to: id });
    S.history = []; S.overlay = null; S.overlayParams = {}; S.uiHidden = false; S.transition = null;
    ALP.scope = X;
    markProject(id);
    ALP.log('project:', prev ? prev.scopeId : '(none)', '->', id);
    ALP.bus.emit('project', { id: id, from: prev ? prev.scopeId : null, opts: opts });
    ALP.bus.emit('project:enter', { from: prev ? prev.scopeId : null, opts: opts });
    ALP.bus.emit('change', { project: id });
    // for the tour's own page scripts: window.addEventListener('alp:project', function (e) { e.detail.id ... })
    try { window.dispatchEvent(new CustomEvent('alp:project', { detail: { id: id, from: prev ? prev.scopeId : null } })); } catch (e) {}
    return true;
  };
  // the picture on a project card: its own image, or for a project inside this tour, the thumbnail of its first panorama
  ALP.cardImage = function (pj) {
    if (!pj) return null;
    if (pj.image) return pj.image;
    var X = ALP.scopes && ALP.scopes[pj.id];
    if (!X || !X.tour || !X.tour.known || !X.tour.known()) return pj.fallbackImage || null;
    var pr = X.project ? X.project() : null, m = pr ? (pr.cardMedia !== undefined ? pr.cardMedia : pr.startMedia) : null;
    if (m === undefined || m === null) m = 0;
    var u = null;
    try { u = X.tour.thumb(m); } catch (e) { u = null; }
    return u || pj.fallbackImage || null;
  };
  ALP.activeProject = function () { return ALP.scope ? ALP.scope.scopeId : (C.projectId || ''); };
  // the address named a project this tour does not have: open the first one
  setTimeout(function () { if (!ALP.scope && ALP.scopeList.length) ALP.activate(ALP.scopeList[0], {}); }, 0);

  function fixOldQuest() {
    if (!C.oculusQuest1Fix) return false;
    var ua = (navigator.userAgent || '').toLowerCase();
    if (ua.indexOf('oculusbrowser') === -1) return false;
    var api = window.TDV && window.TDV.PlayerAPI;
    if (!api || api.device !== (api.DEVICE_OTHER || 'other')) return false;
    var hash = location.hash || '';
    if (hash.indexOf('device=') !== -1) return false;
    var tries = 0;
    try { tries = parseInt(sessionStorage.getItem('alpQuestFix') || '0', 10) || 0; sessionStorage.setItem('alpQuestFix', String(tries + 1)); } catch (e) {}
    if (tries >= 2) return false;
    ALP.log('Oculus browser not recognised by 3DVista, reloading with #device=oculusquest');
    try { location.replace(location.href.split('#')[0] + (hash.length > 1 ? hash + '&' : '#') + 'device=oculusquest'); location.reload(); } catch (e) { return false; }
    return true;
  }
  if (fixOldQuest()) { ALP.halted = true; return; }

  try {
    if (!document.getElementById('alp-fonts')) {
      var l = document.createElement('link');
      l.id = 'alp-fonts'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Montserrat:wght@300;400;500;600&display=swap';
      (document.head || document.documentElement).appendChild(l);
    }
    if (document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load('400 20px Inter'), document.fonts.load('600 20px Inter'), document.fonts.load('500 20px Montserrat')])
        .then(function () { ALP.bus.emit('images'); }, function () {});
    }
  } catch (e) {}

  T.hideVRMenu();
  setTimeout(T.hideVRMenu, 3000);
  ALP.define('core', [], function () { return true; });

  var q = window.__ALPQ || [];
  window.__ALPQ = { push: function (m) { ALP.define(m[0], m[1], m[2], m[3]); } };
  for (var i = 0; i < q.length; i++) ALP.define(q[i][0], q[i][1], q[i][2], q[i][3]);
  ALP.log('core ' + ALP.version + ' installed');
})(typeof this !== 'undefined' ? this : null);
