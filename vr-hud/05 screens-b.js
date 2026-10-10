(function () {
  var run = function (ALP) {
  'use strict';
  var S = ALP.state, K = ALP.canvas, T = ALP.tokens, C = T.color, px = ALP.px, E = ALP.vr, W = ALP.ui, A = ALP.actions, U = ALP.util;
  function P() { return ALP.project() || {}; }
  function peso(n) { return (P().calc || {}).peso + Math.round(n).toLocaleString(); }
  function free(s) { return !s.uiHidden && !s.galleryOn && !s.videoOn && !s.aboutOn && !s.contactOn && !s.unitInfoOn && !s.mapOn && s.screen === 'tour'; }

  var N = { pad: 42, gap: 30, sec: 26 };

  function kind() {
    var pl = A.current() || {};
    if (S.lotOverride) return 'lot';
    if (pl.unit) return 'unit';
    if (pl.floor) return 'floor';
    return 'lot';
  }
  function lotFor(pl) { return A.lot(S.lotOverride || (pl && pl.lot)) || null; }
  // Furnished / Unfurnished now sits on the dock, so the cards no longer carry their own switch
  function furnishH() { return 0; }
  function collapsedPill(ctx, ui, w, h, title) {
    var pl = A.current() || {};
    W.glass(ctx, 2, 2, w - 4, h - 4, (h - 4) / 2, { fill: C.shell, line: W.alpha(0.5) });
    W.eyebrow(ctx, A.section(pl.section).label, 44, h / 2 - 12);
    W.text(ctx, title, 44, h / 2 + px(T.size.body) * 0.95, { size: T.size.body, family: T.font.brand, track: 0.03, color: C.text, maxW: w - 300 });
    W.pill(ctx, ui, 'expand', w - 42 - 210, h / 2 - 34, 210, 68, 'Details', { kind: 'plain', size: T.size.micro, weight: 500, track: 0.16, icon: 'chevD' });
  }

  /* ---------- the place card: whatever you are standing in, explained ---------- */
  // opened with Info on the dock, in front of you; Info again, the close button, or moving to another place puts it away
  E.panel('detail', {
    order: 28, enterRise: 0.02, pinGroup: 'info',
    layout: { yaw: 0, y: 0.06, dist: 2.0, deg: 28, design: 29 },
    show: function (s) { return kind() !== 'unit' && s.infoOn && free(s) ? 1 : 0; },
    measure: function () {
      var w = W.widthFor(this, 29), k = kind(), pl = A.current() || {}, fh = furnishH();
      if (k === 'lot') {
        var lt = lotFor(pl), body = lt ? lt.text : (pl.info || '');
        this.px = [w, N.pad * 2 + 74 + px(T.size.heading) + 30 + 2 + 30 + W.paraHeight(W.mctx(), body, w - N.pad * 2, { size: T.size.small, lh: Math.round(px(T.size.small) * 1.72) }) + fh];
        return;
      }
      var f = A.currentFloor() || {};
      var h = N.pad * 2 + 96 + N.gap + 2 + N.sec + 40 + 2 * 128 - 16 + N.gap + 88;
      this.px = [w, h + fh];
    },
    draw: function (ctx, ui) {
      var w = this.px[0], fh = furnishH(), h = this.px[1] - fh, k = kind(), pl = A.current() || {}, i;
      if (fh) W.furnishBar(ctx, ui, 0, h + 26, w);
      var f = A.currentFloor() || {};
      W.glass(ctx, 2, 2, w - 4, h - 4, 30, { fill: C.shell, line: W.alpha(0.5), shadowBlur: 56, shadowY: 22 });
      var x = N.pad, iw = w - N.pad * 2, y = N.pad;
      W.roundBtn(ctx, ui, 'fold', w - N.pad - 32, y + 32, 32, 'close');
      if (k === 'lot') {
        var lt = lotFor(pl), body = lt ? lt.text : (pl.info || '');
        W.eyebrow(ctx, A.section(pl.section).label, x, y + 24);
        W.text(ctx, lt ? lt.title : pl.label.toUpperCase(), x, y + 74 + px(T.size.heading) * 0.2, { size: T.size.heading, family: T.font.brand, track: 0.16, color: C.white, maxW: iw - 80 });
        y += 74 + px(T.size.heading) + 30;
        ctx.fillStyle = W.alpha(0.2); ctx.fillRect(x, y, 80, 2);
        y += 2 + 30 + px(T.size.small);
        W.para(ctx, body, x, y, iw, { size: T.size.small, weight: 300, color: W.alpha(0.85), lh: Math.round(px(T.size.small) * 1.72) });
        return;
      }
      ctx.beginPath(); ctx.arc(x + 34, y + 34, 34, 0, Math.PI * 2);
      ctx.fillStyle = W.alpha(0.06); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = W.alpha(0.12); ctx.stroke();
      ALP.drawIcon(ctx, 'compass', x + 34 - 17, y + 34 - 17, 34, C.accentLine, 1.8);
      W.eyebrow(ctx, 'Active Level', x + 84, y + 24);
      W.text(ctx, f.levelLabel || '', x + 84, y + 34 + px(T.size.heading) * 0.72, { size: T.size.heading, family: T.font.brand, track: 0.03, color: C.text, maxW: iw - 84 - 80 });
      W.text(ctx, f.levelName || '', x + 84, y + 34 + px(T.size.heading) * 0.72 + px(T.size.small) + 12, { size: T.size.small, weight: 300, color: C.text2, maxW: iw - 84 - 80 });
      y += 96 + N.gap;
      W.divider(ctx, x, y, iw); y += 2 + N.sec;
      W.eyebrow(ctx, 'Leasing Snapshot', x, y + px(T.size.micro)); y += 40;
      var L = f.leasing || {}, cw = (iw - 16) / 2, ch = 112;
      W.statCard(ctx, x, y, cw, ch, 'doorOpen', 'Available Units', String(L.availableUnits || 0));
      W.statCard(ctx, x + cw + 16, y, cw, ch, 'trendUp', 'Occupancy', (L.occupancyPct || 0) + '%');
      W.statCard(ctx, x, y + ch + 16, cw, ch, 'ruler', 'Retail Area', (L.retailAreaSqm || 0).toLocaleString() + ' sqm');
      W.statCard(ctx, x + cw + 16, y + ch + 16, cw, ch, 'square', 'Avg. Unit Size', (L.avgUnitSqm || 0) + ' sqm');
      y += 2 * 128 - 16 + N.gap;
      var unitPl = null, list = A.places();
      for (i = 0; i < list.length; i++) if (list[i].unit && list[i].floor === pl.floor) unitPl = list[i];
      if (unitPl) W.pill(ctx, ui, 'unit:' + unitPl.id, x, y, iw, 88, 'View ' + unitPl.label, { kind: 'plain', icon: 'layout', size: T.size.small, weight: 500, track: 0.14, radius: 22 });
      else if (pl.map) W.pill(ctx, ui, 'map', x, y, iw, 88, 'Show on 3D Map', { kind: 'plain', icon: 'map', size: T.size.small, weight: 500, track: 0.14, radius: 22 });
    },
    onPress: function (id) {
      if (id === 'fur:on' || id === 'fur:off') { A.setFurnished(id === 'fur:on'); return; }
      if (id === 'fold') { A.closeInfo(); return; }
      if (id === 'map') { A.closeInfo(); A.openMap(); return; }
      if (id.indexOf('unit:') === 0) { A.closeInfo(); A.go(id.slice(5)); }
    }
  });

  /* ---------- the unit card ---------- */
  E.panel('unitcard', {
    order: 28, enterRise: 0.02, pinGroup: 'info',
    layout: { yaw: 0, y: 0.06, dist: 2.0, deg: 33, design: 35 },
    show: function (s) { return kind() === 'unit' && s.infoOn && free(s) ? 1 : 0; },
    measure: function () {
      var w = W.widthFor(this, 35);
      var u = A.currentUnit() || { benefits: [], facts: [], blueprints: [] };
      var left = 40 + u.benefits.length * 62 + N.gap + 40 + 2 * 112;
      var right = 40 + Math.ceil(u.blueprints.length / 2) * 96;
      this.px = [w, N.pad * 2 + 62 + 96 + 84 + N.gap + 2 + N.sec + Math.max(left, right) + N.gap + 2 + 24 + 88];
    },
    draw: function (ctx, ui) {
      var w = this.px[0], h = this.px[1], u = A.currentUnit() || { benefits: [], facts: [], blueprints: [] }, i;
      W.glass(ctx, 2, 2, w - 4, h - 4, 30, { fill: C.shell, line: W.alpha(0.5), shadowBlur: 56, shadowY: 22 });
      var x = N.pad, iw = w - N.pad * 2, y = N.pad;

      var bw = W.measure(ctx, 'Available Now', { size: T.size.micro, weight: 500, track: 0.1 }) + 40;
      K.roundRect(ctx, x, y, bw, 50, 25); ctx.fillStyle = C.accentSoft; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = C.accentBorder; ctx.stroke();
      W.text(ctx, 'Available Now', x + bw / 2, y + 25 + px(T.size.micro) * 0.36, { size: T.size.micro, weight: 500, track: 0.1, align: 'center', color: C.accentLine });
      var b2 = W.measure(ctx, u.conditionLabel || '', { size: T.size.micro, weight: 500, track: 0.1 }) + 40;
      K.roundRect(ctx, x + bw + 12, y, b2, 50, 25); ctx.fillStyle = W.alpha(0.06); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = W.alpha(0.12); ctx.stroke();
      W.text(ctx, u.conditionLabel || '', x + bw + 12 + b2 / 2, y + 25 + px(T.size.micro) * 0.36, { size: T.size.micro, weight: 500, track: 0.1, align: 'center', color: C.text2 });
      W.roundBtn(ctx, ui, 'fold', w - N.pad - 34, y + 25, 34, 'close');
      y += 62;

      W.text(ctx, u.title, x, y + px(T.size.title) * 0.78, { size: T.size.title, family: T.font.brand, track: 0.02, color: C.white, maxW: iw - 80 });
      W.text(ctx, u.subTitle, x, y + px(T.size.title) * 0.78 + px(T.size.small) + 14, { size: T.size.small, weight: 300, color: C.text2, maxW: iw });
      y += 96;

      var chips = [['maximize', u.areaSqm + ' sqm'], ['zap', 'Ready for Fit-out'], ['layers', u.floorLabel]];
      var cx0 = x;
      for (i = 0; i < chips.length; i++) {
        var cwid = W.measure(ctx, chips[i][1], { size: T.size.micro, weight: 400 }) + px(T.size.micro) + 46;
        K.roundRect(ctx, cx0, y, cwid, 56, 16); ctx.fillStyle = W.alpha(0.04); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = W.alpha(0.08); ctx.stroke();
        ALP.drawIcon(ctx, chips[i][0], cx0 + 16, y + 28 - px(T.size.micro) / 2, px(T.size.micro), C.text3, 1.8);
        W.text(ctx, chips[i][1], cx0 + 16 + px(T.size.micro) + 10, y + 28 + px(T.size.micro) * 0.36, { size: T.size.micro, weight: 400, color: C.text2 });
        cx0 += cwid + 10;
      }
      y += 84 + N.gap;
      W.divider(ctx, x, y, iw); y += 2 + N.sec;

      var colW = (iw - 40) / 2, rx = x + colW + 40, ly = y, ry = y;

      ALP.drawIcon(ctx, 'sparkles', x, ly + 2, px(T.size.micro), C.accentLine, 1.8);
      W.eyebrow(ctx, 'Why This Space', x + px(T.size.micro) + 12, ly + px(T.size.micro)); ly += 40;
      for (i = 0; i < u.benefits.length; i++) {
        ctx.beginPath(); ctx.arc(x + 18, ly + 18, 18, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(52,211,153,.09)'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(52,211,153,.2)'; ctx.stroke();
        ALP.drawIcon(ctx, 'check', x + 7, ly + 7, 22, C.accentLine, 2.6);
        W.text(ctx, u.benefits[i], x + 48, ly + 18 + px(T.size.small) * 0.36, { size: T.size.small, weight: 300, color: C.text2, maxW: colW - 48 });
        ly += 62;
      }
      ly += N.gap;
      ALP.drawIcon(ctx, 'chart', x, ly + 2, px(T.size.micro), C.text3, 1.8);
      W.eyebrow(ctx, 'Quick Facts', x + px(T.size.micro) + 12, ly + px(T.size.micro)); ly += 40;
      var icons = ['users', 'arrowUp', 'layout', 'sliders'], fw = (colW - 14) / 2;
      for (i = 0; i < u.facts.length && i < 4; i++) {
        var fx = x + (i % 2) * (fw + 14), fy = ly + Math.floor(i / 2) * 112;
        K.roundRect(ctx, fx, fy, fw, 96, 16); ctx.fillStyle = W.alpha(0.04); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = W.alpha(0.07); ctx.stroke();
        ALP.drawIcon(ctx, icons[i], fx + 16, fy + 16, px(T.size.micro), C.text3, 1.8);
        W.eyebrow(ctx, u.facts[i][0], fx + 16 + px(T.size.micro) + 10, fy + 16 + px(T.size.micro) * 0.82, { maxW: fw - 46 });
        W.text(ctx, u.facts[i][1], fx + 16, fy + 96 - 18, { size: T.size.small, weight: 400, color: C.text, maxW: fw - 32 });
      }

      ALP.drawIcon(ctx, 'layoutGrid', rx, ry + 2, px(T.size.micro), C.text3, 1.8);
      W.eyebrow(ctx, 'Fit-Out Blueprint', rx + px(T.size.micro) + 12, ry + px(T.size.micro)); ry += 40;
      var bps = u.blueprints || [], bwid = (colW - 14) / 2;
      for (i = 0; i < bps.length; i++) {
        var bp = bps[i], bx = rx + (i % 2) * (bwid + 14), by = ry + Math.floor(i / 2) * 96;
        var act = bp.id === S.blueprintId;
        var hov = ui.lift('b:' + bp.id, bx, by, bwid, 82) * (bp.disabled ? 0 : 1);
        var prs = ui.press('b:' + bp.id) * (bp.disabled ? 0 : 1);
        ctx.save();
        if (act) { ctx.shadowColor = 'rgba(52,211,153,.35)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8; }
        K.roundRect(ctx, bx, by - hov * 2, bwid, 82, 22);
        ctx.fillStyle = act ? C.accent : W.alpha(W.wa(0.04, 0.12, hov) + 0.08 * prs); ctx.fill();
        ctx.restore();
        ctx.lineWidth = 2; ctx.strokeStyle = act ? C.accent : W.alpha(bp.disabled ? 0.05 : 0.1); ctx.stroke();
        var tc = act ? C.onAccent : (bp.disabled ? C.text3 : C.text);
        W.text(ctx, bp.label, bx + 20, by - hov * 2 + 34, { size: T.size.small, weight: act ? 600 : 400, color: tc, maxW: bwid - 40 });
        W.text(ctx, peso(bp.cost) + ' / sq ft', bx + 20, by - hov * 2 + 64, { size: T.size.micro, weight: 400, color: act ? 'rgba(5,46,31,.85)' : W.cream(0.4), maxW: bwid - 40 });
      }

      y = Math.max(ly + 2 * 112, ry + Math.ceil(bps.length / 2) * 96) + N.gap;
      W.divider(ctx, x, y, iw); y += 24;
      W.pill(ctx, ui, 'back', x, y, (iw - 14) / 2, 88, 'Back to Floor', { kind: 'plain', icon: 'arrowL', size: T.size.small, weight: 500, track: 0.12, radius: 22 });
      W.pill(ctx, ui, 'calc', x + (iw - 14) / 2 + 14, y, (iw - 14) / 2, 88, 'Calculator', { kind: 'plain', icon: 'calculator', size: T.size.small, weight: 500, track: 0.12, radius: 22 });
    },
    onPress: function (id) {
      if (id === 'fur:on' || id === 'fur:off') { A.setFurnished(id === 'fur:on'); return; }
      if (id === 'fold') { A.closeInfo(); return; }
      if (id === 'back') {
        A.closeInfo();
        var pl = A.current() || {}, list = A.places(), i;
        for (i = 0; i < list.length; i++) if (!list[i].unit && list[i].floor === pl.floor) { A.go(list[i].id); return; }
        return;
      }
      if (id === 'calc') { ALP.set({ calcOn: true, infoOn: false }); return; }
      if (id.indexOf('b:') === 0) A.setBlueprint(id.slice(2));
    }
  });

  /* ---------- lease and turnover tool ---------- */
  var CA = { pad: 46 };
  E.panel('calc', {
    order: 29, enterRise: 0.02,
    layout: { yaw: 0, y: 0.02, dist: 2.0, deg: 32 },
    show: function (s) { return s.calcOn && free(s) ? 1 : 0; },
    measure: function () {
      var cfg = P().calc || { sales: [] };
      this.px = [W.widthFor(this, 32), CA.pad * 2 + 96 + 36 + 40 + 128 + 40 + 40 + 76 + 40 + 40 + Math.ceil(cfg.sales.length / 3) * 76 + 40 + 300];
    },
    draw: function (ctx, ui) {
      var w = this.px[0], h = this.px[1], u = A.currentUnit() || {}, cfg = P().calc || { terms: [], sales: [], salesLabels: [] }, i;
      W.glass(ctx, 2, 2, w - 4, h - 4, 34, { fill: C.deep, line: W.alpha(0.08), shadowBlur: 70, shadowY: 30 });
      var x = CA.pad, iw = w - CA.pad * 2, y = CA.pad;

      ctx.beginPath(); ctx.arc(x + 32, y + 32, 32, 0, Math.PI * 2);
      ctx.fillStyle = W.alpha(0.06); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = W.alpha(0.12); ctx.stroke();
      ALP.drawIcon(ctx, 'calculator', x + 32 - 15, y + 32 - 15, 30, C.accentLine, 1.8);
      W.eyebrow(ctx, 'Commercial Profile', x + 80, y + 22);
      W.text(ctx, 'Lease and Turnover Tool', x + 80, y + 32 + px(T.size.heading) * 0.74, { size: T.size.heading, family: T.font.brand, track: 0.06, maxW: iw - 150 });
      W.roundBtn(ctx, ui, 'close', w - CA.pad - 28, y + 32, 28, 'close');
      y += 96 + 36;

      W.eyebrow(ctx, 'Property Information (Read-Only)', x, y + px(T.size.micro)); y += 40;
      var rate = u.areaSqm ? Math.round(u.monthlyRentPhp / u.areaSqm) : 0;
      var cells = [['Monthly Rent', peso(u.monthlyRentPhp || 0)], ['Floor Area', (u.areaSqm || 0) + ' sqm'], ['Rate / Sqm', peso(rate)]];
      var cw = (iw - 4) / 3;
      K.roundRect(ctx, x, y, iw, 112, 18); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = W.alpha(0.04); ctx.stroke();
      for (i = 0; i < 3; i++) {
        if (i) { ctx.fillStyle = W.alpha(0.06); ctx.fillRect(x + i * cw, y + 16, 2, 80); }
        W.eyebrow(ctx, cells[i][0], x + i * cw + 22, y + 34, { maxW: cw - 40 });
        W.text(ctx, cells[i][1], x + i * cw + 22, y + 82, { size: T.size.small, weight: 600, color: C.white, maxW: cw - 40 });
      }
      y += 128 + 40;

      W.eyebrow(ctx, 'Lease Term Duration', x, y + px(T.size.micro)); y += 40;
      var tw = (iw - 24) / 3;
      for (i = 0; i < cfg.terms.length; i++) {
        W.chip(ctx, ui, 't:' + cfg.terms[i], x + i * (tw + 12), y, tw, 68, cfg.terms[i] + ' Mos', {
          active: S.calcTerm === cfg.terms[i], size: T.size.small, radius: 18
        });
      }
      y += 76 + 40;

      W.eyebrow(ctx, 'Projected Monthly Gross Sales', x, y + px(T.size.micro)); y += 40;
      var sw = (iw - 24) / 3;
      for (i = 0; i < cfg.sales.length; i++) {
        var sx = x + (i % 3) * (sw + 12), sy = y + Math.floor(i / 3) * 76;
        W.chip(ctx, ui, 's:' + i, sx, sy, sw, 64, cfg.salesLabels[i], {
          active: S.calcSales === cfg.sales[i], size: T.size.small, radius: 18
        });
      }
      y += Math.ceil(cfg.sales.length / 3) * 76 + 40;

      // results
      var base = u.monthlyRentPhp || 0, variable = Math.round((S.calcSales || 0) * 0.03), total = base + variable;
      var months = S.calcTerm || 12;
      K.roundRect(ctx, x, y, iw, 288, 24); ctx.fillStyle = W.alpha(0.015); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = W.alpha(0.05); ctx.stroke();
      var ry = y + 40;
      W.eyebrow(ctx, 'Estimated Monthly Payment', x + 26, ry); ry += 42;
      W.text(ctx, 'Base Rent', x + 26, ry, { size: T.size.small, weight: 300, color: C.text2 });
      W.text(ctx, peso(base), x + iw - 26, ry, { size: T.size.small, weight: 500, align: 'right', color: C.text });
      ry += 40;
      if (S.calcSales) {
        W.text(ctx, '3% of Gross Sales', x + 26, ry, { size: T.size.small, weight: 300, color: C.text2 });
        W.text(ctx, peso(variable), x + iw - 26, ry, { size: T.size.small, weight: 500, align: 'right', color: C.text });
      } else {
        W.text(ctx, 'Plus 3% of gross sales once trading begins', x + 26, ry, { size: T.size.micro, weight: 300, color: C.text3, maxW: iw - 52 });
      }
      ry += 34;
      ctx.save(); ctx.setLineDash([10, 10]); ctx.lineWidth = 2; ctx.strokeStyle = W.alpha(0.1);
      ctx.beginPath(); ctx.moveTo(x + 26, ry); ctx.lineTo(x + iw - 26, ry); ctx.stroke(); ctx.restore();
      ry += 46;
      W.text(ctx, 'Total Monthly Payment', x + 26, ry, { size: T.size.small, weight: 600, color: C.white });
      W.text(ctx, peso(total), x + iw - 26, ry, { size: T.size.value, weight: 600, align: 'right', color: C.accentLine });
      ry += 52;
      W.eyebrow(ctx, 'Lease Term ' + months + ' Months', x + 26, ry);
      W.text(ctx, 'Estimated Contract Value', x + 26, ry + 44, { size: T.size.small, weight: 300, color: C.text2 });
      W.text(ctx, peso(total * months), x + iw - 26, ry + 44, { size: T.size.value, weight: 300, align: 'right', color: C.white });
    },
    onPress: function (id) {
      var cfg = P().calc || { sales: [] };
      if (id === 'close') { ALP.set({ calcOn: false, infoOn: true }); return; }
      if (id.indexOf('t:') === 0) { S.calcTerm = parseInt(id.slice(2), 10); ALP.bus.emit('change', { calcTerm: S.calcTerm }); return; }
      if (id.indexOf('s:') === 0) { S.calcSales = cfg.sales[parseInt(id.slice(2), 10)] || 0; ALP.bus.emit('change', { calcSales: S.calcSales }); }
    }
  });

  ALP.log('parklinks screens B ready');
  return true;
  };
  if (window.ALP && window.ALP.define) window.ALP.define('vr-screens-b', ['core', 'data', 'vr-engine', 'vr-screens-a'], run, 'parklinks');
  else (window.__ALPQ = window.__ALPQ || []).push(['vr-screens-b', ['core', 'data', 'vr-engine', 'vr-screens-a'], run, 'parklinks']);
})();
