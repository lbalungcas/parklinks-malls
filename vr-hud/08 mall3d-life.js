(function () {
  var run = function (ALP) {
  'use strict';
  var S = ALP.state, K = ALP.canvas, T = ALP.tokens, C = T.color, px = ALP.px, E = ALP.vr, W = ALP.ui, A = ALP.actions, U = ALP.util, M4 = U.M4;
  var MAP = ALP.mall3d, X = MAP.x, CFG = X.CFG, DOT = String.fromCharCode(183);
  var NOTINT = [0, 0, 0, 0];
  function P() { return ALP.project() || {}; }
  function cfg() { return X.config() || {}; }
  function peso(n) { return ((P().calc || {}).peso || 'PHP ') + Math.round(n).toLocaleString(); }
  function rng(seed) { var s = seed >>> 0; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function css(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a === undefined ? 1 : a) + ')'; }

  // what turns the model into an information map: every lot with its number, area and status, the amenities of each floor,
  // people walking the corridors, name tags, the Floor Guide and the card that opens when a lot is pressed
  // the Floor Guide starts closed so the map opens clean; the Floor Guide button on the map's bar opens it
  ALP.extendState({ lotId: '', mapGuide: false, lotsOn: true, lotFilter: '', amenFilter: '' });
  var LIFE = MAP.life = { lots: [], people: [], amen: [] };

  /* ---------- lots ---------- */
  var KIND = { cafe: [204, 133, 82], dining: [178, 77, 66], market: [92, 143, 92], fashion: [58, 64, 82], retail: [72, 112, 158], wellness: [158, 133, 178], lease: [52, 211, 153] };
  var WOOD = [140, 104, 72], WHITE = [236, 232, 224], DARK = [58, 54, 50], STEEL = [150, 154, 158];
  var STAT0 = { available: { label: 'Available', color: [52, 211, 153] }, reserved: { label: 'Reserved', color: [240, 180, 60] }, sold: { label: 'Sold', color: [222, 108, 96] } };
  var ORDER = ['available', 'reserved', 'sold'];
  var lots = LIFE.lots, lotMesh = {}, UNCUT = 5.1;
  function lcfg() { return cfg().lots || {}; }
  function stat(k) { var o = (lcfg().statuses || {})[k] || STAT0[k] || STAT0.sold; return { label: o.label || k, color: o.color || (STAT0[k] || STAT0.sold).color }; }
  function word() { return lcfg().word || 'Lot'; }
  function buildLots() {
    lots.length = 0; lotMesh = {};
    var list = lcfg().list || [], lv = X.levels(), i, j;
    for (i = 0; i < list.length; i++) {
      var d = list[i], li = -1, pts;
      for (j = 0; j < lv.length; j++) if (lv[j].id === d.level) li = j;
      if (li < 0) continue;
      if (d.rect && d.rect.length >= 4) {
        var a0 = Math.min(d.rect[0], d.rect[2]), a1 = Math.max(d.rect[0], d.rect[2]), b0 = Math.min(d.rect[1], d.rect[3]), b1 = Math.max(d.rect[1], d.rect[3]);
        pts = [[a0, b0], [a1, b0], [a1, b1], [a0, b1]];
      } else if (d.pts && d.pts.length >= 3) pts = d.pts;
      else continue;
      var x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      for (j = 0; j < pts.length; j++) { x0 = Math.min(x0, pts[j][0]); x1 = Math.max(x1, pts[j][0]); z0 = Math.min(z0, pts[j][1]); z1 = Math.max(z1, pts[j][1]); }
      var f = d.front || 'south', ns = f === 'south' || f === 'north', st = ORDER.indexOf(d.status) >= 0 ? d.status : 'sold';
      lots.push({ id: d.id || ('lot' + i), d: d, level: li, y: lv[li].elev, pts: pts, tri: triangulate(pts), isRect: !!d.rect, x0: x0, x1: x1, z0: z0, z1: z1,
        cx: d.at ? d.at[0] : (x0 + x1) / 2, cz: d.at ? d.at[1] : (z0 + z1) / 2, front: f, wd: ns ? x1 - x0 : z1 - z0, dp: ns ? z1 - z0 : x1 - x0,
        status: st, col: KIND[d.kind] || KIND.retail, lease: !!d.place, dressed: !!(d.rect && (d.kind || d.place)), mesh: null, hm: null, hov: 0 });
    }
  }
  function lotById(id) { for (var i = 0; i < lots.length; i++) if (lots[i].id === id) return lots[i]; return null; }
  function lotName(l) { return l.d.tenant || l.d.name || (word() + ' ' + l.id); }
  function lotSqm(l) { var u = l.d.unit ? A.unit(l.d.unit) : null; return u && u.areaSqm ? u.areaSqm : (l.d.sqm || Math.round(l.wd * l.dp)); }
  function levelLots(li) { var out = []; for (var i = 0; i < lots.length; i++) if (lots[i].level === li) out.push(lots[i]); return out; }
  function counts(li) {
    var c = { available: 0, reserved: 0, sold: 0, all: 0 };
    for (var i = 0; i < lots.length; i++) if (li < 0 || lots[i].level === li) { c[lots[i].status] = (c[lots[i].status] || 0) + 1; c.all++; }
    return c;
  }
  // corners of any simple outline cut into triangles (ear clipping)
  function triangulate(pts) {
    var n = pts.length, idx = [], out = [], i, area = 0, guard = 0;
    for (i = 0; i < n; i++) { idx.push(i); area += pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1]; }
    if (area < 0) idx.reverse();
    function cr(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
    while (idx.length > 3 && guard++ < 400) {
      var cut = false;
      for (i = 0; i < idx.length; i++) {
        var ia = idx[(i + idx.length - 1) % idx.length], ib = idx[i], ic = idx[(i + 1) % idx.length], a = pts[ia], b = pts[ib], c = pts[ic], ok = cr(a, b, c) > 1e-9, k;
        for (k = 0; ok && k < idx.length; k++) {
          var q = idx[k];
          if (q === ia || q === ib || q === ic) continue;
          if (cr(a, b, pts[q]) >= 0 && cr(b, c, pts[q]) >= 0 && cr(c, a, pts[q]) >= 0) ok = false;
        }
        if (ok) { out.push(ia, ib, ic); idx.splice(i, 1); cut = true; break; }
      }
      if (!cut) break;
    }
    for (i = 1; i + 1 < idx.length; i++) out.push(idx[0], idx[i], idx[i + 1]);
    return out;
  }
  function inside(l, x, z) {
    if (x < l.x0 || x > l.x1 || z < l.z0 || z > l.z1) return false;
    if (l.isRect) return true;
    var p = l.pts, c = false, i, j;
    for (i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < (p[j][0] - p[i][0]) * (z - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
    return c;
  }
  function dimmed(l) { return !!S.lotFilter && l.status !== S.lotFilter; }
  function pushTri(Pv, Cv, a, b, c, col, al) {
    Pv.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    for (var k = 0; k < 3; k++) Cv.push(Math.round(col[0]), Math.round(col[1]), Math.round(col[2]), al);
  }
  // a band along the outline of a lot, lying flat at height y, reaching 'wide' metres inward
  function rim(Pv, Cv, l, y, wide, col, al) {
    var p = l.pts, n = p.length, i, sgn = 0;
    for (i = 0; i < n; i++) sgn += p[i][0] * p[(i + 1) % n][1] - p[(i + 1) % n][0] * p[i][1];
    sgn = sgn > 0 ? 1 : -1;
    for (i = 0; i < n; i++) {
      var a = p[i], b = p[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1, nx = -dz / len * sgn * wide, nz = dx / len * sgn * wide;
      var a2 = [a[0] + nx, a[1] + nz], b2 = [b[0] + nx, b[1] + nz];
      pushTri(Pv, Cv, [a[0], y, a[1]], [b[0], y, b[1]], [b2[0], y, b2[1]], col, al);
      pushTri(Pv, Cv, [a[0], y, a[1]], [b2[0], y, b2[1]], [a2[0], y, a2[1]], col, al);
    }
  }
  function face(Pv, Cv, l, y, col, al) {
    for (var i = 0; i < l.tri.length; i += 3) { var a = l.pts[l.tri[i]], b = l.pts[l.tri[i + 1]], c = l.pts[l.tri[i + 2]]; pushTri(Pv, Cv, [a[0], y, a[1]], [b[0], y, b[1]], [c[0], y, c[1]], col, al); }
  }
  // every lot of one floor in its status colour. On a floor that is cut open: a tinted floor and a coloured band on top of the walls.
  // On a floor shown whole: a tinted lid over each lot, because the floor itself cannot be seen.
  function floorLots(li, cut) {
    var key = li + (cut ? 'c' : 'u') + S.lotFilter, m = lotMesh[key];
    if (m) return m;
    var Pv = [], Cv = [], L = levelLots(li), i;
    for (i = 0; i < L.length; i++) {
      var l = L[i], dm = dimmed(l), col = dm ? [176, 176, 172] : stat(l.status).color;
      if (cut) { face(Pv, Cv, l, l.y + 0.05, col, dm ? 46 : 150); rim(Pv, Cv, l, l.y + cut + 0.012, 0.32, dm ? col : mixc(col, [20, 20, 20], 0.06), dm ? 90 : 255); }
      else { face(Pv, Cv, l, l.y + UNCUT, col, dm ? 60 : 168); rim(Pv, Cv, l, l.y + UNCUT + 0.01, 0.36, col, dm ? 110 : 255); }
    }
    m = lotMesh[key] = Pv.length ? X.packF(Pv, Cv) : { count: 0 };
    return m;
  }
  // the pointed-at or chosen lot lifts as a see-through block
  function blockMesh(l, h) {
    if (l.hm && l.hmH === h) return l.hm;
    var Pv = [], Cv = [], p = l.pts, n = p.length, i, col = mixc(stat(l.status).color, [255, 255, 255], 0.25);
    for (i = 0; i < n; i++) {
      var a = p[i], b = p[(i + 1) % n];
      pushTri(Pv, Cv, [a[0], l.y + 0.06, a[1]], [b[0], l.y + 0.06, b[1]], [b[0], l.y + h, b[1]], col, 70);
      pushTri(Pv, Cv, [a[0], l.y + 0.06, a[1]], [b[0], l.y + h, b[1]], [a[0], l.y + h, a[1]], col, 70);
    }
    face(Pv, Cv, l, l.y + h + 0.02, col, 96); rim(Pv, Cv, l, l.y + h + 0.03, 0.4, [255, 255, 255], 235);
    l.hm = X.packF(Pv, Cv); l.hmH = h;
    return l.hm;
  }

  /* ---------- a lot that has a tenant is dressed as a store: shopfront, sign band, a few fittings ---------- */
  // u runs along the shopfront from its left as you face it, v runs into the unit
  function at(s, u, v) {
    if (s.front === 'south') return [s.x0 + u, s.z1 - v];
    if (s.front === 'north') return [s.x1 - u, s.z0 + v];
    if (s.front === 'west') return [s.x0 + v, s.z0 + u];
    return [s.x1 - v, s.z1 - u];
  }
  function box(Pv, Cv, s, u0, v0, u1, v1, y0, y1, col, a, even) {
    var p = at(s, u0, v0), q = at(s, u1, v1), xa = Math.min(p[0], q[0]), xb = Math.max(p[0], q[0]), za = Math.min(p[1], q[1]), zb = Math.max(p[1], q[1]);
    var ya = s.y + y0, yb = s.y + y1, al = a === undefined ? 255 : a;
    function quad(a1, b1, c1, d1, k0) {
      var k = even ? 1 : k0;
      [a1, b1, c1, a1, c1, d1].forEach(function (pt) { Pv.push(pt[0], pt[1], pt[2]); Cv.push(Math.min(255, Math.round(col[0] * k)), Math.min(255, Math.round(col[1] * k)), Math.min(255, Math.round(col[2] * k)), al); });
    }
    quad([xa, yb, za], [xb, yb, za], [xb, yb, zb], [xa, yb, zb], 1.06);
    quad([xa, ya, zb], [xb, ya, zb], [xb, yb, zb], [xa, yb, zb], 0.9);
    quad([xb, ya, za], [xa, ya, za], [xa, yb, za], [xb, yb, za], 0.74);
    quad([xb, ya, zb], [xb, ya, za], [xb, yb, za], [xb, yb, zb], 0.82);
    quad([xa, ya, za], [xa, ya, zb], [xa, yb, zb], [xa, yb, za], 0.68);
  }
  function bays(s) { return Math.max(2, Math.round((s.wd - 1.2) / 2.3)); }
  function storeMesh(s) {
    var Pv = [], Cv = [], w = s.wd, d = s.dp, c = s.col, kind = s.d.kind, i, j, u, v;
    function b(u0, v0, u1, v1, y0, y1, col, a, even) { box(Pv, Cv, s, u0, v0, u1, v1, y0, y1, col, a, even); }
    // the shopfront as seen from the corridor: a dark frame around a lit pane. The view into the shop is a picture laid
    // just in front of the pane (see shop windows below), so the pane is what shows if that picture cannot be drawn
    function shopfront(glow) {
      var n = bays(s), step = (w - 1.2) / n, k;
      b(0.6, -0.07, w - 0.6, -0.03, 0.12, 2.2, glow, 255, true);
      b(0.6, -0.11, w - 0.6, -0.02, 0.0, 0.12, DARK); b(0.6, -0.11, w - 0.6, -0.02, 2.16, 2.25, DARK);
      for (k = 0; k <= n; k++) b(0.6 + k * step - 0.04, -0.12, 0.6 + k * step + 0.04, -0.02, 0.0, 2.2, DARK);
    }
    function table(tu, tv, tw, td) {
      b(tu - tw / 2, tv - td / 2, tu + tw / 2, tv + td / 2, 0.68, 0.76, WHITE);
      b(tu - 0.06, tv - 0.06, tu + 0.06, tv + 0.06, 0.06, 0.68, DARK);
      b(tu - tw / 2 - 0.45, tv - 0.18, tu - tw / 2 - 0.1, tv + 0.18, 0.06, 0.46, WOOD); b(tu + tw / 2 + 0.1, tv - 0.18, tu + tw / 2 + 0.45, tv + 0.18, 0.06, 0.46, WOOD);
    }
    if (s.lease) {
      // a real unit that is still to let: a hoarding across the front under a mint sign band
      var mint = KIND.lease;
      b(0.6, -0.16, w - 0.6, 0.16, 2.25, 2.68, mint, 255, true);
      b(0.6, -0.07, w - 0.6, -0.03, 0.0, 2.25, [228, 231, 226], 255, true);
      b(0.6, -0.09, w - 0.6, -0.05, 0.0, 0.3, mint, 255, true);
      return X.packF(Pv, Cv);
    }
    b(0.6, -0.16, w - 0.6, 0.18, 2.25, 2.68, c, 255, true);
    shopfront([255, 238, 206]);
    if (kind === 'cafe') {
      b(1.0, d - 1.7, Math.min(6.0, w - 1), d - 1.0, 0.06, 1.05, WOOD); b(1.0, d - 0.55, Math.min(6.0, w - 1), d - 0.25, 0.06, 2.1, DARK);
      for (i = 0; i < 3; i++) for (j = 0; j < 2; j++) { u = w - 1.6 - i * 2.3; v = 1.7 + j * 2.5; if (u > 6.8 || j === 0) table(u, v, 0.8, 0.8); }
      for (i = 0; i < 3; i++) table(1.6 + i * 1.9, 1.6, 0.7, 0.7);
    } else if (kind === 'dining') {
      for (i = 0; i < Math.floor((w - 2.4) / 2.7); i++) for (j = 0; j < 2; j++) table(1.9 + i * 2.7, 1.7 + j * 2.4, 1.3, 0.8);
      b(1.0, d - 1.5, w - 1.0, d - 0.9, 0.06, 1.08, DARK); b(1.0, d - 0.5, w - 1.0, d - 0.25, 0.06, 2.2, WOOD);
    } else if (kind === 'market') {
      for (i = 0; i < Math.floor((w - 3) / 2.3); i++) b(1.4 + i * 2.3, 2.2, 2.1 + i * 2.3, d - 1.0, 0.06, 1.55, i % 2 ? WHITE : mixc(c, WHITE, 0.5));
      for (i = 0; i < 3; i++) b(w - 1.6 - i * 1.9, 0.7, w - 0.9 - i * 1.9, 1.5, 0.06, 0.95, STEEL);
      b(0.3, d - 0.55, w - 0.3, d - 0.25, 0.06, 2.0, mixc(c, DARK, 0.3));
    } else if (kind === 'fashion') {
      b(0.3, 0.9, 0.6, d - 0.6, 0.06, 1.95, WOOD); b(w - 0.6, 0.9, w - 0.3, d - 0.6, 0.06, 1.95, WOOD);
      for (i = 0; i < 2; i++) b(w * (0.3 + 0.4 * i) - 0.9, d * 0.5 - 0.45, w * (0.3 + 0.4 * i) + 0.9, d * 0.5 + 0.45, 0.06, 0.82, WHITE);
      for (i = 0; i < 3; i++) { u = 1.6 + i * 1.1; b(u - 0.3, 0.45, u + 0.3, 1.05, 0.06, 0.2, WHITE); b(u - 0.13, 0.62, u + 0.13, 0.88, 0.2, 1.78, i === 1 ? c : DARK); }
      b(w - 3.4, d - 1.4, w - 1.0, d - 0.8, 0.06, 1.0, DARK);
    } else if (kind === 'wellness') {
      b(1.0, 1.0, 3.6, 1.6, 0.06, 1.05, WHITE);
      for (i = 0; i < Math.floor((w - 1) / 3.2); i++) b(1.0 + i * 3.2, d * 0.45, 1.12 + i * 3.2, d - 0.3, 0.06, 2.2, mixc(c, WHITE, 0.6));
      b(1.0, d * 0.45, w - 1.0, d * 0.45 + 0.12, 0.06, 2.2, mixc(c, WHITE, 0.6));
    } else {
      for (i = 0; i < Math.floor((w - 2) / 3); i++) for (j = 0; j < 2; j++) b(1.5 + i * 3, 1.5 + j * 2.6, 3.3 + i * 3, 2.4 + j * 2.6, 0.06, 0.86, j ? WHITE : mixc(c, WHITE, 0.55));
      b(0.3, d - 0.55, w - 0.3, d - 0.25, 0.06, 2.0, DARK);
    }
    return X.packF(Pv, Cv);
  }

  /* ---------- pointing at lots ---------- */
  function lotHeight(l) { return X.cut(l.level) || UNCUT; }
  function openLot(l) { ALP.set({ lotId: l ? l.id : '' }); E.wake(); E.dirty('lotcard'); E.dirty('mapguide'); E.dirty('mall3d'); }
  function pressLot(f) { if (X.dragged() || !f.store) return; openLot(S.lotId === f.store.id ? null : f.store); }
  X.HK.pick.push(function (o, d, limit) {
    var lv = X.levels(), best = null, i;
    if (X.mode.sk > 0.5) return null;
    for (i = 0; i < lots.length; i++) {
      var l = lots[i], L = lv[l.level];
      if (!L || !X.levelOpen(l.level) || Math.abs(d[1]) < 1e-6) continue;
      // where the ray meets the top of the lot's block, or failing that its floor
      var yb = l.y + (X.walk.on ? 0 : L.lift), top = yb + lotHeight(l), t = (top - o[1]) / d[1], hit = t > 0 && inside(l, o[0] + d[0] * t, o[2] + d[2] * t);
      if (!hit) { t = (yb + 0.05 - o[1]) / d[1]; hit = t > 0 && inside(l, o[0] + d[0] * t, o[2] + d[2] * t); }
      if (hit && t < limit && (!best || t < best.t)) best = { t: t, kind: 'lot', store: l, suffix: l.id, label: lotName(l), onPress: pressLot };
    }
    return best;
  });
  function hovLot() { return X.hov.extra && X.hov.extra.kind === 'lot' ? X.hov.extra.store : null; }
  X.HK.hint.push(function (hov) {
    var l = hov.extra && hov.extra.kind === 'lot' ? hov.extra.store : null;
    if (!l) return '';
    return lotName(l) + '  ' + DOT + '  ' + lotSqm(l) + ' sqm  ' + DOT + '  ' + stat(l.status).label + '  ' + DOT + '  pull the trigger for details';
  });

  /* ---------- amenities ---------- */
  var AM0 = { restroom: 'Restrooms', accessible: 'Accessibility', elevator: 'Elevator', escalator: 'Escalator', info: 'Information Desk', atm: 'ATM', dining: 'Dining', baby: 'Baby Care', parking: 'Parking' };
  var AMORDER = ['restroom', 'accessible', 'elevator', 'escalator', 'info', 'atm', 'dining', 'baby', 'parking'];
  // line icons in the same hand as the rest of the interface, on a 24 by 24 grid
  U.extend(ALP.icons, {
    amRestroom: 'M7 6.4a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2zM4.6 14.5V9h4.8v5.5M5.9 14.5V21M8.1 14.5V21M17 6.4a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2zM17 9l-3.1 7.4h6.2zM15.9 16.4V21M18.1 16.4V21M12 4v17',
    amAccessible: 'M10.5 5.8a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4zM10.5 8.2v6.3h5l2.6 5.2M10.5 11h4.2M8.4 12.3a5 5 0 1 0 6.6 6.4',
    amElevator: 'M5 3h14v18H5zM9.2 10.2L12 7.4l2.8 2.8M9.2 13.8l2.8 2.8 2.8-2.8',
    amEscalator: 'M3 20h5.6l7.6-10H21v-3h-6.2l-7.6 10H3zM8 6.4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM8 8.6v4.2',
    amInfo: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 11v6M12 7.6v.4',
    amAtm: 'M3 7h18v10H3zM12 14.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2zM6.4 10v4M17.6 10v4',
    amDining: 'M6 3v6a2.5 2.5 0 0 0 5 0V3M8.5 3v18M17.5 3c-2.2 2.2-3.2 5.2-3.2 9h3.2M17.5 3v18',
    amBaby: 'M5 11h14a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6zM12 11V5a7 7 0 0 1 7 6M5 11L3.6 7H2M8.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM15.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
    amParking: 'M4 4h16v16H4zM9.5 17V7H13a3 3 0 0 1 0 6H9.5'
  });
  var AMICON = { restroom: 'amRestroom', accessible: 'amAccessible', elevator: 'amElevator', escalator: 'amEscalator', info: 'amInfo', atm: 'amAtm', dining: 'amDining', baby: 'amBaby', parking: 'amParking' };
  var amen = LIFE.amen;
  function acfg() { return cfg().amenities || {}; }
  function amLabel(t) { var o = (acfg().types || {})[t]; return (o && o.label) || AM0[t] || t; }
  function amAbout(t) { var o = (acfg().types || {})[t]; return (o && o.about) || ''; }
  function buildAmen() {
    amen.length = 0;
    var list = acfg().list || [], lv = X.levels(), i, j;
    for (i = 0; i < list.length; i++) {
      var d = list[i], li = -1;
      for (j = 0; j < lv.length; j++) if (lv[j].id === d.level) li = j;
      if (li >= 0 && AMICON[d.type]) amen.push({ type: d.type, level: li, x: d.x, z: d.z, y: lv[li].elev });
    }
  }
  function amCounts(li) {
    var c = {}, i;
    for (i = 0; i < amen.length; i++) if (li < 0 || amen[i].level === li) c[amen[i].type] = (c[amen[i].type] || 0) + 1;
    return c;
  }
  // where a symbol floats: above the cut walls of an open floor, higher over a floor shown whole
  function amTop(am, L, pk) { return am.y + (X.walk.on ? 2.3 : L.lift + (X.cut(am.level) ? 6.4 : 9.0) * pk); }
  function sph(o, d, c, R) {
    var oc = [o[0] - c[0], o[1] - c[1], o[2] - c[2]], a2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2], b2 = 2 * (oc[0] * d[0] + oc[1] * d[1] + oc[2] * d[2]);
    var cc = oc[0] * oc[0] + oc[1] * oc[1] + oc[2] * oc[2] - R * R, disc = b2 * b2 - 4 * a2 * cc;
    if (disc < 0) return -1;
    var tt = (-b2 - Math.sqrt(disc)) / (2 * a2);
    return tt > 0 ? tt : -1;
  }
  function pressAm(f) { if (X.dragged() || !f.am) return; S.amenFilter = S.amenFilter === f.am.type ? '' : f.am.type; S.mapGuide = true; E.dirty('mapguide'); E.dirty('mall3d'); E.wake(); }
  X.HK.pick.push(function (o, d, limit) {
    var lv = X.levels(), best = null, i, pk = X.pinK(), R = 0.019 / Math.max(1e-6, X.modelScale());
    if (X.mode.sk > 0.5 || X.walk.on) return null;
    for (i = 0; i < amen.length; i++) {
      var am = amen[i], L = lv[am.level];
      if (!L || L.show < 0.5 || X.mode.focus !== am.level) continue;
      var t = sph(o, d, [am.x, amTop(am, L, pk) + R * 0.85, am.z], R);
      if (t > 0 && t < limit && (!best || t < best.t)) best = { t: t, kind: 'amenity', am: am, suffix: am.type + ':' + i, label: amLabel(am.type), onPress: pressAm };
    }
    return best;
  });
  X.HK.hint.push(function (hov) {
    var am = hov.extra && hov.extra.kind === 'amenity' ? hov.extra.am : null;
    if (!am) return '';
    return amLabel(am.type) + (amAbout(am.type) ? '  ' + DOT + '  ' + amAbout(am.type) : '') + '  ' + DOT + '  pull the trigger to pick out every one on this floor';
  });

  /* ---------- people ---------- */
  var people = LIFE.people, PPL = { a: null, b: null, sh: null, prog: null, gl: null };
  var TOPS = [[0.93, 0.90, 0.84], [0.17, 0.22, 0.33], [0.72, 0.36, 0.27], [0.45, 0.55, 0.43], [0.20, 0.20, 0.21], [0.82, 0.66, 0.30], [0.47, 0.58, 0.70], [0.96, 0.96, 0.95], [0.55, 0.30, 0.36], [0.30, 0.42, 0.52], [0.86, 0.74, 0.62]];
  var BOTS = [[0.16, 0.16, 0.18], [0.22, 0.30, 0.43], [0.62, 0.55, 0.43], [0.10, 0.10, 0.11], [0.36, 0.34, 0.33], [0.78, 0.74, 0.66]];
  var SKINS = [[0.90, 0.78, 0.68], [0.80, 0.64, 0.52], [0.66, 0.50, 0.40], [0.52, 0.38, 0.30]];
  var HAIRS = [[0.08, 0.07, 0.07], [0.16, 0.11, 0.08], [0.26, 0.18, 0.12], [0.42, 0.40, 0.38]];
  function mkLine(pts, out) {
    var seg = [], len = 0, j;
    for (j = 0; j + 1 < pts.length; j++) { var l = Math.hypot(pts[j + 1][0] - pts[j][0], pts[j + 1][1] - pts[j][1]); seg.push({ a: pts[j], b: pts[j + 1], s0: len, l: l }); len += l; }
    return len > 1 ? { seg: seg, len: len, out: !!out } : null;
  }
  function buildPeople() {
    people.length = 0;
    var pc = cfg().people || {}, lv = X.levels(), r = rng(2026), li, i;
    if (pc.enabled === false) return;
    function look() {
      var kid = r() < 0.07;
      return { top: TOPS[Math.floor(r() * TOPS.length)], bot: BOTS[Math.floor(r() * BOTS.length)], skin: SKINS[Math.floor(r() * SKINS.length)], hair: HAIRS[Math.floor(r() * HAIRS.length)],
        tall: kid ? 0.66 + r() * 0.1 : 0.93 + r() * 0.13, wide: 0.92 + r() * 0.2, skirt: r() < 0.3, ph: r() * 6.28 };
    }
    for (li = 0; li < lv.length; li++) {
      var id = lv[li].id, src = (pc.routes || {})[id] || (pc.paths || {})[id] || [], count = (pc.count || {})[id] || 0, lines = [], total = 0, ln;
      for (i = 0; i < src.length; i++) { ln = mkLine(src[i].points || src[i], src[i].outdoor); if (ln) { lines.push(ln); total += ln.len; } }
      if (li === 0) for (i = 0; i < (pc.outdoor || []).length; i++) { ln = mkLine(pc.outdoor[i], true); if (ln) { lines.push(ln); total += ln.len; } }
      for (i = 0; i < count && lines.length; i++) {
        var pick = r() * total, k = 0;
        while (k < lines.length - 1 && pick > lines[k].len) { pick -= lines[k].len; k++; }
        var w = U.extend({ level: li, y: lv[li].elev, line: lines[k], s: r() * lines[k].len, dir: r() < 0.5 ? 1 : -1, speed: 0.95 + r() * 0.45, lane: (r() - 0.5) * 1.1, wait: 0, x: 0, z: 0, a: r() * 6.28, out: lines[k].out }, look());
        people.push(w);
        // some walk as a pair
        if (r() < 0.26 && i + 1 < count) { i++; people.push(U.extend(U.extend({}, w), U.extend(look(), { lane: w.lane + (w.lane > 0 ? -0.62 : 0.62), s: Math.max(0, w.s - 0.15) }))); }
      }
      var st = (pc.stand || {})[id] || [];
      for (i = 0; i < st.length; i++) {
        var face = (180 - (st[i][2] || 0)) * Math.PI / 180;
        people.push(U.extend({ level: li, y: lv[li].elev, line: null, speed: 0, x: st[i][0], z: st[i][1], a: face + (r() - 0.5) * 0.5, out: false }, look()));
        if (r() < 0.4) people.push(U.extend({ level: li, y: lv[li].elev, line: null, speed: 0, x: st[i][0] + Math.cos(face) * 0.62, z: st[i][1] - Math.sin(face) * 0.62, a: face + (r() - 0.5) * 0.9, out: false }, look()));
      }
    }
  }
  function stepPeople(dt) {
    for (var i = 0; i < people.length; i++) {
      var w = people[i], ln = w.line;
      if (!ln) continue;
      if (w.wait > 0) { w.wait -= dt; w.moving = false; continue; }
      w.s += w.dir * w.speed * dt; w.moving = true; w.ph += dt * w.speed * 3.6;
      // at the end of a walk: stop a moment, then head back
      if (w.s > ln.len) { w.s = ln.len; w.dir = -1; w.wait = 1.5 + (i % 7) * 0.9; } else if (w.s < 0) { w.s = 0; w.dir = 1; w.wait = 1.5 + (i % 5) * 1.1; }
      var sg = ln.seg[0], k;
      for (k = 0; k < ln.seg.length; k++) { sg = ln.seg[k]; if (w.s <= sg.s0 + sg.l) break; }
      var t = sg.l > 0 ? U.clamp((w.s - sg.s0) / sg.l, 0, 1) : 0, dx = (sg.b[0] - sg.a[0]) / (sg.l || 1), dz = (sg.b[1] - sg.a[1]) / (sg.l || 1);
      w.x = sg.a[0] + (sg.b[0] - sg.a[0]) * t - dz * w.lane; w.z = sg.a[1] + (sg.b[1] - sg.a[1]) * t + dx * w.lane;
      w.a += U.angleDiff(Math.atan2(dx * w.dir, dz * w.dir), w.a) * Math.min(1, dt * 5);
    }
  }
  // a figure of rounded limbs. colour r: 255 skin, 200 top, 140 legs, 80 hair, 20 shoes; g is the shading; a: 255 still, 128 swings forward, 64 swings back
  function personMesh(skirt) {
    var Pv = [], Cv = [], LX = 0.33, LY = 0.82, LZ = 0.47;
    function v(p, n, region, group) {
      var l = Math.hypot(n[0], n[1], n[2]) || 1, d = (n[0] * LX + n[1] * LY + n[2] * LZ) / l;
      Pv.push(p[0], p[1], p[2]); Cv.push(region, Math.round(255 * U.clamp(0.6 + 0.4 * d, 0.38, 1)), 0, group);
    }
    function tube(cx, cz, y0, rx0, rz0, y1, rx1, rz1, n, region, group, cap) {
      for (var i = 0; i < n; i++) {
        var a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
        var p00 = [cx + c0 * rx0, y0, cz + s0 * rz0], p10 = [cx + c1 * rx0, y0, cz + s1 * rz0], p01 = [cx + c0 * rx1, y1, cz + s0 * rz1], p11 = [cx + c1 * rx1, y1, cz + s1 * rz1], n0 = [c0, 0.15, s0], n1 = [c1, 0.15, s1];
        v(p00, n0, region, group); v(p10, n1, region, group); v(p11, n1, region, group); v(p00, n0, region, group); v(p11, n1, region, group); v(p01, n0, region, group);
        if (cap) { v([cx, y1, cz], [0, 1, 0], region, group); v(p01, [c0, 1, s0], region, group); v(p11, [c1, 1, s1], region, group); }
      }
    }
    function ball(cx, cy, cz, rx, ry, rz, seg, rings, region, hair) {
      for (var j = 0; j < rings; j++) for (var i = 0; i < seg; i++) {
        var q = [];
        [[i, j], [i + 1, j], [i + 1, j + 1], [i, j], [i + 1, j + 1], [i, j + 1]].forEach(function (e) {
          var th = e[0] / seg * 6.2832, ph = e[1] / rings * 3.1416, n = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
          q.push([[cx + n[0] * rx, cy + n[1] * ry, cz + n[2] * rz], n]);
        });
        // hair covers the top and the back of the head
        var mid = [(q[0][1][0] + q[2][1][0]) / 2, (q[0][1][1] + q[2][1][1]) / 2, (q[0][1][2] + q[2][1][2]) / 2], isHair = hair && (mid[1] > 0.32 || mid[2] < -0.18);
        q.forEach(function (e) { v(e[0], e[1], isHair ? 80 : region, 255); });
      }
    }
    // legs and shoes
    tube(-0.085, 0, 0.06, 0.052, 0.058, 0.92, 0.082, 0.09, 6, 140, 128); tube(0.085, 0, 0.06, 0.052, 0.058, 0.92, 0.082, 0.09, 6, 140, 64);
    tube(-0.085, 0.045, 0.0, 0.058, 0.115, 0.075, 0.05, 0.1, 6, 20, 128, true); tube(0.085, 0.045, 0.0, 0.058, 0.115, 0.075, 0.05, 0.1, 6, 20, 64, true);
    if (skirt) tube(0, 0, 0.5, 0.235, 0.19, 1.0, 0.16, 0.115, 10, 200, 255);
    // torso, shoulders, neck
    tube(0, 0, 0.88, 0.165, 0.112, 1.12, 0.15, 0.1, 10, skirt ? 200 : 140, 255);
    tube(0, 0, 1.12, 0.15, 0.1, 1.4, 0.2, 0.115, 10, 200, 255); tube(0, 0, 1.4, 0.2, 0.115, 1.455, 0.11, 0.08, 10, 200, 255, true);
    tube(0, 0, 1.44, 0.05, 0.05, 1.53, 0.046, 0.046, 6, 255, 255);
    // arms, the lower part bare
    tube(-0.245, 0, 1.0, 0.042, 0.045, 1.42, 0.058, 0.06, 6, 200, 64, true); tube(0.245, 0, 1.0, 0.042, 0.045, 1.42, 0.058, 0.06, 6, 200, 128, true);
    tube(-0.245, 0, 0.8, 0.034, 0.036, 1.0, 0.04, 0.043, 6, 255, 64); tube(0.245, 0, 0.8, 0.034, 0.036, 1.0, 0.04, 0.043, 6, 255, 128);
    ball(0, 1.635, 0.008, 0.094, 0.116, 0.104, 8, 5, 255, true);
    if (skirt) tube(0, -0.045, 1.42, 0.085, 0.05, 1.66, 0.1, 0.085, 8, 80, 255);
    return X.packF(Pv, Cv);
  }
  // the soft shadow a figure stands on
  function shadowMesh() {
    // an oval lying away from the sun, as long as the shadow of someone standing: dark under the feet, soft at the rim
    var Pv = [], Cv = [], n = 18, i, sn = CFG.sun || [0.38, 0.82, 0.42], sl = Math.hypot(sn[0], sn[2]) || 1, dx = -sn[0] / sl, dz = -sn[2] / sl;
    var len = Math.min(1.5, 1.7 * sl / Math.max(0.2, sn[1])), ca = len * 0.5 + 0.16, cb = 0.3, ox = dx * (len * 0.5 - 0.06), oz = dz * (len * 0.5 - 0.06);
    function pt(a, k) { var u = Math.cos(a) * ca * k, v = Math.sin(a) * cb * k; return [ox + dx * u - dz * v, oz + dz * u + dx * v]; }
    for (i = 0; i < n; i++) {
      var a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832, p0 = pt(a0, 0.55), p1 = pt(a1, 0.55), q0 = pt(a0, 1), q1 = pt(a1, 1);
      Pv.push(ox, 0, oz, p1[0], 0, p1[1], p0[0], 0, p0[1]); Cv.push(18, 15, 12, 96, 18, 15, 12, 96, 18, 15, 12, 96);
      Pv.push(p0[0], 0, p0[1], p1[0], 0, p1[1], q1[0], 0, q1[1], p0[0], 0, p0[1], q1[0], 0, q1[1], q0[0], 0, q0[1]); Cv.push(18, 15, 12, 96, 18, 15, 12, 96, 18, 15, 12, 0, 18, 15, 12, 96, 18, 15, 12, 0, 18, 15, 12, 0);
    }
    return X.packF(Pv, Cv);
  }
  var VSP = 'attribute vec3 aPos;attribute vec4 aCol;uniform mat4 uMVP;uniform float uPh;uniform vec3 uTop;uniform vec3 uBot;uniform vec3 uSkin;uniform vec3 uHair;varying vec3 vC;' +
    'void main(){float g=aCol.a;float s=g>0.75?0.0:(g>0.37?1.0:-1.0);vec3 p=aPos;float leg=p.y<0.93?1.0:0.0;float piv=mix(1.42,0.92,leg);float amp=mix(0.2,0.33,leg);' +
    'p.z+=s*sin(uPh)*amp*(piv-p.y);p.y+=abs(sin(uPh))*0.012*abs(s);float r=aCol.r;vec3 c=r>0.9?uSkin:(r>0.66?uTop:(r>0.43?uBot:(r>0.2?uHair:vec3(0.13,0.12,0.12))));vC=c*aCol.g;gl_Position=uMVP*vec4(p,1.0);}';
  var FSP = 'precision mediump float;uniform float uAlpha;varying vec3 vC;void main(){gl_FragColor=vec4(vC*uAlpha,uAlpha);}';
  function program(gl, vs, fs, attrs, unis) {
    function sh(type, src) {
      var o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { ALP.warn('mall3d life shader', gl.getShaderInfoLog(o)); return null; }
      return o;
    }
    var a = sh(gl.VERTEX_SHADER, vs), b = sh(gl.FRAGMENT_SHADER, fs);
    if (!a || !b) return null;
    var p = gl.createProgram();
    gl.attachShader(p, a); gl.attachShader(p, b);
    for (var i = 0; i < attrs.length; i++) gl.bindAttribLocation(p, i, attrs[i]);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
    unis.forEach(function (n) { p[n] = gl.getUniformLocation(p, n); });
    return p;
  }
  function seen(w, lv, walking) {
    var L = lv[w.level];
    if (!L || L.show < 0.5 || L.ghost > 0.5 || (!w.out && !X.levelOpen(w.level))) return null;
    if (walking && w.level !== X.walk.level) return null;
    return L;
  }
  function drawPeople(gl, vp, ctx) {
    if (!people.length) return;
    if (PPL.gl !== gl) { PPL.gl = gl; PPL.prog = program(gl, VSP, FSP, ['aPos', 'aCol'], ['uMVP', 'uPh', 'uTop', 'uBot', 'uSkin', 'uHair', 'uAlpha']); PPL.a = personMesh(false); PPL.b = personMesh(true); PPL.sh = shadowMesh(); }
    if (!PPL.prog || !X.upload(gl, PPL.a, true) || !X.upload(gl, PPL.b, true) || !X.upload(gl, PPL.sh, true)) return;
    var lv = X.levels(), walking = X.walk.on, base = walking ? X.walkBase() : X.tableBase(), k = walking ? 1 : (CFG.peopleScale || 1.5), i, L, w, al = ctx.opacity * (1 - X.mode.sk);
    var hi = walking ? X.headInfo() : null, hm = hi ? M4.xformPoint(X.invWalk(), hi.pos) : ctx.camModel;
    // shadows first, lying on the floor
    X.flat(gl); X.useMesh(gl, PPL.sh); gl.depthMask(false);
    for (i = 0; i < people.length; i++) {
      w = people[i]; L = seen(w, lv, walking);
      if (!L) continue;
      X.uni(gl, M4.mul(vp, M4.mul(base, M4.mul(M4.translate(w.x, w.y + (walking ? 0 : L.lift) + 0.085, w.z), M4.scale(k, 1, k)))), NOTINT, al * L.show, 0);
      gl.drawArrays(gl.TRIANGLES, 0, PPL.sh.count);
    }
    gl.depthMask(true);
    gl.useProgram(PPL.prog);
    for (var pass = 0; pass < 2; pass++) {
      var mesh = pass ? PPL.b : PPL.a;
      X.useMesh(gl, mesh);
      for (i = 0; i < people.length; i++) {
        w = people[i];
        if (!!w.skirt !== !!pass) continue;
        L = seen(w, lv, walking);
        if (!L) continue;
        // at life size nobody walks through you: a figure fades as it comes within two metres and is gone at one
        var near = walking ? Math.hypot(w.x - hm[0], w.z - hm[2]) : 99, na = near > 2.1 ? 1 : (near - 1.0) / 1.1;
        if ((walking && near > 75) || na <= 0.02) continue;
        var m = M4.mul(base, M4.mul(M4.translate(w.x, w.y + (walking ? 0 : L.lift) + 0.06, w.z), M4.mul(M4.rotY(w.a), M4.scale(k * w.wide, k * w.tall, k * w.wide))));
        gl.uniformMatrix4fv(PPL.prog.uMVP, false, M4.mul(vp, m));
        gl.uniform1f(PPL.prog.uPh, w.moving ? w.ph : 0);
        gl.uniform3f(PPL.prog.uTop, w.top[0], w.top[1], w.top[2]); gl.uniform3f(PPL.prog.uBot, w.bot[0], w.bot[1], w.bot[2]);
        gl.uniform3f(PPL.prog.uSkin, w.skin[0], w.skin[1], w.skin[2]); gl.uniform3f(PPL.prog.uHair, w.hair[0], w.hair[1], w.hair[2]);
        gl.uniform1f(PPL.prog.uAlpha, al * L.show * na);
        gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
      }
    }
  }

  /* ---------- planters: a round tub with a small tree and a curved timber bench, as in the mall's concourses ---------- */
  var planterMeshes = {};
  function planterMesh(li) {
    if (planterMeshes[li] !== undefined) return planterMeshes[li];
    var lv = X.levels(), list = (cfg().planters || {})[lv[li].id] || [], Pv = [], Cv = [], r = rng(77 + li), i, k;
    function v(p, col, sh, al) { Pv.push(p[0], p[1], p[2]); Cv.push(Math.min(255, Math.round(col[0] * sh)), Math.min(255, Math.round(col[1] * sh)), Math.min(255, Math.round(col[2] * sh)), al === undefined ? 255 : al); }
    function lit(n) { var l = Math.hypot(n[0], n[1], n[2]) || 1; return U.clamp(0.62 + 0.4 * (n[0] * 0.33 + n[1] * 0.82 + n[2] * 0.47) / l, 0.4, 1.06); }
    function tube(cx, cz, y0, r0, y1, r1, n, col, cap, a0, a1) {
      a0 = a0 || 0; a1 = a1 === undefined ? 6.2832 : a1;
      for (var q = 0; q < n; q++) {
        var t0 = a0 + (a1 - a0) * q / n, t1 = a0 + (a1 - a0) * (q + 1) / n, c0 = Math.cos(t0), s0 = Math.sin(t0), c1 = Math.cos(t1), s1 = Math.sin(t1);
        var p00 = [cx + c0 * r0, y0, cz + s0 * r0], p10 = [cx + c1 * r0, y0, cz + s1 * r0], p01 = [cx + c0 * r1, y1, cz + s0 * r1], p11 = [cx + c1 * r1, y1, cz + s1 * r1], l0 = lit([c0, 0.2, s0]), l1 = lit([c1, 0.2, s1]);
        v(p00, col, l0); v(p10, col, l1); v(p11, col, l1); v(p00, col, l0); v(p11, col, l1); v(p01, col, l0);
        if (cap) { v([cx, y1, cz], cap, 1.04); v(p01, cap, 1.04); v(p11, cap, 1.04); }
      }
    }
    function blob(cx, cy, cz, rx, ry, col) {
      var seg = 8, rings = 5;
      for (var j = 0; j < rings; j++) for (var q = 0; q < seg; q++) {
        [[q, j], [q + 1, j], [q + 1, j + 1], [q, j], [q + 1, j + 1], [q, j + 1]].forEach(function (e) {
          var th = e[0] / seg * 6.2832, ph = e[1] / rings * 3.1416, n = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
          v([cx + n[0] * rx, cy + n[1] * ry, cz + n[2] * rx], col, lit(n) * (0.9 + 0.14 * ((e[0] * 7 + e[1] * 3) % 3) / 2));
        });
      }
    }
    for (i = 0; i < list.length; i++) {
      var x = list[i][0], z = list[i][1], y = lv[li].elev, top = li === 0 ? 3.3 : 2.75, turn = r() * 6.28;
      // contact shadow
      for (k = 0; k < 16; k++) { var b0 = k / 16 * 6.2832, b1 = (k + 1) / 16 * 6.2832; v([x, y + 0.07, z], [20, 16, 12], 1, 120); v([x + Math.cos(b0) * 2.3, y + 0.07, z + Math.sin(b0) * 2.3], [20, 16, 12], 1, 0); v([x + Math.cos(b1) * 2.3, y + 0.07, z + Math.sin(b1) * 2.3], [20, 16, 12], 1, 0); }
      tube(x, z, y + 0.06, 0.9, y + 0.62, 1.0, 14, [236, 233, 226], [96, 78, 58]);
      tube(x, z, y + 0.62, 0.09, y + top * 0.56, 0.06, 6, [112, 86, 62]);
      blob(x, y + top * 0.72, z, 1.0, top * 0.26, [84, 138, 78]); blob(x + 0.45, y + top * 0.62, z - 0.3, 0.72, top * 0.2, [66, 118, 66]); blob(x - 0.4, y + top * 0.66, z + 0.38, 0.66, top * 0.19, [104, 156, 92]);
      // the bench curves round part of the tub
      tube(x, z, y + 0.06, 1.72, y + 0.44, 1.72, 9, [150, 112, 76], null, turn, turn + 3.5); tube(x, z, y + 0.06, 1.26, y + 0.44, 1.26, 9, [118, 88, 60], null, turn, turn + 3.5);
      for (k = 0; k < 9; k++) {
        var t0 = turn + 3.5 * k / 9, t1 = turn + 3.5 * (k + 1) / 9, q0 = [x + Math.cos(t0) * 1.26, y + 0.44, z + Math.sin(t0) * 1.26], q1 = [x + Math.cos(t1) * 1.26, y + 0.44, z + Math.sin(t1) * 1.26], q2 = [x + Math.cos(t1) * 1.72, y + 0.44, z + Math.sin(t1) * 1.72], q3 = [x + Math.cos(t0) * 1.72, y + 0.44, z + Math.sin(t0) * 1.72];
        v(q0, [176, 134, 92], 1); v(q1, [176, 134, 92], 1); v(q2, [176, 134, 92], 1); v(q0, [176, 134, 92], 1); v(q2, [176, 134, 92], 1); v(q3, [176, 134, 92], 1);
      }
    }
    planterMeshes[li] = Pv.length ? X.packF(Pv, Cv) : null;
    return planterMeshes[li];
  }

  /* ---------- everything that stands on the floors ---------- */
  X.HK.solid.push(function (gl, vp, ctx) {
    var lv = X.levels(), walking = X.walk.on, wb = walking ? X.walkBase() : null, tb = walking ? null : X.tableBase(), i, L, m;
    function mat(L2) { return M4.mul(vp, walking ? wb : M4.mul(tb, M4.translate(0, L2.lift, 0))); }
    if (X.mode.sk < 0.5) {
      // lot colours first, so that everything else stands on them
      if (S.lotsOn && !walking) for (i = 0; i < lv.length; i++) {
        L = lv[i];
        if (L.show < 0.5 || L.ghost > 0.5 || !X.levelOpen(i)) continue;
        m = floorLots(i, X.cut(i));
        if (!m.count || !X.upload(gl, m, true)) continue;
        X.useMesh(gl, m); X.uni(gl, mat(L), NOTINT, ctx.opacity * L.show, 0);
        gl.drawArrays(gl.TRIANGLES, 0, m.count);
      }
      for (i = 0; i < lots.length; i++) {
        var s = lots[i]; L = lv[s.level];
        if (!s.dressed || !L || L.show < 0.5 || L.ghost > 0.5 || !X.levelOpen(s.level) || !(walking || X.cut(s.level))) continue;
        if (!s.mesh) s.mesh = storeMesh(s);
        if (!X.upload(gl, s.mesh, true)) continue;
        X.useMesh(gl, s.mesh); X.uni(gl, mat(L), NOTINT, ctx.opacity * L.show, 0);
        gl.drawArrays(gl.TRIANGLES, 0, s.mesh.count);
      }
      if (CFG.look !== 'plain') drawArt(gl, vp, lv, walking, wb, tb, ctx.opacity);
      X.flat(gl);
      for (i = 0; i < lv.length; i++) {
        L = lv[i];
        if (L.show < 0.5 || L.ghost > 0.5 || !X.levelOpen(i) || (walking && i !== X.walk.level)) continue;
        m = planterMesh(i);
        if (!m || !X.upload(gl, m, true)) continue;
        X.useMesh(gl, m); X.uni(gl, mat(L), NOTINT, ctx.opacity * L.show, 0);
        gl.drawArrays(gl.TRIANGLES, 0, m.count);
      }
    }
    drawPeople(gl, vp, ctx);
  });

  /* ---------- labels: one picture holding every name and symbol, drawn as small signs ---------- */
  var LB = { c: null, g: null, tex: null, dirty: true, items: {}, x: 4, y: 20, row: 0, W: 2048, H: 2048, gl: null, buf: null, vao: null, prog: null, n: 0, alpha: {} };
  var PPD = 36, WHITE_PX = { x: 4, y: 4, w: 8, h: 8 };
  function wipe(g) { g.clearRect(0, 0, LB.W, LB.H); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, 16, 16); }
  function atlas() {
    if (!LB.c) { LB.c = document.createElement('canvas'); LB.c.width = LB.W; LB.c.height = LB.H; LB.g = LB.c.getContext('2d'); wipe(LB.g); }
    return LB.g;
  }
  function resetAtlas() { if (LB.g) wipe(LB.g); LB.items = {}; LB.x = 4; LB.y = 20; LB.row = 0; LB.dirty = true; }
  function slot(key, w, h) {
    if (LB.x + w + 6 > LB.W) { LB.x = 4; LB.y += LB.row + 8; LB.row = 0; }
    if (LB.y + h + 6 > LB.H) return null;
    var it = { x: LB.x, y: LB.y, w: w, h: h };
    LB.x += w + 8; LB.row = Math.max(LB.row, h); LB.items[key] = it; LB.dirty = true;
    return it;
  }
  // a name tag: one line, or a small line over a larger one. o.dot is a colour for the dot, o.line the colour of the border
  function mkLabel(key, o) {
    if (LB.items[key]) return LB.items[key];
    var g = atlas(), f1 = o.size || 27, two = !!o.sub, h = two ? 92 : 56, pad = 24, f2 = 18;
    var fam1 = o.brand ? T.font.brand : T.font.ui, t1 = o.brand ? String(o.text) : String(o.text).toUpperCase(), t2 = two ? String(o.sub).toUpperCase() : '';
    g.font = (o.brand ? '400 ' : '600 ') + f1 + 'px ' + fam1; K.spacing(g, o.style === 'sign' ? f1 * 0.08 : (o.brand ? f1 * 0.05 : f1 * 0.12));
    var w1 = g.measureText(t1).width, w2 = 0, dot = o.dot ? 26 : 0;
    if (two) { g.font = '600 ' + f2 + 'px ' + T.font.ui; K.spacing(g, f2 * 0.16); w2 = g.measureText(t2).width + dot; }
    var w = Math.ceil(Math.max(w1, w2) + pad * 2), it = slot(key, w, h);
    if (!it) return null;
    var x = it.x, y = it.y, mint = o.style === 'here' || o.style === 'lease', dotc = typeof o.dot === 'string' ? o.dot : null;
    if (o.style === 'sign') {
      g.save();
      g.font = '400 ' + f1 + 'px ' + fam1; K.spacing(g, f1 * 0.08); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = o.dark ? '#062B1E' : '#FFFFFF';
      g.fillText(t1, x + pad, y + h / 2 + f1 * 0.35);
      K.spacing(g, 0); g.restore();
      return it;
    }
    g.save();
    K.roundRect(g, x + 1, y + 1, w - 2, h - 2, two ? 22 : (h - 2) / 2);
    g.fillStyle = o.style === 'here' ? 'rgba(52,211,153,.96)' : 'rgba(10,10,10,.88)'; g.fill();
    g.lineWidth = 2; g.strokeStyle = o.line || (o.style === 'here' ? 'rgba(52,211,153,1)' : (o.style === 'lease' ? 'rgba(52,211,153,.85)' : 'rgba(255,255,255,.3)')); g.stroke();
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    var dark = o.style === 'here';
    if (two) {
      g.font = '600 ' + f2 + 'px ' + T.font.ui; K.spacing(g, f2 * 0.16);
      if (dot) { g.beginPath(); g.arc(x + pad + 8, y + 27, 7, 0, Math.PI * 2); g.fillStyle = dotc || (dark ? '#062B1E' : (mint ? '#34D399' : 'rgba(245,242,236,.6)')); g.fill(); }
      g.fillStyle = dark ? 'rgba(6,43,30,.85)' : (mint ? '#34D399' : 'rgba(245,242,236,.72)');
      g.fillText(t2, x + pad + dot, y + 33);
      g.font = (o.brand ? '400 ' : '600 ') + f1 + 'px ' + fam1; K.spacing(g, o.brand ? f1 * 0.05 : f1 * 0.12);
      g.fillStyle = dark ? '#062B1E' : '#FFFFFF';
      g.fillText(t1, x + pad, y + 72);
    } else {
      g.font = '600 ' + f1 + 'px ' + fam1; K.spacing(g, f1 * 0.12);
      g.fillStyle = dark ? '#062B1E' : '#FFFFFF';
      g.fillText(t1, x + pad, y + h / 2 + f1 * 0.35);
    }
    K.spacing(g, 0);
    g.restore();
    return it;
  }
  // the number printed on a lot: dark figures on a pale plate; its area is a smaller dark plate
  function mkPlate(key, text, small) {
    if (LB.items[key]) return LB.items[key];
    var g = atlas(), f = small ? 26 : 46, h = small ? 40 : 64;
    g.font = (small ? '500 ' : '700 ') + f + 'px ' + T.font.ui; K.spacing(g, small ? 0.5 : 1);
    var w = Math.ceil(g.measureText(text).width + (small ? 26 : 40)), it = slot(key, w, h);
    if (!it) return null;
    g.save();
    K.roundRect(g, it.x + 1, it.y + 1, w - 2, h - 2, (h - 2) / 2);
    g.fillStyle = small ? 'rgba(16,16,16,.74)' : 'rgba(250,248,243,.94)'; g.fill();
    g.font = (small ? '500 ' : '700 ') + f + 'px ' + T.font.ui; K.spacing(g, small ? 0.5 : 1); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillStyle = small ? '#FFFFFF' : '#151513';
    g.fillText(text, it.x + w / 2, it.y + h / 2 + f * 0.35);
    K.spacing(g, 0); g.restore();
    return it;
  }
  // an amenity symbol on a dark tile; lit in mint when its row in the Floor Guide is chosen
  function mkBadge(type, on) {
    var key = 'am:' + type + (on ? ':on' : '');
    if (LB.items[key]) return LB.items[key];
    var g = atlas(), it = slot(key, 72, 72);
    if (!it) return null;
    g.save();
    K.roundRect(g, it.x + 2, it.y + 2, 68, 68, 20);
    g.fillStyle = on ? 'rgba(52,211,153,.98)' : 'rgba(12,12,12,.92)'; g.fill();
    g.lineWidth = 2.5; g.strokeStyle = on ? '#34D399' : 'rgba(255,255,255,.55)'; g.stroke();
    ALP.drawIcon(g, AMICON[type], it.x + 14, it.y + 14, 44, on ? '#062B1E' : '#FFFFFF', 1.9);
    g.restore();
    return it;
  }
  try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { resetAtlas(); }); } catch (e) {}
  setTimeout(resetAtlas, 4000);
  var VSL = 'attribute vec3 aPos;attribute vec3 aUv;uniform mat4 uVP;varying vec3 vUv;void main(){vUv=aUv;gl_Position=uVP*vec4(aPos,1.0);}';
  var FSL = 'precision mediump float;uniform sampler2D uT;uniform float uAlpha;varying vec3 vUv;void main(){gl_FragColor=texture2D(uT,vUv.xy)*(vUv.z*uAlpha);}';
  function xf(m, x, y, z) { return M4.xformPoint(m, [x, y, z]); }
  // a label lying flat at height y, centred on (cx, cz), turned so that it reads upright from the direction (fx, fz) points away from
  function flatQuad(base, cx, cz, y, w, h, fx, fz) {
    var rx = -fz, rz = fx;
    return [xf(base, cx - rx * w / 2 - fx * h / 2, y, cz - rz * w / 2 - fz * h / 2), xf(base, cx + rx * w / 2 - fx * h / 2, y, cz + rz * w / 2 - fz * h / 2),
      xf(base, cx + rx * w / 2 + fx * h / 2, y, cz + rz * w / 2 + fz * h / 2), xf(base, cx - rx * w / 2 + fx * h / 2, y, cz - rz * w / 2 + fz * h / 2)];
  }
  // which labels to show this frame, where, and how big: nearest things win when two would overlap
  function collect(ctx) {
    var out = [], lv = X.levels(), pins = X.pins(), walking = X.walk.on, base = walking ? X.walkBase() : X.tableBase(), i, cur = S.placeId, h = X.headInfo();
    var hm = h ? M4.xformPoint(walking ? X.invWalk() : X.invTable(), h.pos) : [0, 100, 0], hovL = hovLot(), pk = X.pinK(), ms = X.modelScale();
    // every flat label reads upright from where you stand: they all turn to face away from you, along the line from you to the middle of the model
    var bd0 = X.bounds(), vf = [(bd0[0] + bd0[3]) / 2 - hm[0], (bd0[2] + bd0[5]) / 2 - hm[2]], vl = Math.hypot(vf[0], vf[1]) || 1; vf = [vf[0] / vl, vf[1] / vl];
    for (i = 0; i < pins.length; i++) {
      var p = pins[i], L = lv[p.level];
      if (!L || L.show < 0.5 || !X.pinOpen(p)) continue;
      var here = p.place && p.place === cur, hv = X.hov.pin && X.hov.pin.id === p.id;
      var py = walking ? X.floorY(p.level) + (CFG.pinH + CFG.pinR * 1.9) * CFG.walkPinScale + 0.12 : p.y + L.lift + (CFG.pinH + CFG.pinR * 2.1) * pk;
      var it = here ? mkLabel('here:' + p.label, { text: p.label, sub: 'You are here', dot: true, style: 'here' }) : mkLabel('pin:' + p.label, { text: p.label, sub: p.place ? 'Open 360' : '', style: 'pin' });
      if (it) out.push({ it: it, key: 'p' + i, pos: xf(base, p.x, py, p.z), prio: here ? 100 : (hv ? 95 : 50), scale: here || hv ? 1 : 0.86 });
    }
    if (X.mode.sk < 0.5) {
      for (i = 0; i < lots.length; i++) {
        var s = lots[i], Ls = lv[s.level];
        if (!Ls || Ls.show < 0.5 || !X.levelOpen(s.level)) continue;
        var lift = walking ? 0 : Ls.lift, hot = s === hovL || s.id === S.lotId, ht = lotHeight(s);
        if (!walking && S.lotsOn) {
          // the lot number lies flat on top of the lot, turned so it reads upright from where you stand
          var num = X.cut(s.level) ? s.id.slice(s.id.indexOf('-') + 1) : s.id, pl = mkPlate('n:' + num, num, false);
          if (pl) {
            var fx = vf[0], fz = vf[1], fl = Math.hypot(s.cx - hm[0], s.cz - hm[2]) || 1;
            var ph = U.clamp(Math.min(s.x1 - s.x0, s.z1 - s.z0) * 0.3, 1.25, 3.2), pw = ph * pl.w / pl.h, py2 = s.y + lift + ht + 0.06, da = dimmed(s) ? 0.35 : 1;
            var room = Math.max(s.x1 - s.x0, s.z1 - s.z0) * 0.86;
            if (pw > room) { ph *= room / pw; pw = room; }
            out.push({ it: pl, key: 'n' + s.id, alpha: da, fixed: flatQuad(base, s.cx, s.cz, py2, pw, ph, fx, fz) });
            // its area sits under the number once the model is large enough to read it
            var app = ph * ms / Math.max(0.3, Math.hypot(fl, hm[1] - (s.y + ht)) * ms);
            if (app > 0.017 && !dimmed(s)) {
              var ar = mkPlate('a:' + lotSqm(s), lotSqm(s) + ' sqm', true);
              if (ar) { var ah2 = ph * 0.52; out.push({ it: ar, key: 'a' + s.id, alpha: U.clamp((app - 0.017) * 220, 0, 1), fixed: flatQuad(base, s.cx - fx * ph * 0.84, s.cz - fz * ph * 0.84, py2, ah2 * ar.w / ar.h, ah2, fx, fz) }); }
            }
          }
        }
        if (walking && s.dressed) {
          // the name on the sign band, fixed to the wall
          var sg = mkLabel('sign:' + s.id, { text: lotName(s), style: 'sign', brand: true, size: 40, dark: s.lease });
          if (sg) {
            var sh = 0.4, sw = Math.min(s.wd - 1.8, sh * sg.w / sg.h), a0 = at(s, s.wd / 2 - sw / 2, -0.2), a1 = at(s, s.wd / 2 + sw / 2, -0.2), y0 = s.y + 2.265;
            out.push({ it: sg, key: 'g' + s.id, fixed: [xf(base, a0[0], y0, a0[1]), xf(base, a1[0], y0, a1[1]), xf(base, a1[0], y0 + sw * sg.h / sg.w, a1[1]), xf(base, a0[0], y0 + sw * sg.h / sg.w, a0[1])] });
          }
        }
        // the tag that names the lot you point at, or the one whose card is open
        if (hot) {
          var stt = stat(s.status), tg = mkLabel('lot:' + s.id + ':' + s.status, { text: lotName(s), sub: stt.label + '  ' + DOT + '  ' + lotSqm(s) + ' sqm', dot: css(stt.color), line: css(stt.color, 0.9), brand: !!(s.d.tenant || s.d.name), size: 30 });
          var tph = walking ? 0 : U.clamp(Math.min(s.x1 - s.x0, s.z1 - s.z0) * 0.3, 1.25, 3.2) * 1.05;
          if (tg) out.push({ it: tg, key: 's' + s.id, pos: xf(base, s.cx + vf[0] * tph, s.y + lift + (walking ? 2.9 : ht + 1.6 * pk), s.cz + vf[1] * tph), prio: 97, scale: 1 });
        }
      }
      // amenity symbols stand on a thin stem
      for (i = 0; i < amen.length; i++) {
        var am = amen[i], La = lv[am.level];
        if (!La || La.show < 0.5 || (walking ? am.level !== X.walk.level : X.mode.focus !== am.level)) continue;
        var on = S.amenFilter === am.type, bd = mkBadge(am.type, on), ya = am.y + (walking ? 0 : La.lift);
        if (!bd) continue;
        var hva = X.hov.extra && X.hov.extra.kind === 'amenity' && X.hov.extra.am === am, top = amTop(am, La, pk) + (on && !walking ? (1.0 + Math.sin(ctx.t * 4 + i) * 0.45) * pk : 0);
        if (hva) { var nt = mkLabel('amn:' + am.type, { text: amLabel(am.type), style: 'pin', size: 24 }); if (nt) out.push({ it: nt, key: 'h' + i, pos: xf(base, am.x, top + 0.041 / Math.max(1e-6, ms), am.z), prio: 98, scale: 0.9 }); }
        var fade = S.amenFilter && !on ? 0.3 : 1, pa = xf(base, am.x, ya + 0.1, am.z), pb = xf(base, am.x, top, am.z), dxs = pa[0] - (h ? h.pos[0] : 0), dzs = pa[2] - (h ? h.pos[2] : 0), dl = Math.hypot(dxs, dzs) || 1, sw2 = 0.0014 * Math.max(0.5, dl);
        var sx = -dzs / dl * sw2, sz = dxs / dl * sw2;
        out.push({ it: WHITE_PX, key: 'e' + i, alpha: 0.7 * fade, fixed: [[pa[0] - sx, pa[1], pa[2] - sz], [pa[0] + sx, pa[1], pa[2] + sz], [pb[0] + sx, pb[1], pb[2] + sz], [pb[0] - sx, pb[1], pb[2] - sz]] });
        out.push({ it: bd, key: 'm' + i, pos: pb, prio: hva ? 96 : (on ? 90 : 44), scale: hva || on ? 0.9 : 0.74, fade: hva ? 1 : fade });
      }
    }
    if (!walking && X.mode.ex > 0.6) {
      var b = (X.manifest() || {}).bounds;
      for (i = 0; b && i < lv.length; i++) {
        var li = mkLabel('level:' + lv[i].id, { text: lv[i].name, style: 'level', size: 24 });
        if (li && lv[i].show > 0.5) out.push({ it: li, key: 'l' + i, pos: xf(base, b[0] - 4, lv[i].elev + lv[i].lift + 1, b[5] + 2), prio: 20, scale: 0.8 });
      }
    }
    return out;
  }
  function layoutLabels(ctx) {
    var all = collect(ctx), h = X.headInfo(), i, j, taken = [], data = [], list = [];
    if (!h) { LB.n = 0; LB.nf = 0; return; }
    for (i = 0; i < all.length; i++) {
      var fq = all[i];
      if (!fq.fixed) { list.push(fq); continue; }
      var fu0 = (fq.it.x + 2) / LB.W, fu1 = (fq.it.x + fq.it.w - 2) / LB.W, fv0 = (fq.it.y + 2) / LB.H, fv1 = (fq.it.y + fq.it.h - 2) / LB.H, F = fq.fixed, fa = fq.alpha === undefined ? 1 : fq.alpha;
      data.push(F[0][0], F[0][1], F[0][2], fu0, fv1, fa, F[1][0], F[1][1], F[1][2], fu1, fv1, fa, F[2][0], F[2][1], F[2][2], fu1, fv0, fa,
        F[0][0], F[0][1], F[0][2], fu0, fv1, fa, F[2][0], F[2][1], F[2][2], fu1, fv0, fa, F[3][0], F[3][1], F[3][2], fu0, fv0, fa);
    }
    LB.nf = data.length / 6;
    list.sort(function (a, b) { return b.prio - a.prio; });
    for (i = 0; i < list.length; i++) {
      var q = list[i], dx = q.pos[0] - h.pos[0], dy = q.pos[1] - h.pos[1], dz = q.pos[2] - h.pos[2], hd = Math.hypot(dx, dz), dist = Math.hypot(hd, dy);
      if (dist < 0.15) continue;
      var sc = q.scale * (CFG.labelScale || 0.9), ah = q.it.h / PPD * sc * Math.PI / 180, aw = q.it.w / PPD * sc * Math.PI / 180;
      var yaw = Math.atan2(dx, -dz), pit = Math.atan2(dy, hd) + ah / 2, ok = true;
      for (j = 0; j < taken.length; j++) {
        var t = taken[j];
        if (Math.abs(U.angleDiff(yaw, t.yaw)) < (aw + t.aw) / 2 * 0.92 && Math.abs(pit - t.pit) < (ah + t.ah) / 2 * 0.9) { ok = false; break; }
      }
      if (ok) taken.push({ yaw: yaw, pit: pit, aw: aw, ah: ah });
      var a0 = LB.alpha[q.key] || 0, a1 = a0 + ((ok ? 1 : 0) - a0) * 0.22;
      LB.alpha[q.key] = a1;
      if (a1 < 0.03) continue;
      var av = a1 * (q.fade === undefined ? 1 : q.fade), wh = dist * Math.tan(ah), ww = wh * q.it.w / q.it.h, fx = -dx / (hd || 1), fz = -dz / (hd || 1), rx = fz, rz = -fx;
      var u0 = q.it.x / LB.W, u1 = (q.it.x + q.it.w) / LB.W, v0 = q.it.y / LB.H, v1 = (q.it.y + q.it.h) / LB.H;
      var bl = [q.pos[0] - rx * ww / 2, q.pos[1], q.pos[2] - rz * ww / 2], br = [q.pos[0] + rx * ww / 2, q.pos[1], q.pos[2] + rz * ww / 2];
      data.push(bl[0], bl[1], bl[2], u0, v1, av, br[0], br[1], br[2], u1, v1, av, br[0], br[1] + wh, br[2], u1, v0, av,
        bl[0], bl[1], bl[2], u0, v1, av, br[0], br[1] + wh, br[2], u1, v0, av, bl[0], bl[1] + wh, bl[2], u0, v0, av);
    }
    LB.data = new Float32Array(data); LB.n = data.length / 6;
  }
  X.HK.overlay.push(function (gl, vp, ctx) {
    var lv = X.levels(), walking = X.walk.on, i;
    // the block over the lot you point at or have chosen
    X.flat(gl); gl.depthMask(false);
    for (i = 0; i < lots.length; i++) {
      var l = lots[i], L = lv[l.level];
      if (l.hov < 0.02 || !L || !X.levelOpen(l.level) || X.mode.sk > 0.5) continue;
      var bm = blockMesh(l, lotHeight(l));
      if (!X.upload(gl, bm, true)) continue;
      X.useMesh(gl, bm); X.uni(gl, M4.mul(vp, walking ? X.walkBase() : M4.mul(X.tableBase(), M4.translate(0, L.lift, 0))), NOTINT, ctx.opacity * L.show * l.hov, 0);
      gl.drawArrays(gl.TRIANGLES, 0, bm.count);
    }
    gl.depthMask(true);
    if (!ctx.view) layoutLabels(ctx);
    if (LB.gl !== gl) { LB.gl = gl; LB.prog = program(gl, VSL, FSL, ['aPos', 'aUv'], ['uVP', 'uT', 'uAlpha']); LB.tex = gl.createTexture(); LB.buf = gl.createBuffer(); LB.vao = X.mkVao(gl); LB.dirty = true; LB.sent = null; }
    if (!LB.prog || !LB.c) return;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, LB.tex);
    if (LB.dirty) {
      LB.dirty = false;
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, LB.c);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    if (!LB.n) return;
    if (LB.vao) X.bindVao(gl, LB.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, LB.buf);
    if (LB.sent !== LB.data) { gl.bufferData(gl.ARRAY_BUFFER, LB.data, gl.DYNAMIC_DRAW); LB.sent = LB.data; }
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    gl.disableVertexAttribArray(2);
    gl.useProgram(LB.prog);
    gl.uniformMatrix4fv(LB.prog.uVP, false, vp); gl.uniform1i(LB.prog.uT, 0); gl.uniform1f(LB.prog.uAlpha, ctx.opacity);
    gl.depthMask(false);
    if (LB.nf) { gl.enable(gl.DEPTH_TEST); gl.drawArrays(gl.TRIANGLES, 0, LB.nf); }
    gl.disable(gl.DEPTH_TEST);
    if (LB.n > LB.nf) gl.drawArrays(gl.TRIANGLES, LB.nf, LB.n - LB.nf);
    gl.enable(gl.DEPTH_TEST);
  });

  /* ---------- shop windows: a painted view into each kind of store, set behind the glass of every bay ---------- */
  var AR = { c: null, gl: null, prog: null, tex: null, vao: null, up: false, W: 2048, H: 2048, tw: 512, th: 448 };
  var ARTK = ['cafe', 'dining', 'market', 'fashion', 'wellness', 'retail'];
  function paintArt() {
    var cv = AR.c = document.createElement('canvas'); cv.width = AR.W; cv.height = AR.H;
    var g = cv.getContext('2d'), TW = AR.tw, TH = AR.th, r = rng(41), n;
    var INK = 'rgba(46,40,36,.94)', CREAM = '#F4EEE2', BRASS = '#C9A45C', MANN = '#ECE5DA', LEAF = ['#4F8A55', '#3E7247', '#6FA56C'];
    var WD = css(WOOD), WDD = css(mixc(WOOD, DARK, 0.45)), WDL = css(mixc(WOOD, [250, 240, 220], 0.72));
    function rr(x, y, w, h, rad, fill) { K.roundRect(g, x, y, w, h, rad); g.fillStyle = fill; g.fill(); }
    function el(x, y, rx, ry, fill) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); }
    function ln(x0, y0, x1, y1, wd, col) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineWidth = wd; g.strokeStyle = col; g.stroke(); }
    function poly(pts, fill) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (var q = 2; q < pts.length; q += 2) g.lineTo(pts[q], pts[q + 1]); g.closePath(); g.fillStyle = fill; g.fill(); }
    function vg(y0, y1, c0, c1) { var q = g.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, c0); q.addColorStop(1, c1); return q; }
    function pick(pal) { return pal[Math.floor(r() * pal.length)]; }
    // the room behind the glass: a warm wall washed by three downlights, and the shop floor
    function room(c) {
      var wall = mixc([244, 233, 212], c, 0.1);
      g.fillStyle = vg(0, TH, css(mixc(wall, [255, 251, 240], 0.45)), css(mixc(wall, [150, 128, 104], 0.2))); g.fillRect(0, 0, TW, TH);
      g.fillStyle = vg(372, TH, css(mixc(wall, [168, 142, 112], 0.5)), css(mixc(wall, [120, 100, 80], 0.6))); g.fillRect(0, 372, TW, TH - 372);
      ln(0, 372, TW, 372, 2, 'rgba(70,58,46,.2)');
      g.fillStyle = vg(0, 64, 'rgba(38,32,28,.5)', 'rgba(38,32,28,0)'); g.fillRect(0, 0, TW, 64);
      for (var q = 0; q < 3; q++) { var cx = 86 + q * 170; poly([cx - 9, 0, cx + 9, 0, cx + 130, 330, cx - 130, 330], vg(0, 330, 'rgba(255,246,220,.36)', 'rgba(255,246,220,0)')); el(cx, 5, 13, 5, '#FFF9E8'); }
    }
    function shine() { poly([70, 0, 160, 0, -20, TH, -110, TH], 'rgba(255,255,255,.08)'); poly([350, 0, 392, 0, 212, TH, 170, TH], 'rgba(255,255,255,.06)'); }
    function pendant(x, y, col) { ln(x, 0, x, y, 2, INK); poly([x - 9, y, x + 9, y, x + 27, y + 30, x - 27, y + 30], col); el(x, y + 32, 21, 6, 'rgba(255,242,206,.95)'); }
    function plant(x, yb, k) { for (var q = 0; q < 6; q++) { g.save(); g.translate(x, yb - 34 * k); g.rotate((q - 2.5) * 0.4); el(0, -36 * k, 9 * k, 36 * k, LEAF[q % 3]); g.restore(); } rr(x - 17 * k, yb - 38 * k, 34 * k, 38 * k, 6, '#DAD3C6'); }
    function frame(x, y, w, h, col) { rr(x, y, w, h, 3, INK); rr(x + 5, y + 5, w - 10, h - 10, 2, CREAM); rr(x + 15, y + 15, w - 30, h - 30, 2, col); }
    function figure(x, top, bottom, dress) {
      rr(x - 46, 414, 92, 24, 4, '#EFE9DD');
      if (dress) { rr(x - 12, 360, 8, 56, 3, MANN); rr(x + 4, 360, 8, 56, 3, MANN); } else { rr(x - 21, 250, 17, 166, 6, bottom); rr(x + 4, 250, 17, 166, 6, bottom); }
      rr(x - 47, 100, 14, 128, 7, dress ? MANN : top); rr(x + 33, 100, 14, 128, 7, dress ? MANN : top);
      if (dress) poly([x - 30, 94, x + 30, 94, x + 26, 190, x + 54, 366, x - 54, 366, x - 26, 190], top); else rr(x - 33, 92, 66, 172, 14, top);
      rr(x - 6, 72, 12, 24, 3, MANN); el(x, 56, 16, 20, MANN);
    }
    function shelves(x, y, w, h, rows, item) {
      rr(x, y, w, h, 5, WDD); rr(x + 7, y + 7, w - 14, h - 14, 3, WDL);
      for (var q = 1; q <= rows; q++) { var sy = y + 7 + (h - 14) * q / rows; g.fillStyle = WDD; g.fillRect(x + 7, sy - 6, w - 14, 6); item(x + 14, sy - 6, w - 28, (h - 14) / rows - 14, q); }
    }
    function books(pal) { return function (x, y, w, h) { var xx = x; while (xx < x + w - 12) { var bw = 9 + r() * 11, bh = h * (0.62 + r() * 0.36); if (r() < 0.12) { xx += 16; continue; } g.fillStyle = pick(pal); g.fillRect(xx, y - bh, bw, bh); xx += bw + 2; } }; }
    function bottles(pal) { return function (x, y, w, h) { for (var xx = x + 2; xx < x + w - 14; xx += 23) { var bh = h * (0.55 + r() * 0.3), col = pick(pal); rr(xx, y - bh, 14, bh, 4, col); rr(xx + 4, y - bh - 9, 6, 11, 2, col); } }; }
    function boxes(pal) { return function (x, y, w, h) { var xx = x; while (xx < x + w - 30) { var bw = 26 + r() * 22, bh = h * (0.45 + r() * 0.45); rr(xx, y - bh, bw, bh, 3, pick(pal)); xx += bw + 6; } }; }
    function chair(x, col, side) { rr(side > 0 ? x - 22 : x + 14, 270, 8, 78, 4, col); rr(x - 22, 340, 44, 9, 4, col); ln(x - 16, 349, x - 17, 408, 4, INK); ln(x + 16, 349, x + 17, 408, 4, INK); }
    function tableSet(x, col) { chair(x - 84, col, 1); chair(x + 84, col, -1); rr(x - 52, 300, 104, 10, 4, CREAM); rr(x - 5, 310, 10, 94, 2, INK); rr(x - 26, 402, 52, 6, 3, INK); }
    function crate(x, y, pal) { for (var q = 0; q < 6; q++) for (var p = 0; p < 2; p++) el(x + 15 + q * 22 + p * 6, y + 4 - p * 12, 11, 11, pal[(q + p) % pal.length]); rr(x, y + 6, 140, 58, 5, '#B98D5E'); ln(x + 6, y + 26, x + 134, y + 26, 2, 'rgba(90,62,36,.45)'); ln(x + 6, y + 44, x + 134, y + 44, 2, 'rgba(90,62,36,.45)'); }
    var SC = {
      cafe0: function (c) {
        rr(54, 92, 196, 116, 8, INK); for (n = 0; n < 4; n++) ln(74, 118 + n * 22, 150 + ((n * 37) % 70), 118 + n * 22, 4, 'rgba(255,255,255,.72)');
        rr(74, 196, 88, 58, 6, '#B9BDC2'); rr(84, 206, 68, 18, 3, INK); for (n = 0; n < 3; n++) rr(182 + n * 20, 234, 15, 20, 3, CREAM);
        rr(252, 206, 104, 48, 8, 'rgba(255,255,255,.6)'); for (n = 0; n < 4; n++) rr(262 + n * 23, 228, 18, 22, 4, n % 2 ? css(c) : '#E8C98A');
        rr(34, 264, 344, 150, 6, WD); for (n = 1; n < 6; n++) ln(34 + n * 57, 270, 34 + n * 57, 410, 2, 'rgba(60,40,24,.28)'); rr(24, 252, 364, 15, 4, WDD);
        pendant(300, 112, css(c)); pendant(420, 132, css(c));
        rr(410, 318, 56, 10, 4, css(c)); ln(420, 328, 414, 410, 4, INK); ln(456, 328, 462, 410, 4, INK); ln(417, 376, 459, 376, 3, INK);
      },
      cafe1: function (c) {
        frame(64, 104, 96, 118, css(mixc(c, [255, 255, 255], 0.35))); frame(182, 124, 78, 98, '#8FAE8B');
        rr(318, 168, 150, 9, 3, WDD); bottles([CREAM, css(c), '#8FAE8B'])(322, 168, 146, 44);
        pendant(170, 150, css(c)); tableSet(170, css(mixc(c, DARK, 0.15))); plant(404, 412, 1.7);
      },
      dining0: function (c) {
        frame(50, 96, 84, 104, BRASS); frame(214, 96, 84, 104, css(mixc(c, [255, 255, 255], 0.3))); frame(378, 96, 84, 104, BRASS);
        rr(16, 258, 480, 76, 18, css(c)); rr(16, 326, 480, 46, 10, css(mixc(c, DARK, 0.28)));
        for (n = 0; n < 2; n++) { var tx = 136 + n * 240; rr(tx - 64, 316, 128, 11, 4, CREAM); rr(tx - 5, 327, 10, 78, 2, INK); rr(tx - 28, 402, 56, 6, 3, INK); rr(tx - 30, 300, 12, 16, 3, 'rgba(255,255,255,.8)'); rr(tx + 14, 300, 12, 16, 3, 'rgba(255,255,255,.8)'); }
        pendant(136, 150, BRASS); pendant(256, 128, BRASS); pendant(376, 150, BRASS);
      },
      dining1: function (c) {
        shelves(48, 86, 262, 262, 3, bottles(['#5A3A2E', '#2F4A3A', '#7A2E2E', BRASS, '#3A4A5E']));
        rr(340, 302, 112, 112, 6, INK); rr(330, 290, 132, 15, 4, css(c)); rr(374, 250, 44, 40, 4, CREAM); pendant(396, 150, BRASS);
        rr(40, 356, 278, 58, 6, WD); rr(32, 346, 294, 13, 4, WDD);
      },
      market0: function (c) {
        rr(166, 84, 180, 72, 8, INK); ln(190, 110, 322, 110, 5, 'rgba(255,255,255,.75)'); ln(210, 132, 302, 132, 4, 'rgba(255,255,255,.5)');
        var P1 = ['#6FA35A', '#8DBB5E', '#4F8A45'], P2 = ['#E08A3C', '#F0A84A', '#D96C2E'], P3 = ['#C8463C', '#D9604A', '#9E2F2F'], P4 = ['#E9C94A', '#F0DA72', '#D8B13A'];
        crate(22, 196, P1); crate(186, 196, P2); crate(350, 196, P3); rr(14, 262, 484, 12, 3, WDD);
        crate(22, 300, P4); crate(186, 300, P3); crate(350, 300, P1); rr(14, 366, 484, 48, 4, WD);
      },
      market1: function (c) {
        shelves(36, 76, 300, 338, 4, function (x, y, w, h, q) { (q % 2 ? bottles(['#E9C94A', '#C8463C', '#8FAE8B', CREAM, '#E08A3C']) : boxes([css(c), CREAM, '#E0B56A', '#C96F4A', '#8FAE8B']))(x, y, w, h); });
        rr(372, 310, 104, 104, 6, WD); for (n = 0; n < 4; n++) el(390 + n * 23, 306, 12, 12, n % 2 ? '#E08A3C' : '#6FA35A'); plant(424, 232, 1.0);
        rr(380, 232, 88, 8, 3, WDD);
      },
      fashion0: function (c) { figure(150, css(mixc(c, [255, 255, 255], 0.12)), '#2E2B2A', false); figure(356, '#B9605A', '', true); },
      fashion1: function (c) {
        var pal = [css(c), '#B9605A', CREAM, '#C9A45C', '#2E2B2A', '#8FA3B8', '#D9CDB8'];
        ln(64, 116, 64, 0, 3, INK); ln(448, 116, 448, 0, 3, INK); ln(44, 116, 468, 116, 6, INK);
        for (n = 0; n < 7; n++) { var gx = 86 + n * 57; ln(gx, 116, gx, 132, 2, INK); poly([gx - 12, 132, gx + 12, 132, gx + 25, 150, gx + 25, 238 + ((n * 2) % 3) * 44, gx - 25, 238 + ((n * 2) % 3) * 44, gx - 25, 150], pal[n]); }
        rr(52, 398, 408, 12, 3, WDD); for (n = 0; n < 5; n++) { rr(76 + n * 78, 380, 30, 18, 6, pal[(n + 3) % 7]); rr(108 + n * 78, 386, 22, 12, 5, pal[(n + 3) % 7]); }
      },
      wellness0: function (c) {
        el(256, 168, 86, 86, 'rgba(255,251,238,.98)'); el(256, 168, 75, 75, vg(93, 243, '#DCE8EA', '#B9CCD0')); poly([226, 110, 250, 104, 206, 222, 188, 214], 'rgba(255,255,255,.35)');
        rr(104, 296, 304, 118, 12, CREAM); g.fillStyle = css(c); g.fillRect(104, 334, 304, 16); plant(364, 296, 0.85);
        rr(140, 268, 56, 28, 4, '#D9CDB8'); pendant(70, 150, css(mixc(c, [255, 255, 255], 0.3))); pendant(442, 150, css(mixc(c, [255, 255, 255], 0.3)));
      },
      wellness1: function (c) {
        shelves(150, 92, 176, 254, 3, bottles([css(mixc(c, [255, 255, 255], 0.35)), CREAM, '#C9D8C4', '#E8C9B8', css(c)]));
        plant(84, 412, 1.45);
        rr(352, 236, 124, 110, 30, css(mixc(c, [255, 255, 255], 0.25))); rr(344, 318, 140, 56, 20, css(mixc(c, [255, 255, 255], 0.42))); ln(360, 374, 356, 410, 5, INK); ln(468, 374, 472, 410, 5, INK);
      },
      retail0: function (c) { shelves(34, 66, 444, 318, 4, books([css(c), '#B9605A', '#C9A45C', '#4F6F8F', CREAM, '#2E2B2A', '#8FAE8B', '#D98A4A'])); rr(34, 384, 444, 30, 4, WDD); },
      retail1: function (c) {
        frame(70, 88, 128, 168, css(c)); plant(112, 412, 1.15);
        pendant(350, 138, css(c)); rr(232, 304, 236, 14, 4, WDD); ln(250, 318, 246, 410, 6, WDD); ln(450, 318, 454, 410, 6, WDD);
        boxes([css(c), CREAM, '#C9A45C', '#B9605A', '#4F6F8F'])(244, 304, 216, 86); rr(292, 232, 60, 22, 3, CREAM); rr(304, 214, 44, 18, 3, css(c));
      },
      door: function () {
        poly([186, 372, 326, 372, 430, TH, 82, TH], 'rgba(120,96,74,.3)'); rr(206, 150, 100, 222, 4, 'rgba(255,250,236,.5)');
        g.fillStyle = 'rgba(46,40,36,.45)'; g.fillRect(0, TH - 40, TW, 40);
        g.lineWidth = 12; g.strokeStyle = INK; g.strokeRect(6, 6, TW / 2 - 9, TH - 12); g.strokeRect(TW / 2 + 3, 6, TW / 2 - 9, TH - 12);
        rr(222, 176, 10, 132, 5, '#D8C9A6'); rr(280, 176, 10, 132, 5, '#D8C9A6');
      }
    };
    for (var ti = 0; ti < 13; ti++) {
      var kind = ti < 12 ? ARTK[ti >> 1] : 'door', fn = ti < 12 ? SC[kind + (ti % 2)] : SC.door, c = KIND[kind] || [150, 140, 128];
      g.save(); g.beginPath(); g.rect((ti % 4) * TW, (ti >> 2) * TH, TW, TH); g.clip(); g.translate((ti % 4) * TW, (ti >> 2) * TH);
      room(c); fn(c); shine();
      g.restore();
    }
  }
  // where a store's window pictures go: one per bay of the shopfront, the middle bay being the door
  function storeArt(s) {
    if (s.lease || !s.dressed) return null;
    var n = bays(s), step = (s.wd - 1.2) / n, door = Math.floor(n / 2), ki = ARTK.indexOf(s.d.kind), out = [], k, j = 0;
    if (ki < 0) ki = 5;
    for (k = 0; k < n; k++) {
      var idx = k === door ? 12 : ki * 2 + (j++ % 2), u0 = 0.6 + k * step + 0.04, u1 = 0.6 + (k + 1) * step - 0.04;
      var a = at(s, u0, -0.085), b = at(s, u1, -0.085), y0 = s.y + 0.12, y1 = s.y + 2.16;
      var tu0 = ((idx % 4) * AR.tw + 3) / AR.W, tu1 = ((idx % 4 + 1) * AR.tw - 3) / AR.W, tv0 = ((idx >> 2) * AR.th + 3) / AR.H, tv1 = (((idx >> 2) + 1) * AR.th - 3) / AR.H;
      out.push(a[0], y0, a[1], tu0, tv1, 1, b[0], y0, b[1], tu1, tv1, 1, b[0], y1, b[1], tu1, tv0, 1,
        a[0], y0, a[1], tu0, tv1, 1, b[0], y1, b[1], tu1, tv0, 1, a[0], y1, a[1], tu0, tv0, 1);
    }
    return new Float32Array(out);
  }
  function drawArt(gl, vp, lv, walking, wb, tb, opacity) {
    var i;
    if (AR.gl !== gl) { AR.gl = gl; AR.prog = program(gl, VSL, FSL, ['aPos', 'aUv'], ['uVP', 'uT', 'uAlpha']); AR.tex = gl.createTexture(); AR.vao = X.mkVao(gl); AR.up = false; for (i = 0; i < lots.length; i++) lots[i].artBuf = null; }
    if (!AR.prog) return;
    if (!AR.c) { try { paintArt(); } catch (e) { AR.prog = null; ALP.warn('mall3d: shop window pictures', e); return; } }
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, AR.tex);
    if (!AR.up) {
      AR.up = true;
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, AR.c);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    if (AR.vao) X.bindVao(gl, AR.vao);
    gl.useProgram(AR.prog); gl.uniform1i(AR.prog.uT, 0);
    for (i = 0; i < lots.length; i++) {
      var s = lots[i], L = lv[s.level];
      if (!s.dressed || !L || L.show < 0.5 || L.ghost > 0.5 || !X.levelOpen(s.level) || !(walking || X.cut(s.level))) continue;
      if (s.art === undefined) s.art = storeArt(s);
      if (!s.art) continue;
      if (!s.artBuf) { s.artBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, s.artBuf); gl.bufferData(gl.ARRAY_BUFFER, s.art, gl.STATIC_DRAW); }
      else gl.bindBuffer(gl.ARRAY_BUFFER, s.artBuf);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
      gl.disableVertexAttribArray(2);
      gl.uniformMatrix4fv(AR.prog.uVP, false, M4.mul(vp, walking ? wb : M4.mul(tb, M4.translate(0, L.lift, 0))));
      gl.uniform1f(AR.prog.uAlpha, opacity * L.show);
      gl.drawArrays(gl.TRIANGLES, 0, s.art.length / 6);
    }
  }

  /* ---------- per frame ---------- */
  var lastFocus = -2;
  E.addFrame(function (dt) {
    if (!S.mapOn) { if (S.lotId) S.lotId = ''; return; }
    var hv = hovLot(), i;
    for (i = 0; i < lots.length; i++) {
      var l = lots[i], want = l === hv ? 1 : (l.id === S.lotId ? 0.8 : 0);
      l.hov += (want - l.hov) * Math.min(1, dt * 10);
    }
    // a card and a highlighted amenity belong to the floor they were chosen on
    if (X.mode.focus !== lastFocus) {
      lastFocus = X.mode.focus;
      var cl = lotById(S.lotId);
      if (cl && X.mode.focus >= 0 && cl.level !== X.mode.focus) S.lotId = '';
      S.amenFilter = ''; E.dirty('mapguide'); E.dirty('lotcard');
    }
    if (people.length) stepPeople(Math.min(dt, 0.1));
  });
  function rebuild() { buildLots(); buildAmen(); buildPeople(); planterMeshes = {}; E.dirty('mapguide'); }
  ALP.bus.on('mall3d:setup', rebuild);
  ALP.bus.on('mall3d:gl', function () {
    var i, k;
    for (i = 0; i < lots.length; i++) { if (lots[i].mesh) lots[i].mesh.buf = null; if (lots[i].hm) lots[i].hm.buf = null; }
    for (k in lotMesh) if (lotMesh[k]) lotMesh[k].buf = null;
    for (k in planterMeshes) if (planterMeshes[k]) planterMeshes[k].buf = null;
    PPL.gl = null; LB.gl = null; AR.gl = null;
  });
  if (X.levels().length) rebuild();

  /* ---------- the Floor Guide: what is on this floor, and how much of it is free ---------- */
  var SC = { pad: 42 };
  function cur() { return lotById(S.lotId); }
  function focusLevel() { return X.walk.on ? X.walk.level : X.mode.focus; }
  function setFilter(k) { S.lotFilter = S.lotFilter === k ? '' : k; E.dirty('mapguide'); E.wake(); }
  function guideRows(li) { var c = amCounts(li), out = []; for (var i = 0; i < AMORDER.length; i++) if (c[AMORDER[i]] || li < 0) out.push([AMORDER[i], c[AMORDER[i]] || 0]); return out; }
  function note() { return lcfg().note || ''; }
  E.panel('mapguide', {
    order: 27, enterRise: 0.02, pinGroup: 'info',
    layout: { yaw: -38, y: 0.07, dist: 2.1, deg: 26, design: 29 },
    show: function (s) { return s.mapOn && !s.uiHidden && s.mapGuide && MAP.ready && !(s.lotId && cur()) ? 1 : 0; },
    measure: function () {
      var w = W.widthFor(this, 29), li = focusLevel(), iw = w - SC.pad * 2, rows = guideRows(li), h = SC.pad + 74 + px(T.size.heading) + 26;
      h += li < 0 ? X.levels().length * 86 + 8 : 132 + 78;
      h += 30 + 34 + Math.ceil(rows.length / 2) * 80;
      if (note()) h += 14 + W.paraHeight(W.mctx(), note(), iw, { size: T.size.micro, lh: Math.round(px(T.size.micro) * 1.7) });
      this.px = [w, h + SC.pad];
    },
    draw: function (ctx, ui) {
      var w = this.px[0], h = this.px[1], x = SC.pad, iw = w - SC.pad * 2, y = SC.pad, li = focusLevel(), lv = X.levels(), i, c, hov;
      W.glass(ctx, 2, 2, w - 4, h - 4, 30, { fill: C.shell, line: W.alpha(0.5), shadowBlur: 56, shadowY: 22 });
      W.roundBtn(ctx, ui, 'close', w - SC.pad - 32, y + 32, 32, 'close');
      W.eyebrow(ctx, 'Floor Guide', x, y + 24, { maxW: iw - 90 });
      W.text(ctx, li < 0 ? (cfg().title || 'The Mall') : lv[li].name, x, y + 74 + px(T.size.heading) * 0.2, { size: T.size.heading, family: T.font.brand, track: 0.05, color: C.white, maxW: iw - 90 });
      y += 74 + px(T.size.heading) + 26;
      if (li < 0) {
        // the whole building: one row per floor with what is free on it; press a row to open that floor
        for (i = lv.length - 1; i >= 0; i--) {
          c = counts(i); hov = ui.lift('floor:' + i, x, y, iw, 76);
          K.roundRect(ctx, x, y, iw, 76, 18); ctx.fillStyle = W.alpha(W.wa(0.04, 0.12, hov) + 0.08 * ui.press('floor:' + i)); ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = W.alpha(W.wa(0.07, 0.3, hov)); ctx.stroke();
          W.text(ctx, lv[i].name, x + 22, y + 38 + px(T.size.small) * 0.36, { size: T.size.small, weight: 500, color: C.text, maxW: iw * 0.42 });
          var txt = c.all ? c.available + ' available  ' + DOT + '  ' + c.all + ' lots' : 'No lots';
          ctx.beginPath(); ctx.arc(x + iw * 0.47, y + 38, 8, 0, Math.PI * 2); ctx.fillStyle = c.available ? css(stat('available').color) : W.alpha(0.18); ctx.fill();
          W.text(ctx, txt, x + iw * 0.47 + 20, y + 38 + px(T.size.micro) * 0.36, { size: T.size.micro, weight: 500, track: 0.08, upper: true, color: C.text2, maxW: iw * 0.44 });
          ALP.drawIcon(ctx, 'chevR', x + iw - 46, y + 24, 28, hov > 0.4 ? C.text : C.text3, 1.8);
          y += 86;
        }
        y += 8;
      } else {
        // one floor: how many lots of each status; press one to pick those out on the model
        c = counts(li);
        var tw = (iw - 32) / 3;
        for (i = 0; i < ORDER.length; i++) {
          var k = ORDER[i], st = stat(k), tx = x + i * (tw + 16), on = S.lotFilter === k;
          hov = ui.lift('st:' + k, tx, y, tw, 116);
          K.roundRect(ctx, tx, y, tw, 116, 18); ctx.fillStyle = on ? css(st.color, 0.2) : W.alpha(W.wa(0.04, 0.11, hov)); ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = on ? css(st.color, 0.95) : W.alpha(W.wa(0.07, 0.3, hov)); ctx.stroke();
          ctx.beginPath(); ctx.arc(tx + 26, y + 30, 9, 0, Math.PI * 2); ctx.fillStyle = css(st.color); ctx.fill();
          W.eyebrow(ctx, st.label, tx + 46, y + 30 + px(T.size.micro) * 0.36, { maxW: tw - 60, color: on ? C.text : C.text3 });
          W.text(ctx, String(c[k] || 0), tx + 20, y + 98, { size: T.size.value, weight: 500, color: C.text });
        }
        y += 132;
        W.pill(ctx, ui, 'colours', x, y, iw, 62, S.lotsOn ? 'Lot colours on' : 'Lot colours off', { kind: 'plain', icon: S.lotsOn ? 'eye' : 'eyeOff', size: T.size.micro, weight: 500, track: 0.14, radius: 18 });
        y += 78;
      }
      W.divider(ctx, x, y, iw); y += 30;
      W.eyebrow(ctx, li < 0 ? 'Symbols on each floor' : 'On this floor', x, y + 16); y += 34;
      var rows = guideRows(li), cw = (iw - 16) / 2;
      for (i = 0; i < rows.length; i++) {
        var t = rows[i][0], rx = x + (i % 2) * (cw + 16), ry = y + Math.floor(i / 2) * 80, act = S.amenFilter === t, id = li < 0 ? null : 'am:' + t;
        hov = id ? ui.lift(id, rx, ry, cw, 70) : 0;
        K.roundRect(ctx, rx, ry, cw, 70, 18); ctx.fillStyle = act ? 'rgba(52,211,153,.16)' : W.alpha(W.wa(0.03, 0.1, hov)); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = act ? C.accent : W.alpha(W.wa(0.06, 0.28, hov)); ctx.stroke();
        K.roundRect(ctx, rx + 12, ry + 11, 48, 48, 14); ctx.fillStyle = act ? C.accent : 'rgba(0,0,0,.55)'; ctx.fill();
        if (!act) { ctx.lineWidth = 1.5; ctx.strokeStyle = W.alpha(0.3); ctx.stroke(); }
        ALP.drawIcon(ctx, AMICON[t], rx + 20, ry + 19, 32, act ? C.onAccent : '#FFFFFF', 1.9);
        W.text(ctx, amLabel(t), rx + 74, ry + 35 + px(T.size.micro) * 0.36, { size: T.size.micro, weight: 500, track: 0.06, color: C.text, maxW: cw - 74 - (rows[i][1] > 1 ? 58 : 14) });
        if (rows[i][1] > 1) W.text(ctx, String.fromCharCode(215) + rows[i][1], rx + cw - 18, ry + 35 + px(T.size.micro) * 0.36, { size: T.size.micro, weight: 500, color: C.text3, align: 'right' });
      }
      y += Math.ceil(rows.length / 2) * 80;
      if (note()) W.para(ctx, note(), x, y + 14 + px(T.size.micro), iw, { size: T.size.micro, weight: 400, color: C.text3, lh: Math.round(px(T.size.micro) * 1.7) });
    },
    onPress: function (id) {
      if (id === 'close') { S.mapGuide = false; E.dirty('mall3d'); return; }
      if (id === 'colours') { S.lotsOn = !S.lotsOn; E.dirty('mapguide'); E.wake(); return; }
      if (id.indexOf('floor:') === 0) { X.setFocus(parseInt(id.slice(6), 10)); return; }
      if (id.indexOf('st:') === 0) { setFilter(id.slice(3)); return; }
      if (id.indexOf('am:') === 0) { var t = id.slice(3); S.amenFilter = S.amenFilter === t ? '' : t; E.dirty('mapguide'); E.wake(); }
    }
  });
  X.HK.hint.push(function (hov) {
    if (hov.pin || hov.level >= 0 || hov.extra) return '';
    if (S.amenFilter) return amLabel(S.amenFilter) + (amAbout(S.amenFilter) ? '  ' + DOT + '  ' + amAbout(S.amenFilter) : '') + '. Shown in mint on the model.';
    if (S.lotFilter) return 'Showing the lots that are ' + stat(S.lotFilter).label.toLowerCase() + '. Press it again in the Floor Guide to show all.';
    return '';
  });

  /* ---------- the lot card ---------- */
  function facts(l) {
    var lv = X.levels()[l.level], u = l.d.unit ? A.unit(l.d.unit) : null, st = stat(l.status);
    // a real unit shows the figures from the units list; any other lot shows what its outline on the model measures
    var out = [['ruler', u && u.areaSqm ? 'Floor Area' : 'Approx. Area', lotSqm(l) + ' sqm']];
    if (u && u.conditionLabel) out.push(['doorOpen', 'Condition', u.conditionLabel]);
    else out.push(['maximize', 'Frontage', (l.d.frontage || Math.round(l.wd * 10) / 10) + ' m']);
    out.push(['layers', 'Level', lv ? lv.name : '']);
    if (u && u.monthlyRentPhp) out.push(['chart', 'Monthly Rent', peso(u.monthlyRentPhp)]);
    else out.push(['doorOpen', 'Status', st.label]);
    return out;
  }
  function blurb(l) {
    if (l.d.blurb) return l.d.blurb;
    var side = { north: 'north', south: 'south', east: 'east', west: 'west' }[l.front] || '';
    return (l.d.corner ? 'A corner lot' : 'An inline lot') + (l.d.frontage ? ' with about ' + Math.round(l.d.frontage) + ' m of frontage' : '') + (side ? ' on its ' + side + ' side.' : '.');
  }
  function cardNote(l) { return l.d.sample ? (lcfg().sampleNote || '') : (l.d.unit ? '' : note()); }
  E.panel('lotcard', {
    order: 28, enterRise: 0.02, pinGroup: 'info',
    layout: { yaw: -38, y: 0.07, dist: 2.1, deg: 26, design: 29 },
    show: function (s) { return s.mapOn && !s.uiHidden && s.lotId && cur() ? 1 : 0; },
    measure: function () {
      var w = W.widthFor(this, 29), l = cur(), iw = w - SC.pad * 2, lh = Math.round(px(T.size.small) * 1.72);
      if (!l) { this.px = [w, 200]; return; }
      var hgt = SC.pad + 74 + px(T.size.heading) + 22 + 56 + 30 + 2 + 30 + 2 * 128 - 16 + 30;
      hgt += W.paraHeight(W.mctx(), blurb(l), iw, { size: T.size.small, lh: lh }) + 16;
      if (cardNote(l)) hgt += W.paraHeight(W.mctx(), cardNote(l), iw, { size: T.size.micro, lh: Math.round(px(T.size.micro) * 1.7) }) + 18;
      this.px = [w, hgt + 14 + 88 + SC.pad];
    },
    draw: function (ctx, ui) {
      var w = this.px[0], h = this.px[1], l = cur(), x = SC.pad, iw = w - SC.pad * 2, y = SC.pad, i;
      if (!l) return;
      var st = stat(l.status), named = !!(l.d.tenant || l.d.name);
      W.glass(ctx, 2, 2, w - 4, h - 4, 30, { fill: C.shell, line: W.alpha(0.5), shadowBlur: 56, shadowY: 22 });
      W.roundBtn(ctx, ui, 'close', w - SC.pad - 32, y + 32, 32, 'close');
      W.eyebrow(ctx, (named ? word() + ' ' + l.id + '  ' + DOT + '  ' : '') + (l.d.category ? l.d.category + '  ' + DOT + '  ' : '') + X.levels()[l.level].name, x, y + 24, { maxW: iw - 90 });
      W.text(ctx, lotName(l), x, y + 74 + px(T.size.heading) * 0.2, { size: T.size.heading, family: T.font.brand, track: 0.05, color: C.white, maxW: iw - 90 });
      y += 74 + px(T.size.heading) + 22;
      // status, in its colour
      var label = st.label, cw = Math.round(W.measure(ctx, label, { size: T.size.micro, weight: 600, track: 0.16, upper: true }) + 56);
      K.roundRect(ctx, x, y, cw, 52, 26); ctx.fillStyle = css(st.color); ctx.fill();
      W.text(ctx, label, x + cw / 2, y + 26 + px(T.size.micro) * 0.36, { size: T.size.micro, weight: 700, track: 0.16, upper: true, align: 'center', color: '#10110F' });
      if (l.d.sample) {
        var sl = 'Sample tenant', sw = Math.round(W.measure(ctx, sl, { size: T.size.micro, weight: 600, track: 0.16, upper: true }) + 56);
        K.roundRect(ctx, x + cw + 12, y, sw, 52, 26); ctx.fillStyle = W.alpha(0.05); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = W.alpha(0.22); ctx.stroke();
        W.text(ctx, sl, x + cw + 12 + sw / 2, y + 26 + px(T.size.micro) * 0.36, { size: T.size.micro, weight: 600, track: 0.16, upper: true, align: 'center', color: C.text2 });
      }
      y += 56 + 30;
      W.divider(ctx, x, y, iw); y += 2 + 30;
      var f = facts(l), cwd = (iw - 16) / 2, ch = 112;
      for (i = 0; i < f.length; i++) W.statCard(ctx, x + (i % 2) * (cwd + 16), y + Math.floor(i / 2) * (ch + 16), cwd, ch, f[i][0], f[i][1], f[i][2]);
      y += 2 * 128 - 16 + 30;
      var lh = Math.round(px(T.size.small) * 1.72);
      y += W.para(ctx, blurb(l), x, y + px(T.size.small), iw, { size: T.size.small, weight: 300, color: W.alpha(0.85), lh: lh }) + 16;
      if (cardNote(l)) y += W.para(ctx, cardNote(l), x, y + px(T.size.micro), iw, { size: T.size.micro, weight: 400, color: C.text3, lh: Math.round(px(T.size.micro) * 1.7) }) + 18;
      y += 14;
      var bw = (iw - 16) / 2, enq = l.status !== 'sold';
      if (l.d.place) W.pill(ctx, ui, 'view', x, y, bw, 88, 'View 360', { kind: 'accent', icon: 'view360', size: T.size.small, weight: 600, track: 0.14, radius: 22 });
      else W.pill(ctx, ui, 'enquire', x, y, bw, 88, 'Enquire', { kind: enq ? 'accent' : 'plain', icon: 'mail', size: T.size.small, weight: enq ? 600 : 500, track: 0.14, radius: 22 });
      if (l.d.place) W.pill(ctx, ui, 'enquire', x + bw + 16, y, bw, 88, 'Enquire', { kind: 'plain', icon: 'mail', size: T.size.small, weight: 500, track: 0.14, radius: 22 });
      else W.pill(ctx, ui, 'guide', x + bw + 16, y, bw, 88, 'Floor Guide', { kind: 'plain', icon: 'map', size: T.size.small, weight: 500, track: 0.14, radius: 22 });
    },
    onPress: function (id) {
      var l = cur(); if (!l) return;
      if (id === 'close') { openLot(null); return; }
      if (id === 'guide') { S.mapGuide = true; openLot(null); return; }
      if (id === 'view') { var pl = l.d.place; openLot(null); A.go(pl); return; }
      if (id === 'enquire') { openLot(null); A.openOnly('contact'); }
    }
  });
  ALP.bus.on('change', function (d) { if (d && d.map === false) { S.lotId = ''; S.lotFilter = ''; S.amenFilter = ''; } });
  LIFE.open = function (id) { openLot(lotById(id)); };
  LIFE.at = at;
  LIFE.counts = counts;
  LIFE.amPoint = function (i) { var am = amen[i], L = X.levels()[am.level]; return [am.x, amTop(am, L, X.pinK()) + 0.016 / Math.max(1e-6, X.modelScale()), am.z]; };

  ALP.log('mall3d life ready: ' + lots.length + ' lots, ' + amen.length + ' amenities, ' + people.length + ' people');
  return true;
  };
  if (window.ALP && window.ALP.define) window.ALP.define('mall3d-life', ['core', 'data', 'vr-engine', 'vr-screens-a', 'mall3d'], run, 'parklinks');
  else (window.__ALPQ = window.__ALPQ || []).push(['mall3d-life', ['core', 'data', 'vr-engine', 'vr-screens-a', 'mall3d'], run, 'parklinks']);
})();
