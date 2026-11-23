# Overtake Babylon.js rendering engine

This game ships a local tree-shaken bundle of the Babylon.js modules it uses (`babylon-overtake.js`), built from `babylon-overtake.entry.js`. Upstream license and notice files are included in this directory.

To rebuild from `games/overtake`:

```sh
npm install --no-save --package-lock=false @babylonjs/core@9.37.0 esbuild@0.25.12
npx esbuild vendor/babylon-overtake.entry.js --bundle --minify --format=esm --target=es2020 --outfile=vendor/babylon-overtake.js
```
