# Third-party notices

## Electron

Kanvaz Mini is built on [Electron](https://www.electronjs.org/), which is MIT licensed and bundles Chromium and Node.js under their own licenses. The full license texts ship inside every build (`LICENSES.chromium.html` and the Electron license file).

## PureRef file reader

`src/pur-import.js` and `src/pur-import-worker.js` come from [Kanvaz](https://github.com/p4inz-code/kanvaz) (MIT, same author). The reader is based on the community-documented PureRef file layout in [FyorDev/PureRef-format](https://github.com/FyorDev/PureRef-format). PureRef is a product of its own makers. Kanvaz Mini only reads the images and positions that a `.pur` file contains, and shares no code or assets with PureRef itself.

## electron-builder

Used at build time to make the installers. MIT licensed. Nothing from it ships in the app.
