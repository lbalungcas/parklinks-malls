(function () {
  var run = function (ALP) {
  'use strict';
  var U = ALP.util, M4 = U.M4, S = ALP.state, log = ALP.log, warn = ALP.warn;

  var EC = U.extend({
    toggleButtons: [5],
    followMode: 'follow',
    followThresholdDeg: 55,
    modalFollowThresholdDeg: 35,
    followSpeed: 2.5,
    drawRay: 'auto',
    forceBaseLayer: true,
    enterVRButton: 'auto',
    enterVRTop: 18,
    idleSeconds: 0,
    idleOpacity: 0.3,
    grab: true,
    grabHoldMs: 420,
    persistPins: true
  }, ALP.config.vr || {});
  ALP.config.vr = EC;
  var stats = { sessions: 0, via: '', frames: 0, drawn: 0, path: '', testMode: false, gl: '' };
  var xr = { session: null, gl: null, binding: null, refSpace: null, renderer: null };
  var E = ALP.vr = { config: EC, stats: stats, xr: xr };
  var idle = { last: Date.now(), f: 1 };

  var panels = [];
  E.panels = panels;
  E.panel = function (id, def) {
    var p = def || {};
    p.id = id;
    p.order = p.order || 10;
    p.px = p.px || [512, 256];
    p.opacity = 0; p.targetOpacity = 0;
    p.scale = 1; p.targetScale = 1;
    p.dirty = true; p.uploaded = false;
    p.regions = []; p.hoverId = null;
    p.model = null; p.w = 1; p.h = 1;
    for (var i = 0; i < panels.length; i++) if (panels[i].id === id && (panels[i].scope || '') === (p.scope || '')) { panels.splice(i, 1); break; }
    panels.push(p);
    panels.sort(function (a, b) { return a.order - b.order; });
    return p;
  };
  // with several projects in one tour two panels can share a name: the one that belongs to the open project is meant
  function findPanel(id, sid) {
    var other = null;
    for (var i = 0; i < panels.length; i++) if (panels[i].id === id) {
      if (!panels[i].scope || panels[i].scope === sid) return panels[i];
      other = other || panels[i];
    }
    return sid === undefined ? other : null;
  }
  function activeScope() { return ALP.scope ? ALP.scope.scopeId : undefined; }
  function live(p) { return !p.scope || !ALP.scope || p.scope === ALP.scope.scopeId; }
  E.get = function (id) { return findPanel(id, activeScope()); };
  E.dirty = function (id) {
    if (id) { var p = E.get(id); if (p) p.dirty = true; return; }
    for (var i = 0; i < panels.length; i++) panels[i].dirty = true;
  };
  E.recenter = function () { anchor.set = false; };
  // panels someone has moved are pinned in the room frame instead of following the head
  var room = { set: false, yaw: 0, pos: [0, 0, 0] };
  E.pins = {};
  function pinKey(p) { return (p.scope ? p.scope + ':' : '') + (p.pinGroup || p.id); }
  E.pinKey = pinKey;
  function pinStoreKey() { return 'alp-pins:' + (location.host || '') + (location.pathname || ''); }
  function savePins() {
    if (!EC.persistPins) return;
    try { window.localStorage.setItem(pinStoreKey(), JSON.stringify(E.pins)); } catch (e) {}
  }
  function loadPins() {
    if (!EC.persistPins) return;
    try { var v = window.localStorage.getItem(pinStoreKey()); if (v) E.pins = JSON.parse(v) || {}; } catch (e) { E.pins = {}; }
  }
  loadPins();
  E.setPins = function (obj) { for (var k in obj) E.pins[k] = obj[k]; savePins(); E.dirty(); ALP.bus.emit('change', { pins: true }); };
  E.clearPins = function (keys) {
    if (!keys) E.pins = {};
    else for (var i = 0; i < keys.length; i++) delete E.pins[keys[i]];
    savePins(); E.dirty(); ALP.bus.emit('change', { pins: true });
  };
  E.hasPins = function (keys) {
    if (!keys) { for (var k in E.pins) return true; return false; }
    for (var i = 0; i < keys.length; i++) if (E.pins[keys[i]]) return true;
    return false;
  };
  E.recenterAll = function () { anchor.set = false; room.set = false; };
  E.roomMatrix = function () { return M4.mul(M4.translate(room.pos[0], room.pos[1], room.pos[2]), M4.rotY(room.yaw)); };
  E.anchorMatrix = function () {
    return M4.mul(M4.translate(anchor.pos[0], anchor.pos[1], anchor.pos[2]), M4.rotY(anchor.yaw));
  };
  E.layoutOf = function (p) {
    var cfg = p.scopeObj ? p.scopeObj.config : ALP.config;
    var o = (cfg.layout && cfg.layout[p.id]) || null;
    var L = U.extend({}, p.layout || { yaw: 0, y: 0, dist: 1.5, deg: 30 }, o || {});
    var pin = !p.fullscreen && E.pins[pinKey(p)];
    if (pin) {
      L.yaw = pin.yaw; L.y = pin.y; L.dist = pin.dist; L.pinned = true;
      if (pin.s && L.deg) L.deg = L.deg * pin.s;
      if (pin.s && L.width) L.width = L.width * pin.s;
    }
    var sc = S.uiScale || 1;
    if (sc !== 1 && !p.noScale) {
      // wide bars grow more gently so they stay inside a comfortable field of view
      if (L.deg && L.deg > 40) sc = 1 + (sc - 1) * (L.deg > 55 ? 0.4 : 0.55);
      if (L.deg) L.deg = L.deg * sc;
      if (L.width) L.width = L.width * sc;
      if (L.ppm) L.ppm = L.ppm / sc;
      if (L.y && !L.pinned) L.y = L.y * (0.55 + 0.45 * sc);
    }
    return L;
  };

  E.panel('__backdrop', {
    order: 49, px: [4, 4], fullscreen: true, interactive: false,
    show: function () {
      var d = 0;
      for (var i = 0; i < panels.length; i++) {
        var p = panels[i];
        if (p.dim && p.targetOpacity > 0.5 && live(p)) d = Math.max(d, typeof p.dim === 'function' ? p.dim(S) : p.dim);
      }
      return d;
    },
    draw: function (ctx) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 4, 4); }
  });

  ALP.bus.on('change', function () { E.dirty(); });
  ALP.bus.on('images', function () { E.dirty(); });
  ALP.bus.on('screen', function () { anchor.set = false; });

  function topModal() {
    var top = null;
    for (var i = 0; i < panels.length; i++) {
      var p = panels[i];
      var m = typeof p.modal === 'function' ? p.modal(S) : p.modal;
      if (m && p.targetOpacity > 0.5 && p.opacity > 0.3) top = p;
    }
    return top;
  }
  E.topModal = topModal;
  function interactive(p) {
    if (p.interactive === false || p.fullscreen) return false;
    if (p.opacity < 0.5 || p.targetOpacity < 0.5) return false;
    var top = topModal();
    if (top) return p === top || (top.group && p.group === top.group);
    return true;
  }

  var glFor = typeof WeakMap === 'function' ? new WeakMap() : null;
  function rememberGL(gl, session) {
    if (!gl) return;
    xr.gl = gl;
    if (session && glFor) { try { glFor.set(session, gl); } catch (e) {} }
  }
  function wrapCtor(name, onCreate) {
    var Orig = window[name];
    if (typeof Orig !== 'function' || Orig.__alpWrapped) return;
    var Wrapped = function (a, b, c) {
      var inst = arguments.length > 2 ? new Orig(a, b, c) : new Orig(a, b);
      try { onCreate(a, b, inst); } catch (e) {}
      return inst;
    };
    Wrapped.prototype = Orig.prototype;
    if (name === 'XRWebGLBinding' && EC.forceBaseLayer) {

      var proto = {};
      Object.getOwnPropertyNames(Orig.prototype).forEach(function (k) {
        if (k === 'createProjectionLayer' || k === 'constructor') return;
        try { Object.defineProperty(proto, k, Object.getOwnPropertyDescriptor(Orig.prototype, k)); } catch (e) {}
      });
      proto.constructor = Wrapped;
      Wrapped.prototype = proto;
    }
    Wrapped.__alpWrapped = true;
    Wrapped.__alpOrig = Orig;
    try {
      Object.getOwnPropertyNames(Orig).forEach(function (k) {
        if (['prototype', 'length', 'name', 'arguments', 'caller'].indexOf(k) !== -1) return;
        try { var v = Orig[k]; Wrapped[k] = typeof v === 'function' ? v.bind(Orig) : v; } catch (e) {}
      });
    } catch (e) {}
    try { window[name] = Wrapped; } catch (e) {}
  }
  function wrapMakeXRCompatible(proto) {
    if (!proto || !proto.makeXRCompatible || proto.makeXRCompatible.__alpWrapped) return;
    var orig = proto.makeXRCompatible;
    var w = function () { rememberGL(this); return orig.apply(this, arguments); };
    w.__alpWrapped = true;
    try { proto.makeXRCompatible = w; } catch (e) {}
  }
  function installCaptureHooks() {
    wrapCtor('XRWebGLLayer', function (s, gl) { rememberGL(gl, s); });
    wrapCtor('XRWebGLBinding', function (s, gl, inst) { rememberGL(gl, s); xr.binding = inst; });
    if (window.WebGLRenderingContext) wrapMakeXRCompatible(window.WebGLRenderingContext.prototype);
    if (window.WebGL2RenderingContext) wrapMakeXRCompatible(window.WebGL2RenderingContext.prototype);
  }
  function findGLFallback() {
    if (xr.gl) return xr.gl;
    var cs = document.getElementsByTagName('canvas'), best = null, area = 0;
    for (var i = 0; i < cs.length; i++) {
      var g = null;
      try { g = cs[i].getContext('webgl2'); } catch (e) {}
      if (!g) { try { g = cs[i].getContext('webgl'); } catch (e) {} }
      if (g && cs[i].width * cs[i].height > area) { best = g; area = cs[i].width * cs[i].height; }
    }
    if (best) rememberGL(best);
    return best;
  }
  function hookRequestSession() {
    var sys = navigator.xr;
    if (!sys || sys.__alpHooked) return !!sys;
    var orig = sys.requestSession;
    if (typeof orig !== 'function') return false;
    sys.requestSession = function (mode) {
      installCaptureHooks();
      var p = orig.apply(sys, arguments);
      if (mode === 'immersive-vr' || mode === 'immersive-ar') {
        p = p.then(function (session) {
          try { attachSession(session, 'requestSession hook'); } catch (e) { warn('attach failed', e); }
          return session;
        });
      }
      return p;
    };
    sys.__alpHooked = true;
    log('requestSession hooked');
    return true;
  }
  function nativeOf(obj, name) {
    var p = Object.getPrototypeOf(obj);
    while (p) {
      if (Object.prototype.hasOwnProperty.call(p, '__alpNative_' + name)) return p['__alpNative_' + name];
      p = Object.getPrototypeOf(p);
    }
    return obj[name];
  }

  function installProtoHooks() {
    var XS = window.XRSession;
    if (!XS || !XS.prototype || Object.prototype.hasOwnProperty.call(XS.prototype, '__alpProto')) return;
    var proto = XS.prototype;
    var nRAF = proto.requestAnimationFrame, nAdd = proto.addEventListener, nRemove = proto.removeEventListener;
    if (typeof nRAF !== 'function' || typeof nAdd !== 'function') return;
    proto.__alpNative_requestAnimationFrame = nRAF;
    proto.__alpNative_addEventListener = nAdd;
    proto.__alpNative_removeEventListener = nRemove;
    proto.requestAnimationFrame = function (cb) {
      if (!this.__alpAttached) { try { attachSession(this, 'first frame (late)'); } catch (e) { warn('late attach failed', e); } }
      if (Object.prototype.hasOwnProperty.call(this, 'requestAnimationFrame')) return this.requestAnimationFrame(cb);
      return nRAF.call(this, cb);
    };
    var add = function (type, listener, opts) {
      if (INTERCEPTED[type] && listener && !listener.__alpOwn) {
        var session = this;
        var wrapped = function (e) {

          if (xr.session === session && type !== 'selectend') decidePress(e);
          if (isConsumed(e)) return;
          return typeof listener === 'function' ? listener.call(this, e) : listener.handleEvent(e);
        };
        if (!session.__alpWraps) session.__alpWraps = [];
        session.__alpWraps.push({ type: type, listener: listener, wrapped: wrapped });
        return nAdd.call(this, type, wrapped, opts);
      }
      return nAdd.apply(this, arguments);
    };
    add.__alpProtoAdd = true;
    proto.addEventListener = add;
    proto.removeEventListener = function (type, listener, opts) {
      var list = this.__alpWraps;
      if (INTERCEPTED[type] && list) {
        for (var i = 0; i < list.length; i++) {
          if (list[i].type === type && list[i].listener === listener) {
            var w = list[i].wrapped; list.splice(i, 1);
            return nRemove.call(this, type, w, opts);
          }
        }
      }
      return nRemove.apply(this, arguments);
    };
    proto.__alpProto = true;
    log('XRSession prototype hooked');
  }
  function own(fn) { fn.__alpOwn = true; return fn; }

  var INTERCEPTED = { selectstart: 1, select: 1, selectend: 1, squeezestart: 1, squeeze: 1, squeezeend: 1 };
  var consumed = [], releaseQueue = [], pressing = [], hover = [], prevPads = [];
  var pressTarget = null;
  function isConsumed(e) { return !!(e && e.inputSource && consumed.indexOf(e.inputSource) !== -1); }

  function attachSession(session, via) {
    if (!session || session.__alpAttached) return;
    try { if (session.renderState && typeof session.renderState.inlineVerticalFieldOfView === 'number') return; } catch (e) {}
    session.__alpAttached = true;
    xr.session = session;
    stats.sessions++; stats.via = via || ''; stats.frames = 0; stats.drawn = 0; stats.path = '';
    log('immersive session started (attached via ' + stats.via + ')');
    var origAdd = nativeOf(session, 'addEventListener'), origRemove = nativeOf(session, 'removeEventListener');
    origAdd.call(session, 'selectstart', own(function (e) { decidePress(e); }));
    origAdd.call(session, 'select', own(onSelect));
    origAdd.call(session, 'selectend', own(onSelectEnd));

    var protoWraps = !!(session.addEventListener && session.addEventListener.__alpProtoAdd);
    var wrapMap = [];
    if (!protoWraps) session.addEventListener = function (type, listener, opts) {
      if (INTERCEPTED[type] && listener) {
        var wrapped = function (e) {
          if (isConsumed(e)) return;
          return typeof listener === 'function' ? listener.call(this, e) : listener.handleEvent(e);
        };
        wrapMap.push({ type: type, listener: listener, wrapped: wrapped });
        return origAdd.call(session, type, wrapped, opts);
      }
      return origAdd.apply(session, arguments);
    };
    if (!protoWraps) session.removeEventListener = function (type, listener, opts) {
      if (INTERCEPTED[type]) {
        for (var i = 0; i < wrapMap.length; i++) {
          if (wrapMap[i].type === type && wrapMap[i].listener === listener) {
            var w = wrapMap[i].wrapped; wrapMap.splice(i, 1);
            return origRemove.call(session, type, w, opts);
          }
        }
      }
      return origRemove.apply(session, arguments);
    };
    ['onselectstart', 'onselect', 'onselectend', 'onsqueezestart', 'onsqueeze', 'onsqueezeend'].forEach(function (prop) {
      var handler = null;
      try {
        Object.defineProperty(session, prop, {
          configurable: true,
          get: function () { return handler; },
          set: function (fn) { handler = typeof fn === 'function' ? fn : null; }
        });
        origAdd.call(session, prop.slice(2), own(function (e) { if (handler && !isConsumed(e)) handler.call(session, e); }));
      } catch (e) {}
    });

    var origRAF = nativeOf(session, 'requestAnimationFrame'), origCancel = session.cancelAnimationFrame;
    var pendingRaf = {}, generation = 0, remaining = 0, lastFrame = null;
    session.requestAnimationFrame = function (cb) {
      var gen = generation;
      var id = origRAF.call(session, function (t, frame) {
        if (frame !== lastFrame) {
          lastFrame = frame; generation++; remaining = 0;
          for (var k in pendingRaf) if (pendingRaf[k] < generation) remaining++;
        }
        delete pendingRaf[id];
        try { cb(t, frame); }
        finally {
          remaining--;
          if (remaining <= 0) {
            remaining = 0;
            try { onXRFrame(t, frame); } catch (e) { warn('frame error', e); }
          }
        }
      });
      pendingRaf[id] = gen;
      return id;
    };
    session.cancelAnimationFrame = function (id) {
      if (pendingRaf.hasOwnProperty(id)) { if (pendingRaf[id] < generation) remaining--; delete pendingRaf[id]; }
      return origCancel.call(session, id);
    };

    var spaces = ['local', 'local-floor', 'viewer'];
    (function next() {
      var type = spaces.shift();
      if (!type) { warn('no reference space available'); return; }
      session.requestReferenceSpace(type).then(function (s) { xr.refSpace = s; log('reference space:', type); }, next);
    })();

    origAdd.call(session, 'end', own(function () {
      log('immersive session ended');
      if (xr.session !== session) return;
      xr.session = null; xr.refSpace = null; stats.testMode = false;
      consumed = []; pressing = []; hover = []; prevPads = []; pressTarget = null; gestured = []; pressInfo = [];
      anchor.set = false; room.set = false; grab = null;
      for (var i = 0; i < panels.length; i++) { panels[i].opacity = 0; panels[i].hoverId = null; }
      ALP.bus.emit('vr:exit');
    }));

    try { ALP.tour.hideVRMenu(); } catch (e) {}
    E.dirty();
    ALP.bus.emit('vr:enter', { via: via });
  }

  function rayFromPose(pose) {
    var m = pose.transform.matrix;
    return { o: [m[12], m[13], m[14]], d: [-m[8], -m[9], -m[10]], m: m };
  }
  function barGeom(p) {
    var ph = p.h * p.scale, bw = Math.min(0.16, Math.max(0.07, p.w * p.scale * 0.3));
    return { w: bw, h: bw * 48 / 256, y: -ph / 2 - 0.032 };
  }
  function raycastPanel(p, ray) {
    if (!p.model) return null;
    var inv = M4.invRigid(p.model);
    var o = M4.xformPoint(inv, ray.o), d = M4.xformDir(inv, ray.d);
    if (d[2] >= -1e-6) return null;
    var t = -o[2] / d[2];
    if (t <= 0) return null;
    var x = o[0] + d[0] * t, y = o[1] + d[1] * t;
    var w = p.w * p.scale, h = p.h * p.scale;
    var u = x / w + 0.5, v = 0.5 - y / h;
    if (u < 0 || u > 1 || v < 0 || v > 1) {
      if (p.barA > 0.3) {
        var bg = barGeom(p);
        if (Math.abs(x) < bg.w / 2 + 0.015 && Math.abs(y - bg.y) < bg.h / 2 + 0.02) return { panel: p, id: '__bar', t: t, local: [x, y] };
      }
      return null;
    }
    var px = u * p.px[0], py = v * p.px[1], id = null, r = p.regions;
    for (var i = r.length - 1; i >= 0; i--) {
      if (px >= r[i].x && px <= r[i].x + r[i].w && py >= r[i].y && py <= r[i].y + r[i].h) { id = r[i].id; break; }
    }
    return { panel: p, id: id, t: t, local: [x, y] };
  }
  function hitTest(ray) {
    for (var i = panels.length - 1; i >= 0; i--) {
      var p = panels[i];
      if (!interactive(p)) continue;
      var h = raycastPanel(p, ray);
      if (h) return h;
    }
    return null;
  }
  function sourceIndex(list, src) { for (var i = 0; i < list.length; i++) if (list[i].source === src) return i; return -1; }

  var pressInfo = [], gestured = [];
  function decidePress(e) {
    if (EC.debugInput && e) log('input', e.type, e.inputSource && e.inputSource.handedness);
    if (!e || !e.inputSource || e.type === 'selectend') return;
    var gi = gestured.indexOf(e.inputSource);
    if (e.type === 'selectstart') { if (gi !== -1) gestured.splice(gi, 1); }
    else if (gi !== -1) { gestured.splice(gi, 1); pressTarget = null; return; }
    if (pressing.indexOf(e.inputSource) !== -1) return;
    // only a real selectstart holds the trigger down; a late select after selectend must not leave it stuck
    if (e.type === 'selectstart') pressing.push(e.inputSource);
    var hi0 = sourceIndex(hover, e.inputSource), h0 = hi0 !== -1 ? hover[hi0].hit : null;
    var pi0 = sourceIndex(pressInfo, e.inputSource);
    var rec = { source: e.inputSource, t: Date.now(), panel: h0 ? h0.panel : null, id: h0 ? h0.id : null };
    if (pi0 !== -1) pressInfo[pi0] = rec; else pressInfo.push(rec);
    var hit = null;
    try {
      if (e.frame && xr.refSpace) {
        var pose = e.frame.getPose(e.inputSource.targetRaySpace, xr.refSpace);
        if (pose) hit = hitTest(rayFromPose(pose));
      }
    } catch (err) {}
    if (!hit) { var hi = sourceIndex(hover, e.inputSource); if (hi !== -1) hit = hover[hi].hit; }
    var modal = topModal();
    var world = null;
    if (!hit && !modal) {
      var hw = sourceIndex(hover, e.inputSource);
      world = hw !== -1 ? hover[hw].world : null;
    }
    if (hit || world || (modal && modal.opacity > 0.5)) {
      if (consumed.indexOf(e.inputSource) === -1) consumed.push(e.inputSource);
      if (hit) pressTarget = { panel: hit.panel, id: hit.id, source: e.inputSource };
      else if (world) pressTarget = { world: world, source: e.inputSource };
      else pressTarget = { panel: modal, id: '__outside', source: e.inputSource };
    }
  }
  function onSelect(e) {
    decidePress(e);
    if (!isConsumed(e) || !pressTarget || pressTarget.source !== e.inputSource) return;
    var t = pressTarget; pressTarget = null;
    if (t.id === '__bar') return;
    if (t.world) {
      pulse(e.inputSource, 0.45, 26);
      log('press world', t.world.id || '-');
      if (t.world.onPress) { try { t.world.onPress(t.world); } catch (err) { warn('world press error', err); } }
      return;
    }
    if (t.id && t.panel && t.panel.onPress) {
      log('press', t.panel.id + ':' + t.id);
      pulse(e.inputSource, 0.5, 30);
      ALP.anim.owner = t.panel.id;
      ALP.anim.flash(t.panel.id + '/p:' + t.id, 4.5);
      ALP.anim.owner = null;
      t.panel.dirty = true;
      try { t.panel.onPress(t.id, t.panel); } catch (err) { warn('onPress error', err); }
    }
  }
  function onSelectEnd(e) {
    if (EC.debugInput) log('input selectend', e.inputSource && e.inputSource.handedness);
    var pi = pressing.indexOf(e.inputSource);
    if (pi !== -1) pressing.splice(pi, 1);
    var pj = sourceIndex(pressInfo, e.inputSource);
    if (pj !== -1) pressInfo.splice(pj, 1);
    // a gesture blocks the click that ends it; headsets send that select just before selectend, some emulators
    // at the start, so the marker is dropped right after this release either way
    var gsrc = e.inputSource;
    setTimeout(function () { var k = gestured.indexOf(gsrc); if (k !== -1 && pressing.indexOf(gsrc) === -1) gestured.splice(k, 1); }, 0);
    if (isConsumed(e)) releaseQueue.push(e.inputSource);
    if (pressTarget && pressTarget.source === e.inputSource) pressTarget = null;
  }
  function pulse(src, v, ms) {
    try { var a = src.gamepad.hapticActuators[0]; if (a && a.pulse) a.pulse(v, ms); } catch (e) {}
  }
  E.pulse = pulse;
  // a press that turned into a gesture (a pinch, a drag) must not also click
  E.cancelPress = function (src) {
    if (pressTarget && (!src || pressTarget.source === src)) pressTarget = null;
    if (src && consumed.indexOf(src) === -1) consumed.push(src);
    if (src && gestured.indexOf(src) === -1 && pressing.indexOf(src) !== -1) gestured.push(src);
  };

  /* ---------- grabbing a panel to move it ---------- */
  var grab = null;
  function movable(p) {
    if (!EC.grab || !p || p.fullscreen || p.movable === false || p.interactive === false) return false;
    var m = typeof p.modal === 'function' ? p.modal(S) : p.modal;
    return !m && !!p.model;
  }
  function startGrab(src, hit, ray, mode) {
    var p = hit.panel;
    if (grab || !movable(p)) return false;
    var c = [p.model[12], p.model[13], p.model[14]];
    var hp = [ray.o[0] + ray.d[0] * hit.t, ray.o[1] + ray.d[1] * hit.t, ray.o[2] + ray.d[2] * hit.t];
    var cur = E.pins[pinKey(p)];
    grab = { source: src, panel: p, key: pinKey(p), t: hit.t, off: [c[0] - hp[0], c[1] - hp[1], c[2] - hp[2]], mode: mode, s: cur && cur.s ? cur.s : 1 };
    if (consumed.indexOf(src) === -1) consumed.push(src);
    if (pressTarget && pressTarget.source === src) pressTarget = null;
    if (mode === 'select' && gestured.indexOf(src) === -1) gestured.push(src);
    p.targetScale = 1.04;
    pulse(src, 0.35, 24);
    log('grab', p.id);
    ALP.bus.emit('vr:grab', { id: p.id });
    return true;
  }
  function endGrab() {
    if (!grab) return;
    grab.panel.targetScale = 1;
    pulse(grab.source, 0.25, 18);
    if (grab.mode === 'squeeze') releaseQueue.push(grab.source);
    log('placed', grab.panel.id, JSON.stringify(E.pins[grab.key] || {}));
    savePins();
    ALP.bus.emit('vr:placed', { id: grab.panel.id });
    grab = null;
  }
  function updateGrab(entry, held, dt) {
    if (!grab) return;
    if (!entry || !entry.ray || !held || !room.set) { endGrab(); return; }
    var gp = grab.source.gamepad;
    if (gp && gp.axes && gp.axes.length >= 4) {
      var ay = gp.axes[3];
      if (Math.abs(ay) > 0.25) grab.t = U.clamp(grab.t * (1 + ay * dt * 1.4), 0.35, 4.5);
    }
    var r = entry.ray;
    var P = [r.o[0] + r.d[0] * grab.t + grab.off[0], r.o[1] + r.d[1] * grab.t + grab.off[1], r.o[2] + r.d[2] * grab.t + grab.off[2]];
    var loc = M4.xformPoint(M4.invRigid(E.roomMatrix()), P);
    var dist = U.clamp(Math.sqrt(loc[0] * loc[0] + loc[2] * loc[2]), 0.55, 4.5);
    E.pins[grab.key] = { yaw: Math.atan2(-loc[0], -loc[2]) * 180 / Math.PI, y: loc[1], dist: dist, s: grab.s };
  }
  E.grabbing = function () { return grab ? grab.panel.id : null; };
  E._inputDebug = function () { return { pressing: pressing.length, gestured: gestured.length, consumed: consumed.length, target: pressTarget ? (pressTarget.panel ? pressTarget.panel.id + ':' + pressTarget.id : 'world') : null, info: pressInfo.length }; };

  E.onToggle = function () {
    if (S.overlay) { ALP.closeOverlay(); return; }
    if (S.screen === 'start' || S.screen === 'lobby' || S.screen === 'intro' || S.screen === 'projects') return;
    ALP.set({ uiHidden: !S.uiHidden });
    anchor.set = false;
  };

  function updateInput(frame, dt) {
    for (var r = 0; r < releaseQueue.length; r++) {
      var ci = consumed.indexOf(releaseQueue[r]);
      if (ci !== -1) consumed.splice(ci, 1);
    }
    releaseQueue = [];
    var sources = xr.session.inputSources || [], next = [], pads = [], hovered = {};
    var modal = topModal();
    for (var i = 0; i < sources.length; i++) {
      var src = sources[i], hit = null, ray = null;
      if (src.targetRaySpace && src.targetRayMode !== 'screen') {
        var pose = null;
        try { pose = frame.getPose(src.targetRaySpace, xr.refSpace); } catch (e) {}
        if (pose) {
          ray = rayFromPose(pose);
          hit = hitTest(ray);
          var prev = sourceIndex(hover, src), prevHit = prev !== -1 ? hover[prev].hit : null;
          if (hit && hit.id && (!prevHit || prevHit.id !== hit.id || prevHit.panel !== hit.panel)) pulse(src, 0.15, 12);
          if (hit && hit.id && hit.id !== '__bar') hovered[hit.panel.id] = hit.id;
        }
      }
      var gp = src.gamepad, grabbing = !!(grab && grab.source === src);
      var squeeze = !!(gp && gp.buttons && gp.buttons[1] && gp.buttons[1].pressed);
      if (grabbing && ray && (!hit || hit.panel !== grab.panel)) hit = { panel: grab.panel, id: null, t: grab.t, local: [0, 0] };
      if (grabbing && hit) hit = { panel: hit.panel, id: null, t: hit.t, local: hit.local };
      var world = (!hit && ray && !modal && !grabbing) ? worldPick(ray) : null;
      var entry = { source: src, hit: hit, ray: ray, world: world, pressed: pressing.indexOf(src) !== -1, squeeze: squeeze, grabbing: grabbing };
      next.push(entry);
      if (!grab && hit && ray && !modal) {
        var wasSq = sourceIndex(prevPads, src) !== -1 && prevPads[sourceIndex(prevPads, src)].b[1];
        if (squeeze && !wasSq) startGrab(src, hit, ray, 'squeeze');
        else {
          var pr = sourceIndex(pressInfo, src);
          if (pr !== -1 && entry.pressed && pressInfo[pr].panel === hit.panel && (pressInfo[pr].id === '__bar' || (!pressInfo[pr].id && Date.now() - pressInfo[pr].t > EC.grabHoldMs))) startGrab(src, hit, ray, 'select');
        }
        if (grab && grab.source === src) { entry.grabbing = true; grabbing = true; }
      }
      if (grab && grab.source === src) updateGrab(entry, grab.mode === 'squeeze' ? squeeze : entry.pressed, dt || 0.016);

      var pi = sourceIndex(prevPads, src);
      var was = pi !== -1 ? prevPads[pi] : { b: [], sx: 0, sy: 0 };
      var cur = { source: src, b: [], sx: 0, sy: 0 };
      if (gp && gp.buttons) {
        for (var b = 0; b < gp.buttons.length; b++) {
          cur.b[b] = !!(gp.buttons[b] && gp.buttons[b].pressed);
          if (cur.b[b] && !was.b[b] && EC.toggleButtons.indexOf(b) !== -1) E.onToggle();
        }
        // thumbstick click brings every panel back in front of you, keeping your arrangement
        if (cur.b[3] && !was.b[3] && !grabbing) { E.recenterAll(); ALP.bus.emit('vr:recenter'); }
        if (gp.axes && gp.axes.length >= 4 && !grabbing) {
          var ax = gp.axes[2], ay = gp.axes[3];
          cur.sx = ax > 0.75 ? 1 : (ax < -0.75 ? -1 : 0);
          cur.sy = ay > 0.75 ? 1 : (ay < -0.75 ? -1 : 0);
          var target = hit ? hit.panel : (world || null);
          if (cur.sx && cur.sx !== was.sx) {
            var sxT = modal && modal.onStickX ? modal : (target && target.onStickX ? target : null);
            if (sxT) { try { sxT.onStickX(cur.sx); } catch (e) {} }
          }
          if (target && target.onStick && cur.sy && cur.sy !== was.sy) { try { target.onStick(cur.sy); } catch (e) {} }
        }
      }
      pads.push(cur);
    }
    if (grab && sourceIndex(next, grab.source) === -1) endGrab();
    hover = next; prevPads = pads;
    for (var p = 0; p < panels.length; p++) {
      var id = hovered[panels[p].id] || null;
      if (panels[p].hoverId !== id) { panels[p].hoverId = id; panels[p].dirty = true; }
    }
  }

  var anchor = { set: false, yaw: 0, pos: [0, 0, 0], following: false };
  function updateLayout(pose, dt) {
    var m = pose.transform.matrix;
    var head = [m[12], m[13], m[14]], fwd = [-m[8], -m[9], -m[10]];
    var headYaw = Math.atan2(-fwd[0], -fwd[2]);
    var anyHover = false;
    for (var h = 0; h < hover.length; h++) if (hover[h].hit) anyHover = true;
    if (!room.set) { room.yaw = headYaw; room.pos = head.slice(); room.set = true; }
    if (!anchor.set) {
      anchor.yaw = headYaw; anchor.pos = head.slice(); anchor.set = true;
    } else if (EC.followMode === 'follow') {
      var diff = U.angleDiff(headYaw, anchor.yaw);
      var lim = (topModal() ? EC.modalFollowThresholdDeg : EC.followThresholdDeg) * Math.PI / 180;
      if ((Math.abs(diff) > lim && !anyHover) || anchor.following) {
        anchor.following = Math.abs(diff) > 0.05;
        var k = Math.min(1, dt * EC.followSpeed);
        anchor.yaw += diff * k;
        for (var i = 0; i < 3; i++) anchor.pos[i] += (head[i] - anchor.pos[i]) * k;
      }
    }
    var base = M4.mul(M4.translate(anchor.pos[0], anchor.pos[1], anchor.pos[2]), M4.rotY(anchor.yaw));
    var roomBase = E.roomMatrix();
    for (var p = 0; p < panels.length; p++) {
      var pn = panels[p];
      if (pn.fullscreen) { pn.model = null; continue; }
      if (pn.targetOpacity <= 0 && pn.opacity <= 0) continue;
      var L = E.layoutOf(pn);
      if (pn.measure) pn.measure();
      pn.w = L.deg ? 2 * L.dist * Math.tan(L.deg * Math.PI / 360) : (L.width || (pn.px[0] / (L.ppm || 1200)));
      pn.h = pn.w * pn.px[1] / pn.px[0];
      var tilt = Math.atan2(L.y || 0, L.dist);
      var rise = (1 - pn.opacity) * (pn.enterRise === undefined ? 0.06 : pn.enterRise);
      pn.model = M4.mul(L.pinned ? roomBase : base, M4.mul(M4.rotY((L.yaw || 0) * Math.PI / 180), M4.mul(M4.translate(0, (L.y || 0) - rise, -L.dist), M4.rotX(tilt))));
    }
  }

  function paint(p, now) {
    ALP.anim.owner = p.id;
    p.animDirty = false;
    p.paintedAt = now || Date.now();
    if (p.measure) p.measure();
    if (!p.canvas) p.canvas = document.createElement('canvas');
    var c = p.canvas;
    if (c.width !== p.px[0] || c.height !== p.px[1]) { c.width = p.px[0]; c.height = p.px[1]; }
    var ctx = c.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // two strips rather than one whole-canvas clear: some browsers skip a whole-canvas clear and leave old pixels behind
    ctx.clearRect(0, 0, c.width, Math.max(1, c.height - 1));
    ctx.clearRect(0, c.height - 1, c.width, 1);
    var regions = [];
    var ui = {
      button: function (id, x, y, w, h) { regions.push({ id: id, x: x, y: y, w: w, h: h }); return p.hoverId === id; },
      hover: function (id) { return p.hoverId === id; },
      anim: function (key, target, speed) { return ALP.anim.to(p.id + '/' + key, target, speed); },
      lift: function (id, x, y, w, h, speed) {
        regions.push({ id: id, x: x, y: y, w: w, h: h });
        return ALP.anim.to(p.id + '/h:' + id, p.hoverId === id ? 1 : 0, speed || 14);
      },
      press: function (id) { return ALP.anim.to(p.id + '/p:' + id, 0, 5); },
      now: function () { return ALP.anim.now(); },
      enter: function () { return ALP.anim.now() - (p.shownAt || 0); },
      stagger: function (i, step, dur) { return ALP.anim.ease((ALP.anim.now() - (p.shownAt || 0) - i * (step || 0.05)) / (dur || 0.32)); }
    };
    ctx.save();
    try { p.draw(ctx, ui, p); } catch (e) { warn('draw error in', p.id, e && e.message ? e.message : e); }
    ctx.restore();
    p.regions = regions;
    ALP.anim.owner = null;
    p.dirty = false;
    p.uploaded = false;
  }

  function createRenderer(gl) {
    var isGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
    var vaoExt = isGL2 ? null : gl.getExtension('OES_vertex_array_object');
    function compile(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) warn('shader', gl.getShaderInfoLog(s));
      return s;
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER,
      'attribute vec2 aPos;uniform mat4 uMVP;varying vec2 vUv;void main(){vUv=vec2(aPos.x+0.5,0.5-aPos.y);gl_Position=uMVP*vec4(aPos,0.0,1.0);}'));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER,
      'precision mediump float;uniform sampler2D uTex;uniform float uOpacity;varying vec2 vUv;void main(){gl_FragColor=texture2D(uTex,vUv)*uOpacity;}'));
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    var uMVP = gl.getUniformLocation(prog, 'uMVP'), uTex = gl.getUniformLocation(prog, 'uTex'), uOpacity = gl.getUniformLocation(prog, 'uOpacity');

    var prevBuf = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, prevBuf);
    var vao = null;
    if (isGL2 || vaoExt) {
      var prevVao = gl.getParameter(isGL2 ? gl.VERTEX_ARRAY_BINDING : vaoExt.VERTEX_ARRAY_BINDING_OES);
      vao = isGL2 ? gl.createVertexArray() : vaoExt.createVertexArrayOES();
      if (isGL2) gl.bindVertexArray(vao); else vaoExt.bindVertexArrayOES(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      if (isGL2) gl.bindVertexArray(prevVao); else vaoExt.bindVertexArrayOES(prevVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, prevBuf);
    }

    function newTex() {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return t;
    }
    // same-size repaints update the texture in place; reallocating it on every repaint is costly on a headset GPU
    function upload(tex, canvas) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      if (tex.__alpW === canvas.width && tex.__alpH === canvas.height) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      else { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas); tex.__alpW = canvas.width; tex.__alpH = canvas.height; }
      if (isGL2) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
    }
    // a panel can show a video element straight from WebGL (option media: a function that returns the element when it has a
    // frame). Headset browsers built on Firefox play video but can give back black frames when it is drawn into a 2D canvas;
    // the WebGL upload is the path 3DVista uses for its own videos, so it works wherever those do
    function uploadMedia(tex, el) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      var w = el.videoWidth || el.width, h = el.videoHeight || el.height;
      if (tex.__alpW === w && tex.__alpH === h && tex.__alpMedia) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, el);
      else { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el); tex.__alpW = w; tex.__alpH = h; tex.__alpMedia = true; }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    function mk(w, h, fn) { var c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d')); return c; }
    var cursorCanvas = mk(64, 64, function (ctx) {
      var g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
      g.addColorStop(0, '#fff'); g.addColorStop(0.45, '#fff'); g.addColorStop(0.55, 'rgba(0,0,0,.8)');
      g.addColorStop(0.7, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    });
    var rayCanvas = mk(8, 128, function (ctx) {
      var g = ctx.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 128);
    });
    // the grab bar under a panel, like a window bar, shown while you point at the panel
    var barCanvas = mk(256, 48, function (ctx) {
      var x = 8, y = 10, w = 240, h = 28, r = 14;
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(x + r, y + h); ctx.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath();
      ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 8; ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.fill();
    });
    var cursorTex = null, rayTex = null, barTex = null, fbo = null, texs = {};
    var FULLSCREEN = M4.scale(2, 2, 1);

    function save() {
      var s = {};
      s.fb = gl.getParameter(gl.FRAMEBUFFER_BINDING);
      if (isGL2) {
        s.readFb = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
        s.unpackBuf = gl.getParameter(gl.PIXEL_UNPACK_BUFFER_BINDING);
        s.rd = gl.isEnabled(gl.RASTERIZER_DISCARD);
        s.rowLength = gl.getParameter(gl.UNPACK_ROW_LENGTH); s.skipRows = gl.getParameter(gl.UNPACK_SKIP_ROWS);
        s.skipPixels = gl.getParameter(gl.UNPACK_SKIP_PIXELS); s.imageHeight = gl.getParameter(gl.UNPACK_IMAGE_HEIGHT);
        s.skipImages = gl.getParameter(gl.UNPACK_SKIP_IMAGES);
      }
      s.viewport = gl.getParameter(gl.VIEWPORT);
      s.scissor = gl.isEnabled(gl.SCISSOR_TEST);
      s.blend = gl.isEnabled(gl.BLEND);
      s.bs = gl.getParameter(gl.BLEND_SRC_RGB); s.bd = gl.getParameter(gl.BLEND_DST_RGB);
      s.bsa = gl.getParameter(gl.BLEND_SRC_ALPHA); s.bda = gl.getParameter(gl.BLEND_DST_ALPHA);
      s.be = gl.getParameter(gl.BLEND_EQUATION_RGB); s.bea = gl.getParameter(gl.BLEND_EQUATION_ALPHA);
      s.depth = gl.isEnabled(gl.DEPTH_TEST); s.depthMask = gl.getParameter(gl.DEPTH_WRITEMASK);
      s.cull = gl.isEnabled(gl.CULL_FACE); s.stencil = gl.isEnabled(gl.STENCIL_TEST);
      s.a2c = gl.isEnabled(gl.SAMPLE_ALPHA_TO_COVERAGE); s.po = gl.isEnabled(gl.POLYGON_OFFSET_FILL);
      s.colorMask = gl.getParameter(gl.COLOR_WRITEMASK);
      s.program = gl.getParameter(gl.CURRENT_PROGRAM);
      s.activeTex = gl.getParameter(gl.ACTIVE_TEXTURE);
      gl.activeTexture(gl.TEXTURE0);
      s.tex0 = gl.getParameter(gl.TEXTURE_BINDING_2D);
      if (isGL2) s.sampler0 = gl.getParameter(gl.SAMPLER_BINDING);
      s.arrayBuf = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
      s.flipY = gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL); s.premul = gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL);
      s.conv = gl.getParameter(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL); s.align = gl.getParameter(gl.UNPACK_ALIGNMENT);
      if (vao) s.vao = gl.getParameter(isGL2 ? gl.VERTEX_ARRAY_BINDING : vaoExt.VERTEX_ARRAY_BINDING_OES);
      else s.attr0 = {
        enabled: gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_ENABLED), buffer: gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING),
        size: gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_SIZE), type: gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_TYPE),
        norm: gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_NORMALIZED), stride: gl.getVertexAttrib(0, gl.VERTEX_ATTRIB_ARRAY_STRIDE),
        offset: gl.getVertexAttribOffset(0, gl.VERTEX_ATTRIB_ARRAY_POINTER)
      };
      return s;
    }
    function setup() {
      if (isGL2) {
        gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
        gl.disable(gl.RASTERIZER_DISCARD);
        gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
        gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0); gl.pixelStorei(gl.UNPACK_IMAGE_HEIGHT, 0);
        gl.pixelStorei(gl.UNPACK_SKIP_IMAGES, 0);
        gl.bindSampler(0, null);
      }
      gl.disable(gl.SCISSOR_TEST); gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
      gl.disable(gl.CULL_FACE); gl.disable(gl.STENCIL_TEST);
      gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE); gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.colorMask(true, true, true, true);
      gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD);
      gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      gl.useProgram(prog); gl.uniform1i(uTex, 0);
      if (vao) { if (isGL2) gl.bindVertexArray(vao); else vaoExt.bindVertexArrayOES(vao); }
      else { gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); }
    }
    function restore(s) {
      if (isGL2) {
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, s.fb); gl.bindFramebuffer(gl.READ_FRAMEBUFFER, s.readFb);
        gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, s.unpackBuf);
        if (s.rd) gl.enable(gl.RASTERIZER_DISCARD);
        gl.pixelStorei(gl.UNPACK_ROW_LENGTH, s.rowLength); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, s.skipRows);
        gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, s.skipPixels); gl.pixelStorei(gl.UNPACK_IMAGE_HEIGHT, s.imageHeight);
        gl.pixelStorei(gl.UNPACK_SKIP_IMAGES, s.skipImages);
        gl.bindSampler(0, s.sampler0);
      } else gl.bindFramebuffer(gl.FRAMEBUFFER, s.fb);
      gl.viewport(s.viewport[0], s.viewport[1], s.viewport[2], s.viewport[3]);
      if (s.scissor) gl.enable(gl.SCISSOR_TEST);
      if (!s.blend) gl.disable(gl.BLEND);
      gl.blendFuncSeparate(s.bs, s.bd, s.bsa, s.bda); gl.blendEquationSeparate(s.be, s.bea);
      if (s.depth) gl.enable(gl.DEPTH_TEST);
      gl.depthMask(s.depthMask);
      if (s.cull) gl.enable(gl.CULL_FACE);
      if (s.stencil) gl.enable(gl.STENCIL_TEST);
      if (s.a2c) gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
      if (s.po) gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.colorMask(s.colorMask[0], s.colorMask[1], s.colorMask[2], s.colorMask[3]);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, s.flipY); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, s.premul);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, s.conv); gl.pixelStorei(gl.UNPACK_ALIGNMENT, s.align);
      gl.useProgram(s.program);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, s.tex0); gl.activeTexture(s.activeTex);
      if (vao) {
        if (isGL2) gl.bindVertexArray(s.vao); else vaoExt.bindVertexArrayOES(s.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, s.arrayBuf);
      } else {
        var a = s.attr0;
        if (a.buffer) { gl.bindBuffer(gl.ARRAY_BUFFER, a.buffer); gl.vertexAttribPointer(0, a.size, a.type, a.norm, a.stride, a.offset); }
        if (a.enabled) gl.enableVertexAttribArray(0); else gl.disableVertexAttribArray(0);
        gl.bindBuffer(gl.ARRAY_BUFFER, s.arrayBuf);
      }
    }

    var render3dWarned = false;
    function targets(session, pose) {
      var out = [], views = pose.views, rs = session.renderState, i;
      if (rs.baseLayer) {
        stats.path = 'XRWebGLLayer';
        if (!targets.logged) { log('drawing into XRWebGLLayer (baseLayer), ' + views.length + ' views'); targets.logged = true; }
        for (i = 0; i < views.length; i++) {
          var vp = rs.baseLayer.getViewport(views[i]);
          if (vp) out.push({ fb: rs.baseLayer.framebuffer, vp: vp, view: views[i] });
        }
        return out;
      }
      if (rs.layers && rs.layers.length && xr.binding && isGL2) {
        var proj = null;
        for (i = 0; i < rs.layers.length; i++) {
          var L = rs.layers[i];
          if (typeof XRProjectionLayer !== 'undefined' ? L instanceof XRProjectionLayer : ('textureWidth' in L)) { proj = L; break; }
        }
        if (!proj) return out;
        stats.path = 'XRProjectionLayer';
        if (!targets.logged) { log('drawing into XRProjectionLayer (layers API), ' + views.length + ' views'); targets.logged = true; }
        if (!fbo) fbo = gl.createFramebuffer();
        for (i = 0; i < views.length; i++) {
          var sub = xr.binding.getViewSubImage(proj, views[i]);
          if (sub) out.push({ fb: fbo, vp: sub.viewport, view: views[i], sub: sub, array: proj.textureArrayLength > 1 });
        }
      }
      return out;
    }
    function bindTarget(tg) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, tg.fb);
      if (tg.sub) {
        if (tg.array) gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, tg.sub.colorTexture, 0, tg.sub.imageIndex || 0);
        else gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tg.sub.colorTexture, 0);
      }
      gl.viewport(tg.vp.x, tg.vp.y, tg.vp.width, tg.vp.height);
    }
    function quad(mvp, tex, opacity) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniformMatrix4fv(uMVP, false, mvp);
      gl.uniform1f(uOpacity, opacity);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    return {
      gl: gl,
      render: function (session, pose, list, rays, cursors) {
        var tgs = targets(session, pose);
        if (!tgs.length) { stats.path = 'none (no XR layer yet)'; if (!this.warned) { warn('no drawable XR layer found'); this.warned = true; } return; }
        stats.drawn++;
        var s = save();
        try {
          setup();
          gl.activeTexture(gl.TEXTURE0);
          if (!cursorTex) { cursorTex = newTex(); upload(cursorTex, cursorCanvas); rayTex = newTex(); upload(rayTex, rayCanvas); barTex = newTex(); upload(barTex, barCanvas); }
          for (var i = 0; i < list.length; i++) {
            var p = list[i];
            if (!texs[p.id]) { texs[p.id] = newTex(); p.uploaded = false; }
            var me = null;
            if (p.media && p.mediaOk !== false) { try { me = p.media(); } catch (merr) { me = null; } }
            if (me) {
              try { uploadMedia(texs[p.id], me); p.mediaOk = true; }
              catch (err) { p.mediaOk = false; warn('video upload failed for', p.id, err); }
              p.uploaded = false;
              continue;
            }
            if (texs[p.id].__alpMedia) { texs[p.id].__alpMedia = false; texs[p.id].__alpW = 0; p.uploaded = false; }
            if (!p.uploaded && p.canvas) {
              try { upload(texs[p.id], p.canvas); } catch (err) { warn('texture upload failed for', p.id, err); }
              p.uploaded = true;
            }
          }
          for (var t = 0; t < tgs.length; t++) {
            bindTarget(tgs[t]);
            var vp = M4.mul(tgs[t].view.projectionMatrix, tgs[t].view.transform.inverse.matrix);
            if (passes.length) {
              for (var pz = 0; pz < passes.length; pz++) {
                try { passes[pz](gl, vp, tgs[t], isGL2, t); } catch (perr) { if (!render3dWarned) { warn('3D pass error', perr); render3dWarned = true; } }
              }
              setup();
              bindTarget(tgs[t]);
            }
            for (var k = 0; k < list.length; k++) {
              var pn = list[k];
              if (pn.fullscreen) quad(FULLSCREEN, texs[pn.id], pn.opacity);
              else quad(M4.mul(vp, M4.mul(pn.model, M4.scale(pn.w * pn.scale, pn.h * pn.scale, 1))), texs[pn.id], pn.opacity * (pn.idleDim ? idle.f : 1));
            }
            for (var bk = 0; bk < list.length; bk++) {
              var bp = list[bk];
              if (!bp.barA || bp.barA < 0.01 || bp.fullscreen || !bp.model) continue;
              var bg = barGeom(bp);
              quad(M4.mul(vp, M4.mul(bp.model, M4.mul(M4.translate(0, bg.y, 0.002), M4.scale(bg.w, bg.h, 1)))), barTex, bp.opacity * bp.barA * (bp.barHot ? 0.95 : 0.55));
            }
            for (var r = 0; r < rays.length; r++) {
              var base = M4.mul(rays[r].m, M4.translate(0, 0, -rays[r].len / 2));
              var ribbon = M4.mul(M4.rotX(-Math.PI / 2), M4.scale(0.004, rays[r].len, 1));
              quad(M4.mul(vp, M4.mul(base, ribbon)), rayTex, 0.8);
              quad(M4.mul(vp, M4.mul(base, M4.mul(M4.rotZ(Math.PI / 2), ribbon))), rayTex, 0.8);
            }
            for (var c = 0; c < cursors.length; c++) {
              var cm = M4.mul(cursors[c].panel.model, M4.mul(M4.translate(cursors[c].local[0], cursors[c].local[1], 0.003), M4.scale(0.02, 0.02, 1)));
              quad(M4.mul(vp, cm), cursorTex, 1);
            }
          }
          if (tgs[0].sub) { gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0); }
        } catch (e) {
          if (!this.errored) { warn('render error', e); this.errored = true; }
        } finally { restore(s); }
      }
    };
  }

  var lastT = 0;
  function num(v) { return v === true ? 1 : (v ? +v : 0); }
  function onXRFrame(t, frame) {
    if (!xr.session || !xr.refSpace) return;
    var dt = lastT ? Math.min(0.1, (t - lastT) / 1000) : 0.016;
    lastT = t;
    var pose = frame.getViewerPose(xr.refSpace);
    if (!pose) return;
    xr.lastViewerMatrix = pose.transform.matrix;
    stats.frames++;
    var now = Date.now();
    var moving = ALP.anim.tick(dt);
    if (moving) for (var mk in moving) { var mp = E.get(mk); if (mp) mp.animDirty = true; }
    if (S.transition && S.transition.until < now) { S.transition = null; ALP.bus.emit('change', { transition: null }); }
    if (S.toast && S.toast.until < now) { S.toast = null; ALP.bus.emit('change', { toast: null }); }

    for (var i = 0; i < panels.length; i++) {
      var p = panels[i];
      var target = 0;
      try { target = p.show && live(p) ? num(p.show(S, p)) : 0; } catch (e) { target = 0; }
      if (target > 0 && p.targetOpacity <= 0) { p.scale = p.enterScale || 0.96; p.dirty = true; p.shownAt = ALP.anim.now(); }
      if (target > 0 && (p.spin || ALP.anim.now() - (p.shownAt || 0) < 0.9)) p.animDirty = true;
      p.targetOpacity = target;
      var speed = p.fadeSpeed || (p.fullscreen ? 2.2 : 4);
      var dOp = p.targetOpacity - p.opacity;
      p.opacity = Math.abs(dOp) < 0.01 ? p.targetOpacity : p.opacity + U.clamp(dOp, -dt * speed, dt * speed);
      p.scale += ((p.targetScale || 1) - p.scale) * Math.min(1, dt * 7);
    }
    updateLayout(pose, dt);
    updateInput(frame, dt);
    for (var bi = 0; bi < panels.length; bi++) {
      var bpn = panels[bi], bwant = 0, bhot = false;
      if (movable(bpn) && bpn.opacity > 0.5) {
        for (var bh = 0; bh < hover.length; bh++) if (hover[bh].hit && hover[bh].hit.panel === bpn) { bwant = 1; if (hover[bh].hit.id === '__bar') bhot = true; }
        if (grab && grab.panel === bpn) { bwant = 1; bhot = true; }
      }
      bpn.barHot = bhot;
      bpn.barA = (bpn.barA || 0) + (bwant - (bpn.barA || 0)) * Math.min(1, dt * (bwant ? 10 : 1.5));
    }
    for (var fi = 0; fi < frames.length; fi++) { try { frames[fi](dt, hover, pose); } catch (e) {} }
    // chrome that opts in with idleDim eases back while nobody points at the interface
    var busy = pressing.length > 0 || topModal();
    for (var hb = 0; hb < hover.length && !busy; hb++) if (hover[hb].hit || hover[hb].world) busy = true;
    if (busy || !EC.idleSeconds) idle.last = now;
    var idleWant = (EC.idleSeconds && now - idle.last > EC.idleSeconds * 1000) ? EC.idleOpacity : 1;
    idle.f += (idleWant - idle.f) * Math.min(1, dt * (idleWant < idle.f ? 1.6 : 9));

    var list = [];
    for (var j = 0; j < panels.length; j++) {
      var pn = panels[j];
      if (pn.opacity <= 0.002) continue;
      if (pn.dirty || (pn.animDirty && now - (pn.paintedAt || 0) > 20)) paint(pn, now);
      list.push(pn);
    }
    if (!list.length) return;

    var gl = (glFor && glFor.get(xr.session)) || xr.gl || findGLFallback();
    stats.gl = gl ? (typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? 'WebGL2' : 'WebGL1') : 'none';
    if (!gl) { if (!onXRFrame.warned) { warn('no WebGL context captured yet'); onXRFrame.warned = true; } return; }
    if (!xr.renderer || xr.renderer.gl !== gl) { xr.renderer = createRenderer(gl); for (var q = 0; q < panels.length; q++) panels[q].uploaded = false; }

    var rays = [], cursors = [];
    for (var h = 0; h < hover.length; h++) {
      var hv = hover[h];
      var hitPanel = !!hv.hit;
      if (hitPanel) cursors.push(hv.hit);
      var mode = EC.drawRay === 'auto' ? (stats.testMode ? 'always' : 'onHover') : EC.drawRay;
      var show = mode === 'always' ? true : (mode === 'onHover' ? hitPanel : false);
      if (show && hv.ray) rays.push({ m: hv.ray.m, len: hitPanel ? hv.hit.t : 1.5 });
    }
    xr.renderer.render(xr.session, pose, list, rays, cursors);
  }

  // can this device open VR: a standalone headset 3DVista knows, or any browser with a VR runtime behind it (Quest Link, Air Link, SteamVR)
  var xrOK = null;
  function checkXR(then) {
    try {
      if (navigator.xr && navigator.xr.isSessionSupported) {
        navigator.xr.isSessionSupported('immersive-vr').then(function (v) { xrOK = !!v; if (then) then(); }, function () { xrOK = false; if (then) then(); });
        return;
      }
    } catch (e) {}
    xrOK = false;
    if (then) then();
  }
  checkXR();
  try { if (navigator.xr && navigator.xr.addEventListener) navigator.xr.addEventListener('devicechange', function () { checkXR(); }); } catch (e) {}
  function tourVR() { try { var rp = ALP.tour.root(); return !!(rp && rp.get && rp.get('vrAvailable')); } catch (e) { return false; } }
  E.canVR = function () { return ALP.tour.seesHeadset() || xrOK === true || tourVR(); };
  E.vrSupport = function () { return { headset: ALP.tour.seesHeadset(), browser: xrOK, tour: tourVR() }; };

  // 3DVista's start picture: a centred, clickable image in a fading layer
  function vrGate() {
    var imgs = document.getElementsByTagName('img'), i;
    for (i = 0; i < imgs.length; i++) {
      var im = imgs[i], par = im.parentElement;
      if (im.style.cursor !== 'pointer' || (im.style.transform || '').indexOf('translate(-50%') === -1 || !par || (par.style.transition || '').indexOf('opacity') === -1) continue;
      var r = im.getBoundingClientRect();
      if (r.width < 8 || par.style.display === 'none') continue;
      try { if (im.checkVisibility && !im.checkVisibility({ checkVisibilityCSS: true })) continue; } catch (e) {}
      return im;
    }
    return null;
  }
  function pressEl(el) {
    var r = el.getBoundingClientRect(), o = { bubbles: true, cancelable: true, view: window, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
    try { el.dispatchEvent(new MouseEvent('mousedown', o)); el.dispatchEvent(new MouseEvent('mouseup', o)); } catch (e) {}
  }
  E.vrGate = vrGate;

  E.enterVR = function () {
    if (xr.session) return;
    var rp = ALP.tour.root();
    if (rp && typeof rp.enableVR === 'function' && E.canVR()) {
      // on a PC, 3DVista answers with its own "press to start VR" picture, often hidden under the page's welcome card;
      // pass the visitor's press on to it while the browser still counts it as theirs
      var steps = [0, 350, 900, 1600, 2600], asks = 0, gateClicks = 0, t0 = Date.now();
      var tick = function () {
        if (xr.session) return;
        var gate = vrGate();
        if (gate && gateClicks < 2) { pressEl(gate); gateClicks++; log('passed the press on to 3DVista to start VR'); }
        else if (!gate && asks < steps.length && Date.now() - t0 >= steps[asks]) {
          var vm = null;
          try { vm = rp.getMainViewer().get('viewMode'); } catch (e) {}
          if (vm !== 'vr') { try { rp.enableVR(); } catch (e) { warn('enableVR failed', e); } log('asked 3DVista to enter VR (attempt ' + (asks + 1) + ')'); }
          asks++;
        }
        if (Date.now() - t0 < 4800) setTimeout(tick, 120);
      };
      tick();
      // the headset may still be asking the visitor to allow VR, so only speak up if 3DVista never switched to VR at all
      setTimeout(function () {
        if (xr.session) return;
        var vm = null;
        try { vm = rp.getMainViewer().get('viewMode'); } catch (e) {}
        if (vm === 'vr') return;
        warn('3DVista did not open a VR session');
        E.noVR('stuck');
      }, 8000);
      return;
    }
    if (EC.testSession) { warn('no headset; starting the HUD test session'); E.testVR(); return; }
    E.noVR('none');
  };
  // the Enter VR buttons on the page call this: it waits for the browser's answer if it has not come back yet
  E.enterFromPage = function () {
    if (xr.session) return;
    if (xrOK === null && !ALP.tour.seesHeadset()) { checkXR(function () { E.enterVR(); }); return; }
    E.enterVR();
  };

  // a plain explanation instead of a button that does nothing
  var NV = { el: null };
  E.noVR = function (kind) {
    if (!document.body) return;
    if (NV.el && NV.el.parentNode) NV.el.parentNode.removeChild(NV.el);
    if (!document.getElementById('alp-novr-css')) {
      var st = document.createElement('style'); st.id = 'alp-novr-css';
      st.textContent = [
        '#alp-novr{position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;background:rgba(5,5,5,.72);',
        'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-family:Inter,Arial,sans-serif;color:#F2F0EC;opacity:0;transition:opacity .3s ease}',
        '#alp-novr.on{opacity:1}',
        '#alp-novr .nv-card{width:100%;max-width:540px;background:rgba(14,14,14,.96);border:1px solid rgba(255,255,255,.12);border-radius:26px;padding:38px 38px 32px;box-shadow:0 30px 70px rgba(0,0,0,.55);text-align:center}',
        '#alp-novr .nv-eyebrow{font-size:11px;letter-spacing:.34em;text-transform:uppercase;color:rgba(242,240,236,.5)}',
        '#alp-novr .nv-title{font-family:Marcellus,Georgia,serif;font-size:28px;letter-spacing:.14em;text-transform:uppercase;margin:14px 0 10px;font-weight:400}',
        '#alp-novr .nv-rule{width:72px;height:1px;background:rgba(255,255,255,.22);margin:0 auto 18px}',
        '#alp-novr .nv-text{font-size:14px;font-weight:300;line-height:1.7;color:rgba(242,240,236,.75);margin:0 0 26px}',
        '#alp-novr .nv-row{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}',
        '#alp-novr button{border-radius:999px;padding:13px 26px;font-family:inherit;font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;cursor:pointer}',
        '#alp-novr .nv-ok{background:#F2F1EE;color:#0C0C0D;border:1px solid #F2F1EE}',
        '#alp-novr .nv-copy{background:transparent;color:#F2F0EC;border:1px solid rgba(255,255,255,.35)}',
        '#alp-novr .nv-copy:hover{border-color:rgba(255,255,255,.7)}'
      ].join('');
      document.head.appendChild(st);
    }
    var stuck = kind === 'stuck';
    var title = stuck ? 'VR did not start' : 'No headset found';
    var text = stuck
      ? 'The headset did not open VR this time. Make sure it is awake and this link is open in its browser, then press Enter VR again.'
      : 'This tour opens in VR on a Meta Quest. Put on the headset, open this same link in its browser and press Enter VR. On a PC, connect the headset first with Quest Link, Air Link or SteamVR, then open the link in Chrome or Edge.';
    var el = document.createElement('div'); el.id = 'alp-novr';
    el.innerHTML = '<div class="nv-card"><div class="nv-eyebrow">Virtual Reality</div><div class="nv-title">' + title + '</div><div class="nv-rule"></div>' +
      '<p class="nv-text">' + text + '</p><div class="nv-row"><button type="button" class="nv-copy">Copy link</button><button type="button" class="nv-ok">OK</button></div></div>';
    var close = function () { el.className = ''; setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 320); if (NV.el === el) NV.el = null; };
    el.onclick = function (ev) { if (ev.target === el) close(); };
    el.getElementsByClassName('nv-ok')[0].onclick = function (ev) { ev.stopPropagation(); close(); };
    var copy = el.getElementsByClassName('nv-copy')[0];
    copy.onclick = function (ev) {
      ev.stopPropagation();
      var link = location.href.split('#')[0];
      var done = function () { copy.textContent = 'Link copied'; };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(done, function () { window.prompt('Copy this link', link); });
        else window.prompt('Copy this link', link);
      } catch (e) {}
    };
    NV.el = el;
    var host = document.fullscreenElement || document.webkitFullscreenElement || document.body;
    host.appendChild(el);
    setTimeout(function () { el.className = 'on'; }, 20);
    ALP.bus.emit('vr:unavailable', { kind: kind || 'none' });
  };

  E.testVR = function () {
    if (!navigator.xr) { warn('WebXR is not available in this browser'); return Promise.resolve(false); }
    if (xr.session) return Promise.resolve(true);
    stats.testMode = true;
    return navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] }).then(function (session) {
      if (!session.__alpAttached) attachSession(session, 'test button');
      var canvas = document.createElement('canvas');
      var attrs = { xrCompatible: true, antialias: true, alpha: false };
      var gl = canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs);
      session.updateRenderState({ baseLayer: new window.XRWebGLLayer(session, gl) });
      rememberGL(gl, session);
      var loop = function () {
        session.requestAnimationFrame(loop);
        var L = session.renderState.baseLayer;
        if (!L) return;
        gl.bindFramebuffer(gl.FRAMEBUFFER, L.framebuffer);
        gl.clearColor(0.17, 0.21, 0.26, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      };
      session.requestAnimationFrame(loop);
      log('HUD test session started (the tour image is not shown in this mode)');
      return true;
    }, function (e) { stats.testMode = false; warn('test session failed: ' + e); return false; });
  };
  E.isPresenting = function () { return !!xr.session; };
  E.hoverState = function () { return hover; };
  E.idleFactor = function () { return idle.f; };
  E.wake = function () { idle.last = Date.now(); idle.f = Math.max(idle.f, 0.99); };
  var passes = [], pickers = [], frames = [];
  E.addPass = function (fn) { passes.push(fn); };
  E.addPicker = function (fn) { pickers.push(fn); };
  E.addFrame = function (fn) { frames.push(fn); };
  // panels can show a video element through WebGL (the media option); screens check this before relying on it
  E.mediaPanels = true;

  /* ---------- several projects in one tour ---------- */
  // what one project sees of the engine: its own panels, its own saved positions, and hooks that only run while it is open
  E.scoped = function (X) {
    var sid = X.scopeId, V = Object.create(E), pre = sid + ':';
    function mine() { return ALP.scope === X; }
    V.panel = function (id, def) { def = def || {}; def.scope = sid; def.scopeObj = X; return E.panel(id, def); };
    V.get = function (id) { return findPanel(id, sid); };
    V.dirty = function (id) {
      if (!id) { E.dirty(); return; }
      var p = findPanel(id, sid); if (p) p.dirty = true;
    };
    V.addFrame = function (fn) { E.addFrame(function () { if (mine()) return fn.apply(this, arguments); }); };
    V.addPass = function (fn) { E.addPass(function () { if (mine()) return fn.apply(this, arguments); }); };
    V.addPicker = function (fn) { E.addPicker(function () { return mine() ? fn.apply(this, arguments) : null; }); };
    V.setPins = function (obj) { var o = {}, k; for (k in obj) o[pre + k] = obj[k]; E.setPins(o); };
    V.clearPins = function (keys) {
      var list = [], k, i;
      if (keys) for (i = 0; i < keys.length; i++) list.push(pre + keys[i]);
      else for (k in E.pins) if (k.indexOf(pre) === 0) list.push(k);
      E.clearPins(list);
    };
    V.hasPins = function (keys) {
      var k, i;
      if (!keys) { for (k in E.pins) if (k.indexOf(pre) === 0) return true; return false; }
      for (i = 0; i < keys.length; i++) if (E.pins[pre + keys[i]]) return true;
      return false;
    };
    Object.defineProperty(V, 'pins', { get: function () { var o = {}, k; for (k in E.pins) if (k.indexOf(pre) === 0) o[k.slice(pre.length)] = E.pins[k]; return o; } });
    return V;
  };
  // engine settings a project asked for apply while that project is open
  var EC0 = null;
  function applyScope() {
    var k, o = ALP.scope && ALP.scope.vrOverrides;
    if (!EC0) { EC0 = {}; for (k in EC) EC0[k] = EC[k]; }
    for (k in EC0) EC[k] = EC0[k];
    if (o) for (k in o) EC[k] = o[k];
  }
  E.applyScope = applyScope;
  ALP.bus.on('project', function () {
    applyScope();
    anchor.set = false; room.set = false;
    idle.last = Date.now(); idle.f = 1;
    E.dirty();
  });
  setTimeout(applyScope, 0);
  E.passes = passes;
  function worldPick(ray) {
    for (var i = 0; i < pickers.length; i++) {
      var r = null;
      try { r = pickers[i](ray); } catch (e) {}
      if (r) return r;
    }
    return null;
  }
  E.status = function () {
    var ua = navigator.userAgent || '', headset = 'desktop browser';
    var qi = ua.indexOf('Quest');
    if (qi !== -1) headset = ua.slice(qi, Math.max(qi + 5, ua.indexOf(')', qi)));
    else if (ua.indexOf('Pico') !== -1) headset = 'Pico';
    var tdvDevice = null;
    try { tdvDevice = String(window.TDV.PlayerAPI.device); } catch (e) {}
    return {
      version: ALP.version, webxr: !!navigator.xr, secure: !!window.isSecureContext,
      hooked: !!(navigator.xr && navigator.xr.__alpHooked),
      protoHooked: !!(window.XRSession && window.XRSession.prototype && window.XRSession.prototype.__alpProto),
      headset: headset, tdvDevice: tdvDevice, tdvSeesHeadset: ALP.tour.seesHeadset(),
      presenting: !!xr.session, testMode: stats.testMode, attachedVia: stats.via,
      sessions: stats.sessions, frames: stats.frames, drawn: stats.drawn, path: stats.path, gl: stats.gl,
      screen: S.screen, overlay: S.overlay, modules: Object.keys(ALP.modules).join(', '),
      lastError: ALP.stats.lastError
    };
  };

  function setupEnterButton() {
    if (EC.enterVRButton === false) return;
    var btn = null, label = null;
    var cont = ALP.tour.arrivedFromLobby().vr;
    function build() {
      btn = document.createElement('button');
      btn.id = 'alp-enter-vr';
      btn.type = 'button';
      var big = cont ? 'padding:18px 38px;font-size:16px;' : 'padding:12px 26px;font-size:13px;';
      btn.style.cssText = 'position:fixed;top:' + EC.enterVRTop + 'px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;align-items:center;gap:12px;' + big + 'border-radius:999px;border:1px solid rgba(255,255,255,.35);background:rgba(12,24,40,.82);color:#fff;cursor:pointer;font-family:Montserrat,Inter,Arial,sans-serif;font-weight:500;letter-spacing:.24em;text-transform:uppercase;box-shadow:0 8px 24px rgba(0,0,0,.45);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)';
      var ns = 'http' + '://www.w3.org/2000/svg';
      var svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '22'); svg.setAttribute('height', '22');
      var path = document.createElementNS(ns, 'path');
      path.setAttribute('d', ALP.icons.vr);
      path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '1.7'); path.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(path);
      btn.appendChild(svg);
      label = document.createTextNode(cont ? 'Continue in VR' : 'Enter VR');
      btn.appendChild(label);
      btn.onmouseenter = function () { btn.style.background = '#3D7BFF'; };
      btn.onmouseleave = function () { btn.style.background = 'rgba(12,24,40,.82)'; };
      btn.onclick = function () { E.enterFromPage(); };
    }
    function pickerOpen() { var d = document.getElementById('alp-projects'); return !!(d && d.className.indexOf('on') !== -1); }
    function update() {
      if (!document.body) return;
      var eligible = EC.enterVRButton === true || (EC.enterVRButton !== false && E.canVR());
      var show = eligible && !xr.session && !pickerOpen();
      if (!btn) { if (!show) return; build(); }
      var host = document.fullscreenElement || document.webkitFullscreenElement || document.body;
      if (btn.parentNode !== host) { try { host.appendChild(btn); } catch (e) {} }
      btn.style.display = show ? 'flex' : 'none';
    }
    setInterval(update, 700);
    update();
  }

  function ensureHooks() {
    try { installCaptureHooks(); } catch (e) {}
    try { installProtoHooks(); } catch (e) {}
    try { hookRequestSession(); } catch (e) {}
  }
  function onSessionGranted() {
    if (EC.autoReenter === false) return;
    log('headset granted a VR session after navigation');
    var tries = 0;
    var tick = function () {
      if (xr.session) return;
      tries++;
      var rp = ALP.tour.root();
      if (rp && typeof rp.enableVR === 'function' && ALP.tour.seesHeadset()) { E.enterVR(); return; }
      if (tries < 40) setTimeout(tick, 500);
    };
    tick();
  }
  E.onSessionGranted = onSessionGranted;
  try { if (navigator.xr && navigator.xr.addEventListener) navigator.xr.addEventListener('sessiongranted', onSessionGranted); } catch (e) {}

  ensureHooks();
  setInterval(ensureHooks, 1000);
  try { setupEnterButton(); } catch (e) { warn('enter VR button failed', e); }
  log('vr engine ready');
  return E;
  };
  if (window.ALP && window.ALP.define) window.ALP.define('vr-engine', ['core'], run);
  else (window.__ALPQ = window.__ALPQ || []).push(['vr-engine', ['core'], run]);
})();
