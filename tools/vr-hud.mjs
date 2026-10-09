// Checks the ALP VR scripts in vr-hud/ and writes them into the published script_general.js.
//
// 3DVista stores each "Execute JavaScript" action after stripping backslashes and comments and joining the lines,
// then wraps it as try{eval('...')} inside the tour's init string. This tool simulates that processing so a file that
// would break inside 3DVista fails here first, and can swap the processed modules into an existing export so a fix
// reaches the site without re-publishing from 3DVista.
//
//   node tools/vr-hud.mjs check     validate vr-hud/*.js (no backslashes, syntax, survives 3DVista processing)
//   node tools/vr-hud.mjs status    show which modules in script_general.js match vr-hud/
//   node tools/vr-hud.mjs apply     validate, then replace the modules inside script_general.js

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HUD = path.join(ROOT, 'vr-hud');
const SCRIPT = path.join(ROOT, 'script_general.js');
const BS = String.fromCharCode(92);

// What 3DVista does to pasted code: drop backslashes, drop comments (string-aware), join lines.
export function simulate3DVista(src) {
  src = src.split(BS).join('');
  let out = '', i = 0, q = null;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (q) { out += c; if (c === q) q = null; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; out += c; i++; continue; }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i = src.indexOf('*/', i + 2) + 2; continue; }
    out += c; i++;
  }
  return out.split(/\r?\n/).map(l => l.trim()).filter(Boolean).join(' ');
}

// A module's name is the first argument of ALP.define. Files that belong to one project of a tour holding several (Parklinks,
// Park Villas) pass that project as a fourth argument, ALP.define('vr-screens-a', [...], run, 'parklinks'); the name is then
// 'parklinks:vr-screens-a', so the two projects' files with the same short name are told apart.
const moduleName = code => {
  const m = code.match(/ALP\.define\('([^']+)',\s*\[[^\]]*\],\s*run(?:,\s*'([^']+)')?\)/);
  if (m) return m[2] ? m[2] + ':' + m[1] : m[1];
  return (code.match(/ALP\.define\('([^']+)'/) || [])[1] || (code.includes('__core') ? 'core' : null);
};
const norm = s => s.replace(/\s+/g, '');

function loadHud() {
  const files = fs.readdirSync(HUD).filter(f => /^\d\d .*\.js$/.test(f)).sort();
  const problems = [];
  const mods = files.map(f => {
    const src = fs.readFileSync(path.join(HUD, f), 'utf8');
    const bs = src.split(BS).length - 1;
    if (bs) problems.push(`${f}: ${bs} backslash character(s); 3DVista strips them`);
    try { new vm.Script(src, { filename: f }); } catch (e) { problems.push(`${f}: syntax error: ${e.message}`); }
    const code = simulate3DVista(src);
    try { new Function(code); } catch (e) { problems.push(`${f}: breaks after 3DVista processing: ${e.message}`); }
    const name = moduleName(code);
    if (!name) problems.push(`${f}: no ALP.define('name', ...) found`);
    return { file: f, name, code };
  });
  const seen = {};
  for (const m of mods) { if (m.name && seen[m.name]) problems.push(`${m.file}: module ${m.name} is also in ${seen[m.name]}`); else if (m.name) seen[m.name] = m.file; }
  return { mods, problems };
}

// Read a quoted JS string literal starting at src[i]; returns [value, endIndex].
function readLiteral(src, i) {
  const q = src[i];
  let j = i + 1;
  while (j < src.length) {
    if (src[j] === BS) { j += 2; continue; }
    if (src[j] === q) break;
    j++;
  }
  return [vm.runInNewContext(src.slice(i, j + 1)), j + 1];
}

function readDeployed(script) {
  const key = '"init":"';
  let at = -1, init = null, end = -1;
  for (let k = script.indexOf(key); k >= 0; k = script.indexOf(key, k + 1)) {
    const [value, e] = readLiteral(script, k + key.length - 1);
    if (value.includes("ALP.define('core'") || value.includes('window.ALP.__core')) { at = k + key.length - 1; init = value; end = e; break; }
  }
  if (!init) throw new Error('no ALP init block found in script_general.js');
  const segs = [];
  for (let k = init.indexOf("eval('"); k >= 0; ) {
    const [code, e] = readLiteral(init, k + 5);
    segs.push({ start: k + 5, end: e, code, name: moduleName(code) });
    k = init.indexOf("eval('", e);
  }
  return { at, end, init, segs };
}

const cmd = process.argv[2] || 'check';
const { mods, problems } = loadHud();
if (problems.length) { console.error(problems.map(p => 'FAIL ' + p).join('\n')); process.exit(1); }
console.log(`ok    ${mods.length} files pass: no backslashes, valid syntax, valid after 3DVista processing`);
if (cmd === 'check') process.exit(0);

const script = fs.readFileSync(SCRIPT, 'utf8');
const dep = readDeployed(script);
const byName = Object.fromEntries(mods.map(m => [m.name, m]));
for (const s of dep.segs) {
  const m = byName[s.name];
  console.log(`${(m ? (norm(m.code) === norm(s.code) ? 'same ' : 'diff ') : 'n/a  ')} ${s.name}${m ? '  (' + m.file + ')' : ''}`);
}
const missing = mods.filter(m => !dep.segs.some(s => s.name === m.name));
if (missing.length) console.log('not in the export (paste these into 3DVista):', missing.map(m => m.file).join(', '));
if (cmd !== 'apply') process.exit(0);

let init = dep.init, offset = 0;
for (const s of dep.segs) {
  const m = byName[s.name];
  if (!m || norm(m.code) === norm(s.code)) continue;
  const literal = "'" + m.code.split("'").join(BS + "'") + "'";
  init = init.slice(0, s.start + offset) + literal + init.slice(s.end + offset);
  offset += literal.length - (s.end - s.start);
}
const out = script.slice(0, dep.at) + JSON.stringify(init) + script.slice(dep.end);
new vm.Script(out, { filename: 'script_general.js' });
const check = readDeployed(out);
for (const s of check.segs) {
  const m = byName[s.name];
  if (m && norm(m.code) !== norm(s.code)) throw new Error('round-trip mismatch for ' + s.name);
}
fs.writeFileSync(SCRIPT, out);
console.log('wrote script_general.js');
