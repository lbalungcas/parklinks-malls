(function () {
  var run = function (ALP) {
  'use strict';
  var S = ALP.state, K = ALP.canvas, T = ALP.tokens, C = T.color, px = ALP.px, E = ALP.vr, W = ALP.ui, A = ALP.actions, U = ALP.util, M4 = U.M4;
  var NL = String.fromCharCode(10);

  // the whole mall on a table in front of you, floor by floor, in the tour's own finishes, with a see-through
  // skeleton view, exploded floors, and a life-size walk-inside mode with point-and-teleport
  var CFG = U.extend({
    width: 1.05, dist: 1.45, y: -0.42, tilt: 32, topTilt: 82, yaw: 0,
    minZoom: 0.3, maxZoom: 8, exaggerate: 1, explodeGap: 10,
    pinH: 16, pinR: 3.2, walkPinScale: 0.16, eyeHeight: 1.6, turnDeg: 30, walkReach: 70,
    ghostAlpha: 0.12, lineAlpha: 0.75,
    // opening the map from inside the mall shows the floor you are on; false always opens on the whole building
    autoFocus: true,
    // the floor in focus is shown with the finer walk-inside mesh, cut off at this height above its floor so you look into it
    fineFocus: true, cutHeight: 2.5,
    // true fades the floors under the one in focus to a ghost instead of leaving them solid
    ghostBelow: false,
    // the base the model stands on
    plinth: true,
    // false keeps the map on the table as an information map; true adds Walk Inside
    walk: false,
    // soft shadows from walls and columns on the floor that is open
    shadows: true,
    // true shows the model position under your pointer in the toolbar, for placing pins, lots and amenities
    showPosition: false,
    // look: 'auto' is the textured model; 'plain' draws the earlier plain-coloured model with no patterns or lighting, the lightest option for a slow headset
    look: 'auto',
    sun: [0.38, 0.82, 0.42], walkFog: 0.0045
  }, ALP.config.mall3d || {});
  ALP.config.mall3d = CFG;

  var MAP = ALP.mall3d = { ready: false, loading: false, error: '', loaded: 0, version: 3, look: CFG.look === 'plain' ? 'plain' : '' };
  var MF = null, levels = [], pins = [], Qm = null;
  var view = { zoom: 1, yaw: 0.35, tilt: CFG.tilt, targetYaw: 0.35, targetZoom: 1, targetTilt: CFG.tilt, off: [0, 0, 0], wyaw: 0 };
  // the table model is placed once in front of you and then stays put in the room, so it can be handled
  var frame = { set: false, pos: [0, 0, 0], yaw: 0 };
  var G = { marks: [], act: [], mode: '', s0: null, detent: 0 };
  var mode = { focus: -1, skeleton: false, explode: false, ex: 0, sk: 0 };
  var walk = { on: false, level: 0, px: 0, pz: 0, yaw: 0, feet: [0, 0, 0] };
  var hov = { pin: null, level: -1, floor: null, extra: null };
  var drag = null, dragMoved = 0, dragEndedAt = 0, stickPrev = {};
  var cx = 0, cz = 0, y0 = 0, span = 1, bnd = [0, 0, 0, 1, 1, 1], opacity = 0, ground = 2;
  // the second file (stores, people, labels) draws and picks through these
  var HK = { solid: [], overlay: [], pick: [], hint: [] };
  var wantFocus = false;

  /* ---------- addresses ---------- */
  function mcfg() { return (ALP.project() || {}).map3d || {}; }
  function manifestUrl() { return U.rawUrl(MAP.url || (CFG.look === 'plain' && mcfg().fallback) || mcfg().url || 'alp-mall-3d.json'); }
  function heroUrl() { return mcfg().hero ? U.rawUrl(mcfg().hero) : ''; }
  // raw.githubusercontent.com/user/repo/branch/path -> cdn.jsdelivr.net/gh/user/repo@branch/path
  function mirrorUrl(u) {
    var pre = 'https://raw.githubusercontent.com/';
    if (!u || u.indexOf(pre) !== 0) return '';
    var p = u.slice(pre.length).split('/');
    if (p.length < 4) return '';
    return 'https://cdn.jsdelivr.net/gh/' + p[0] + '/' + p[1] + '@' + p[2] + '/' + p.slice(3).join('/');
  }
  // floor files sit in the same folder as the manifest unless a full address is given
  function fileUrl(name) {
    if (!name) return '';
    if (name.indexOf('http') === 0) return U.rawUrl(name);
    var base = manifestUrl(), k = base.lastIndexOf('/');
    return k >= 0 ? base.slice(0, k + 1) + name : name;
  }
  function fetchAny(u, kind) {
    var get = function (x) {
      // a background warm-up yields to the tour's own downloads; once the map is open each floor loads at normal priority
      return fetch(x, { mode: 'cors', priority: S.mapOn ? 'high' : 'low' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + x);
        return kind === 'json' ? r.json() : r.arrayBuffer();
      });
    };
    var m = mirrorUrl(u);
    return get(u).then(null, function (e) {
      if (!m) throw e;
      ALP.warn('mall3d: trying the mirror for', u);
      return get(m);
    });
  }

  /* ---------- data ---------- */
  function parseBin(ab) {
    var dv = new DataView(ab);
    if (dv.getUint8(0) !== 65 || dv.getUint8(1) !== 76 || dv.getUint8(2) !== 80 || dv.getUint8(3) !== 51) throw new Error('not an ALP3 mesh');
    var ver = dv.getUint32(4, true);
    return { data: new Uint8Array(ab, 32), no: dv.getUint32(8, true), ng: dv.getUint32(12, true), nl: dv.getUint32(16, true),
      layout: ver >= 2 ? attribsM : attribsQ, legacy: ver < 2, buf: null, vao: null };
  }
  function levelIndex(id) { for (var j = 0; j < levels.length; j++) if (levels[j].id === id) return j; return 0; }
  function setup(mf) {
    MF = mf;
    var b = mf.bounds, i, j;
    bnd = b; cx = (b[0] + b[3]) / 2; cz = (b[2] + b[5]) / 2; y0 = b[1]; span = Math.max(b[3] - b[0], b[5] - b[2]);
    ground = mf.ground === undefined ? y0 + 2 : mf.ground;
    var q = mf.q;
    Qm = M4.mul(M4.translate(q.offset[0], q.offset[1], q.offset[2]), M4.scale(q.scale, q.scale, q.scale));
    levels = [];
    for (i = 0; i < mf.levels.length; i++) {
      var l = mf.levels[i];
      levels.push({ id: l.id, name: l.name || l.id, short: l.short || l.id, elev: l.elev || 0, top: l.top || (l.elev || 0) + 5,
        file: l.table, walkFile: l.walk && l.walk !== l.table ? l.walk : '', table: null, walkMesh: null, walkLoading: false,
        show: 1, ghost: 0, lift: 0, glow: 0, failed: false });
    }
    // pins: the model file's own, then the data file's on top (same label replaces, new label adds)
    var list = (mf.pins || []).slice(), extra = mcfg().pins || [], places = A.places();
    for (i = 0; i < extra.length; i++) {
      var found = -1;
      for (j = 0; j < list.length; j++) if (list[j].label === extra[i].label) found = j;
      if (found >= 0) list[found] = extra[i]; else list.push(extra[i]);
    }
    pins = [];
    for (i = 0; i < list.length; i++) {
      var pp = list[i], pl = null, li = levelIndex(pp.level);
      for (j = 0; j < places.length; j++) if (places[j].map === pp.label) pl = places[j];
      pins.push({ id: 'pin:' + i, label: pp.label, x: pp.x, y: levels[li].elev, z: pp.z, level: li, place: pl ? pl.id : null, outdoor: !!pp.outdoor });
    }
    SH.plinth = null;
    ALP.bus.emit('mall3d:setup', { levels: levels.length, pins: pins.length });
  }
  function load() {
    if (MAP.loading || MF) return;
    MAP.loading = true; MAP.error = ''; MAP.loaded = 0; E.dirty('mall3d');
    if (!TX.a) setTimeout(makeTextures, 30);
    var start = function (mf) {
      if (!mf || (mf.version !== 2 && mf.version !== 3) || !mf.levels || !mf.levels.length) throw new Error('not a version 2 or 3 map manifest');
      setup(mf);
      nextLevel(0);
    };
    fetchAny(manifestUrl(), 'json').then(start).then(null, function (e) {
      // the newer model is not on the server yet: fall back to the one that is
      var fb = mcfg().fallback;
      if (!fb || MAP.url) { fail(e); return; }
      ALP.log('mall3d: new model not found, using the earlier one');
      MAP.url = fb; MF = null;
      fetchAny(manifestUrl(), 'json').then(start).then(null, fail);
    });
  }
  function fail(e) {
    MAP.loading = false; MF = null;
    MAP.error = 'The 3D model could not be downloaded. Check the connection and open the map again.';
    ALP.warn('mall3d load failed', manifestUrl(), e);
    E.dirty('mall3d'); E.dirty('mall3dposter');
  }
  function nextLevel(i) {
    if (i >= levels.length) {
      MAP.loading = false;
      if (!MAP.ready) { fail(new Error('no floor could be loaded')); return; }
      ALP.log('mall3d loaded:', levels.length, 'floors,', pins.length, 'pins');
      E.dirty('mall3d');
      return;
    }
    fetchAny(fileUrl(levels[i].file), 'bin').then(function (ab) {
      levels[i].table = parseBin(ab);
      MAP.loaded = i + 1; MAP.ready = true;
      E.dirty('mall3d');
      nextLevel(i + 1);
    }).then(null, function (e) {
      ALP.warn('mall3d floor failed', levels[i].file, e);
      levels[i].failed = true;
      nextLevel(i + 1);
    });
  }
  // the finer walk-inside mesh of a floor loads only when someone walks on that floor
  function needWalk(i) {
    var L = levels[i];
    if (!L || L.walkMesh || L.walkLoading || !L.walkFile) return;
    L.walkLoading = true;
    fetchAny(fileUrl(L.walkFile), 'bin').then(function (ab) { L.walkMesh = parseBin(ab); L.walkLoading = false; },
      function (e) { L.walkLoading = false; L.walkFile = ''; ALP.warn('mall3d walk mesh failed', e); });
  }
  function meshFor(i) {
    var L = levels[i];
    if (!L) return null;
    if (walk.on && i === walk.level && L.walkMesh) return L.walkMesh;
    if (!walk.on && CFG.fineFocus && MAP.look !== 'plain' && mode.focus === i && L.walkMesh) return L.walkMesh;
    return L.table;
  }

  /* ---------- fixed shapes: pin, rings, sky, plinth ---------- */
  function packF(P, Cc) {
    var n = P.length / 3, ab = new ArrayBuffer(n * 16), f = new Float32Array(ab), u = new Uint8Array(ab), i;
    for (i = 0; i < n; i++) {
      f[i * 4] = P[i * 3]; f[i * 4 + 1] = P[i * 3 + 1]; f[i * 4 + 2] = P[i * 3 + 2];
      u[i * 16 + 12] = Cc[i * 4]; u[i * 16 + 13] = Cc[i * 4 + 1]; u[i * 16 + 14] = Cc[i * 4 + 2]; u[i * 16 + 15] = Cc[i * 4 + 3];
    }
    return { data: u, count: n, layout: attribsF, buf: null, vao: null };
  }
  function pinShape() {
    var P = [], Cc = [], h = CFG.pinH, r = CFG.pinR, st = r * 0.14, i;
    function v(p, s) { P.push(p[0], p[1], p[2]); var c = Math.round(255 * s); Cc.push(c, c, c, 255); }
    function tri(a, b, c, s) { v(a, s); v(b, s); v(c, s); }
    tri([-st, 0, 0], [st, 0, 0], [st, h, 0], 0.8); tri([-st, 0, 0], [st, h, 0], [-st, h, 0], 0.8);
    tri([0, 0, -st], [0, 0, st], [0, h, st], 0.65); tri([0, 0, -st], [0, h, st], [0, h, -st], 0.65);
    var top = [0, h + r * 1.5, 0], bot = [0, h - r * 0.6, 0], ring = [[r, h, 0], [0, h, r], [-r, h, 0], [0, h, -r]];
    for (i = 0; i < 4; i++) {
      var a = ring[i], c = ring[(i + 1) % 4], s1 = 0.72 + 0.28 * ((i + 1) % 2);
      tri(top, c, a, s1); tri(bot, a, c, s1 * 0.6);
    }
    for (i = 0; i < 24; i++) {
      var a0 = i / 24 * Math.PI * 2, a1 = (i + 1) / 24 * Math.PI * 2, rr = r * 0.95;
      tri([0, 0.15, 0], [Math.cos(a1) * rr, 0.15, Math.sin(a1) * rr], [Math.cos(a0) * rr, 0.15, Math.sin(a0) * rr], 1);
    }
    return packF(P, Cc);
  }
  function ringShape() {
    var P = [], Cc = [], i, r0 = 0.32, r1 = 0.46, n = 32;
    for (i = 0; i < n; i++) {
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      var p00 = [Math.cos(a0) * r0, 0, Math.sin(a0) * r0], p01 = [Math.cos(a0) * r1, 0, Math.sin(a0) * r1];
      var p10 = [Math.cos(a1) * r0, 0, Math.sin(a1) * r0], p11 = [Math.cos(a1) * r1, 0, Math.sin(a1) * r1];
      [p00, p01, p11, p00, p11, p10].forEach(function (p) { P.push(p[0], p[1], p[2]); Cc.push(52, 211, 153, 255); });
      [[0, 0, 0], p10, p00].forEach(function (p) { P.push(p[0], p[1], p[2]); Cc.push(52, 211, 153, 70); });
    }
    return packF(P, Cc);
  }
  // a thin white ring of radius 1, for the pulse under the place you came from
  function haloShape() {
    var P = [], Cc = [], i, n = 40;
    for (i = 0; i < n; i++) {
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, r0 = 0.86;
      var p00 = [Math.cos(a0) * r0, 0, Math.sin(a0) * r0], p01 = [Math.cos(a0), 0, Math.sin(a0)];
      var p10 = [Math.cos(a1) * r0, 0, Math.sin(a1) * r0], p11 = [Math.cos(a1), 0, Math.sin(a1)];
      [p00, p01, p11, p00, p11, p10].forEach(function (p) { P.push(p[0], p[1], p[2]); Cc.push(255, 255, 255, 255); });
    }
    return packF(P, Cc);
  }
  function skyShape() {
    // a soft warm sky around you while walking inside, so the panorama does not show through
    var P = [], Cc = [], R = 50, top = [206, 220, 234], hor = [244, 240, 232], low = [158, 152, 142];
    var c4 = [[-R, -R], [R, -R], [R, R], [-R, R]], i;
    function v(x, y, z, c) { P.push(x, y, z); Cc.push(c[0], c[1], c[2], 255); }
    for (i = 0; i < 4; i++) {
      var a = c4[i], b = c4[(i + 1) % 4];
      v(a[0], 0, a[1], hor); v(b[0], 0, b[1], hor); v(b[0], R, b[1], top);
      v(a[0], 0, a[1], hor); v(b[0], R, b[1], top); v(a[0], R, a[1], top);
      v(a[0], -R, a[1], low); v(b[0], -R, b[1], low); v(b[0], 0, b[1], hor);
      v(a[0], -R, a[1], low); v(b[0], 0, b[1], hor); v(a[0], 0, a[1], hor);
    }
    v(-R, R, -R, top); v(R, R, -R, top); v(R, R, R, top); v(-R, R, -R, top); v(R, R, R, top); v(-R, R, R, top);
    v(-R, -R, -R, low); v(R, -R, R, low); v(R, -R, -R, low); v(-R, -R, -R, low); v(-R, -R, R, low); v(R, -R, R, low);
    return packF(P, Cc);
  }
  // the base the model stands on: a dark block with a landscaped top and a brass rim, like a model in a sales gallery
  function plinthShape() {
    var P = [], Cc = [], m = 10, x0 = bnd[0] - m, x1 = bnd[3] + m, z0 = bnd[2] - m, z1 = bnd[5] + m, yt = ground - 0.35, yb = yt - span * 0.035, yr = yt + 0.5;
    function quad(a, b, c, d, col) { [a, b, c, a, c, d].forEach(function (p) { P.push(p[0], p[1], p[2]); Cc.push(col[0], col[1], col[2], 255); }); }
    var gr = [96, 110, 88], s1 = [30, 29, 27], s2 = [20, 19, 18], br = [176, 148, 92], br2 = [128, 106, 64];
    // the lawn, mown in stripes, with a pale kerb just inside the rim
    var ns = Math.round((x1 - x0) / 7), kb = [150, 146, 132], si;
    for (si = 0; si < ns; si++) { var sa = x0 + (x1 - x0) * si / ns, sb = x0 + (x1 - x0) * (si + 1) / ns, gc = si % 2 ? gr : [104, 119, 94]; quad([sa, yt, z0], [sb, yt, z0], [sb, yt, z1], [sa, yt, z1], gc); }
    quad([x0, yt + 0.02, z0], [x1, yt + 0.02, z0], [x1, yt + 0.02, z0 + 1.3], [x0, yt + 0.02, z0 + 1.3], kb); quad([x0, yt + 0.02, z1 - 1.3], [x1, yt + 0.02, z1 - 1.3], [x1, yt + 0.02, z1], [x0, yt + 0.02, z1], kb);
    quad([x0, yt + 0.02, z0], [x0 + 1.3, yt + 0.02, z0], [x0 + 1.3, yt + 0.02, z1], [x0, yt + 0.02, z1], kb); quad([x1 - 1.3, yt + 0.02, z0], [x1, yt + 0.02, z0], [x1, yt + 0.02, z1], [x1 - 1.3, yt + 0.02, z1], kb);
    quad([x0, yb, z1], [x1, yb, z1], [x1, yt, z1], [x0, yt, z1], s1); quad([x1, yb, z0], [x0, yb, z0], [x0, yt, z0], [x1, yt, z0], s1);
    quad([x1, yb, z1], [x1, yb, z0], [x1, yt, z0], [x1, yt, z1], s2); quad([x0, yb, z0], [x0, yb, z1], [x0, yt, z1], [x0, yt, z0], s2);
    quad([x0, yb, z0], [x1, yb, z0], [x1, yb, z1], [x0, yb, z1], s2);
    // rim
    var w = 0.9;
    quad([x0 - w, yt - 0.2, z1 + w], [x1 + w, yt - 0.2, z1 + w], [x1 + w, yr, z1 + w], [x0 - w, yr, z1 + w], br); quad([x1 + w, yt - 0.2, z0 - w], [x0 - w, yt - 0.2, z0 - w], [x0 - w, yr, z0 - w], [x1 + w, yr, z0 - w], br);
    quad([x1 + w, yt - 0.2, z1 + w], [x1 + w, yt - 0.2, z0 - w], [x1 + w, yr, z0 - w], [x1 + w, yr, z1 + w], br2); quad([x0 - w, yt - 0.2, z0 - w], [x0 - w, yt - 0.2, z1 + w], [x0 - w, yr, z1 + w], [x0 - w, yr, z0 - w], br2);
    quad([x0 - w, yr, z0 - w], [x1 + w, yr, z0 - w], [x1 + w, yr, z0], [x0 - w, yr, z0], br); quad([x0 - w, yr, z1], [x1 + w, yr, z1], [x1 + w, yr, z1 + w], [x0 - w, yr, z1 + w], br);
    quad([x0 - w, yr, z0], [x0, yr, z0], [x0, yr, z1], [x0 - w, yr, z1], br); quad([x1, yr, z0], [x1 + w, yr, z0], [x1 + w, yr, z1], [x1, yr, z1], br);
    quad([x0, yt, z0], [x0, yr, z0], [x0, yr, z1], [x0, yt, z1], br2); quad([x1, yt, z1], [x1, yr, z1], [x1, yr, z0], [x1, yt, z0], br2);
    quad([x0, yt, z0], [x1, yt, z0], [x1, yr, z0], [x0, yr, z0], br2); quad([x1, yt, z1], [x0, yt, z1], [x0, yr, z1], [x1, yr, z1], br2);
    // trees around the border, each a trunk under two rounded crowns, standing on a soft shadow
    var rr = rng(41), per = 2 * ((x1 - x0) + (z1 - z0)), nT = Math.round(per / 11), k;
    function vtx(p3, col, sh, al) { P.push(p3[0], p3[1], p3[2]); Cc.push(Math.min(255, Math.round(col[0] * sh)), Math.min(255, Math.round(col[1] * sh)), Math.min(255, Math.round(col[2] * sh)), al === undefined ? 255 : al); }
    function crown(cx2, cy2, cz2, rx, ry, col) {
      var seg = 7, rings = 4;
      for (var j2 = 0; j2 < rings; j2++) for (var q = 0; q < seg; q++) {
        [[q, j2], [q + 1, j2], [q + 1, j2 + 1], [q, j2], [q + 1, j2 + 1], [q, j2 + 1]].forEach(function (e) {
          var th = e[0] / seg * 6.2832, ph = e[1] / rings * 3.1416, n = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
          vtx([cx2 + n[0] * rx, cy2 + n[1] * ry, cz2 + n[2] * rx], col, U.clamp(0.6 + 0.42 * (n[0] * 0.33 + n[1] * 0.82 + n[2] * 0.47), 0.4, 1.08) * (0.92 + 0.12 * ((e[0] * 5 + e[1] * 3) % 3) / 2));
        });
      }
    }
    function tree(tx, tz, hgt, rad, tone) {
      var g1 = [70 * tone, 122 * tone, 62 * tone], g2 = [52 * tone, 100 * tone, 52 * tone], tr = [96, 76, 56], a;
      for (a = 0; a < 12; a++) { var s0 = a / 12 * 6.2832, s1 = (a + 1) / 12 * 6.2832; vtx([tx, yt + 0.05, tz], [16, 22, 14], 1, 130); vtx([tx + Math.cos(s0) * rad * 1.5, yt + 0.05, tz + Math.sin(s0) * rad * 1.5], [16, 22, 14], 1, 0); vtx([tx + Math.cos(s1) * rad * 1.5, yt + 0.05, tz + Math.sin(s1) * rad * 1.5], [16, 22, 14], 1, 0); }
      for (a = 0; a < 5; a++) { var b0 = a / 5 * 6.2832, b1 = (a + 1) / 5 * 6.2832, tw = 0.26;
        quad([tx + Math.cos(b0) * tw, yt, tz + Math.sin(b0) * tw], [tx + Math.cos(b1) * tw, yt, tz + Math.sin(b1) * tw], [tx + Math.cos(b1) * tw * 0.7, yt + hgt * 0.5, tz + Math.sin(b1) * tw * 0.7], [tx + Math.cos(b0) * tw * 0.7, yt + hgt * 0.5, tz + Math.sin(b0) * tw * 0.7], [tr[0] * (0.7 + 0.3 * Math.cos(b0)), tr[1] * (0.7 + 0.3 * Math.cos(b0)), tr[2] * (0.7 + 0.3 * Math.cos(b0))]); }
      crown(tx, yt + hgt * 0.66, tz, rad, hgt * 0.3, g1); crown(tx + rad * 0.42, yt + hgt * 0.52, tz - rad * 0.3, rad * 0.72, hgt * 0.22, g2);
    }
    for (k = 0; k < nT; k++) {
      var d = (k + 0.5) / nT * per + (rr() - 0.5) * 3, e = 4.2 + rr() * 1.6, px2, pz2;
      if (d < x1 - x0) { px2 = x0 + d; pz2 = z0 + e; }
      else if (d < (x1 - x0) + (z1 - z0)) { px2 = x1 - e; pz2 = z0 + (d - (x1 - x0)); }
      else if (d < 2 * (x1 - x0) + (z1 - z0)) { px2 = x1 - (d - (x1 - x0) - (z1 - z0)); pz2 = z1 - e; }
      else { px2 = x0 + e; pz2 = z1 - (d - 2 * (x1 - x0) - (z1 - z0)); }
      tree(px2, pz2, 6.0 + rr() * 4.0, 2.2 + rr() * 1.3, 0.84 + rr() * 0.32);
    }
    return packF(P, Cc);
  }
  var SH = { pin: null, ring: null, sky: null, halo: null, plinth: null };

  /* ---------- materials: the tour's own finishes, by the material number each triangle carries ---------- */
  // [r, g, b,  pattern (0 tiles, 1 slats, 2 plaster, 3 stone courses, 4 pavers, 5 foliage, 6 asphalt, 7 fins), repeats per metre, strength, kind (1 floor slab, 2 glass, 3 self-lit)]
  var MATS = {
    plain: [1.0, 0.98, 0.94, 2, 0.3, 0, 0], slab: [0.95, 0.90, 0.80, 0, 0.0833, 0.9, 1], wall: [0.97, 0.95, 0.91, 2, 0.31, 0.14, 0],
    facade: [0.87, 0.80, 0.69, 3, 0.2083, 0.34, 0], ledge: [0.88, 0.88, 0.86, 2, 0.31, 0.16, 0], stone: [0.84, 0.77, 0.66, 3, 0.2083, 0.36, 0],
    wood: [0.66, 0.47, 0.30, 1, 0.26, 0.5, 0], metal: [0.80, 0.80, 0.78, 7, 0.4167, 0.3, 0], concrete: [0.78, 0.77, 0.74, 2, 0.31, 0.2, 0],
    asphalt: [0.27, 0.28, 0.30, 6, 0.33, 0.5, 0], site: [0.71, 0.70, 0.68, 4, 0.156, 0.55, 0], roof: [0.62, 0.43, 0.35, 2, 0.31, 0.2, 0],
    plant: [0.34, 0.54, 0.25, 5, 0.33, 0.95, 0], soil: [0.42, 0.33, 0.24, 6, 0.33, 0.4, 0], rail: [0.84, 0.86, 0.88, 2, 0.3, 0, 0],
    sign: [0.20, 0.74, 0.46, 2, 0.3, 0, 3], sculpt: [1.0, 0.80, 0.42, 2, 0.3, 0, 3], glass: [0.60, 0.77, 0.88, 2, 0.3, 0, 2],
    car0: [0.92, 0.92, 0.91, 2, 0.3, 0, 0], car1: [0.70, 0.72, 0.74, 2, 0.3, 0, 0], car2: [0.20, 0.21, 0.23, 2, 0.3, 0, 0], car3: [0.18, 0.25, 0.38, 2, 0.3, 0, 0],
    car4: [0.60, 0.17, 0.16, 2, 0.3, 0, 0], car5: [0.44, 0.45, 0.47, 2, 0.3, 0, 0], car6: [0.88, 0.87, 0.84, 2, 0.3, 0, 0], deck: [0.66, 0.66, 0.64, 4, 0.156, 0.5, 1]
  };
  var NMAT = 26;
  // the floor slab seen from above is the tour's cream stone; seen from below it is the timber slat ceiling
  var LOOK = U.extend({ tile: [0.95, 0.90, 0.80], ceiling: [0.80, 0.63, 0.44], tileRepeat: 0.0833, ceilingRepeat: 0.26, tileStrength: 0.9, ceilingStrength: 0.7 }, mcfg().look || {});
  function matArrays() {
    var names = (MF && MF.materials) || [], pal = new Float32Array(NMAT * 3), par = new Float32Array(NMAT * 4), i, over = mcfg().materials || {};
    for (i = 0; i < NMAT; i++) {
      var m = over[names[i]] || MATS[names[i]] || MATS.plain;
      pal[i * 3] = m[0]; pal[i * 3 + 1] = m[1]; pal[i * 3 + 2] = m[2];
      par[i * 4] = m[3]; par[i * 4 + 1] = m[4]; par[i * 4 + 2] = m[5]; par[i * 4 + 3] = m[6];
    }
    return { pal: pal, par: par };
  }

  /* ---------- eight tiling patterns, made here so nothing extra has to be hosted ---------- */
  var TX = { a: null, b: null, t0: null, t1: null, n: 512 };
  function rng(seed) { var s = seed >>> 0; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  function h2(a, b) { var n = (Math.imul(a + 17, 374761393) + Math.imul(b + 29, 668265263)) >>> 0; n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
  function vnoise(n, cells, seed) {
    var r = rng(seed), g = new Float32Array(cells * cells), out = new Float32Array(n * n), i, x, y;
    for (i = 0; i < g.length; i++) g[i] = r();
    for (y = 0; y < n; y++) {
      var fy = y / n * cells, ya = Math.floor(fy), ty = fy - ya, yb = (ya + 1) % cells; ty = ty * ty * (3 - 2 * ty);
      for (x = 0; x < n; x++) {
        var fx = x / n * cells, xa = Math.floor(fx), tx = fx - xa, xb = (xa + 1) % cells; tx = tx * tx * (3 - 2 * tx);
        var a = g[ya * cells + xa], b = g[ya * cells + xb], c = g[yb * cells + xa], d = g[yb * cells + xb];
        out[y * n + x] = a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
      }
    }
    return out;
  }
  function makeTextures() {
    if (TX.a) return;
    var N = TX.n, a = new Uint8Array(N * N * 4), b = new Uint8Array(N * N * 4), x, y, i, r = rng(7), v;
    var n8 = vnoise(N, 8, 11), n32 = vnoise(N, 32, 12), n96 = vnoise(N, 96, 13), n200 = vnoise(N, 200, 14);
    // the mall floor: a cream field with a scatter of taupe and grey tiles, some in pairs
    var TC = 16, tone = new Float32Array(TC * TC);
    for (i = 0; i < tone.length; i++) { var q = r(); tone[i] = q < 0.03 ? 0.3 : (q < 0.1 ? 0.39 : 0.5 + (r() - 0.5) * 0.04); }
    for (i = 0; i < 14; i++) { var c0 = Math.floor(r() * tone.length); tone[(c0 + (r() < 0.5 ? 1 : TC)) % tone.length] = tone[c0]; }
    var slat = new Float32Array(32); for (i = 0; i < 32; i++) slat[i] = 0.5 + (r() - 0.5) * 0.16;
    var rowN = [], rowO = []; for (i = 0; i < 8; i++) { rowN.push(3 + Math.floor(r() * 3)); rowO.push(Math.floor(r() * 160)); }
    function put(arr, o, val) { v = val < 0 ? 0 : (val > 1 ? 1 : val); arr[o] = Math.round(v * 255); }
    for (y = 0; y < N; y++) {
      for (x = 0; x < N; x++) {
        var k = y * N + x, o = k * 4, f8 = n8[k] - 0.5, f32 = n32[k] - 0.5, f96 = n96[k] - 0.5, f200 = n200[k] - 0.5;
        // 0 tiles
        var tx = x % 32, ty = y % 32, grout = tx === 0 || ty === 0;
        put(a, o, grout ? 0.4 : tone[(y >> 5) * TC + (x >> 5)] + f96 * 0.03);
        // 1 timber slats with a dark gap between them
        var sx = x % 16;
        put(a, o + 1, sx > 10 ? 0.1 : slat[x >> 4] + f200 * 0.1 + (sx === 0 || sx === 10 ? -0.1 : 0));
        // 2 plaster
        put(a, o + 2, 0.5 + f8 * 0.3 + f96 * 0.22);
        // 3 coursed stone cladding
        var row = y >> 6, bw = N / rowN[row], bx = (x + rowO[row]) % N, bi = Math.floor(bx / bw), jx = bx - bi * bw, jy = y % 64;
        put(a, o + 3, jx < 2 || jy < 2 ? 0.26 : 0.5 + (h2(row, bi) - 0.5) * 0.22 + f32 * 0.1 + f200 * 0.05);
        // 4 pavers laid in bands
        var pr = y >> 4, pxx = (x + (pr % 2) * 16) % N, pi2 = pxx >> 5, band = (pr >> 3) % 2;
        put(b, o, pxx % 32 === 0 || y % 16 === 0 ? 0.36 : (band ? 0.42 : 0.52) + (h2(pr, pi2) - 0.5) * 0.14 + f96 * 0.04);
        // 5 foliage
        put(b, o + 1, 0.5 + f32 * 0.9 + f200 * 0.55 + f8 * 0.3);
        // 6 asphalt
        put(b, o + 2, 0.5 + f200 * 0.45 + f32 * 0.15 + (h2(x, y) > 0.985 ? 0.25 : 0));
        // 7 fins
        var fn = x % 16;
        put(b, o + 3, fn > 9 ? 0.16 : 0.42 + fn * 0.022 + f200 * 0.05);
      }
    }
    TX.a = a; TX.b = b;
  }

  /* ---------- gl ---------- */
  var VS = 'attribute vec3 aPos;attribute vec4 aCol;uniform mat4 uMVP;varying vec4 vCol;void main(){vCol=aCol;gl_Position=uMVP*vec4(aPos,1.0);}';
  var FS = 'precision mediump float;uniform vec4 uTint;uniform float uAlpha;uniform float uGhost;uniform vec3 uGhostCol;varying vec4 vCol;' +
    'void main(){vec3 c=mix(vCol.rgb,uTint.rgb*max(vCol.rgb,vec3(0.35))*1.15,uTint.a);c=mix(c,uGhostCol,uGhost);float a=uAlpha*vCol.a;gl_FragColor=vec4(c*a,a);}';
  // the building itself: material colour and pattern, light from the face the viewer sees, glass that catches the sky
  var VS3 = 'attribute vec3 aPos;attribute vec4 aCol;attribute vec2 aMat;uniform mat4 uMVP;uniform mat4 uQ;uniform vec3 uPal[26];uniform vec4 uMatP[26];uniform float uLegacy;' +
    'varying vec3 vAlb;varying vec4 vSel;varying vec3 vMp;varying float vSh;varying float vA;varying float vAx;' +
    'void main(){int m=int(clamp(aMat.x,0.0,25.0)+0.5);vAlb=mix(uPal[m],aCol.rgb,uLegacy);vSel=uMatP[m];vSh=mix(aCol.r,1.0,uLegacy);vA=aCol.a;vAx=aMat.y;' +
    'vec4 mp=uQ*vec4(aPos,1.0);vMp=mp.xyz;gl_Position=uMVP*vec4(aPos,1.0);}';
  var FS3 = 'uniform sampler2D uT0;uniform sampler2D uT1;uniform vec3 uCam;uniform vec3 uSun;uniform vec4 uTint;uniform float uAlpha;uniform float uGhost;uniform vec3 uGhostCol;' +
    'uniform vec3 uTile;uniform vec3 uCeil;uniform vec4 uSlab;uniform vec4 uFog;uniform float uFlat;uniform float uCut;uniform vec4 uBox;uniform sampler2D uLM;uniform vec4 uLmB;uniform vec2 uLmP;' +
    'varying vec3 vAlb;varying vec4 vSel;varying vec3 vMp;varying float vSh;varying float vA;varying float vAx;' +
    'void main(){if(vMp.y>uCut||vMp.x<uBox.x||vMp.x>uBox.z||vMp.z<uBox.y||vMp.z>uBox.w)discard;vec3 v=uCam-vMp;float dist=length(v);v=v/max(dist,0.0001);' + NL +
    '#ifdef NODERIV' + NL +
    'vec3 n=vAx<0.5?vec3(1.0,0.0,0.0):(vAx<1.5?vec3(0.0,1.0,0.0):vec3(0.0,0.0,1.0));' + NL +
    '#else' + NL +
    'vec3 n=cross(dFdx(vMp),dFdy(vMp));float nl=length(n);n=nl>0.0?n/nl:vec3(0.0,1.0,0.0);' + NL +
    '#endif' + NL +
    'if(dot(n,v)<0.0)n=-n;' +
    'vec3 alb=vAlb;float ch=vSel.x;float sc=vSel.y;float st=vSel.z;float kind=vSel.w;' +
    'if(kind>0.5&&kind<1.5){if(n.y>0.0){if(vSel.x<0.5){alb=uTile;sc=uSlab.x;st=uSlab.z;}}else{alb=uCeil;ch=1.0;sc=uSlab.y;st=uSlab.w;}}' +
    'vec2 uv=vAx<0.5?vMp.zy:(vAx<1.5?vMp.xz:vMp.xy);' +
    'vec4 a=texture2D(uT0,uv*sc);vec4 b=texture2D(uT1,uv*sc);' +
    'float d=ch<0.5?a.r:(ch<1.5?a.g:(ch<2.5?a.b:(ch<3.5?a.a:(ch<4.5?b.r:(ch<5.5?b.g:(ch<6.5?b.b:b.a))))));' +
    'st*=clamp(1.3-dist*0.012,0.3,1.0);float sh=0.4+0.6*vSh;vec3 c=alb*sh*(1.0+(d*2.0-1.0)*st);' +
    'float lit=0.9+0.22*max(dot(n,uSun),0.0)+0.05*n.y;c*=mix(lit,1.0,uFlat);c*=vec3(1.07,1.05,1.0);' +
    'if(uLmP.x>0.0&&n.y>0.5&&vMp.y<uLmP.y+0.3){vec2 lu=(vMp.xz-uLmB.xy)*uLmB.zw;vec2 lo=vec2(0.0011,0.0011);vec2 lp=vec2(0.0011,-0.0011);float s1=0.25*(texture2D(uLM,lu+lo,1.0).r+texture2D(uLM,lu-lo,1.0).r+texture2D(uLM,lu+lp,1.0).r+texture2D(uLM,lu-lp,1.0).r);float s2=texture2D(uLM,lu,3.2).g;c*=1.0-uLmP.x*(0.36*clamp(s1*1.25,0.0,1.0)+0.26*clamp(s2*2.2,0.0,1.0));}' +
    'float al=vA;' +
    'if(kind>1.5&&kind<2.5){float f=1.0-abs(dot(n,v));f=f*f*f;c=mix(c,vec3(0.82,0.90,0.96),0.22+0.5*f);al=clamp(vA+f*0.5,0.0,0.92);}' +
    'if(kind>2.5)c=alb*(0.8+0.45*sh);' +
    'c=mix(c,uFog.rgb,(1.0-exp(-dist*uFog.a))*(1.0-uFlat));' +
    'c=mix(c,uTint.rgb*max(c,vec3(0.35))*1.15,uTint.a);c=mix(c,uGhostCol,uGhost);float A=uAlpha*al;gl_FragColor=vec4(c*A,A);}';
  function shaderSrc(gl2, frag, deriv, body) {
    var h = '';
    if (gl2) h = '#version 300 es' + NL + '#define attribute in' + NL + '#define varying ' + (frag ? 'in' : 'out') + NL + '#define texture2D texture' + NL;
    else if (frag && deriv) h = '#extension GL_OES_standard_derivatives : enable' + NL;
    if (frag) h += '#ifdef GL_FRAGMENT_PRECISION_HIGH' + NL + 'precision highp float;' + NL + '#else' + NL + 'precision mediump float;' + NL + '#endif' + NL;
    if (frag && gl2) h += 'out vec4 oC;' + NL + '#define gl_FragColor oC' + NL;
    if (frag && !deriv) h += '#define NODERIV' + NL;
    return h + body;
  }
  var glref = null, prog = null, prog3 = null, isGL2 = false, vaoExt = null;
  function attribsQ(gl) {
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.SHORT, false, 12, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, 12, 8);
    gl.disableVertexAttribArray(2);
  }
  function attribsM(gl) {
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.SHORT, false, 12, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, 12, 8);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.UNSIGNED_BYTE, false, 12, 6);
  }
  function attribsF(gl) {
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, 16, 12);
    gl.disableVertexAttribArray(2);
  }
  function bindVao(gl, v) { if (isGL2) gl.bindVertexArray(v); else if (vaoExt) vaoExt.bindVertexArrayOES(v); }
  function curVao(gl) { return (isGL2 || vaoExt) ? gl.getParameter(isGL2 ? gl.VERTEX_ARRAY_BINDING : vaoExt.VERTEX_ARRAY_BINDING_OES) : null; }
  function mkVao(gl) { return isGL2 ? gl.createVertexArray() : (vaoExt ? vaoExt.createVertexArrayOES() : null); }
  function build(gl, vs, fs, attrs, unis) {
    function sh(type, src) {
      var o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { ALP.warn('mall3d shader', gl.getShaderInfoLog(o)); return null; }
      return o;
    }
    var a = sh(gl.VERTEX_SHADER, vs), b = sh(gl.FRAGMENT_SHADER, fs);
    if (!a || !b) return null;
    var p = gl.createProgram();
    gl.attachShader(p, a); gl.attachShader(p, b);
    for (var i = 0; i < attrs.length; i++) gl.bindAttribLocation(p, i, attrs[i]);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { ALP.warn('mall3d link', gl.getProgramInfoLog(p)); return null; }
    unis.forEach(function (n) { p[n] = gl.getUniformLocation(p, n); });
    return p;
  }
  var U3 = ['uMVP', 'uQ', 'uPal', 'uMatP', 'uLegacy', 'uT0', 'uT1', 'uCam', 'uSun', 'uTint', 'uAlpha', 'uGhost', 'uGhostCol', 'uTile', 'uCeil', 'uSlab', 'uFog', 'uFlat', 'uCut', 'uBox', 'uLM', 'uLmB', 'uLmP'];
  function glSetup(gl) {
    if (prog && glref === gl) return true;
    glref = gl;
    isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    vaoExt = isGL2 ? null : gl.getExtension('OES_vertex_array_object');
    prog = build(gl, VS, FS, ['aPos', 'aCol'], ['uMVP', 'uTint', 'uAlpha', 'uGhost', 'uGhostCol']);
    if (!prog) return false;
    var deriv = isGL2 || !!gl.getExtension('OES_standard_derivatives'), es3 = isGL2;
    if (CFG.look === 'es1') es3 = false;
    if (CFG.look === 'es1-flat') { es3 = false; deriv = false; }
    prog3 = CFG.look === 'plain' ? null : build(gl, shaderSrc(es3, false, deriv, VS3), shaderSrc(es3, true, deriv, FS3), ['aPos', 'aCol', 'aMat'], U3);
    if (!prog3 && CFG.look !== 'plain') { deriv = false; prog3 = build(gl, shaderSrc(false, false, false, VS3), shaderSrc(false, true, false, FS3), ['aPos', 'aCol', 'aMat'], U3); }
    if (!prog3 && CFG.look !== 'plain') ALP.warn('mall3d: the textured look is not available on this browser, showing plain colours');
    MAP.look = prog3 ? (deriv ? 'textured' : 'textured, flat light') + (es3 ? '' : ' (es1)') : 'plain';
    makeTextures();
    var pa = gl.getParameter(gl.ACTIVE_TEXTURE);
    gl.activeTexture(gl.TEXTURE0);
    var pt = gl.getParameter(gl.TEXTURE_BINDING_2D), pp = gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL), pf = gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    var aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    [['t0', TX.a], ['t1', TX.b]].forEach(function (e) {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TX.n, TX.n, 0, gl.RGBA, gl.UNSIGNED_BYTE, e[1]);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4);
      TX[e[0]] = t;
    });
    gl.bindTexture(gl.TEXTURE_2D, pt); gl.activeTexture(pa);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, pp); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, pf);
    if (prog3) {
      var cur = gl.getParameter(gl.CURRENT_PROGRAM), ma = matArrays(), sn = CFG.sun, sl = Math.sqrt(sn[0] * sn[0] + sn[1] * sn[1] + sn[2] * sn[2]) || 1;
      gl.useProgram(prog3);
      gl.uniform3fv(prog3.uPal, ma.pal); gl.uniform4fv(prog3.uMatP, ma.par);
      gl.uniformMatrix4fv(prog3.uQ, false, Qm);
      gl.uniform1i(prog3.uT0, 0); gl.uniform1i(prog3.uT1, 1); gl.uniform1i(prog3.uLM, 2); gl.uniform2f(prog3.uLmP, 0, 0);
      gl.uniform3f(prog3.uSun, sn[0] / sl, sn[1] / sl, sn[2] / sl);
      gl.uniform3f(prog3.uTile, LOOK.tile[0], LOOK.tile[1], LOOK.tile[2]); gl.uniform3f(prog3.uCeil, LOOK.ceiling[0], LOOK.ceiling[1], LOOK.ceiling[2]);
      gl.uniform4f(prog3.uSlab, LOOK.tileRepeat, LOOK.ceilingRepeat, LOOK.tileStrength, LOOK.ceilingStrength);
      gl.uniform3f(prog3.uGhostCol, 0.86, 0.93, 0.95);
      gl.useProgram(cur);
    }
    SH.pin = pinShape(); SH.ring = ringShape(); SH.sky = skyShape(); SH.halo = haloShape(); SH.plinth = null;
    LM.prog = null; LM.tex = null; LM.fbo = null; LM.level = -1; LM.mesh = null;
    for (var i = 0; i < levels.length; i++) { if (levels[i].table) levels[i].table.buf = null; if (levels[i].walkMesh) levels[i].walkMesh.buf = null; }
    ALP.bus.emit('mall3d:gl', { gl: gl });
    return true;
  }
  var uploadedThisFrame = 0;

  /* ---------- soft shadows on the floor that is open ---------- */
  // Everything that stands between the floor and the cut is drawn once, flattened onto the floor along the light, into a small picture:
  // red is the shadow the sun casts, green is the shade close to walls and columns. The floor then reads that picture, blurred.
  var LM = { prog: null, tex: null, fbo: null, size: 1024, level: -1, mesh: null, ok: false, elev: 0, box: [0, 0, 1, 1] };
  var VSB = 'attribute vec3 aPos;uniform mat4 uQ;uniform vec4 uB;uniform vec3 uSh;varying float vH;void main(){vec4 mp=uQ*vec4(aPos,1.0);vH=mp.y-uSh.z;vec2 p=mp.xz-uSh.xy*vH;gl_Position=vec4((p-uB.xy)*uB.zw*2.0-1.0,0.0,1.0);}';
  var FSB = 'precision mediump float;uniform vec4 uC;uniform vec2 uR;varying float vH;void main(){if(vH<uR.x||vH>uR.y)discard;gl_FragColor=uC;}';
  function bakeShadows(gl, li, m, cut) {
    if (LM.level === li && LM.mesh === m) return;
    LM.level = li; LM.mesh = m; LM.ok = false; LM.elev = levels[li].elev;
    try {
      if (!LM.prog) {
        LM.prog = build(gl, VSB, FSB, ['aPos'], ['uQ', 'uB', 'uSh', 'uC', 'uR']);
        if (!LM.prog) return;
        LM.tex = gl.createTexture(); LM.fbo = gl.createFramebuffer();
        gl.bindTexture(gl.TEXTURE_2D, LM.tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, LM.size, LM.size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      }
      var fbD = gl.getParameter(isGL2 ? gl.DRAW_FRAMEBUFFER_BINDING : gl.FRAMEBUFFER_BINDING), fbR = isGL2 ? gl.getParameter(gl.READ_FRAMEBUFFER_BINDING) : null;
      var vpt = gl.getParameter(gl.VIEWPORT), sci = gl.isEnabled(gl.SCISSOR_TEST), cc = gl.getParameter(gl.COLOR_CLEAR_VALUE), cm = gl.getParameter(gl.COLOR_WRITEMASK), cp = gl.getParameter(gl.CURRENT_PROGRAM);
      var pad = 4, x0 = bnd[0] - pad, z0 = bnd[2] - pad, w = bnd[3] - bnd[0] + pad * 2, d = bnd[5] - bnd[2] + pad * 2, sn = CFG.sun, sy = Math.max(0.2, sn[1]);
      LM.box = [x0, z0, 1 / w, 1 / d];
      gl.bindFramebuffer(gl.FRAMEBUFFER, LM.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, LM.tex, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
        gl.viewport(0, 0, LM.size, LM.size); gl.disable(gl.SCISSOR_TEST); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
        gl.colorMask(true, true, true, true); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
        gl.useProgram(LM.prog); useMesh(gl, m);
        gl.uniformMatrix4fv(LM.prog.uQ, false, Qm); gl.uniform4f(LM.prog.uB, x0, z0, 1 / w, 1 / d); gl.uniform2f(LM.prog.uR, 0.14, cut);
        gl.uniform3f(LM.prog.uSh, sn[0] / sy, sn[2] / sy, LM.elev); gl.uniform4f(LM.prog.uC, 1, 0, 0, 0);
        drawRange(gl, m, 0, m.no * 3);
        [[0.3, 0.3], [-0.3, 0.3], [0.3, -0.3], [-0.3, -0.3]].forEach(function (e) {
          gl.uniform3f(LM.prog.uSh, e[0], e[1], LM.elev); gl.uniform4f(LM.prog.uC, 0, 0.3, 0, 0);
          drawRange(gl, m, 0, m.no * 3);
        });
        gl.bindTexture(gl.TEXTURE_2D, LM.tex); gl.generateMipmap(gl.TEXTURE_2D);
        LM.ok = true;
      }
      if (isGL2) { gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fbD); gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fbR); } else gl.bindFramebuffer(gl.FRAMEBUFFER, fbD);
      gl.viewport(vpt[0], vpt[1], vpt[2], vpt[3]); if (sci) gl.enable(gl.SCISSOR_TEST);
      gl.clearColor(cc[0], cc[1], cc[2], cc[3]); gl.colorMask(cm[0], cm[1], cm[2], cm[3]); gl.useProgram(cp);
    } catch (e) { LM.ok = false; if (!LM.warned) { LM.warned = true; ALP.warn('mall3d: floor shadows not available', e && e.message ? e.message : e); } }
  }
  function upload(gl, m, always) {
    if (!m) return false;
    if (m.buf) return true;
    if (!m.data || (uploadedThisFrame > 0 && !always)) return false;
    if (!always) uploadedThisFrame++;
    var pb = gl.getParameter(gl.ARRAY_BUFFER_BINDING), pv = curVao(gl);
    m.buf = gl.createBuffer(); m.vao = mkVao(gl);
    if (m.vao) bindVao(gl, m.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.buf); gl.bufferData(gl.ARRAY_BUFFER, m.data, gl.STATIC_DRAW);
    if (m.vao) { m.layout(gl); bindVao(gl, pv); }
    gl.bindBuffer(gl.ARRAY_BUFFER, pb);
    return true;
  }
  function useMesh(gl, m) { if (m.vao) bindVao(gl, m.vao); else { gl.bindBuffer(gl.ARRAY_BUFFER, m.buf); m.layout(gl); } }
  // plain coloured shapes: pins, rings, sky, plinth, and everything the second file draws
  function flat(gl) { gl.useProgram(prog); gl.uniform3f(prog.uGhostCol, 0.86, 0.93, 0.95); }
  function uni(gl, mvp, tint, alpha, ghost) {
    gl.uniformMatrix4fv(prog.uMVP, false, mvp);
    gl.uniform4f(prog.uTint, tint[0], tint[1], tint[2], tint[3]);
    gl.uniform1f(prog.uAlpha, alpha);
    gl.uniform1f(prog.uGhost, ghost || 0);
  }
  // the building: P is the program in use for it (textured, or the plain one where the textured look is not available)
  function uniB(gl, P, m, mvp, tint, alpha, ghost, flatLight, cam, cut) {
    gl.uniformMatrix4fv(P.uMVP, false, mvp);
    gl.uniform4f(P.uTint, tint[0], tint[1], tint[2], tint[3]);
    gl.uniform1f(P.uAlpha, alpha);
    gl.uniform1f(P.uGhost, ghost || 0);
    if (P !== prog3) return;
    gl.uniform1f(P.uLegacy, m.legacy ? 1 : 0);
    gl.uniform1f(P.uFlat, flatLight ? 1 : 0);
    gl.uniform3f(P.uCam, cam[0], cam[1], cam[2]);
    gl.uniform1f(P.uCut, cut || 100000);
    gl.uniform2f(P.uLmP, cut && LM.level >= 0 && LM.ok ? 1 : 0, LM.elev);
    // a floor opened on the table is trimmed to the base it stands on, like the table model of the other floors
    if (cut) gl.uniform4f(P.uBox, bnd[0] - 1.5, bnd[2] - 1.5, bnd[3] + 1.5, bnd[5] + 1.5); else gl.uniform4f(P.uBox, -1e6, -1e6, 1e6, 1e6);
  }
  var NOTINT = [0, 0, 0, 0], MINT = [0.20, 0.83, 0.60, 1], WHITE = [1, 1, 1, 1], CREAM = [0.96, 0.93, 0.87, 1];

  /* ---------- matrices ---------- */
  function modelScale() { return (CFG.width / span) * view.zoom; }
  // pins and markers keep a sensible size on the table when the model is enlarged
  function pinK() { return 1 / Math.pow(Math.max(1, view.zoom), 0.6); }
  function tableFrame() {
    if (!frame.set) return M4.mul(E.anchorMatrix(), M4.rotY(CFG.yaw * Math.PI / 180));
    return M4.mul(M4.translate(frame.pos[0], frame.pos[1], frame.pos[2]), M4.rotY(frame.yaw + CFG.yaw * Math.PI / 180));
  }
  function placeFrame() {
    var h = headInfo();
    if (!h) return;
    frame.pos = h.pos.slice(); frame.yaw = h.heading; frame.set = true;
  }
  function tableOrigin() { return [view.off[0], CFG.y + view.off[1], -CFG.dist + view.off[2]]; }
  function tableBase() {
    var o = tableOrigin();
    var m = M4.mul(tableFrame(), M4.translate(o[0], o[1], o[2]));
    m = M4.mul(m, M4.rotY(view.wyaw));
    m = M4.mul(m, M4.rotX(view.tilt * Math.PI / 180));
    m = M4.mul(m, M4.rotY(view.yaw));
    var s = modelScale();
    m = M4.mul(m, M4.scale(s, s * CFG.exaggerate, s));
    return M4.mul(m, M4.translate(-cx, -y0, -cz));
  }
  function invTable() {
    var s = modelScale(), o = tableOrigin();
    var inv = M4.mul(M4.translate(cx, y0, cz), M4.scale(1 / s, 1 / (s * CFG.exaggerate), 1 / s));
    inv = M4.mul(inv, M4.rotY(-view.yaw));
    inv = M4.mul(inv, M4.rotX(-view.tilt * Math.PI / 180));
    inv = M4.mul(inv, M4.rotY(-view.wyaw));
    inv = M4.mul(inv, M4.translate(-o[0], -o[1], -o[2]));
    return M4.mul(inv, M4.invRigid(tableFrame()));
  }
  function floorY(i) { var L = levels[i]; return L ? L.elev : 0; }
  function walkBase() {
    return M4.mul(M4.translate(walk.feet[0], walk.feet[1], walk.feet[2]), M4.mul(M4.rotY(walk.yaw), M4.translate(-walk.px, -floorY(walk.level), -walk.pz)));
  }
  function invWalk() {
    return M4.mul(M4.translate(walk.px, floorY(walk.level), walk.pz), M4.mul(M4.rotY(-walk.yaw), M4.translate(-walk.feet[0], -walk.feet[1], -walk.feet[2])));
  }
  function headInfo() {
    var m = E.xr && E.xr.lastViewerMatrix;
    if (!m) return null;
    return { pos: [m[12], m[13], m[14]], heading: Math.atan2(m[8], m[10]) };
  }
  // is this floor the one on top right now, so what stands on it can be seen and pressed
  function levelOpen(i) {
    var L = levels[i];
    if (!L || L.show < 0.5) return false;
    if (walk.on) return i === walk.level;
    return mode.focus === i || mode.ex > 0.6 || i === levels.length - 1;
  }
  function pinOpen(p) { return levelOpen(p.level) || (p.outdoor && !walk.on && mode.focus < 0); }
  // how high above its floor a level is cut open right now; 0 when it is shown whole
  function cutOf(i) { return !walk.on && mode.focus === i && mode.ex < 0.3 && MAP.look !== 'plain' ? CFG.cutHeight : 0; }

  /* ---------- walking inside ---------- */
  function blink(fn) {
    S.veil = 0.95;
    setTimeout(function () { if (fn) fn(); }, 120);
    setTimeout(function () { S.veil = 0; }, 230);
  }
  function startPoint(li) {
    var cur = A.current() || {}, i;
    for (i = 0; i < pins.length; i++) if (pins[i].place === cur.id && pins[i].level === li) return { x: pins[i].x, z: pins[i].z, yaw: 0 };
    var ws = MF && MF.walkStart;
    if (ws && (ws.level === levels[li].id || li === 0)) return { x: ws.x, z: ws.z, yaw: ws.yaw || 0 };
    for (i = 0; i < pins.length; i++) if (pins[i].level === li) return { x: pins[i].x, z: pins[i].z, yaw: 0 };
    return { x: cx, z: cz, yaw: 0 };
  }
  function enterWalk(li, at) {
    if (!MAP.ready) return;
    if (!(li >= 0 && li < levels.length)) li = 0;
    var h = headInfo(), sp = at || startPoint(li);
    if (!h) { ALP.toast('Walk inside needs the headset'); return; }
    blink(function () {
      walk.on = true; S.mapWalk = true; walk.level = li; walk.px = sp.x; walk.pz = sp.z;
      walk.feet = [h.pos[0], h.pos[1] - CFG.eyeHeight, h.pos[2]];
      walk.yaw = h.heading - (sp.yaw || 0) * Math.PI / 180;
      mode.focus = li; needWalk(li);
      E.recenter(); E.wake(); E.dirty('mall3d');
      ALP.bus.emit('change', { mapWalk: true });
    });
  }
  function exitWalk(quiet) {
    if (!walk.on && !S.mapWalk) return;
    var go = function () { walk.on = false; S.mapWalk = false; hov.floor = null; E.recenter(); placeFrame(); E.dirty('mall3d'); ALP.bus.emit('change', { mapWalk: false }); };
    if (quiet) go(); else blink(go);
  }
  function underHead() {
    var h = headInfo();
    if (!h) return null;
    return { p: M4.xformPoint(invWalk(), h.pos), h: h };
  }
  function teleport(x, z) {
    blink(function () {
      var h = headInfo(); if (!h) return;
      walk.px = x; walk.pz = z; walk.feet = [h.pos[0], walk.feet[1], h.pos[2]];
    });
  }
  function turn(dir) {
    var u = underHead(); if (!u) return;
    walk.px = u.p[0]; walk.pz = u.p[2];
    walk.feet = [u.h.pos[0], walk.feet[1], u.h.pos[2]];
    walk.yaw += dir * CFG.turnDeg * Math.PI / 180;
    E.wake();
  }
  function walkLevel(li) {
    if (li < 0 || li >= levels.length || li === walk.level) return;
    var u = underHead();
    blink(function () {
      if (u) { walk.px = u.p[0]; walk.pz = u.p[2]; }
      walk.level = li; mode.focus = li; needWalk(li); E.dirty('mall3d');
    });
  }

  /* ---------- rendering ---------- */
  function levelMatrix(vp, i) {
    if (walk.on) return M4.mul(vp, M4.mul(walkBase(), Qm));
    return M4.mul(vp, M4.mul(tableBase(), M4.mul(M4.translate(0, levels[i].lift, 0), Qm)));
  }
  function drawRange(gl, m, first, count, lines) { if (count > 0) gl.drawArrays(lines ? gl.LINES : gl.TRIANGLES, first, count); }
  function hooks(list, gl, vp, ctx) {
    for (var i = 0; i < list.length; i++) { try { list[i](gl, vp, ctx); } catch (e) { if (!MAP.hookWarned) { MAP.hookWarned = true; ALP.warn('mall3d extra failed', e && e.message ? e.message : e); } } }
  }
  E.addPass(function (gl, vp, target, gl2, viewIndex) {
    var want = S.mapOn && !S.uiHidden && MAP.ready ? 1 : 0;
    if (!viewIndex) { opacity += (want - opacity) * 0.16; uploadedThisFrame = 0; }
    if (opacity < 0.02 || !MF) return;
    if (!glSetup(gl)) return;
    var i, L, m, prevBuf = gl.getParameter(gl.ARRAY_BUFFER_BINDING), prevVao = curVao(gl);
    var B = prog3 || prog, t = ALP.anim.now();
    // where this eye is, in the model's own metres, for light, glass and distance haze
    var camW = null;
    try { var vm = target && target.view && target.view.transform && target.view.transform.matrix; if (vm) camW = [vm[12], vm[13], vm[14]]; } catch (e) {}
    if (!camW) { var hi = headInfo(); camW = hi ? hi.pos : [0, 1.6, 0]; }
    var camM = M4.xformPoint(walk.on ? invWalk() : invTable(), camW);
    var ctx = { t: t, opacity: opacity, view: viewIndex || 0, cam: camW, camModel: camM };
    var prevT1 = null, prevS1 = null, prevT2 = null, prevS2 = null;
    gl.activeTexture(gl.TEXTURE2);
    prevT2 = gl.getParameter(gl.TEXTURE_BINDING_2D);
    if (isGL2) { prevS2 = gl.getParameter(gl.SAMPLER_BINDING); gl.bindSampler(2, null); }
    var fl = !walk.on && mode.focus >= 0 && mode.ex < 0.3 ? mode.focus : -1, fm = fl >= 0 ? meshFor(fl) : null;
    if (CFG.shadows && B === prog3 && fm && fm.buf && !viewIndex) bakeShadows(gl, fl, fm, CFG.cutHeight);
    if (fl < 0) { LM.level = -1; LM.mesh = null; LM.ok = false; }
    if (LM.tex) gl.bindTexture(gl.TEXTURE_2D, LM.tex);
    gl.activeTexture(gl.TEXTURE1);
    prevT1 = gl.getParameter(gl.TEXTURE_BINDING_2D);
    if (isGL2) { prevS1 = gl.getParameter(gl.SAMPLER_BINDING); gl.bindSampler(1, null); }
    gl.bindTexture(gl.TEXTURE_2D, TX.t1);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, TX.t0);
    function building() {
      gl.useProgram(B);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, TX.t0);
      if (B === prog3) gl.uniform4f(B.uLmB, LM.box[0], LM.box[1], LM.box[2], LM.box[3]);
      if (B === prog3) gl.uniform4f(B.uFog, 0.93, 0.91, 0.87, walk.on ? CFG.walkFog : 0);
      else gl.uniform3f(B.uGhostCol, 0.86, 0.93, 0.95);
    }
    function camFor(i2) { return walk.on ? camM : [camM[0], camM[1] - levels[i2].lift, camM[2]]; }
    function cutFor(i2) { return cutOf(i2) ? levels[i2].elev + CFG.cutHeight : 0; }
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    flat(gl);
    if (walk.on && upload(gl, SH.sky, true)) {
      var h = headInfo();
      if (h) {
        gl.depthMask(false);
        useMesh(gl, SH.sky);
        uni(gl, M4.mul(vp, M4.translate(h.pos[0], h.pos[1], h.pos[2])), NOTINT, opacity, 0);
        gl.drawArrays(gl.TRIANGLES, 0, SH.sky.count);
      }
    }
    gl.depthMask(true);
    // the base under the table model
    if (!walk.on && CFG.plinth) {
      if (!SH.plinth) SH.plinth = plinthShape();
      if (upload(gl, SH.plinth, true)) {
        useMesh(gl, SH.plinth);
        uni(gl, M4.mul(vp, tableBase()), NOTINT, opacity * (1 - mode.sk * 0.85), 0);
        gl.drawArrays(gl.TRIANGLES, 0, SH.plinth.count);
      }
    }
    // solid floors first, depth written
    building();
    for (i = 0; i < levels.length; i++) {
      L = levels[i]; m = meshFor(i);
      if (!m || L.show < 0.01 || !upload(gl, m)) continue;
      var solid = L.show * (1 - L.ghost) * (1 - mode.sk);
      if (solid < 0.5) continue;
      useMesh(gl, m);
      uniB(gl, B, m, levelMatrix(vp, i), L.glow > 0.01 ? [0.20, 0.83, 0.60, 0.1 * L.glow] : NOTINT, opacity * Math.min(1, solid * 1.2), 0, false, camFor(i), cutFor(i));
      drawRange(gl, m, 0, m.no * 3);
    }
    // stores, people and anything else that stands on the floors
    flat(gl);
    hooks(HK.solid, gl, vp, ctx);
    flat(gl); gl.depthMask(true); gl.enable(gl.DEPTH_TEST);
    // pins, and a pulse on the floor under the place you came from
    var cur = S.placeId;
    if (upload(gl, SH.pin, true)) {
      useMesh(gl, SH.pin);
      for (i = 0; i < pins.length; i++) {
        var p = pins[i], Lp = levels[p.level];
        if (!Lp || Lp.show < 0.3 || !pinOpen(p)) continue;
        var here = p.place && p.place === cur, hv = hov.pin && hov.pin.id === p.id;
        var bob = (here ? Math.sin(t * 2.4) * 1.2 : 0) + (hv ? 2.2 : 0), sc = (1 + (hv ? 0.35 : 0) + (here ? 0.15 : 0)) * pinK(), pm;
        if (walk.on) {
          if (walk.level !== p.level) continue;
          var ws = CFG.walkPinScale * (hv ? 1.2 : 1);
          pm = M4.mul(walkBase(), M4.mul(M4.translate(p.x, floorY(p.level) + bob * 0.05, p.z), M4.scale(ws, ws, ws)));
        } else {
          pm = M4.mul(tableBase(), M4.mul(M4.translate(p.x, p.y + Lp.lift + bob * pinK() / CFG.exaggerate, p.z), M4.scale(sc, sc / CFG.exaggerate, sc)));
        }
        uni(gl, M4.mul(vp, pm), here ? MINT : (hv ? WHITE : CREAM), opacity * Lp.show, 0);
        gl.drawArrays(gl.TRIANGLES, 0, SH.pin.count);
      }
    }
    if (upload(gl, SH.halo, true)) {
      useMesh(gl, SH.halo);
      gl.depthMask(false);
      for (i = 0; i < pins.length; i++) {
        var ph = pins[i], Lh = levels[ph.level];
        if (!Lh || Lh.show < 0.3 || !ph.place || ph.place !== cur || !pinOpen(ph)) continue;
        for (var w2 = 0; w2 < 2; w2++) {
          var fr = (t * 0.55 + w2 * 0.5) % 1, rr2 = (walk.on ? 0.5 + fr * 1.6 : CFG.pinR * pinK() * (1.2 + fr * 4.5)), hm;
          if (walk.on) hm = M4.mul(walkBase(), M4.mul(M4.translate(ph.x, floorY(ph.level) + 0.04, ph.z), M4.scale(rr2, 1, rr2)));
          else hm = M4.mul(tableBase(), M4.mul(M4.translate(ph.x, ph.y + Lh.lift + 0.3, ph.z), M4.scale(rr2, 1, rr2)));
          uni(gl, M4.mul(vp, hm), MINT, opacity * Lh.show * (1 - fr) * 0.9, 0);
          gl.drawArrays(gl.TRIANGLES, 0, SH.halo.count);
        }
      }
      gl.depthMask(true);
    }
    // see-through pass: glass, ghosted floors, skeleton lines
    building();
    gl.depthMask(false);
    for (i = 0; i < levels.length; i++) {
      L = levels[i]; m = meshFor(i);
      if (!m || !m.buf || L.show < 0.01) continue;
      var mvp = levelMatrix(vp, i), gh = Math.max(L.ghost, mode.sk), solid2 = L.show * (1 - gh), cm = camFor(i);
      useMesh(gl, m);
      if (solid2 >= 0.5) { uniB(gl, B, m, mvp, NOTINT, opacity * L.show, 0, false, cm, cutFor(i)); drawRange(gl, m, m.no * 3, m.ng * 3); }
      if (gh > 0.01) {
        uniB(gl, B, m, mvp, NOTINT, opacity * L.show * CFG.ghostAlpha * gh * (walk.on ? 1.6 : 1), 1, true, cm);
        drawRange(gl, m, 0, (m.no + m.ng) * 3);
      }
      if (m.nl && (gh > 0.01 || L.glow > 0.3)) {
        var focusLine = mode.focus === i || (walk.on && walk.level === i);
        var la = CFG.lineAlpha * L.show * Math.max(gh, L.glow * 0.6) * (mode.focus >= 0 && !focusLine ? 0.45 : 1);
        uniB(gl, B, m, mvp, focusLine && mode.sk > 0.5 ? MINT : NOTINT, opacity * la, 0, true, cm);
        drawRange(gl, m, (m.no + m.ng) * 3, m.nl * 2, true);
      }
    }
    // labels and markers that float over the model
    flat(gl);
    hooks(HK.overlay, gl, vp, ctx);
    flat(gl);
    // teleport target
    if (walk.on && hov.floor && upload(gl, SH.ring, true)) {
      gl.depthMask(false); gl.disable(gl.DEPTH_TEST);
      useMesh(gl, SH.ring);
      var rs = 1 + Math.sin(t * 5) * 0.06;
      uni(gl, M4.mul(vp, M4.mul(walkBase(), M4.mul(M4.translate(hov.floor[0], floorY(walk.level) + 0.03, hov.floor[2]), M4.scale(rs, 1, rs)))), NOTINT, opacity, 0);
      gl.drawArrays(gl.TRIANGLES, 0, SH.ring.count);
    }
    if (isGL2 || vaoExt) bindVao(gl, prevVao);
    else { gl.disableVertexAttribArray(1); gl.disableVertexAttribArray(2); }
    gl.bindBuffer(gl.ARRAY_BUFFER, prevBuf);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, prevT1);
    if (isGL2) gl.bindSampler(1, prevS1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, prevT2);
    if (isGL2) gl.bindSampler(2, prevS2);
    gl.activeTexture(gl.TEXTURE0);
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
  });

  /* ---------- picking ---------- */
  function sphereHit(o, d, c, R, yk) {
    var oc = [o[0] - c[0], o[1] * yk - c[1], o[2] - c[2]], dd = [d[0], d[1] * yk, d[2]];
    var a = dd[0] * dd[0] + dd[1] * dd[1] + dd[2] * dd[2], b = 2 * (oc[0] * dd[0] + oc[1] * dd[1] + oc[2] * dd[2]);
    var cc = oc[0] * oc[0] + oc[1] * oc[1] + oc[2] * oc[2] - R * R, disc = b * b - 4 * a * cc;
    if (disc < 0) return -1;
    var tt = (-b - Math.sqrt(disc)) / (2 * a);
    return tt > 0 ? tt : -1;
  }
  function inBounds(x, z, pad) { return x > bnd[0] - pad && x < bnd[3] + pad && z > bnd[2] - pad && z < bnd[5] + pad; }
  function world(kind, extra) {
    var r = { id: 'mall3d:' + kind + (extra && extra.suffix ? ':' + extra.suffix : ''), kind: kind, onPress: press };
    if (!walk.on) { r.onStick = stickY; r.onStickX = stickX; }
    return U.extend(r, extra || {});
  }
  function pickExtra(o, d, limit) {
    var best = null;
    for (var i = 0; i < HK.pick.length; i++) {
      var r = null;
      try { r = HK.pick[i](o, d, limit); } catch (e) {}
      if (r && r.t < limit && (!best || r.t < best.t)) best = r;
    }
    return best;
  }
  function pick(ray) {
    if (!S.mapOn || !MAP.ready || !MF || S.uiHidden) return null;
    var i, best = null, bt = 1e9, tt, ex;
    if (walk.on) {
      var iw = invWalk(), o = M4.xformPoint(iw, ray.o), d = M4.xformDir(iw, ray.d), fy = floorY(walk.level);
      for (i = 0; i < pins.length; i++) {
        if (pins[i].level !== walk.level) continue;
        tt = sphereHit(o, d, [pins[i].x, fy + CFG.pinH * CFG.walkPinScale, pins[i].z], 1.1, 1);
        if (tt > 0 && tt < bt) { bt = tt; best = pins[i]; }
      }
      ex = pickExtra(o, d, bt);
      if (ex) return world(ex.kind, ex);
      if (best) return world('pin', { pin: best, label: best.label, suffix: best.id });
      if (d[1] < -0.02) {
        tt = (fy - o[1]) / d[1];
        var x = o[0] + d[0] * tt, z = o[2] + d[2] * tt;
        if (tt > 0.3 && tt < CFG.walkReach && inBounds(x, z, 2)) return world('floor', { point: [x, fy, z] });
      }
      return null;
    }
    var inv = invTable(), o2 = M4.xformPoint(inv, ray.o), d2 = M4.xformDir(inv, ray.d);
    var dl = Math.sqrt(d2[0] * d2[0] + d2[1] * d2[1] + d2[2] * d2[2]); if (dl < 1e-9) return null;
    d2 = [d2[0] / dl, d2[1] / dl, d2[2] / dl];
    if (CFG.showPosition && mode.focus >= 0 && Math.abs(d2[1]) > 1e-6) { var Lf = levels[mode.focus], ts = (Lf.elev + Lf.lift + 0.05 - o2[1]) / d2[1]; hov.spot = ts > 0 ? [o2[0] + d2[0] * ts, o2[2] + d2[2] * ts] : null; }
    for (i = 0; i < pins.length; i++) {
      var p = pins[i], Lp = levels[p.level];
      if (!Lp || Lp.show < 0.5 || !pinOpen(p)) continue;
      tt = sphereHit(o2, d2, [p.x, (p.y + Lp.lift) * CFG.exaggerate + CFG.pinH * pinK(), p.z], CFG.pinR * 2.4 * pinK(), CFG.exaggerate);
      if (tt > 0 && tt < bt) { bt = tt; best = p; }
    }
    ex = pickExtra(o2, d2, bt);
    if (ex) return world(ex.kind, ex);
    if (best) return world('pin', { pin: best, label: best.label, suffix: best.id });
    // the nearest visible floor plate under the pointer
    var bl = -1; bt = 1e9;
    if (Math.abs(d2[1]) > 1e-6) {
      for (i = 0; i < levels.length; i++) {
        var L = levels[i];
        if (!L.table || L.show < 0.5) continue;
        tt = (L.elev + L.lift + 0.05 - o2[1]) / d2[1];
        if (tt <= 0 || tt >= bt) continue;
        var gx = o2[0] + d2[0] * tt, gz = o2[2] + d2[2] * tt;
        if (inBounds(gx, gz, 1)) { bt = tt; bl = i; hov.at = [gx, gz]; }
      }
    }
    if (bl >= 0) return world('level', { level: bl, suffix: String(bl), label: levels[bl].name });
    return null;
  }
  E.addPicker(pick);
  function stickY(dy) { zoom(dy > 0 ? -1 : 1); }
  function stickX(dx) { view.targetYaw += dx * 0.38; }
  function zoom(dir) { view.targetZoom = U.clamp(view.targetZoom * (dir > 0 ? 1.2 : 0.84), CFG.minZoom, CFG.maxZoom); E.dirty('mall3d'); }
  function dragged() { return dragMoved > 0.06 && Date.now() - dragEndedAt < 400; }
  function press(f) {
    if (f.kind === 'pin' && f.pin) {
      if (!f.pin.place) { ALP.toast(f.pin.label); return; }
      if (f.pin.place === S.placeId && !walk.on) { ALP.toast('You are already at the ' + f.pin.label); return; }
      A.go(f.pin.place);
      return;
    }
    if (f.kind === 'floor' && f.point) { teleport(f.point[0], f.point[2]); return; }
    if (f.kind === 'level') {
      if (dragged()) return;
      setFocus(mode.focus === f.level ? -1 : f.level);
    }
  }
  function setFocus(i) { mode.focus = i; if (i >= 0 && CFG.fineFocus && MAP.look !== 'plain') needWalk(i); E.dirty('mall3d'); E.wake(); }

  /* ---------- hands on the model: one-hand spin or move, two-hand pinch ---------- */
  function markOf(src) { for (var i = 0; i < G.marks.length; i++) if (G.marks[i].source === src) return i; return -1; }
  function actOf(src) { for (var i = 0; i < G.act.length; i++) if (G.act[i].source === src) return G.act[i]; var a = { source: src, on: false }; G.act.push(a); return a; }
  function toLocal(p) { return M4.xformPoint(M4.invRigid(tableFrame()), p); }
  function toLocalDir(d) { return M4.xformDir(M4.invRigid(tableFrame()), d); }
  function heading(d) { return Math.atan2(d[0], d[2]); }
  function endGesture() {
    if (G.mode) dragEndedAt = Date.now();
    if (G.mode === 'pinch') ALP.bus.emit('mall3d:pinch', { end: true, zoom: view.zoom });
    G.mode = ''; G.s0 = null; drag = null;
  }
  function gestures(hover) {
    var i, h, entries = [];
    for (i = 0; i < hover.length; i++) {
      h = hover[i];
      var active = !!(h.pressed || h.squeeze), a = actOf(h.source), mi = markOf(h.source);
      if (active && !a.on && mi === -1 && !h.grabbing && h.ray) {
        var onModel = !h.hit && h.world && h.world.id && h.world.id.indexOf('mall3d:') === 0;
        var second = G.marks.length === 1 && !h.hit;
        if (onModel || second) G.marks.push({ source: h.source, grip: !!(h.squeeze && !h.pressed) });
      }
      if (!active && mi !== -1) G.marks.splice(mi, 1);
      a.on = active;
    }
    for (i = 0; i < G.marks.length; i++) {
      for (var j = 0; j < hover.length; j++) if (hover[j].source === G.marks[i].source && hover[j].ray) entries.push({ mark: G.marks[i], h: hover[j] });
    }
    var want = entries.length >= 2 ? 'pinch' : (entries.length === 1 ? (entries[0].mark.grip ? 'move' : 'spin') : '');
    if (want !== G.mode) {
      endGesture();
      G.mode = want;
      if (want === 'pinch' || want === 'move') {
        for (i = 0; i < entries.length; i++) { E.cancelPress(entries[i].h.source); E.pulse(entries[i].h.source, 0.3, 20); }
        dragMoved = 99; dragEndedAt = Date.now() + 100000;
        var o0 = tableOrigin();
        G.s0 = { off: view.off.slice(), wyaw: view.wyaw, zoom: view.zoom, O: o0 };
        if (want === 'pinch') {
          var a0 = toLocal(entries[0].h.ray.o), b0 = toLocal(entries[1].h.ray.o);
          G.s0.a = a0; G.s0.b = b0; G.s0.d = Math.max(0.04, Math.hypot(b0[0] - a0[0], b0[1] - a0[1], b0[2] - a0[2]));
          G.s0.ang = Math.atan2(b0[0] - a0[0], b0[2] - a0[2]);
          G.s0.mid = [(a0[0] + b0[0]) / 2, (a0[1] + b0[1]) / 2, (a0[2] + b0[2]) / 2];
          G.detent = Math.floor(view.zoom / 0.25);
          ALP.bus.emit('mall3d:pinch', { start: true });
        } else {
          G.s0.h = toLocal(entries[0].h.ray.o); G.s0.hd = heading(toLocalDir(entries[0].h.ray.d));
        }
      }
    }
    if (G.mode === 'pinch' && G.s0) {
      var A2 = toLocal(entries[0].h.ray.o), B2 = toLocal(entries[1].h.ray.o), s0 = G.s0;
      var d = Math.hypot(B2[0] - A2[0], B2[1] - A2[1], B2[2] - A2[2]);
      var z = U.clamp(s0.zoom * d / s0.d, CFG.minZoom, CFG.maxZoom), sc = z / s0.zoom;
      var dth = U.angleDiff(Math.atan2(B2[0] - A2[0], B2[2] - A2[2]), s0.ang);
      var mid = [(A2[0] + B2[0]) / 2, (A2[1] + B2[1]) / 2, (A2[2] + B2[2]) / 2];
      var v = M4.xformDir(M4.rotY(dth), [(s0.O[0] - s0.mid[0]) * sc, (s0.O[1] - s0.mid[1]) * sc, (s0.O[2] - s0.mid[2]) * sc]);
      var O = [mid[0] + v[0], mid[1] + v[1], mid[2] + v[2]];
      view.off = [O[0], O[1] - CFG.y, O[2] + CFG.dist];
      view.wyaw = s0.wyaw + dth;
      view.zoom = view.targetZoom = z;
      var det = Math.floor(z / 0.25);
      if (det !== G.detent) { G.detent = det; E.pulse(entries[0].h.source, 0.12, 10); E.pulse(entries[1].h.source, 0.12, 10); E.dirty('mall3d'); }
    } else if (G.mode === 'move' && G.s0) {
      var Hh = toLocal(entries[0].h.ray.o), dps = U.angleDiff(heading(toLocalDir(entries[0].h.ray.d)), G.s0.hd);
      var w = M4.xformDir(M4.rotY(dps), [G.s0.O[0] - G.s0.h[0], G.s0.O[1] - G.s0.h[1], G.s0.O[2] - G.s0.h[2]]);
      view.off = [Hh[0] + w[0], Hh[1] + w[1] - CFG.y, Hh[2] + w[2] + CFG.dist];
      view.wyaw = G.s0.wyaw + dps;
    } else if (G.mode === 'spin') {
      var hs = entries[0].h, yaw = Math.atan2(hs.ray.d[0], -hs.ray.d[2]);
      if (drag === null) { drag = yaw; dragMoved = 0; }
      else { var dd = U.angleDiff(yaw, drag); view.targetYaw += dd * 1.6; dragMoved += Math.abs(dd); drag = yaw; }
    }
  }

  /* ---------- per-frame: animation, hover, drag, snap turn ---------- */
  function hovKey() { return (hov.pin ? hov.pin.id : '') + '|' + hov.level + '|' + (hov.floor ? 1 : 0) + '|' + (hov.extra ? hov.extra.id : ''); }
  E.addFrame(function (dt, hover) {
    var i;
    if (!S.mapOn && (walk.on || S.mapWalk)) exitWalk(true);
    if (walk.on && !S.mapWalk) exitWalk(true);
    if (S.mapOn && MAP.ready && MF) {
      // opened from inside the mall: start on the floor you are standing on
      if (wantFocus) {
        wantFocus = false;
        var lc = CFG.autoFocus ? pinLevelOfCurrent() : -1;
        if (lc >= 0 && !walk.on) setFocus(lc);
      }
      var h = null;
      for (i = 0; i < hover.length; i++) if (hover[i].world && hover[i].world.id && hover[i].world.id.indexOf('mall3d:') === 0) { h = hover[i]; break; }
      var prevKey = hovKey();
      hov.pin = h && h.world.kind === 'pin' ? h.world.pin : null;
      hov.level = h && h.world.kind === 'level' ? h.world.level : -1;
      hov.floor = h && h.world.kind === 'floor' ? h.world.point : null;
      hov.extra = h && h.world.kind !== 'pin' && h.world.kind !== 'level' && h.world.kind !== 'floor' ? h.world : null;
      if (prevKey !== hovKey()) E.dirty('mall3d');
      if (!walk.on) gestures(hover);
      if (walk.on) {
        for (i = 0; i < hover.length; i++) {
          var src = hover[i].source, gp = src && src.gamepad, key = (src && src.handedness) || String(i);
          var ax = gp && gp.axes && gp.axes.length >= 4 ? gp.axes[2] : 0, v = ax > 0.7 ? 1 : (ax < -0.7 ? -1 : 0);
          if (v && v !== stickPrev[key]) turn(v);
          stickPrev[key] = v;
        }
        if (CFG.showPosition) E.dirty('mall3d');
      }
    } else { hov.pin = null; hov.level = -1; hov.floor = null; hov.extra = null; drag = null; }
    if ((!S.mapOn || walk.on) && (G.mode || G.marks.length)) { G.marks = []; endGesture(); }
    var k = Math.min(1, dt * 7);
    view.yaw += (view.targetYaw - view.yaw) * k;
    view.zoom += (view.targetZoom - view.zoom) * k;
    view.tilt += (view.targetTilt - view.tilt) * k;
    mode.ex += ((mode.explode && !walk.on ? 1 : 0) - mode.ex) * k;
    mode.sk += ((mode.skeleton ? 1 : 0) - mode.sk) * k;
    for (i = 0; i < levels.length; i++) {
      var L = levels[i], f = mode.focus;
      var wantShow = walk.on ? (i >= walk.level - 1 && i <= walk.level + 1 ? 1 : 0) : (f < 0 || i <= f ? 1 : 0);
      var wantGhost = walk.on || !CFG.ghostBelow ? 0 : (f >= 0 && i < f ? 1 : 0);
      var wantLift = mode.ex * CFG.explodeGap * i + (wantShow ? 0 : 4);
      L.show += (wantShow - L.show) * k;
      L.ghost += (wantGhost - L.ghost) * k;
      L.lift += (wantLift - L.lift) * k;
      L.glow += ((!walk.on && hov.level === i ? 1 : 0) - L.glow) * Math.min(1, dt * 10);
    }
  });

  /* ---------- toolbar ---------- */
  function title() {
    if (!MAP.ready) return MAP.error ? 'Map unavailable' : 'Loading the 3D mall';
    if (walk.on) return levels[walk.level] ? levels[walk.level].name : 'Walk inside';
    if (mode.focus >= 0 && levels[mode.focus]) return levels[mode.focus].name;
    return (MF && MF.title) || mcfg().title || 'All Floors';
  }
  function hereText() {
    var cur = A.current() || {}, i;
    for (i = 0; i < pins.length; i++) if (pins[i].place === cur.id) return 'You are at the ' + pins[i].label + ', ' + levels[pins[i].level].name + '.';
    return cur.label ? 'You are at ' + cur.label + ', outside the mall.' : '';
  }
  function hint() {
    if (MAP.error) return MAP.error;
    if (MAP.loading) return 'Loading floors ' + MAP.loaded + ' of ' + (levels.length || '...');
    if (G.mode === 'pinch') return 'Resizing  ' + String.fromCharCode(183) + '  ' + Math.round(view.zoom * 100) + '%. Pull your hands apart or together, turn them to rotate.';
    if (G.mode === 'move') return 'Moving the model. Let go of the grip to set it down.';
    if (!walk.on && CFG.showPosition && mode.focus >= 0 && hov.spot && (hov.extra || hov.pin || hov.level >= 0)) return 'x ' + hov.spot[0].toFixed(1) + '   z ' + hov.spot[1].toFixed(1) + '   ' + levels[mode.focus].id + (hov.extra && hov.extra.label ? '   ' + hov.extra.label : '');
    for (var i = 0; i < HK.hint.length; i++) { var hx = null; try { hx = HK.hint[i](hov); } catch (e) {} if (hx) return hx; }
    if (hov.pin) return hov.pin.label + '  ' + String.fromCharCode(183) + '  ' + (hov.pin.place === S.placeId ? 'you are here' : 'pull the trigger to open its 360');
    if (walk.on && CFG.showPosition) { var u = underHead(); if (u) return 'x ' + u.p[0].toFixed(1) + '   z ' + u.p[2].toFixed(1) + '   ' + levels[walk.level].id; }
    if (walk.on) return hov.floor ? 'Pull the trigger to move here' : 'Point at the floor and pull the trigger to move. Push the thumbstick left or right to turn.';
    if (hov.level >= 0 && CFG.showPosition && hov.at) return 'x ' + hov.at[0].toFixed(1) + '   z ' + hov.at[1].toFixed(1) + '   ' + levels[hov.level].id;
    if (hov.level >= 0) return levels[hov.level].name + '  ' + String.fromCharCode(183) + '  pull the trigger to ' + (mode.focus === hov.level ? 'show all floors' : 'look at this floor');
    if (mode.focus >= 0) return hereText() + ' Point at a lot, a symbol or a pin.';
    return 'Pick a floor to see its lots and amenities. Pinch with both triggers to resize and rotate.';
  }
  function hot() { return !!(hov.pin || hov.floor || hov.level >= 0 || hov.extra); }
  E.panel('mall3d', {
    order: 26, enterRise: 0.02,
    layout: { yaw: 0, y: -0.8, dist: 1.2, deg: 46 },
    show: function (s) { return s.mapOn && !s.uiHidden ? 1 : 0; },
    measure: function () { this.px = [W.widthFor(this, 46), 424]; },
    draw: function (ctx, ui) {
      var w = this.px[0], h = this.px[1], i, x, cw;
      W.glass(ctx, 2, 2, w - 4, h - 4, 34, { fill: 'rgba(10,10,10,.9)', line: W.alpha(0.12) });
      W.eyebrow(ctx, walk.on ? 'Walk Inside' : '3D Mall Map', 40, 46);
      W.text(ctx, title(), 40, 46 + px(T.size.heading) + 8, { size: T.size.heading, family: T.font.brand, track: 0.12, upper: true, color: C.white, maxW: w - 200 });
      if (MAP.ready && !walk.on) W.text(ctx, Math.round(view.targetZoom * 100) + '%', w - 40, 56, { size: T.size.micro, color: C.text3, align: 'right' });
      W.text(ctx, hint(), 40, 150, { size: T.size.small, weight: hot() ? 500 : 300, color: hot() ? C.accentLine : C.text2, maxW: w - 80 });
      // floors and view toggles
      var cy = 188, ch = 72, gap = 12;
      x = 40;
      if (!walk.on) {
        W.chip(ctx, ui, 'lv:all', x, cy, 170, ch, 'All', { active: mode.focus < 0, size: T.size.micro, upper: true, track: 0.1 });
        x += 170 + gap;
      }
      cw = Math.max(92, Math.min(170, Math.round((w - 80 - (walk.on ? 0 : 182)) / Math.max(1, levels.length)) - gap));
      for (i = 0; i < levels.length; i++) {
        var on = walk.on ? walk.level === i : mode.focus === i;
        W.chip(ctx, ui, 'lv:' + i, x, cy, cw, ch, levels[i].short, { active: on, size: T.size.micro, upper: true, track: 0.1 });
        x += cw + gap;
      }
      // Explode and Skeleton are left out to keep the toolbar simple (their code is still here)
      // actions
      var by = 296, bh = 84, items;
      if (walk.on) {
        items = [
          { id: 'turnl', icon: 'chevL', label: 'Turn Left' },
          { id: 'turnr', icon: 'chevR', label: 'Turn Right' },
          { id: 'up', icon: 'arrowUp', label: 'Floor Up' },
          { id: 'down', icon: 'chevD', label: 'Floor Down' }
        ];
      } else {
        items = [
          { id: 'zoomout', icon: 'chevD', label: 'Smaller' },
          { id: 'zoomin', icon: 'arrowUp', label: 'Bigger' },
          { id: 'spinl', icon: 'chevL', label: 'Turn' },
          { id: 'spinr', icon: 'chevR', label: 'Turn' },
          { id: 'reset', icon: 'reset', label: 'Reset' }
        ];
      }
      var mainW = walk.on ? 250 : 250, closeW = 170;
      cw = Math.round((w - 80 - mainW - closeW - gap * (items.length + 1)) / items.length);
      x = 40;
      for (i = 0; i < items.length; i++) {
        W.pill(ctx, ui, items[i].id, x, by, cw, bh, items[i].label, { kind: 'plain', icon: items[i].icon, size: T.size.micro, weight: 500, track: 0.1, radius: 22,
          disabled: (items[i].id === 'up' && walk.level >= levels.length - 1) || (items[i].id === 'down' && walk.level <= 0) || (!MAP.ready && !walk.on) });
        x += cw + gap;
      }
      if (walk.on) W.pill(ctx, ui, 'table', x, by, mainW, bh, 'Map View', { kind: 'accent', icon: 'map', size: T.size.micro, weight: 600, track: 0.12, radius: 22 });
      else if (CFG.walk) W.pill(ctx, ui, 'walk', x, by, mainW, bh, 'Walk Inside', { kind: 'accent', icon: 'vr', size: T.size.micro, weight: 600, track: 0.12, radius: 22, disabled: !MAP.ready });
      else W.pill(ctx, ui, 'guide', x, by, mainW, bh, 'Floor Guide', { kind: S.mapGuide ? 'accent' : 'plain', icon: 'layers', size: T.size.micro, weight: 600, track: 0.12, radius: 22, disabled: !MAP.ready });
      W.pill(ctx, ui, 'close', w - 40 - closeW, by, closeW, bh, 'Close', { kind: 'invert', icon: 'close', size: T.size.micro, weight: 600, track: 0.12, radius: 22 });
    },
    onPress: function (id) {
      if (id === 'close') { MAP.close(); return; }
      if (id === 'skeleton') { mode.skeleton = !mode.skeleton; E.dirty('mall3d'); return; }
      if (id === 'explode') { mode.explode = !mode.explode; E.dirty('mall3d'); return; }
      if (id === 'lv:all') { setFocus(-1); return; }
      if (id.indexOf('lv:') === 0) {
        var li = parseInt(id.slice(3), 10);
        if (walk.on) walkLevel(li); else setFocus(mode.focus === li ? -1 : li);
        return;
      }
      if (!MAP.ready) return;
      if (id === 'walk') { if (CFG.walk) enterWalk(mode.focus >= 0 ? mode.focus : levelOfCurrent()); return; }
      if (id === 'guide') { S.mapGuide = !S.mapGuide; if (S.mapGuide) S.lotId = ''; E.dirty('mapguide'); E.dirty('lotcard'); E.dirty('mall3d'); E.wake(); return; }
      if (id === 'table') { exitWalk(); return; }
      if (id === 'turnl') turn(-1);
      else if (id === 'turnr') turn(1);
      else if (id === 'up') walkLevel(walk.level + 1);
      else if (id === 'down') walkLevel(walk.level - 1);
      else if (id === 'zoomin') zoom(1);
      else if (id === 'zoomout') zoom(-1);
      else if (id === 'spinl') view.targetYaw -= 0.5;
      else if (id === 'spinr') view.targetYaw += 0.5;
      else if (id === 'top') view.targetTilt = view.targetTilt > 60 ? CFG.tilt : CFG.topTilt;
      else if (id === 'reset') { view.targetYaw = 0.35; view.targetZoom = 1; view.targetTilt = CFG.tilt; view.off = [0, 0, 0]; view.wyaw = 0; placeFrame(); mode.focus = -1; mode.explode = false; mode.skeleton = false; }
      E.dirty('mall3d');
    },
    onStick: function (dy) { if (!walk.on) zoom(dy > 0 ? -1 : 1); },
    onStickX: function (dx) { if (!walk.on) view.targetYaw += dx * 0.38; }
  });
  function pinLevelOfCurrent() {
    var cur = A.current() || {}, i;
    for (i = 0; i < pins.length; i++) if (pins[i].place === cur.id) return pins[i].outdoor ? -1 : pins[i].level;
    return -1;
  }
  function levelOfCurrent() { var l = pinLevelOfCurrent(); return l < 0 ? 0 : l; }

  /* ---------- the render stands in for the model while it downloads ---------- */
  E.panel('mall3dposter', {
    order: 25, enterRise: 0.03,
    layout: { yaw: 0, y: -0.2, dist: 1.5, deg: 42 },
    show: function (s) { return s.mapOn && !s.uiHidden && !MAP.ready && heroUrl() ? 1 : 0; },
    measure: function () { var w = W.widthFor(this, 42); this.px = [w, Math.round(w * 1520 / 2688)]; },
    draw: function (ctx) {
      var w = this.px[0], h = this.px[1];
      ctx.save();
      K.roundRect(ctx, 2, 2, w - 4, h - 4, 30); ctx.clip();
      ctx.fillStyle = '#141414'; ctx.fillRect(0, 0, w, h);
      K.image(ctx, heroUrl(), 0, 0, w, h, 'cover', 1);
      var g = ctx.createLinearGradient(0, h, 0, h - 240);
      g.addColorStop(0, 'rgba(0,0,0,.86)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, h - 240, w, 240);
      ctx.restore();
      W.eyebrow(ctx, 'Parklinks Mall', 40, h - 92);
      W.text(ctx, MAP.error ? 'Showing the render instead' : 'Preparing the interactive model', 40, h - 44, { size: T.size.small, weight: 500, track: 0.08, upper: true, color: C.white });
      K.roundRect(ctx, 2, 2, w - 4, h - 4, 30);
      ctx.strokeStyle = W.alpha(0.18); ctx.lineWidth = 2; ctx.stroke();
    }
  });
  // warm the map up in the background so it opens quickly, but only once the first scenes have had the network to themselves:
  // starting a few seconds in competed with the panorama tiles and video overlays just as the visitor entered VR.
  // Opening the map before then loads it straight away, at full priority.
  var PRELOAD_DELAY_MS = 20000;
  var preloaded = false, posterDrawn = false;
  ALP.bus.on('change', function () {
    if (preloaded || S.screen !== 'tour') return;
    preloaded = true;
    // the warm-up only downloads the files (at low priority) so they are on the device when the map is opened; nothing is
    // decoded or built until then, so the tour never stutters while the map gets ready in the background
    var warm = function () {
      if (ALP.isActive && !ALP.isActive()) { preloaded = false; return; }
      if (MF || MAP.loading) return;
      if (heroUrl()) ALP.img(heroUrl());
      var get = function (u) { try { return fetch(u, { mode: 'cors', priority: 'low' }); } catch (e) { return Promise.reject(e); } };
      get(manifestUrl()).then(function (r) { return r.ok ? r.json() : null; }).then(function (mf) {
        if (!mf || !mf.levels) return;
        var i = 0, next = function () {
          if (MF || S.mapOn || i >= mf.levels.length) return;
          var f = mf.levels[i++].table;
          if (!f) { next(); return; }
          get(fileUrl(f)).then(function (r) { return r.arrayBuffer(); }).then(next, next);
        };
        next();
      }).then(null, function () {});
    };
    setTimeout(warm, PRELOAD_DELAY_MS);
  });
  E.addFrame(function () {
    if (!S.mapOn || MAP.ready || !heroUrl()) return;
    var im = ALP.img(heroUrl());
    if (!im || im.state === 'loading') { E.dirty('mall3dposter'); return; }
    if (!posterDrawn) { posterDrawn = true; E.dirty('mall3dposter'); }
  });

  MAP.open = function () {
    S.mapOn = true; S.uiHidden = false;
    if (S.overlay) ALP.closeOverlay();
    mode.focus = -1; wantFocus = true;
    load(); E.recenter(); E.wake(); placeFrame();
    ALP.bus.emit('change', { map: true });
  };
  MAP.close = function () {
    if (walk.on) exitWalk(true);
    S.mapOn = false;
    ALP.bus.emit('change', { map: false });
  };
  MAP.toggle = function () { if (S.mapOn) MAP.close(); else MAP.open(); };
  // what the second file (stores, people, labels) builds on
  MAP.x = { CFG: CFG, HK: HK, view: view, mode: mode, walk: walk, hov: hov, levels: function () { return levels; }, pins: function () { return pins; },
    manifest: function () { return MF; }, config: mcfg, levelIndex: levelIndex, levelOpen: levelOpen, pinOpen: pinOpen, floorY: floorY, modelScale: modelScale,
    tableBase: tableBase, walkBase: walkBase, invTable: invTable, invWalk: invWalk, headInfo: headInfo, underHead: underHead, pinK: pinK,
    packF: packF, upload: upload, useMesh: useMesh, flat: flat, uni: uni, dragged: dragged,
    enterWalk: enterWalk, exitWalk: exitWalk, setFocus: setFocus, opacity: function () { return opacity; }, gl2: function () { return isGL2; }, bindVao: bindVao, curVao: curVao, mkVao: mkVao,
    cut: cutOf, bounds: function () { return bnd; } };
  MAP._debug = { view: view, mode: mode, walk: walk, hov: hov, G: G, frame: frame, levels: function () { return levels; }, pins: function () { return pins; },
    tableBase: tableBase, invTable: invTable, walkBase: walkBase, invWalk: invWalk, enterWalk: enterWalk, exitWalk: exitWalk,
    teleport: teleport, turn: turn, walkLevel: walkLevel, setFocus: setFocus, Q: function () { return Qm; } };

  ALP.log('mall3d ready');
  return true;
  };
  if (window.ALP && window.ALP.define) window.ALP.define('mall3d', ['core', 'data', 'vr-engine', 'vr-screens-a'], run, 'parklinks');
  else (window.__ALPQ = window.__ALPQ || []).push(['mall3d', ['core', 'data', 'vr-engine', 'vr-screens-a'], run, 'parklinks']);
})();
