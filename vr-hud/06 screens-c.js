(function () {
  var run = function (ALP) {
  'use strict';
  var S = ALP.state, K = ALP.canvas, T = ALP.tokens, C = T.color, px = ALP.px, E = ALP.vr, W = ALP.ui, A = ALP.actions, U = ALP.util;
  function P() { return ALP.project() || {}; }

  /* ---------- media gallery ---------- */
  var GA = { pad: 52, gap: 18, cell: 196 };
  function cells(n) {
    var grid = [], out = [], r, c, i;
    for (r = 0; r < 12; r++) { grid[r] = []; for (c = 0; c < 4; c++) grid[r][c] = 0; }
    grid[0][0] = grid[0][1] = grid[1][0] = grid[1][1] = 1;
    out.push({ c: 0, r: 0, cw: 2, rh: 2 });
    r = 0; c = 0;
    for (i = 1; i < n; i++) {
      while (grid[r][c]) { c++; if (c > 3) { c = 0; r++; } }
      grid[r][c] = 1;
      out.push({ c: c, r: r, cw: 1, rh: 1 });
    }
    return out;
  }
  E.panel('gallery', {
    order: 66, modal: true, dim: 0.78,
    layout: { yaw: 0, y: 0, dist: 2.1, deg: 64 },
    show: function (s) { return s.galleryOn && s.galleryIndex < 0 ? 1 : 0; },
    measure: function () {
      var w = W.widthFor(this, 64), list = P().gallery || [], pos = cells(list.length), rows = 1, i;
      for (i = 0; i < pos.length; i++) rows = Math.max(rows, pos[i].r + pos[i].rh);
      this.px = [w, GA.pad * 2 + 150 + rows * GA.cell + (rows - 1) * GA.gap];
    },
    draw: function (ctx, ui) {
      var w = this.px[0], h = this.px[1], list = P().gallery || [], pos = cells(list.length), i;
      W.glass(ctx, 2, 2, w - 4, h - 4, 28, { fill: 'rgba(12,12,12,.94)', line: W.alpha(0.1), shadowBlur: 70, shadowY: 28 });
      W.wordmark(ctx, 'MEDIA GALLERY', w / 2, GA.pad + px(T.size.heading) * 0.8, T.size.heading, 0.22);
      W.text(ctx, 'A CLOSER LOOK AT PARKLINKS', w / 2, GA.pad + px(T.size.heading) * 0.8 + px(T.size.micro) + 22, {
        size: T.size.micro, track: 0.3, upper: true, align: 'center', color: W.alpha(0.45)
      });
      W.roundBtn(ctx, ui, 'close', w - GA.pad - 8, GA.pad + 8, 32, 'close');
      var x0 = GA.pad, y0 = GA.pad + 150, cw = (w - GA.pad * 2 - 3 * GA.gap) / 4;
      for (i = 0; i < list.length; i++) {
        var p = pos[i], it = list[i];
        var tx = x0 + p.c * (cw + GA.gap), ty = y0 + p.r * (GA.cell + GA.gap);
        var tw = p.cw * cw + (p.cw - 1) * GA.gap, th = p.rh * GA.cell + (p.rh - 1) * GA.gap;
        var hov = ui.lift('g:' + i, tx, ty, tw, th), prs = ui.press('g:' + i), ent = ui.stagger(i, 0.04);
        ctx.save(); ctx.globalAlpha = ent;
        var lift = hov * 6 - prs * 3;
        ctx.save();
        K.roundRect(ctx, tx, ty - lift, tw, th, 22); ctx.clip();
        ctx.fillStyle = '#141414'; ctx.fillRect(tx, ty - lift, tw, th);
        ctx.globalAlpha = ent * W.wa(0.85, 1, hov);
        K.image(ctx, it.img, tx, ty - lift, tw, th, 'cover', 1 + hov * 0.08);
        ctx.globalAlpha = ent;
        var g = ctx.createLinearGradient(0, ty - lift + th, 0, ty - lift + th - 110);
        g.addColorStop(0, 'rgba(0,0,0,.88)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(tx, ty - lift + th - 110, tw, 110);
        W.text(ctx, it.caption, tx + 22, ty - lift + th - 22, {
          size: p.cw > 1 ? T.size.small : T.size.micro, weight: 500, track: 0.08, upper: true, maxW: tw - 44, color: C.white
        });
        if (hov > 0.02) {
          ctx.globalAlpha = ent * hov;
          ctx.beginPath(); ctx.arc(tx + tw / 2, ty - lift + th / 2 - 30, 34, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = W.alpha(0.5); ctx.stroke();
          ALP.drawIcon(ctx, 'zoom', tx + tw / 2 - 17, ty - lift + th / 2 - 47, 34, C.white, 1.9);
        }
        ctx.restore();
        K.roundRect(ctx, tx, ty - lift, tw, th, 22);
        ctx.lineWidth = 2; ctx.strokeStyle = W.alpha(W.wa(0.1, 0.45, hov)); ctx.stroke();
        ctx.restore();
      }
    },
    onPress: function (id) {
      if (id === 'close' || id === '__outside') { A.openOnly(null); return; }
      if (id.indexOf('g:') === 0) { S.galleryIndex = parseInt(id.slice(2), 10); ALP.bus.emit('change', { galleryIndex: S.galleryIndex }); }
    }
  });

  E.panel('lightbox', {
    order: 72, modal: true, dim: 0.92, px: [1920, 1180],
    layout: { yaw: 0, y: 0.01, dist: 2.1, deg: 70 },
    show: function (s) { return s.galleryOn && s.galleryIndex >= 0 ? 1 : 0; },
    draw: function (ctx, ui) {
      var w = 1920, h = 1180, list = P().gallery || [], n = list.length || 1;
      var i = U.clamp(S.galleryIndex, 0, n - 1), it = list[i] || {};
      var pop = ui.anim('pop:' + i, 1, 7);
      ctx.save();
      K.roundRect(ctx, 130, 30, w - 260, h - 200, 18); ctx.clip();
      ctx.globalAlpha = 0.4 + 0.6 * pop;
      K.image(ctx, it.img, 130, 30, w - 260, h - 200, 'contain', 0.96 + 0.04 * pop);
      ctx.restore();
      W.text(ctx, it.caption || '', w / 2, h - 108, { size: T.size.small, track: 0.18, upper: true, align: 'center', color: C.text });
      W.text(ctx, (i + 1) + ' / ' + n, w / 2, h - 56, { size: T.size.micro, align: 'center', color: C.text3 });
      W.roundBtn(ctx, ui, 'prev', 66, (h - 170) / 2, 44, 'chevL');
      W.roundBtn(ctx, ui, 'next', w - 66, (h - 170) / 2, 44, 'chevR');
      W.roundBtn(ctx, ui, 'close', w - 66, 66, 38, 'close');
    },
    onPress: function (id) {
      var n = (P().gallery || []).length || 1;
      if (id === 'close' || id === '__outside') { S.galleryIndex = -1; ALP.bus.emit('change', { galleryIndex: -1 }); return; }
      if (id === 'prev') S.galleryIndex = (S.galleryIndex - 1 + n) % n;
      else if (id === 'next') S.galleryIndex = (S.galleryIndex + 1) % n;
      ALP.anim.set('lightbox/pop:' + S.galleryIndex, 0);
      ALP.bus.emit('change', { galleryIndex: S.galleryIndex });
    },
    onStickX: function (dx) { this.onPress(dx > 0 ? 'next' : 'prev'); }
  });

  /* ---------- about ---------- */
  var AB = { pad: 54 };
  E.panel('about', {
    order: 66, modal: true, dim: 0.7,
    layout: { yaw: 0, y: 0, dist: 2.0, deg: 38 },
    show: function (s) { return s.aboutOn ? 1 : 0; },
    measure: function () {
      var w = W.widthFor(this, 38), a = P().about || {};
      var iw = w - AB.pad * 2;
      var t1 = W.paraHeight(W.mctx(), a.body || '', iw, { size: T.size.small });
      var t2 = W.paraHeight(W.mctx(), a.body2 || '', iw, { size: T.size.small });
      this.px = [w, 420 + px(T.size.heading) + 22 + px(T.size.micro) + 28 + 2 + 30 + t1 + 26 + t2 + 44 + 2 + 90];
    },
    draw: function (ctx, ui) {
      var w = this.px[0], h = this.px[1], a = P().about || {}, cx = w / 2, iw = w - AB.pad * 2, i;
      W.glass(ctx, 2, 2, w - 4, h - 4, 26, { fill: 'rgba(12,12,12,.92)', line: W.alpha(0.1), shadowBlur: 70, shadowY: 28 });
      ctx.save();
      K.roundRect(ctx, 2, 2, w - 4, h - 4, 26); ctx.clip();
      K.image(ctx, a.hero, 0, 0, w, 420, 'cover');
      var g = ctx.createLinearGradient(0, 130, 0, 420);
      g.addColorStop(0, 'rgba(12,12,12,0)'); g.addColorStop(1, 'rgba(12,12,12,.95)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, 420);
      ctx.restore();
      W.roundBtn(ctx, ui, 'close', w - 56, 56, 32, 'close');
      var y = 420 + px(T.size.heading) * 0.2;
      W.wordmark(ctx, a.title || 'PARKLINKS', cx, y, T.size.heading, 0.25);
      y += 22 + px(T.size.micro);
      W.text(ctx, a.tagline || '', cx, y, { size: T.size.micro, track: 0.3, upper: true, align: 'center', color: W.alpha(0.45) });
      y += 28;
      W.rule(ctx, cx, y, 80);
      y += 2 + 30 + px(T.size.small);
      y += W.para(ctx, a.body || '', AB.pad, y, iw, { size: T.size.small, weight: 300, color: W.alpha(0.8), lh: Math.round(px(T.size.small) * 1.75) });
      y += 26;
      y += W.para(ctx, a.body2 || '', AB.pad, y, iw, { size: T.size.small, weight: 300, color: W.alpha(0.8), lh: Math.round(px(T.size.small) * 1.75) });
      y += 44;
      W.divider(ctx, AB.pad, y, iw, 0.08);
      var logos = (P().landing || {}).logos || [], lw = 130, gap = 62, total = logos.length * lw + (logos.length - 1) * gap, lx = cx - total / 2;
      for (i = 0; i < logos.length; i++) { W.logo(ctx, logos[i], lx, y + 22, lw, 42, 0.85); lx += lw + gap; }
    },
    onPress: function (id) { if (id === 'close' || id === '__outside') A.openOnly(null); }
  });

  /* ---------- contact leasing ---------- */
  E.panel('contact', {
    order: 66, modal: true, dim: 0.7,
    layout: { yaw: 0, y: 0.02, dist: 2.0, deg: 28 },
    show: function (s) { return s.contactOn ? 1 : 0; },
    measure: function () {
      var c = P().contact || { rows: [] };
      this.px = [W.widthFor(this, 28), 56 * 2 + px(T.size.heading) + 22 + px(T.size.micro) + 30 + 2 + 36 + c.rows.length * 96 + 20];
    },
    draw: function (ctx, ui) {
      var w = this.px[0], h = this.px[1], c = P().contact || { rows: [] }, cx = w / 2, i;
      W.glass(ctx, 2, 2, w - 4, h - 4, 26, { fill: 'rgba(12,12,12,.92)', line: W.alpha(0.1), shadowBlur: 66, shadowY: 26 });
      W.roundBtn(ctx, ui, 'close', w - 52, 52, 30, 'close');
      var y = 56 + px(T.size.heading) * 0.8;
      W.wordmark(ctx, c.title || '', cx, y, T.size.heading, 0.25);
      y += 22 + px(T.size.micro);
      W.text(ctx, c.tagline || '', cx, y, { size: T.size.micro, track: 0.3, upper: true, align: 'center', color: W.alpha(0.45) });
      y += 30;
      W.rule(ctx, cx, y, 80);
      y += 2 + 36;
      for (i = 0; i < c.rows.length; i++) {
        var r = c.rows[i];
        ALP.drawIcon(ctx, r[0], 56, y + 20, px(T.size.small), C.text3, 1.8);
        W.eyebrow(ctx, r[1], 56 + px(T.size.small) + 18, y + 20 + px(T.size.micro) * 0.8);
        W.text(ctx, r[2], 56 + px(T.size.small) + 18, y + 20 + px(T.size.micro) + px(T.size.small) + 22, { size: T.size.small, weight: 400, color: W.cream(0.85), maxW: w - 140 });
        y += 96;
      }
    },
    onPress: function (id) { if (id === 'close' || id === '__outside') A.openOnly(null); }
  });

  /* ---------- mall unit info ---------- */
  var MI = { pad: 56 };
  function info() { return U.extend({}, P().unitInfo || {}, S.unitInfoData || {}); }
  E.panel('unitinfo', {
    order: 68, modal: true, dim: 0.62,
    layout: { yaw: 0, y: 0.01, dist: 2.0, deg: 32 },
    show: function (s) { return s.unitInfoOn ? 1 : 0; },
    measure: function () {
      var w = W.widthFor(this, 32), d = info(), iw = w - MI.pad * 2;
      var dh = W.paraHeight(W.mctx(), d.description || '', iw, { size: T.size.small });
      var chipRows = d.concepts && d.concepts.length ? Math.ceil(d.concepts.length / 2) : 0;
      var specRows = d.specs && d.specs.length ? Math.ceil(d.specs.length / 2) : 0;
      this.px = [w, MI.pad * 2 + px(T.size.micro) + 20 + px(T.size.title) + 14 + px(T.size.small) + 30 + dh + 32
        + (chipRows ? 34 + chipRows * 66 + 26 : 0)
        + (specRows ? specRows * 104 + 30 : 0) + 100];
    },
    draw: function (ctx, ui) {
      var w = this.px[0], h = this.px[1], d = info(), iw = w - MI.pad * 2, i;
      W.glass(ctx, 2, 2, w - 4, h - 4, 26, { fill: 'rgba(12,12,13,.9)', line: W.alpha(0.14), shadowBlur: 66, shadowY: 24 });
      W.roundBtn(ctx, ui, 'close', w - 52, 52, 30, 'close', { rotate: Math.PI / 2 });
      var x = MI.pad, y = MI.pad + px(T.size.micro);
      W.text(ctx, d.eyebrow || '', x, y, { size: T.size.micro, weight: 600, track: 0.14, upper: true, color: W.cream(0.55) });
      y += 20 + px(T.size.title) * 0.82;
      W.text(ctx, d.title || '', x, y, { size: T.size.title, weight: 600, family: T.font.brand, track: 0.04, upper: true, color: C.white, maxW: iw - 70 });
      y += 14 + px(T.size.small);
      W.text(ctx, d.subtitle || '', x, y, { size: T.size.small, weight: 500, color: W.cream(0.6), maxW: iw });
      y += 30 + px(T.size.small);
      y += W.para(ctx, d.description || '', x, y, iw, { size: T.size.small, weight: 400, color: W.cream(0.85), lh: Math.round(px(T.size.small) * 1.65) }) - px(T.size.small);
      y += 32;

      if (d.concepts && d.concepts.length) {
        W.text(ctx, 'Concept Possibilities', x, y, { size: T.size.micro, weight: 600, track: 0.08, upper: true, color: W.cream(0.5) });
        y += 34;
        var chw = (iw - 14) / 2;
        for (i = 0; i < d.concepts.length; i++) {
          var cx2 = x + (i % 2) * (chw + 14), cy2 = y + Math.floor(i / 2) * 66;
          K.roundRect(ctx, cx2, cy2, chw, 56, 28); ctx.fillStyle = W.alpha(0.06); ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = W.alpha(0.14); ctx.stroke();
          W.text(ctx, d.concepts[i], cx2 + chw / 2, cy2 + 28 + px(T.size.small) * 0.36, { size: T.size.small, weight: 500, align: 'center', color: C.cream, maxW: chw - 28 });
        }
        y += Math.ceil(d.concepts.length / 2) * 66 + 26;
      }

      if (d.specs && d.specs.length) {
        var rows = Math.ceil(d.specs.length / 2), gh = rows * 104;
        K.roundRect(ctx, x, y, iw, gh, 18); ctx.fillStyle = W.alpha(0.1); ctx.fill();
        ctx.save(); K.roundRect(ctx, x, y, iw, gh, 18); ctx.clip();
        var scw = (iw - 2) / 2;
        for (i = 0; i < d.specs.length; i++) {
          var sx = x + (i % 2) * (scw + 2), sy = y + Math.floor(i / 2) * 104 + (Math.floor(i / 2) ? 2 : 0);
          var shh = 104 - (Math.floor(i / 2) ? 2 : 0);
          ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(sx, sy, scw, shh);
          W.text(ctx, d.specs[i][0], sx + 24, sy + 40, { size: T.size.micro, track: 0.05, upper: true, color: W.cream(0.5), maxW: scw - 48 });
          W.text(ctx, d.specs[i][1], sx + 24, sy + 40 + px(T.size.small) + 16, { size: T.size.small, weight: 600, color: C.white, maxW: scw - 48 });
        }
        ctx.restore();
        ctx.lineWidth = 2; K.roundRect(ctx, x, y, iw, gh, 18); ctx.strokeStyle = W.alpha(0.1); ctx.stroke();
        y += gh + 30;
      }
      W.pill(ctx, ui, 'cta', x, y, iw, 90, d.ctaLabel || 'Inquire', { kind: 'invert', size: T.size.small, weight: 600, track: 0.03, radius: 18 });
    },
    onPress: function (id) {
      if (id === 'cta') { A.openOnly('contact'); return; }
      if (id === 'close' || id === '__outside') A.openOnly(null);
    }
  });

  /* ---------- platform bits ---------- */
  var HELP_ROWS = [
    ['Trigger', 'Point at a card or button and pull'],
    ['Journey reel', 'Walks the tour in order, estate to units'],
    ['Thumbstick left / right', 'Next or previous place'],
    ['Furnished / Unfurnished', 'Appears where both exist; keeps your view'],
    ['Details', 'The card on your right explains where you are'],
    ['3D Mall Map', 'Every floor on a table; pick a floor, then point at a lot or a pin'],
    ['Floor Guide', 'Beside the map: lots free on each floor and where the amenities are'],
    ['Move a panel', 'Grip it, or pull the trigger on the bar under it; Reset has Restore original layout'],
    ['Recenter', 'Click the thumbstick to bring every panel in front of you'],
    ['Pinch the map', 'Both triggers on the model; hands apart to resize, turn to rotate'],
    ['Hide Interface', 'Last button in the side menu; Show interface, B or Y brings it back'],
    ['Look around', 'The interface fades back until you point at it']
  ];
  function helpStep() { return px(T.size.body) + px(T.size.small) + 44; }
  E.panel('help', {
    order: 74, modal: true, dim: 0.72,
    layout: { yaw: 0, y: 0.02, dist: 2.0, deg: 50 },
    show: function (s) { return s.overlay === 'help' ? 1 : 0; },
    layoutCols: 2,
    measure: function () { this.px = [W.widthFor(this, 50), 152 + Math.ceil(HELP_ROWS.length / 2) * helpStep() + 170 + (W.offlineHeight ? W.offlineHeight(76) : 0)]; },
    draw: function (ctx, ui) {
      var w = this.px[0], h = this.px[1], x = 52, y = 52, i;
      W.glass(ctx, 2, 2, w - 4, h - 4, 26, { fill: C.panelSolid, line: W.alpha(0.12) });
      ALP.drawIcon(ctx, 'help', x, y, 40, C.accentLine, 1.8);
      W.text(ctx, 'How to explore', x + 58, y + 32, { size: T.size.heading, family: T.font.brand, track: 0.04 });
      W.roundBtn(ctx, ui, 'close', w - 52, y + 18, 30, 'close');
      y += 100;
      var rows = HELP_ROWS, st = helpStep(), half = Math.ceil(rows.length / 2), colW = (w - 104 - 48) / 2;
      for (i = 0; i < rows.length; i++) {
        var cx2 = i < half ? x : x + colW + 48, cy2 = y + (i % half) * st;
        W.text(ctx, rows[i][0], cx2, cy2 + px(T.size.body), { size: T.size.body, weight: 600, maxW: colW });
        W.text(ctx, rows[i][1], cx2, cy2 + px(T.size.body) + px(T.size.small) + 16, { size: T.size.small, weight: 300, color: C.text2, maxW: colW });
      }
      var offH = W.offlineHeight ? W.offlineHeight(76) : 0;
      if (offH) W.offline(ctx, ui, 'offline', w / 2 - 300, h - 52 - 88 - offH, 600, 76);
      W.pill(ctx, ui, 'guide', w / 2 - 300, h - 52 - 88, 280, 88, 'Show me around', { kind: 'plain', size: T.size.small, weight: 500, track: 0.1 });
      W.pill(ctx, ui, 'ok', w / 2 + 20, h - 52 - 88, 280, 88, 'Got it', { kind: 'invert', size: T.size.small, weight: 600, track: 0.1 });
    },
    onPress: function (id) {
      if (id === 'offline') { if (A.offlinePress) A.offlinePress(); return; }
      ALP.closeOverlay(); if (id === 'guide' && A.startOnboarding) A.startOnboarding(true);
    }
  });

  E.panel('reset', {
    order: 74, modal: true, dim: 0.72,
    layout: { yaw: 0, y: 0.02, dist: 2.0, deg: 28 },
    show: function (s) { return s.overlay === 'reset' ? 1 : 0; },
    measure: function () { this.px = [W.widthFor(this, 28), 540]; },
    draw: function (ctx, ui) {
      var w = this.px[0], h = this.px[1] - 120;
      W.glass(ctx, 2, 2, w - 4, this.px[1] - 4, 24, { fill: C.panelSolid, line: W.alpha(0.12) });
      ALP.drawIcon(ctx, 'reset', w / 2 - 28, 46, 56, C.accentLine, 1.8);
      W.text(ctx, 'Reset session?', w / 2, 166, { size: T.size.heading, family: T.font.brand, track: 0.04, align: 'center' });
      W.text(ctx, 'Returns to the Parklinks welcome screen.', w / 2, 220, { size: T.size.small, weight: 300, color: C.text2, align: 'center', maxW: w - 90 });
      W.pill(ctx, ui, 'cancel', 44, h - 44 - 92, (w - 108) / 2, 92, 'Cancel', { kind: 'plain', size: T.size.small, weight: 500, track: 0.1, radius: 20 });
      W.pill(ctx, ui, 'reset', 64 + (w - 108) / 2, h - 44 - 92, (w - 108) / 2, 92, 'Reset', { kind: 'invert', size: T.size.small, weight: 600, track: 0.1, radius: 20 });
      W.divider(ctx, 44, h + 6, w - 88, 0.08);
      W.pill(ctx, ui, 'layout', 44, h + 28, w - 88, 76, 'Restore original layout', { kind: 'plain', icon: 'layout', size: T.size.micro, weight: 500, track: 0.12, radius: 20 });
    },
    onPress: function (id) {
      if (id === 'layout') { ALP.closeOverlay(); if (A.resetLayout) A.resetLayout(); return; }
      if (id === 'reset') { ALP.closeOverlay(); ALP.reset(); }
      else ALP.closeOverlay();
    }
  });

  ALP.error = function (message, retry) { ALP.openOverlay('error', { message: message, retry: retry }); };
  E.panel('error', {
    order: 76, modal: true, dim: 0.72,
    layout: { yaw: 0, y: 0.02, dist: 2.0, deg: 28 },
    show: function (s) { return s.overlay === 'error' ? 1 : 0; },
    measure: function () { this.px = [W.widthFor(this, 28), 400]; },
    draw: function (ctx, ui) {
      var w = this.px[0], h = this.px[1];
      W.glass(ctx, 2, 2, w - 4, h - 4, 24, { fill: C.panelSolid, line: 'rgba(255,107,107,.45)' });
      ALP.drawIcon(ctx, 'alert', w / 2 - 28, 46, 56, C.danger, 1.8);
      W.text(ctx, 'Something went wrong', w / 2, 166, { size: T.size.heading, family: T.font.brand, track: 0.04, align: 'center' });
      W.text(ctx, (S.overlayParams || {}).message || 'Please try again.', w / 2, 218, { size: T.size.small, weight: 300, color: C.text2, align: 'center', maxW: w - 90 });
      W.pill(ctx, ui, 'close', w / 2 - 130, h - 44 - 90, 260, 90, 'Close', { kind: 'invert', size: T.size.small, weight: 600, track: 0.1, radius: 20 });
    },
    onPress: function () { ALP.closeOverlay(); }
  });

  E.panel('transition', {
    order: 82, interactive: false, dim: 0.5, fadeSpeed: 6, spin: true,
    layout: { yaw: 0, y: 0.02, dist: 2.0, deg: 26 },
    show: function (s) { return s.transition ? 1 : 0; },
    measure: function () { this.px = [W.widthFor(this, 26), 250]; },
    draw: function (ctx) {
      var w = this.px[0], h = this.px[1], d;
      W.glass(ctx, 2, 2, w - 4, h - 4, 26, { fill: 'rgba(10,10,10,.92)', line: W.alpha(0.1) });
      ctx.save();
      ctx.beginPath(); ctx.arc(w / 2, 88, 32, 0, Math.PI * 2); ctx.lineWidth = 5; ctx.strokeStyle = W.alpha(0.12); ctx.stroke();
      var a0 = ALP.anim.now() * 3.4;
      ctx.beginPath(); ctx.arc(w / 2, 88, 32, a0, a0 + 1.9); ctx.strokeStyle = C.accent; ctx.lineCap = 'round'; ctx.stroke();
      ctx.restore();
      W.text(ctx, S.transition ? S.transition.text : '', w / 2, 190, { size: T.size.small, weight: 500, track: 0.12, upper: true, align: 'center', maxW: w - 60 });
      for (d = 0; d < 3; d++) {
        var pv = 0.3 + 0.7 * Math.max(0, Math.sin(ALP.anim.now() * 4 - d * 0.5));
        ctx.beginPath(); ctx.arc(w / 2 - 22 + d * 22, 222, 5, 0, Math.PI * 2);
        ctx.fillStyle = W.alpha(0.25 + 0.55 * pv); ctx.fill();
      }
    }
  });

  E.panel('toast', {
    order: 92, interactive: false, fadeSpeed: 6,
    layout: { yaw: 0, y: -0.40, dist: 1.9, deg: 30 },
    show: function (s) { return s.toast ? 1 : 0; },
    measure: function () { this.px = [W.widthFor(this, 30), 110]; },
    draw: function (ctx, ui) {
      var w = this.px[0], h = this.px[1], e = ALP.anim.ease(ui.enter() / 0.3);
      ctx.save(); ctx.translate(0, (1 - e) * -26);
      W.glass(ctx, 2, 2, w - 4, h - 4, (h - 4) / 2, { fill: 'rgba(10,10,10,.94)', line: 'rgba(245,196,81,.45)' });
      ALP.drawIcon(ctx, 'info', 36, h / 2 - 18, 36, C.warn, 1.8);
      W.text(ctx, S.toast ? S.toast.text : '', 90, h / 2 + 10, { size: T.size.small, weight: 300, color: C.text, maxW: w - 126 });
      ctx.restore();
    }
  });

  ALP.bus.on('vr:enter', function () { E.recenter(); });
  /* ---------- onboarding: a short guided tour of the controls, after a project is chosen ---------- */
  var OB_STEPS = [
    { id: 'welcome', title: 'Welcome to Parklinks Mall', text: 'A one-minute guide to the controls. Point at anything and pull the trigger to press it. You can skip the guide at any time.' },
    { id: 'reel', panel: 'reel', title: 'The journey reel', text: 'Walks the tour in order, from the estate to the units. Pick a card to go there, or push the thumbstick left or right for the next or previous place.' },
    { id: 'detail', panel: 'detail', title: 'Where you are', text: 'This card explains the place you are in. Details opens more, and Furnished / Unfurnished appears wherever a place has both.' },
    { id: 'menu', panel: 'matrix', match: 'm:', title: 'The side menu', text: 'Overview takes you back to the start, the 3D Mall Map shows every floor of the mall, and the Media Gallery has the photos and films.' },
    { id: 'hide', panel: 'matrix', regions: ['m:hide'], title: 'Hide the interface', text: 'Hide Interface clears everything away for a clean view of the mall.', tryText: 'Try it: press Hide Interface.', doneText: 'That is all there is to it.',
      hiddenTitle: 'Now bring it back', hiddenText: 'Press Show interface just below you, or the B or Y button on your controller.' },
    { id: 'help', panel: 'matrix', regions: ['help'], title: 'Help, any time', text: 'The question mark lists every control and replays this guide. If the panels are ever out of view, click the thumbstick to bring them back.' },
    { id: 'done', final: true, title: 'You are all set', text: 'Enjoy Parklinks Mall. Everything in this guide is also in Help.' }
  ];
  var OB = { started: false, pending: false, since: 0, size0: 1, hidPhase: 0, tried: false, dir: '', lastDir: 0, lastPulse: 0, wrapped: {} };
  function obCfg() { return P().onboarding || { enabled: true, once: 'visit' }; }
  function obKey() { return 'alp-onboard:' + (ALP.config.projectId || 'tour'); }
  function obSeen() {
    if (OB.started) return true;
    if (obCfg().once === 'device') { try { return !!window.localStorage.getItem(obKey()); } catch (e) {} }
    return false;
  }
  function obStep() { return S.onboard ? OB_STEPS[S.onboard.i] : null; }
  // the panel and region the current step points at; while hidden, the Show interface pill
  function obTarget(st) {
    if (!st) return null;
    if (st.id === 'hide' && S.uiHidden) return { panel: 'reveal' };
    return st.panel ? { panel: st.panel, regions: st.regions, match: st.match } : null;
  }
  A.onboardActive = function () { return !!S.onboard; };
  function obEnter() {
    var st = obStep(); if (!st) return;
    OB.tried = false; OB.hidPhase = 0; OB.size0 = S.uiScale || 1; OB.dir = '';
    var t = obTarget(st); if (t) wrapPanel(t.panel);
    wrapPanel('reveal');
    obFlush();
  }
  // any panel that carried a ring gets repainted a few more times, so a ring is never left behind
  function obFlush() { OB.flushUntil = Date.now() + 1500; E.dirty(); }
  A.startOnboarding = function (force) {
    if (!force && (obSeen() || obCfg().enabled === false)) return;
    OB.started = true; OB.pending = false;
    if (S.matrixMin) ALP.set({ matrixMin: false });
    if (S.uiHidden) ALP.set({ uiHidden: false });
    S.onboard = { i: 0 };
    obEnter();
    ALP.bus.emit('onboarding', { step: 0 });
  };
  function obFinish(skipped) {
    S.onboard = null;
    obFlush();
    try { if (obCfg().once === 'device') window.localStorage.setItem(obKey(), '1'); window.localStorage.setItem('alp-tip:grab', '1'); } catch (e) {}
    E.dirty();
    if (skipped) ALP.toast('Guide closed. Help has Show me around to replay it.', 3200);
    ALP.bus.emit('onboarding', { done: true, skipped: !!skipped });
  }
  function obGo(d) {
    if (!S.onboard) return;
    var n = S.onboard.i + d;
    if (n < 0) return;
    if (n >= OB_STEPS.length) { obFinish(false); return; }
    S.onboard.i = n;
    obEnter();
    ALP.bus.emit('onboarding', { step: n });
  }
  A.onboardGo = obGo;
  A.onboardState = function () { var st = obStep(); return st ? { i: S.onboard.i, id: st.id, n: OB_STEPS.length, tried: OB.tried, dir: OB.dir, target: (obTarget(st) || {}).panel || '' } : null; };

  // it starts once the visitor is in the tour itself, in the headset, with nothing else asking for attention
  function obReady() { return ALP.isActive() && E.isPresenting() && S.screen === 'tour' && !S.overlay && !S.videoOn && !S.mapOn && !S.galleryOn && !S.calcOn; }
  function obQueue() { if (!OB.started && obCfg().enabled !== false && !obSeen()) { OB.pending = true; OB.since = Date.now(); } }
  ALP.bus.on('screen', function (d) { if (d && d.to === 'tour') obQueue(); });
  ALP.bus.on('vr:enter', function () { if (S.screen === 'tour') obQueue(); });
  setInterval(function () {
    if (!OB.pending) return;
    if (Date.now() - OB.since < 3600 || !obReady()) return;
    A.startOnboarding(false);
  }, 500);
  window.startParklinksGuide = function () { A.startOnboarding(true); };

  // a glowing ring drawn onto the real panel, around the button being explained
  function wrapPanel(id) {
    if (OB.wrapped[id]) return;
    var p = E.get(id); if (!p || !p.draw) return;
    OB.wrapped[id] = true;
    var orig = p.draw;
    p.draw = function (ctx, ui, pp) {
      var t = obTarget(obStep());
      if (!t || t.panel !== this.id || !E.isPresenting()) return orig.call(this, ctx, ui, pp);
      var rec = [], u2 = U.extend({}, ui);
      u2.lift = function (rid, x, y, w, h, sp) { rec.push({ id: rid, x: x, y: y, w: w, h: h }); return ui.lift(rid, x, y, w, h, sp); };
      u2.button = function (rid, x, y, w, h) { rec.push({ id: rid, x: x, y: y, w: w, h: h }); return ui.button(rid, x, y, w, h); };
      var r = orig.call(this, ctx, u2, pp);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      obRing(ctx, this, t, rec);
      ctx.restore();
      return r;
    };
  }
  function obRing(ctx, p, t, rec) {
    var box = null, i;
    for (i = 0; i < rec.length; i++) {
      var g = rec[i], want = (t.regions && t.regions.indexOf(g.id) !== -1) || (t.match && g.id.indexOf(t.match) === 0);
      if (!want) continue;
      if (!box) box = { x0: g.x, y0: g.y, x1: g.x + g.w, y1: g.y + g.h };
      else { box.x0 = Math.min(box.x0, g.x); box.y0 = Math.min(box.y0, g.y); box.x1 = Math.max(box.x1, g.x + g.w); box.y1 = Math.max(box.y1, g.y + g.h); }
    }
    var pad = 10, x, y, w, h, r;
    if (box) { x = box.x0 - pad; y = box.y0 - pad; w = box.x1 - box.x0 + pad * 2; h = box.y1 - box.y0 + pad * 2; r = Math.min(40, h / 2); }
    else { x = 5; y = 5; w = p.px[0] - 10; h = p.px[1] - 10; r = 26; }
    var a = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(Date.now() / 260));
    ctx.save();
    ctx.shadowColor = 'rgba(52,211,153,' + (0.7 * a).toFixed(2) + ')'; ctx.shadowBlur = 22;
    K.roundRect(ctx, x, y, w, h, r);
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(52,211,153,' + a.toFixed(2) + ')'; ctx.stroke();
    ctx.restore();
  }

  // where the highlighted panel is, from the headset's point of view
  function obWhere(t) {
    var p = t && E.get(t.panel), v = E.xr && E.xr.lastViewerMatrix;
    if (!p || !p.model || !v) return '';
    var m = p.model, dx = m[12] - v[12], dy = m[13] - v[13], dz = m[14] - v[14], fx = -v[8], fz = -v[10];
    var fl = Math.sqrt(fx * fx + fz * fz) || 1; fx /= fl; fz /= fl;
    var ang = Math.atan2(fx * dz - fz * dx, fx * dx + fz * dz) * 180 / Math.PI;
    var hz = Math.sqrt(dx * dx + dz * dz) || 1, el = Math.atan2(dy, hz) * 180 / Math.PI;
    if (Math.abs(ang) > 115) return 'behind';
    if (ang > 24) return 'right';
    if (ang < -24) return 'left';
    if (el < -16) return 'below';
    if (el > 16) return 'above';
    return 'ahead';
  }
  var OB_DIR = { right: ['chevR', 'On your right'], left: ['chevL', 'On your left'], below: ['chevD', 'Below you'], above: ['arrowUp', 'Above you'], ahead: ['check', 'In front of you'], behind: ['reset', 'Turn around'] };

  // try-it checks, the gentle pulse and the direction label, a few times a second
  E.addFrame(function () {
    if (OB.flushUntil && Date.now() < OB.flushUntil && Date.now() - (OB.lastFlush || 0) > 150) {
      OB.lastFlush = Date.now();
      for (var fk in OB.wrapped) E.dirty(fk);
    }
    var st = obStep();
    if (!st || !E.isPresenting()) return;
    E.wake();
    var now = Date.now();
    if (st.id === 'size' && !OB.tried && Math.abs((S.uiScale || 1) - OB.size0) > 0.001) { OB.tried = true; E.dirty('onboard'); }
    if (st.id === 'hide') {
      if (OB.hidPhase === 0 && S.uiHidden) { OB.hidPhase = 1; obFlush(); }
      else if (OB.hidPhase === 1 && !S.uiHidden) { OB.hidPhase = 2; OB.tried = true; obFlush(); }
    }
    var t = obTarget(st);
    if (t && now - OB.lastPulse > 90) { OB.lastPulse = now; E.dirty(t.panel); }
    if (now - OB.lastDir > 300) {
      OB.lastDir = now;
      var d = t ? obWhere(t) : '';
      if (d !== OB.dir) { OB.dir = d; E.dirty('onboard'); }
    }
  });

  var OBC = { pad: 46 };
  function obTexts(st) {
    var hidden = st.id === 'hide' && S.uiHidden;
    return {
      title: hidden ? st.hiddenTitle : st.title,
      text: hidden ? st.hiddenText : st.text,
      extra: OB.tried ? (st.doneText || '') : (hidden ? '' : (st.tryText || ''))
    };
  }
  E.panel('onboard', {
    order: 70, enterRise: 0.02,
    layout: { yaw: 0, y: 0.16, dist: 1.9, deg: 27 },
    show: function (s) {
      if (!s.onboard || s.screen !== 'tour' || s.videoOn || s.galleryOn || s.mapOn || s.calcOn) return 0;
      return s.overlay ? 0 : 1;
    },
    measure: function () {
      var w = W.widthFor(this, 27), st = obStep() || OB_STEPS[0], tx = obTexts(st), iw = w - OBC.pad * 2;
      var th = W.paraHeight(W.mctx(), tx.text, iw, { size: T.size.small, weight: 300 });
      this.px = [w, OBC.pad + px(T.size.micro) + 22 + 4 + 34 + 56 + 26 + px(T.size.heading) + 22 + th + (tx.extra ? 26 + px(T.size.small) : 0) + 40 + 84 + OBC.pad];
    },
    draw: function (ctx, ui) {
      var w = this.px[0], h = this.px[1], st = obStep() || OB_STEPS[0], tx = obTexts(st), iw = w - OBC.pad * 2, x = OBC.pad, n = OB_STEPS.length, i = S.onboard ? S.onboard.i : 0;
      W.glass(ctx, 2, 2, w - 4, h - 4, 26, { fill: C.panelSolid, line: W.alpha(0.14) });
      var y = OBC.pad;
      W.eyebrow(ctx, 'Quick guide', x, y + px(T.size.micro));
      W.text(ctx, (i + 1) + ' / ' + n, w - x, y + px(T.size.micro), { size: T.size.micro, weight: 500, track: 0.12, align: 'right', color: C.text3 });
      y += px(T.size.micro) + 22;
      K.roundRect(ctx, x, y, iw, 4, 2); ctx.fillStyle = W.alpha(0.1); ctx.fill();
      K.roundRect(ctx, x, y, Math.max(8, iw * (i + 1) / n), 4, 2); ctx.fillStyle = C.accent; ctx.fill();
      y += 4 + 34;
      var dir = OB_DIR[OB.dir];
      if (dir && obTarget(st)) {
        var lab = dir[1].toUpperCase(), cw = Math.round(W.measure(ctx, lab, { size: T.size.micro, weight: 600, track: 0.16 }) + 96);
        K.roundRect(ctx, x, y, cw, 56, 28); ctx.fillStyle = C.accentSoft; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.accentBorder; ctx.stroke();
        ALP.drawIcon(ctx, dir[0], x + 20, y + 12, 32, C.accentLine, 2);
        W.text(ctx, lab, x + 64, y + 28 + px(T.size.micro) * 0.36, { size: T.size.micro, weight: 600, track: 0.16, color: C.accentLine });
      } else if (st.id === 'welcome') {
        W.text(ctx, 'About a minute', x, y + 28 + px(T.size.micro) * 0.36, { size: T.size.micro, weight: 500, track: 0.16, upper: true, color: C.text3 });
      } else if (st.final) {
        ALP.drawIcon(ctx, 'check', x, y + 12, 32, C.accent, 2.4);
        W.text(ctx, 'Guide complete', x + 46, y + 28 + px(T.size.micro) * 0.36, { size: T.size.micro, weight: 600, track: 0.16, upper: true, color: C.accentLine });
      }
      y += 56 + 26;
      W.text(ctx, tx.title, x, y + px(T.size.heading) * 0.82, { size: T.size.heading, family: T.font.brand, track: 0.04, color: C.white, maxW: iw });
      y += px(T.size.heading) + 22;
      y += W.para(ctx, tx.text, x, y + px(T.size.small), iw, { size: T.size.small, weight: 300 });
      if (tx.extra) {
        y += 26;
        if (OB.tried) ALP.drawIcon(ctx, 'check', x, y - 4, px(T.size.small) + 6, C.accent, 2.4);
        W.text(ctx, tx.extra, x + (OB.tried ? px(T.size.small) + 16 : 0), y + px(T.size.small) * 0.8, { size: T.size.small, weight: 500, color: OB.tried ? C.accentLine : C.text, maxW: iw - 40 });
        y += px(T.size.small);
      }
      var by = h - OBC.pad - 84;
      if (!st.final) W.pill(ctx, ui, 'skip', x, by, 220, 84, 'Skip guide', { kind: 'plain', size: T.size.micro, weight: 500, track: 0.14 });
      var nw = st.final ? 360 : 230;
      W.pill(ctx, ui, 'next', w - x - nw, by, nw, 84, st.final ? 'Start exploring' : (i === 0 ? 'Start' : 'Next'), { kind: OB.tried || st.final ? 'accent' : 'invert', size: T.size.micro, weight: 600, track: 0.16 });
      if (i > 0) W.pill(ctx, ui, 'back', w - x - nw - 20 - 200, by, 200, 84, 'Back', { kind: 'ghost', size: T.size.micro, weight: 500, track: 0.14 });
    },
    onPress: function (id) {
      if (id === 'next') obGo(1);
      else if (id === 'back') obGo(-1);
      else if (id === 'skip') obFinish(true);
    }
  });

  ALP.log('parklinks screens C ready');
  return true;
  };
  if (window.ALP && window.ALP.define) window.ALP.define('vr-screens-c', ['core', 'data', 'vr-engine', 'vr-screens-a'], run, 'parklinks');
  else (window.__ALPQ = window.__ALPQ || []).push(['vr-screens-c', ['core', 'data', 'vr-engine', 'vr-screens-a'], run, 'parklinks']);
})();
