// Brings a fresh 3DVista export into this folder and puts the web app back on top of it:
// the manifest and icons, and the "Download for offline" button.
//
//   node tools/import-export.mjs "D:\AI\Parklinks Mall V2"
//
// - copies every new or changed file from the export, unchanged, except tdvplayersw.js (this folder keeps its own offline worker)
// - deletes files the export no longer has, but only inside the folders 3DVista owns (media, lib, locale, misc, skin, fonts)
// - edits index.htm again: web app manifest and icons, app name, theme colour, and the line that loads alp-offline.js
// - turns off 3DVista's own download bar ("downloadEnabled":false) so there are not two
// - writes files.json, the list of tour files the offline download stores, when the export did not bring one
// - removes root files an older export left behind (manifest.json, browserconfig.xml) when the new export no longer has them
// - writes the VR scripts in vr-hud/ into script_general.js (tools/vr-hud.mjs apply), so the site has the latest headset menus
// - leaves everything else alone (alp-offline.js, tdvplayersw.js, manifest.webmanifest, the icons, alp-assets, _headers, tools, ...)

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(path.join(SRC, 'index.htm')) || !fs.existsSync(path.join(SRC, 'script_general.js'))) {
  console.error('usage: node tools/import-export.mjs <3DVista export folder>  (the folder that contains index.htm)');
  process.exit(1);
}
if (SRC === ROOT) { console.error('That is this folder; export to a separate folder first.'); process.exit(1); }

const EXPORT_DIRS = ['media', 'lib', 'locale', 'misc', 'skin', 'fonts'];
const KEEP_OURS = new Set(['tdvplayersw.js', 'favicon.ico']);
const sha = f => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const same = (a, b) => fs.existsSync(b) && fs.statSync(a).size === fs.statSync(b).size && sha(a) === sha(b);

function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, out); else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

// 1. copy the export in
const files = walk(SRC);
const counts = { copied: 0, unchanged: 0, kept: 0, removed: 0 };
for (const rel of files) {
  if (KEEP_OURS.has(rel)) { counts.kept++; continue; }
  const from = path.join(SRC, rel), to = path.join(ROOT, rel);
  if (same(from, to)) { counts.unchanged++; continue; }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  counts.copied++;
}
const incoming = new Set(files);
for (const dir of EXPORT_DIRS) {
  if (!fs.existsSync(path.join(ROOT, dir))) continue;
  for (const rel of walk(path.join(ROOT, dir), ROOT)) {
    if (incoming.has(rel)) continue;
    fs.rmSync(path.join(ROOT, rel)); counts.removed++;
  }
}
console.log(`export imported: ${counts.copied} copied, ${counts.unchanged} unchanged, ${counts.removed} removed (no longer in the export)` +
  (counts.kept ? ', kept this folder\'s own tdvplayersw.js' : ''));

// 2. index.htm: the web app lines
const indexFile = path.join(ROOT, 'index.htm');
let html = fs.readFileSync(indexFile, 'utf8');
const eol = html.includes('\r\n') ? '\r\n' : '\n';
const before = html;
if (!html.includes('name="mobile-web-app-capable"'))
  html = html.replace(/(<meta name="apple-mobile-web-app-capable"[^>]*>)/, `$1${eol}    <meta name="mobile-web-app-capable" content="yes"/>`);
// the page title and the app name come from manifest.webmanifest, so the tab and the installed app show this site's name
let appName = '', appShort = '', appColor = '#0A0A0A';
try { const mf = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8')); appName = mf.name || ''; appShort = mf.short_name || mf.name || ''; appColor = mf.theme_color || appColor; } catch (e) {}
if (!html.includes('name="apple-mobile-web-app-title"'))
  html = html.replace(/(<meta name="mobile-web-app-capable"[^>]*>)/, `$1${eol}    <meta name="apple-mobile-web-app-title" content="${appShort || 'Tour'}"/>`);
if (appShort) html = html.replace(/(<meta name="apple-mobile-web-app-title" content=")[^"]*"/, `$1${appShort}"`);
if (appName) html = html.replace(/<title>[^<]*<\/title>/, `<title>${appName}</title>`);
html = html.replace(/(<link rel="icon" type="image\/png" sizes="16x16" href=")[^"]*"/, '$1favicon-32.png"');
html = html.replace(/<link rel="apple-touch-icon"([^>]*?)href="[^"]*"/, '<link rel="apple-touch-icon"$1href="apple-touch-icon.png"');
html = html.replace(/(<link rel="icon" type="image\/png" sizes="32x32" href=")[^"]*"/, '$1favicon-32.png"');
html = html.replace(/(<link rel="icon" type="image\/png" sizes="192x192" href=")[^"]*"/, '$1icon-192.png"');
if (/<link rel="manifest"/.test(html)) html = html.replace(/<link rel="manifest" href="[^"]*">/, '<link rel="manifest" href="manifest.webmanifest">');
else if (/<link rel="icon" type="image\/png" sizes="192x192"[^>]*>/.test(html))
  html = html.replace(/(<link rel="icon" type="image\/png" sizes="192x192"[^>]*>)/, `$1${eol}\t<link rel="manifest" href="manifest.webmanifest">`);
else html = html.replace('</head>', `\t<link rel="manifest" href="manifest.webmanifest">${eol}</head>`);
html = html.replace(/(<meta name="msapplication-TileColor" content=")[^"]*"/, '$1' + appColor + '"');
html = html.replace(/(<meta name="theme-color" content=")[^"]*"/, '$1' + appColor + '"');
if (!html.includes('alp-offline.js')) html = html.replace('</body>', `    <script src="alp-offline.js"></script>${eol}</body>`);
if (!html.includes('alp-offline.js') || !html.includes('manifest.webmanifest')) { console.error('could not edit index.htm'); process.exit(1); }
if (html !== before) { fs.writeFileSync(indexFile, html); console.log('index.htm: web app manifest, icons, theme colour and the offline button put back'); }
else console.log('index.htm already had the web app lines');

// 2b. root files an older export left behind
for (const f of ['manifest.json', 'browserconfig.xml']) {
  if (!incoming.has(f) && fs.existsSync(path.join(ROOT, f))) { fs.rmSync(path.join(ROOT, f)); console.log('removed ' + f + ' (an older export left it)'); }
}

// 2c. the VR scripts: vr-hud/ holds the current files; write them into the export's script_general.js
if (fs.existsSync(path.join(ROOT, 'vr-hud')) && fs.existsSync(path.join(ROOT, 'tools', 'vr-hud.mjs'))) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'vr-hud.mjs'), 'apply'], { stdio: 'inherit' });
  if (r.status !== 0) { console.error('vr-hud apply failed; the VR scripts in script_general.js were left as exported'); process.exit(1); }
}

// 3. only one download button: switch off 3DVista's own download bar
const sgFile = path.join(ROOT, 'script_general.js');
const sg = fs.readFileSync(sgFile, 'utf8');
if (sg.includes('"downloadEnabled":true')) {
  fs.writeFileSync(sgFile, sg.split('"downloadEnabled":true').join('"downloadEnabled":false'));
  console.log('script_general.js: 3DVista\'s own download bar switched off');
}

// 4. files.json: the list the offline download works from
if (incoming.has('files.json')) console.log('files.json: the one from the export is used');
else {
  const list = {};
  for (const rel of files) {
    if (rel === 'files.json' || KEEP_OURS.has(rel) || rel.endsWith('.DS_Store') || rel.endsWith('Thumbs.db')) continue;
    list[rel] = { tags: ['mobile', 'desktop'], size: fs.statSync(path.join(ROOT, rel)).size };
  }
  // the VR menus' pictures, film and 3D map kept on this site: in the list too, so the download counts them in its progress
  if (fs.existsSync(path.join(ROOT, 'alp-assets')))
    for (const rel of walk(path.join(ROOT, 'alp-assets'), ROOT))
      if (!rel.endsWith('.DS_Store') && !rel.endsWith('Thumbs.db')) list[rel] = { tags: ['mobile', 'desktop'], size: fs.statSync(path.join(ROOT, rel)).size };
  fs.writeFileSync(path.join(ROOT, 'files.json'), JSON.stringify(list));
  const mb = Object.values(list).reduce((t, f) => t + f.size, 0) / 1048576;
  console.log(`files.json: written for ${Object.keys(list).length} files (${mb.toFixed(0)} MB), since the export did not bring one`);
}

// 5. the web app files this folder adds must still be here
const missing = ['alp-offline.js', 'tdvplayersw.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'maskable-192.png',
  'maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png', '_headers'].concat(
  // a site whose VR menus use pictures, a film and a 3D map served from here (Parklinks) has an alp-assets folder
  fs.existsSync(path.join(ROOT, 'alp-assets')) ? ['alp-assets/landing.jpg', 'alp-assets/intro.mp4', 'alp-assets/map3d/alp-mall-3d-v3.json'] : []).filter(f => !fs.existsSync(path.join(ROOT, f)));
if (missing.length) { console.error('missing: ' + missing.join(', ') + '\nRestore them with: git checkout -- ' + missing.join(' ')); process.exit(1); }
if (!fs.readFileSync(path.join(ROOT, 'tdvplayersw.js'), 'utf8').includes('alp-offline-meta'))
  console.warn('tdvplayersw.js is 3DVista\'s own worker, not the offline one; restore it with: git checkout -- tdvplayersw.js');

console.log('\nReady. Next: git add -A, git commit, git push. Netlify deploys from this repository.');
