# Updating the site after a 3DVista publish

This folder is the Netlify site **parklinks-vr** (GitHub: lbalungcas/parklinks-malls). It is the 3DVista export plus the web app:
the manifest and icons, and the **Download for offline** button (`alp-offline.js` and `tdvplayersw.js`).

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
