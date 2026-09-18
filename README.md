# Museum Mouse — smaller GitHub upload package

Prepared September 18, 2026 from the updated globe and production-approach site.
Target address: https://zillaspace.github.io/museum-mouse/

## Upload

1. Unzip Museum-Mouse-Small-Upload.zip on your computer.
2. Open the zillaspace/museum-mouse repository. Put the CONTENTS of this folder at the top level of the publishing folder, where index.html belongs. Do not upload the ZIP itself or put everything inside an extra Museum-Mouse-Small-Upload folder.
3. Replace same-named files with these versions and preserve the assets, data, and vendor subfolders. Include .nojekyll; on a Mac, Command-Shift-period reveals hidden files.
4. Commit the update. For branch-based publishing from the repository root, Settings > Pages should use Deploy from a branch, your publishing branch (usually main), and / (root). If an existing workflow deploys from another directory, use that directory instead.
5. Once GitHub Pages finishes publishing, share https://zillaspace.github.io/museum-mouse/ .

GitHub instructions: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## What the files do

- index.html: the page and complete draft project approach.
- style.css and approach.css: the visual design.
- app.js, economics.js, config.js and google-map.js: map, calculator and interface behavior.
- data/: the museum index and 32 detail files, plus coverage data.
- vendor/: map libraries and license information.
- assets/pip.png: the mouse mascot.
- og.png: the image requested by social previews. The HTML metadata points to this image on the GitHub Pages address above.
- .nojekyll: serves this as a prebuilt static website.
- Three small legacy HTML files redirect older links to the current approach.

Keep all these files together. No backend, npm install, build command, paid map key or Sites account is required for this export. The default globe uses public imagery services and needs internet. Double-clicking index.html directly is not a reliable preview because the map loads JSON files over HTTP; use GitHub Pages or a local web server.

The export contains all local runtime dependencies; it does not include historical download packs, source-research caches, credentials, or the Sites hosting configuration. Publishing this package is a separate step and has not been done by creating the ZIP.

## Link-sharing image

The included og.png is already wired into Open Graph and Twitter card metadata. The image and page must be publicly reachable for social platforms to fetch them. Platforms control preview cropping and may cache an older preview; replacing the site does not instantly replace every existing shared post. If you change the site address, update the canonical, og:url, og:image and twitter:image URLs in index.html.

Open Graph specification: https://ogp.me/

## Data attribution

Wikidata structured data: CC0. OpenStreetMap: © OpenStreetMap contributors, ODbL 1.0. The combined database is supplied under ODbL; underlying Wikidata remains CC0. Esri imagery retains provider rights. See vendor/LICENSES.txt. The 68,730 records are an incomplete open-data inventory, not a verified current census.

## Smaller upload edition

The museum data is compressed without changing any records or fields. This reduces the full extracted upload from about 49 MiB to about 10 MiB. The page decompresses the data in a current browser. Keep the .json.gz files inside data/ exactly as provided; do not individually unzip them. data-loader.js must be uploaded with the other loose files. The map still contains all 68,730 museum records and all 32 detail shards.

Start a fresh GitHub upload if an earlier attempt failed. Use only this folder's contents for that upload, so the original large data files are not included again. Do not upload this outer folder or the ZIP itself. No Terminal commands are needed.
