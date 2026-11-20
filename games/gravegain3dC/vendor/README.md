# Arena FPS rendering engine

The game ships a local bundle of the Babylon.js modules it uses. The source entry is `babylon-arena.entry.js` and the upstream license and notices are included in this directory.

To rebuild from the repository root:

```sh
npm install --no-save --package-lock=false @babylonjs/core@9.37.0 esbuild@0.25.12
npx esbuild games/gravegain3dC/vendor/babylon-arena.entry.js --bundle --minify --format=esm --target=es2020 --outfile=games/gravegain3dC/vendor/babylon-arena.js
```
