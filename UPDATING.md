# Updating the site after a 3DVista publish

This folder is the Netlify site **parklinks-vr** (GitHub: lbalungcas/parklinks-malls). It is the 3DVista export plus:

| Path | What it is |
|---|---|
| `alp-assets/` | The pictures, intro film and 3D mall map used by the VR menus, served from this site. The pictures are reduced JPEG copies (1600 px) of the originals on GitHub. |
| `alp-offline.js`, `tdvplayersw.js` | The **Download for offline** button and the offline worker. |
| `manifest.webmanifest` and the icons | The web app. |
| `_headers` | Netlify cache rules, so a returning headset does not download the tour again. |
| `tools/import-export.mjs` | Brings in a new export (below). |
| `vr-hud/`, `tools/vr-hud.mjs` | The eight VR scripts. The import writes them into `script_general.js`, so the site always has these versions even if 3DVista still holds older ones. When you change the scripts in 3DVista, put the same eight files here too. |

1. Publish from 3DVista into a **separate folder**, for example `D:\AI\Parklinks Mall V2`. Never publish straight into this folder.
2. From this folder, run:

   ```
   node tools/import-export.mjs "D:\AI\Parklinks Mall V2"
   ```

   It copies the new export in, deletes media the export no longer has, puts the web app lines back into `index.htm`,
   switches off 3DVista's own download bar, keeps this folder's offline worker, and writes `files.json` (the list the
   offline download stores) when the export did not bring one.
3. Commit and push:

   ```
   git add -A
   git commit -m "New 3DVista export"
   git push
   ```

   Netlify deploys automatically. A push over 2 GB is refused by GitHub; then push in parts (media folders in batches).

After the deploy, a headset that already downloaded the tour shows **Update offline copy**.

# Download for offline inside the headset

The welcome card in VR has a **Download for offline** button under Skip, and Help has the same button for later. It shows the progress, pauses when pressed again, and says **Available offline** once the whole tour is stored on the headset. A short message appears when it finishes, even if the visitor is already exploring. The page button (bottom left) and the headset button are the same download.
