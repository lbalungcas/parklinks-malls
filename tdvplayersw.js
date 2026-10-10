/* Offline service worker for the tour.
   It keeps the file name 3DVista uses for its own service worker, so whichever script registers it, this is the file that runs.
   Until a visitor presses "Download for offline" it only passes requests through. After the download:
   - the tour's own versioned files (?v=<publish>) of exactly the stored publish come from the stored copy first (fast, and
     safe, because they are the same files);
   - everything else, and every file of a newer publish, comes from the network first, and from the stored copy only when
     the network fails; so a visitor who is online always gets the site as it is now, never a stale copy;
   - the page itself waits for the network up to NAV_TIMEOUT, and opens from the stored copy only when there is no answer. */

// 3DVista's own lines (push messages for its remote features). They must never stop this worker from installing.
var messaging;
try {
    importScripts('https://www.gstatic.com/firebasejs/7.11.0/firebase-app.js');
    importScripts('https://www.gstatic.com/firebasejs/7.11.0/firebase-messaging.js');
    firebase.initializeApp({
        apiKey:             'AIzaSyCMagGPLVM2pmaOc0uM6DXIV-FDdSEpxjg',
        projectId:          'tdvremote',
        messagingSenderId:  '498700427739',
        appId:              '1:498700427739:web:fecf2f1441975690b247fe'
    });
    if (firebase.messaging.isSupported())
        messaging = firebase.messaging();
} catch (e) {}

var SCOPE = self.registration.scope;
var META_CACHE = 'alp-offline-meta';
var META_KEY = SCOPE + '__alp-offline-meta__';
var NAV_TIMEOUT = 12000;
var EXTERNAL = ['raw.githubusercontent.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];
var meta = null;

self.addEventListener('install', function (event) { event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', function (event) { event.waitUntil(self.clients.claim()); });
self.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'alp-offline-meta') { meta = null; event.waitUntil(loadMeta()); }
});

// Storage that does not answer (seen in Firefox-based headset browsers after an interrupted download) must never hold up
// the tour: every look into the stored copy gives up after a few seconds and the request goes to the network instead.
function within(p, ms, alt) {
    return new Promise(function (ok) {
        var t = setTimeout(function () { ok(alt); }, ms);
        p.then(function (v) { clearTimeout(t); ok(v); }, function () { clearTimeout(t); ok(alt); });
    });
}
function loadMeta() {
    if (meta) return Promise.resolve(meta);
    return within(caches.open(META_CACHE).then(function (c) { return c.match(META_KEY); })
        .then(function (r) { return r ? r.json() : {}; })
        .then(function (m) { meta = m || {}; return meta; }), 3000, {});
}

// the name a file is stored under. Tour files lose their version query; a GitHub page link becomes the raw file it leads to.
function keyFor(u) {
    if (u.origin === self.location.origin) return u.href.indexOf(SCOPE) === 0 ? u.origin + u.pathname : null;
    if (u.hostname === 'github.com') {
        var p = u.pathname.split('/');
        if (p.length > 5 && (p[3] === 'blob' || p[3] === 'raw')) return 'https://raw.githubusercontent.com/' + p[1] + '/' + p[2] + '/' + p.slice(4).join('/');
        return null;
    }
    if (EXTERNAL.indexOf(u.hostname) < 0) return null;
    return u.hostname === 'fonts.googleapis.com' ? u.href : u.origin + u.pathname;
}

// a stored file answers a byte-range request (video and audio ask this way) with just that part
function ranged(req, res) {
    var h = req.headers.get('range');
    if (!h || !res) return res;
    var m = /bytes=(\d*)-(\d*)/.exec(h);
    if (!m) return res;
    return res.blob().then(function (blob) {
        var size = blob.size, start, end;
        if (m[1] === '') { start = Math.max(0, size - parseInt(m[2] || '0', 10)); end = size - 1; }
        else { start = parseInt(m[1], 10); end = m[2] === '' ? size - 1 : Math.min(size - 1, parseInt(m[2], 10)); }
        if (!(start >= 0) || start >= size || end < start)
            return new Response(null, { status: 416, statusText: 'Range Not Satisfiable', headers: { 'Content-Range': 'bytes */' + size } });
        var headers = new Headers();
        headers.set('Content-Type', res.headers.get('Content-Type') || blob.type || 'application/octet-stream');
        headers.set('Content-Range', 'bytes ' + start + '-' + end + '/' + size);
        headers.set('Content-Length', String(end - start + 1));
        headers.set('Accept-Ranges', 'bytes');
        return new Response(blob.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers: headers });
    });
}

function stored(req, key, m) {
    if (!m.cache) return Promise.resolve(null);
    return within(caches.open(m.cache).then(function (c) { return c.match(key); }), 5000, null)
        .then(function (res) { return res ? ranged(req, res) : null; })
        .catch(function () { return null; });
}

function fallback(req, key, m, error) {
    return stored(req, key, m).then(function (res) {
        return res || within(caches.match(req, { ignoreSearch: true, ignoreMethod: true }), 5000, null);
    }).then(function (res) {
        if (res) return res;
        if (error) throw error;
        return Response.error();
    });
}

function network(req, u, key, m) {
    var external = u.origin !== self.location.origin;
    // once a visitor has asked for the offline copy, outside files (the 3D map, fonts, pictures on GitHub) are kept as they are used
    if (external && m.cache && !req.headers.get('range') && req.cache !== 'no-store') {
        return fetch(key, { mode: 'cors', credentials: 'omit', cache: req.cache === 'reload' ? 'reload' : 'default' }).then(function (res) {
            if (res && res.status === 200) {
                var copy = res.clone();
                caches.open(m.cache).then(function (c) { return c.put(key, copy); }).catch(function () {});
                return res;
            }
            return fetch(req);
        }).catch(function () {
            return fetch(req).catch(function (error) { return fallback(req, key, m, error); });
        });
    }
    return fetch(req).catch(function (error) { return fallback(req, key, m, error); });
}

function navigate(req, key, m) {
    if (/\/$/.test(key)) key += m.index || 'index.htm';
    if (!m.complete) return fetch(req).catch(function (error) { return fallback(req, key, m, error); });
    // with a stored copy, a page that does not answer at all opens from the copy instead; a slow answer is still waited for
    return new Promise(function (resolve, reject) {
        var settled = false;
        var timer = setTimeout(function () {
            if (settled) return;
            stored(req, key, m).then(function (res) { if (res && !settled) { settled = true; resolve(res); } });
        }, NAV_TIMEOUT);
        fetch(req).then(function (res) {
            clearTimeout(timer);
            if (!settled) { settled = true; resolve(res); }
        }, function (error) {
            clearTimeout(timer);
            if (settled) return;
            fallback(req, key, m, error).then(function (res) { settled = true; resolve(res); }, function (e) { settled = true; reject(e); });
        });
    });
}

self.addEventListener('fetch', function (event) {
    var req = event.request;
    if (req.method !== 'GET') return;
    if ((req.cache === 'only-if-cached') && (req.mode !== 'same-origin')) return;
    var u;
    try { u = new URL(req.url); } catch (e) { return; }
    var key = keyFor(u);
    if (!key) return;
    // 3DVista asks for video with this mark so that its worker leaves it alone; do the same unless a stored copy can answer
    if (u.search.indexOf('swbypass=true') >= 0 && meta && !meta.complete) return;
    event.respondWith(loadMeta().then(function (m) {
        if (req.mode === 'navigate') return navigate(req, key, m);
        var bypass = req.cache === 'reload' || req.cache === 'no-store';
        var v = u.origin === self.location.origin ? u.searchParams.get('v') : null;
        // the stored copy answers first only for versioned files of exactly the stored publish
        if (m.complete && !bypass && v && v === m.build) {
            return stored(req, key, m).then(function (res) { return res || network(req, u, key, m); });
        }
        return network(req, u, key, m);
    }));
});
