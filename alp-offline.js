/* Offline copy of the tour.
   Adds one small button to the page. Pressing it stores every file of the tour on this device (the list comes from the
   files.json that 3DVista writes with each export), plus what the VR menus load: the pictures, film and 3D map in alp-assets,
   anything still on GitHub, and the web fonts. After that the service worker (tdvplayersw.js) answers from the stored copy, so the tour opens
   with no connection. Nothing here touches the tour itself. */
(function () {
  'use strict';
  if (window.ALPOffline) return;
  var SW_FILE = 'tdvplayersw.js', META_CACHE = 'alp-offline-meta', PREFIX = 'alp-offline-';
  var BASE = new URL('./', location.href).href, META_KEY = BASE + '__alp-offline-meta__';
  // files that sit next to the page but are not in 3DVista's list
  var SAME = ['manifest.webmanifest', 'manifest.json', 'icon-192.png', 'icon-512.png', 'maskable-192.png', 'maskable-512.png',
    'apple-touch-icon.png', 'favicon-32.png', 'favicon.ico', 'alp-offline.js', 'files.json'];
  var PARALLEL = 6, TRIES = 3;
  var supported = 'serviceWorker' in navigator && 'caches' in window && window.isSecureContext !== false;
  var st = { state: 'idle', meta: {}, done: 0, total: 0, note: '', confirm: false, failed: 0, extras: 0, extrasMissing: 0, missing: [], log: [], t0: 0, lastError: '' };
  var abort = null, pill = null, parts = {}, lastPaint = 0, confirmTimer = 0;

  /* ---------- a clean start: the address with #alp-reset (or ?alp-reset) removes the stored copy and the offline helper ---------- */
  // for a device whose saved copy got into a bad state; the tour then opens fresh from the site
  function resetAll() {
    var jobs = [];
    try { jobs.push(caches.keys().then(function (names) { return Promise.all(names.filter(function (n) { return n.indexOf(PREFIX) === 0 || n === META_CACHE; }).map(function (n) { return caches.delete(n); })); })); } catch (e) {}
    try { jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); })); } catch (e) {}
    return Promise.all(jobs.map(function (j) { return j.catch(function () {}); }));
  }
  if (supported && (location.hash.indexOf('alp-reset') >= 0 || location.search.indexOf('alp-reset') >= 0)) {
    resetAll().then(function () { location.replace(location.pathname); });
    return;
  }

  function buildId() {
    var s = document.querySelector('script[src*="script.js?v="]'), m = s && /[?&]v=([^&]+)/.exec(s.getAttribute('src'));
    return m ? m[1] : '';
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function mb(n) { return n >= 1048576 * 10 ? Math.round(n / 1048576) + ' MB' : (n / 1048576).toFixed(1) + ' MB'; }

  /* ---------- the note that says what is stored ---------- */
  function readMeta() {
    return caches.open(META_CACHE).then(function (c) { return c.match(META_KEY); })
      .then(function (r) { return r ? r.json() : {}; }).catch(function () { return {}; });
  }
  function writeMeta(m) {
    st.meta = m;
    return caches.open(META_CACHE).then(function (c) {
      return c.put(META_KEY, new Response(JSON.stringify(m), { headers: { 'Content-Type': 'application/json' } }));
    }).then(function () { tellWorker(); });
  }
  function tellWorker() {
    try {
      if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: 'alp-offline-meta' });
      return navigator.serviceWorker.getRegistration(BASE).then(function (r) {
        if (r) [r.active, r.waiting, r.installing].forEach(function (w) { if (w && w !== navigator.serviceWorker.controller) w.postMessage({ type: 'alp-offline-meta' }); });
      }).catch(function () {});
    } catch (e) { return Promise.resolve(); }
  }
  function registerWorker() {
    // 3DVista may register the same file itself; only do it here when nobody has
    return navigator.serviceWorker.getRegistration(BASE).then(function (r) {
      if (r) { try { r.update(); } catch (e) {} return r; }
      return navigator.serviceWorker.register(SW_FILE);
    }).catch(function () { return null; });
  }

  /* ---------- what the tour loads from outside ---------- */
  function keyFor(href) {
    var u; try { u = new URL(href, BASE); } catch (e) { return ''; }
    // the menu pictures, the intro film and the 3D map kept on the site itself (alp-assets)
    if (u.origin === location.origin) return u.href.indexOf(BASE + 'alp-assets/') === 0 ? u.origin + u.pathname : '';
    if (u.hostname === 'github.com') {
      var p = u.pathname.split('/');
      if (p.length > 5 && (p[3] === 'blob' || p[3] === 'raw')) return 'https://raw.githubusercontent.com/' + p[1] + '/' + p[2] + '/' + p.slice(4).join('/');
      return '';
    }
    if (u.hostname === 'raw.githubusercontent.com' || u.hostname === 'fonts.gstatic.com') return u.origin + u.pathname;
    if (u.hostname === 'fonts.googleapis.com') return u.href;
    return '';
  }
  function walk(o, out, depth, seen) {
    if (o === null || o === undefined || depth > 9) return;
    if (typeof o === 'string') { if (/^https:\/\/(github\.com|raw\.githubusercontent\.com)\/[^\s]+\.[A-Za-z0-9]{2,5}(\?[^\s]*)?$/.test(o) || /^alp-assets\/[^\s?]+\.[A-Za-z0-9]{2,5}$/.test(o)) out[o] = 1; return; }
    if (typeof o !== 'object' || seen.indexOf(o) >= 0) return;
    if (o.nodeType || o === window) return;
    seen.push(o);
    var k;
    if (Array.isArray(o)) { for (k = 0; k < o.length && k < 2000; k++) walk(o[k], out, depth + 1, seen); return; }
    for (k in o) { try { walk(o[k], out, depth + 1, seen); } catch (e) {} }
  }
  function outside() {
    var found = {}, items = [], had = {}, jobs = [];
    function add(href) { var key = keyFor(href); if (key && !had[key]) { had[key] = 1; items.push({ url: key, key: key, size: 0, optional: true, opts: { mode: 'cors', credentials: 'omit', cache: 'reload' } }); } }
    var skip = '';
    try {
      var A = window.ALP;
      if (A) {
        walk(A.data, found, 0, []); walk(A.config, found, 0, []);
        // a tour holding several projects keeps each one's content apart: collect from all of them
        var list = [A];
        if (A.scopes) Object.keys(A.scopes).forEach(function (id) { var X = A.scopes[id]; if (X) { list.push(X); walk(X.data, found, 0, []); try { walk(X.config, found, 0, []); } catch (e) {} } });
        list.forEach(function (X) {
          var p = null; try { p = X.project && X.project(); } catch (e) {}
          var m3 = p && p.map3d;
          // the earlier model is only a stand-in for a missing new one, so it is left out
          if (m3 && m3.fallback && m3.url) skip = keyFor(m3.fallback);
        });
      }
    } catch (e) {}
    Object.keys(found).forEach(function (href) {
      var key = keyFor(href);
      if (!key || key === skip) return;
      add(href);
      // a model manifest names the files that belong to it
      if (/\.json$/i.test(key)) jobs.push(within(fetch(key, { mode: 'cors', credentials: 'omit' }), 15000, 'slow').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        var names = {};
        // a 3D map manifest: only the table models are used (walking inside is switched off), so the finer walk models are left out
        if (j && j.levels && j.levels.length) { j.levels.forEach(function (l) { if (l && l.table) names[l.table] = 1; }); }
        else (function bins(o, d) { if (!o || d > 6) return; if (typeof o === 'string') { if (/\.(bin|glb|png|jpg|webp)$/i.test(o) && o.indexOf('://') < 0) names[o] = 1; return; } if (typeof o === 'object') for (var k in o) bins(o[k], d + 1); })(j, 0);
        Object.keys(names).forEach(function (n) { add(new URL(n, key).href); });
      }).catch(function () {}));
    });
    // web fonts: the style sheet, then the font files it names
    Array.prototype.forEach.call(document.querySelectorAll('link[href*="fonts.googleapis.com"]'), function (l) {
      var href = l.href; add(href);
      jobs.push(within(fetch(href, { mode: 'cors', credentials: 'omit' }), 15000, 'slow').then(function (r) { return r.ok ? r.text() : ''; }).then(function (css) {
        var re = /url\(([^)]+)\)/g, m; while ((m = re.exec(css))) add(m[1].replace(/["']/g, ''));
      }).catch(function () {}));
    });
    return Promise.all(jobs).then(function () { return items; });
  }

  /* ---------- downloading ---------- */
  // Every step has a time limit, so a browser that never answers (seen in headset browsers) ends in a message instead of
  // "Preparing" for ever. A file is read piece by piece: the progress moves with every piece, and a file that stops arriving
  // for STALL ms is dropped and tried again.
  var STALL = 30000, FIRST = 45000;
  function within(p, ms, what) {
    return new Promise(function (ok, no) {
      var t = setTimeout(function () { no(new Error(what)); }, ms);
      p.then(function (v) { clearTimeout(t); ok(v); }, function (e) { clearTimeout(t); no(e); });
    });
  }
  function patient(p, what) {
    var t0 = Date.now(), tick = setInterval(function () {
      var sec = Math.round((Date.now() - t0) / 1000);
      if (sec >= 10) { st.note = 'Waiting for this browser to open its storage  ' + sec + ' s (the first time can take a few minutes)'; paint(true); }
    }, 5000);
    return within(p, 240000, what).then(function (v) { clearInterval(tick); return v; }, function (e) { clearInterval(tick); throw e; });
  }
  function quiet(p, ms) { return within(p, ms, 'slow').catch(function () { return null; }); }
  function step(note) { st.note = note; st.log.push(Math.round((Date.now() - st.t0) / 100) / 10 + 's ' + note); paint(true); }
  function cleanHeaders(h) {
    var out = new Headers();
    try { h.forEach(function (v, k) { if (k !== 'content-encoding' && k !== 'content-length' && k !== 'transfer-encoding') out.set(k, v); }); } catch (e) {}
    return out;
  }
  function grab(item, cache) {
    var n = 0;
    function attempt() {
      if (abort.signal.aborted) return Promise.reject(new Error('stopped'));
      var ctl = new AbortController(), timer = 0, got = 0;
      function stopIt() { try { ctl.abort(); } catch (e) {} }
      function arm(ms) { clearTimeout(timer); timer = setTimeout(stopIt, ms); }
      function done() { clearTimeout(timer); abort.signal.removeEventListener('abort', stopIt); }
      function back() { if (got && item.counted) { st.done = Math.max(0, st.done - got); } got = 0; }
      abort.signal.addEventListener('abort', stopIt);
      arm(FIRST);
      var opts = { signal: ctl.signal }, k;
      for (k in (item.opts || {})) opts[k] = item.opts[k];
      return fetch(item.url, opts).then(function (res) {
        if (res.status !== 200) {
          if (item.optional && (res.status === 404 || res.status === 403)) return 'skip';
          throw new Error('status ' + res.status);
        }
        var type = res.headers.get('content-type') || '';
        function store(blob) {
          return within(cache.put(item.key, new Response(blob, { status: 200, statusText: 'OK', headers: cleanHeaders(res.headers) })), 60000, 'storing ' + item.key)
            .then(function () { return 'ok'; });
        }
        if (!res.body || !res.body.getReader) { arm(STALL * 4); return res.blob().then(store); }
        var reader = res.body.getReader(), parts = [];
        arm(STALL);
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) return;
            arm(STALL);
            parts.push(r.value);
            got += r.value.byteLength;
            if (item.counted) { st.done += r.value.byteLength; paint(); }
            return pump();
          });
        }
        return pump().then(function () { clearTimeout(timer); return store(new Blob(parts, { type: type })); });
      }).then(function (r) {
        done();
        // the list's size and what really came can differ a little; count the list's size
        if (item.counted) st.done += (r === 'ok' ? (item.size || 0) - got : -got);
        return r;
      }, function (e) {
        done();
        back();
        if (abort.signal.aborted) throw e;
        if (++n >= TRIES) { st.lastError = (e && e.message) || 'failed'; return item.optional ? 'skip' : 'fail'; }
        return wait(1000 * n).then(attempt);
      });
    }
    return attempt();
  }
  function pool(items, cache, have, each) {
    var i = 0;
    function next() {
      if (i >= items.length) return Promise.resolve();
      var item = items[i++];
      var job = have[item.key] ? Promise.resolve('had') : grab(item, cache);
      return job.then(function (r) { if (r === 'ok') have[item.key] = 1; each(item, r); return next(); });
    }
    var runs = [];
    for (var k = 0; k < PARALLEL; k++) runs.push(next());
    return Promise.all(runs);
  }
  function start() {
    if (!supported || st.state === 'working') return Promise.resolve();
    st.state = 'working'; st.done = 0; st.total = 0; st.failed = 0; st.extras = 0; st.extrasMissing = 0; st.missing = []; st.confirm = false; st.log = []; st.t0 = Date.now(); st.lastError = '';
    abort = new AbortController();
    step('Starting the download');
    var build = buildId(), cacheName = PREFIX + (build || 'tour'), cache, files, index, list = [], have = {}, ext = [], inList = {};
    // the offline helper (service worker) is checked here but not waited on for long; it is made sure of again at the end
    return quiet(registerWorker(), 6000).then(function () {
      step('Getting the list of files');
      return within(fetch(BASE + 'files.json' + (build ? '?v=' + build : ''), { cache: 'no-cache', signal: abort.signal }), 30000, 'The list of files (files.json) did not arrive');
    }).then(function (r) {
      if (!r.ok) throw new Error('files.json is missing from this site');
      return within(r.json(), 30000, 'The list of files (files.json) did not arrive');
    }).then(function (f) {
      files = f;
      index = files['index.htm'] ? 'index.htm' : (files['index.html'] ? 'index.html' : (location.pathname.split('/').pop() || 'index.htm'));
      step('Opening storage on this device');
      // an older stored copy keeps answering until the new one is whole
      if (!(st.meta && st.meta.complete)) return patient(writeMeta({ build: build, cache: cacheName, complete: false, index: index }), 'This browser did not open its storage. Clear this site\'s data in the browser settings, then try again');
    }).then(function () {
      return patient(caches.open(cacheName), 'This browser did not open its storage. Clear this site\'s data in the browser settings, then try again');
    }).then(function (c) {
      cache = c;
      return patient(cache.keys(), 'This browser did not open its storage. Clear this site\'s data in the browser settings, then try again');
    }).then(function (keys) {
      keys.forEach(function (k) { have[k.url] = 1; });
      var p, key, need = 0;
      for (p in files) {
        if (p.indexOf('.DS_Store') >= 0) continue;
        key = new URL(p, BASE).href;
        inList[key] = 1;
        list.push({ url: key + (build ? '?v=' + build : ''), key: key, size: (files[p] && files[p].size) || 0, counted: true });
        st.total += (files[p] && files[p].size) || 0;
        if (have[key]) st.done += (files[p] && files[p].size) || 0;
        else need += (files[p] && files[p].size) || 0;
      }
      SAME.forEach(function (n) { var k2 = BASE + n; if (!files[n]) list.push({ url: k2, key: k2, size: 0, optional: true, opts: { cache: 'reload' } }); });
      // Chrome keeps the copy without asking; Firefox-based browsers (Wolvic) would show a question, so they are not asked
      try { if (!/Firefox|Wolvic/.test(navigator.userAgent) && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); } catch (e) {}
      if (!(navigator.storage && navigator.storage.estimate)) return null;
      step('Checking free space');
      return quiet(navigator.storage.estimate(), 5000).then(function (est) {
        if (est && est.quota && est.quota - (est.usage || 0) < need * 1.08 + 70 * 1048576) throw new Error('Not enough free storage: about ' + mb(need + 70 * 1048576) + ' is needed');
      });
    }).then(function () {
      step('');
      return pool(list, cache, have, function (item, r) { if (r === 'fail') { st.failed++; st.missing.push(item.key); } paint(); });
    }).then(function () {
      step('Getting the 3D map, pictures and fonts');
      return quiet(outside(), 30000);
    }).then(function (items) {
      // files already in the list are not fetched twice
      ext = (items || []).filter(function (it) { return !inList[it.key]; });
      var seen = 0;
      return pool(ext, cache, have, function (item, r) {
        seen++;
        if (r === 'skip' || r === 'fail') { st.extrasMissing++; st.missing.push(item.key); } else st.extras++;
        st.note = 'Getting the 3D map, pictures and fonts  ' + seen + ' of ' + ext.length; paint();
      });
    }).then(function () {
      if (st.failed) { st.state = 'paused'; step(st.failed + ' files did not arrive. Press to try again'); return; }
      step('Starting the offline helper');
      return quiet(registerWorker(), 10000).then(function () {
        var old = st.meta && st.meta.complete && st.meta.cache !== cacheName ? st.meta.cache : '';
        return within(writeMeta({ build: build, cache: cacheName, complete: true, index: index, bytes: st.total, files: list.length, extras: st.extras, extrasMissing: st.extrasMissing, at: Date.now() }), 20000, 'This browser did not save the offline note');
      }).then(function () {
        return quiet(caches.keys(), 10000);
      }).then(function (names) {
        return Promise.all((names || []).filter(function (n) { return n.indexOf(PREFIX) === 0 && n !== cacheName && n !== META_CACHE; }).map(function (n) { return caches.delete(n); }));
      }).then(function () {
        st.state = 'ready'; st.done = st.total;
        step(st.extrasMissing ? st.extrasMissing + ' outside files could not be stored' : '');
        try { if (!navigator.serviceWorker.controller) st.note = 'Saved. Open the tour once more while online so it can open offline'; } catch (e) {}
        paint(true);
      });
    }).catch(function (e) {
      if (abort && abort.signal.aborted) { st.state = 'paused'; st.note = 'Paused at ' + pct() + '%'; }
      else { st.state = 'error'; st.note = (e && e.message) || 'The download stopped'; }
      st.log.push('stopped: ' + st.note);
      paint(true);
    });
  }
  function stop() { if (st.state === 'working' && abort) abort.abort(); }
  function remove() {
    stop();
    return caches.keys().then(function (names) {
      return Promise.all(names.filter(function (n) { return n.indexOf(PREFIX) === 0; }).map(function (n) { return caches.delete(n); }));
    }).then(function () { st.meta = {}; st.state = 'idle'; st.note = ''; st.done = 0; st.confirm = false; return tellWorker(); }).then(function () { paint(true); });
  }
  // a whole number that only reaches 100 when everything is stored
  function pct() { return st.total ? Math.min(st.state === 'ready' ? 100 : 99, Math.floor(st.done / st.total * 100)) : 0; }

  /* ---------- the button ---------- */
  var ICON = { down: 'M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14', check: 'M5 12.5l4.5 4.5L19 7.5', pause: 'M9 6v12M15 6v12', warn: 'M12 8v5m0 3.2v.3M12 3.5l9 16.5H3z' };
  function build() {
    var ns = 'http://www.w3.org/2000/svg';
    pill = document.createElement('button'); pill.id = 'alp-offline'; pill.type = 'button';
    pill.style.cssText = 'position:fixed;left:18px;bottom:18px;z-index:2147483646;display:none;align-items:center;gap:10px;padding:10px 18px 10px 14px;border-radius:999px;' +
      'border:1px solid rgba(255,255,255,.35);background:rgba(12,24,40,.82);color:#fff;cursor:pointer;font-family:Montserrat,Inter,Arial,sans-serif;text-align:left;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.45);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);overflow:hidden;max-width:calc(100vw - 36px)';
    var svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '18'); svg.setAttribute('height', '18'); svg.style.flex = 'none';
    parts.path = document.createElementNS(ns, 'path'); parts.path.setAttribute('fill', 'none'); parts.path.setAttribute('stroke', 'currentColor'); parts.path.setAttribute('stroke-width', '1.8');
    parts.path.setAttribute('stroke-linecap', 'round'); parts.path.setAttribute('stroke-linejoin', 'round'); svg.appendChild(parts.path);
    var text = document.createElement('span'); text.style.cssText = 'display:flex;flex-direction:column;gap:2px;min-width:0';
    parts.label = document.createElement('span'); parts.label.style.cssText = 'font-size:11px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;white-space:nowrap';
    parts.sub = document.createElement('span'); parts.sub.style.cssText = 'font-size:11px;font-weight:400;letter-spacing:.02em;opacity:.72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:none';
    parts.bar = document.createElement('span'); parts.bar.style.cssText = 'position:absolute;left:0;bottom:0;height:3px;width:0;background:#34D399;transition:width .25s linear';
    text.appendChild(parts.label); text.appendChild(parts.sub);
    pill.appendChild(svg); pill.appendChild(text); pill.appendChild(parts.bar);
    pill.onclick = press;
    (document.body || document.documentElement).appendChild(pill);
  }
  function press() {
    if (st.state === 'working') { stop(); return; }
    if (st.state === 'ready') {
      if (!st.confirm) { st.confirm = true; clearTimeout(confirmTimer); confirmTimer = setTimeout(function () { st.confirm = false; paint(true); }, 6000); paint(true); return; }
      clearTimeout(confirmTimer); remove(); return;
    }
    start();
  }
  // before the tour itself is on screen: the project picker, the welcome card, or a page with none of these
  function atTheDoor() {
    var d = document.getElementById('alp-projects');
    if (d && d.className.indexOf('on') !== -1) return true;
    var A = window.ALP;
    if (A && A.state && A.state.screen) return A.state.screen !== 'tour';
    return !d;
  }
  function paint(now) {
    var t = Date.now();
    if (!now && t - lastPaint < 200) return;
    lastPaint = t;
    if (!pill) { if (!document.body) return; build(); }
    var s = st.state, label = 'Download for offline', sub = '', icon = 'down', bar = 0, online = navigator.onLine !== false;
    if (s === 'working') { label = st.total ? 'Downloading ' + pct() + '%' : 'Preparing download'; sub = st.note || (mb(st.done) + ' of ' + mb(st.total) + '. Keep this page open'); icon = 'pause'; bar = st.total ? Math.max(2, pct()) : 2; }
    else if (s === 'paused') { label = 'Resume download'; sub = st.note; }
    else if (s === 'error') { label = 'Try again'; sub = st.note; icon = 'warn'; }
    else if (s === 'update') { label = 'Update offline copy'; sub = 'The tour online is newer than the stored copy'; }
    else if (s === 'ready') { icon = 'check'; label = st.confirm ? 'Remove offline copy?' : (online ? 'Available offline' : 'Offline copy in use'); sub = st.confirm ? 'Press again to remove it from this device' : st.note; bar = 0; }
    parts.path.setAttribute('d', ICON[icon]);
    parts.label.textContent = label;
    parts.sub.textContent = sub; parts.sub.style.display = sub ? 'block' : 'none';
    parts.bar.style.width = bar + '%';
    pill.style.borderColor = s === 'ready' && !st.confirm ? 'rgba(52,211,153,.75)' : 'rgba(255,255,255,.35)';
    // it stays out of the way inside the tour unless it has something to say
    var show = atTheDoor() || s === 'working' || s === 'paused' || s === 'error' || s === 'update' || st.confirm;
    pill.style.display = show ? 'flex' : 'none';
  }

  function init() {
    if (!supported) return;
    readMeta().then(function (m) {
      st.meta = m || {};
      var b = buildId();
      if (m && m.complete) { st.state = b && m.build && m.build !== b && navigator.onLine !== false ? 'update' : 'ready'; st.total = m.bytes || 0; st.done = st.total; if (m.extrasMissing) st.note = m.extrasMissing + ' outside files could not be stored'; }
      else if (m && m.cache) { st.state = 'paused'; st.note = 'Press to carry on where it stopped'; }
      paint(true);
    });
    setInterval(function () { paint(true); }, 1200);
    window.addEventListener('online', function () { paint(true); });
    window.addEventListener('offline', function () { paint(true); });
    // leave 3DVista a moment to register the worker itself, then make sure it is there
    setTimeout(registerWorker, 2500);
  }
  window.ALPOffline = { start: start, stop: stop, remove: remove, reset: resetAll, status: function () { return { state: st.state, percent: pct(), done: st.done, total: st.total, note: st.note, failed: st.failed, extras: st.extras, extrasMissing: st.extrasMissing, missing: st.missing, meta: st.meta, supported: supported, log: st.log.slice(-30), lastError: st.lastError }; } };
  if (document.readyState === 'complete') init(); else window.addEventListener('load', init);
})();
