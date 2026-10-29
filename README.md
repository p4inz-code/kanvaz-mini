# Kanvaz Mini

A small, fast reference window that stays on top of whatever you are working in. Drop images in, move and scale them, and get on with your work. Nothing else on screen.

Kanvaz Mini is its own app, separate from [Kanvaz](https://github.com/p4inz-code/kanvaz). Kanvaz is the full toolbox for heavy work: connections, Map View, 3D, video, plugins. Mini is for the quick job, the way a plain reference window should be.

Free, MIT, no account, no network access at all.

## Status

Version 0.1.0, first slice, built after looking at what PureRef users use and ask for: rotate, flip, grayscale, arrange, a tracing mode and an always-on-top you can toggle, in an app with no setup and nothing to learn. Windows and Linux are the targets. macOS is untested (the keep-on-top behaviour over full-screen apps is not verified).

## What it does

- Opens small in the corner of your screen, always on top. Remembers where you put it.
- Drop images or GIFs, paste from the clipboard, or press `Ctrl+O`.
- Move, scale from a corner (aspect ratio kept), rotate a quarter turn, flip, delete, duplicate, undo and redo (50 steps).
- One key to tidy: `A` arranges the selection (or everything) into even rows like a photo wall.
- One key for a value check: `G` turns the selection (or everything) to grayscale and back.
- Click-through tracing mode (`Ctrl+Alt+T`): the window ignores the mouse so you can draw on the app underneath, with Mini floating over it at whatever opacity you set. A frame shows when it is on, and the top bar stays clickable to turn it off.
- Opens PureRef `.pur` boards with every image at its saved position and scale.
- Press `?` for the full key list at any time.
- Zoom with the wheel, pan with the middle mouse button, right mouse button or `Space` + drag, `F` to fit, `0` for 100%.
- Left and right arrow keys step through your references one at a time when nothing is selected.
- Window opacity with `Ctrl+[` and `Ctrl+]`, keep-on-top with `P`.
- Save and open boards as `.kmini` files (images are embedded, so a board is one file).
- Images and GIFs only. Video, audio, 3D, PDF and Adobe files are refused with a short message: open those in Kanvaz.

## Keys

| Key | Action |
|---|---|
| Drop, `Ctrl+V`, `Ctrl+O` | Add images |
| Drag a card / drag a corner | Move / scale |
| Shift + click | Add to the selection |
| Drag on empty space | Select with a box |
| Middle or right drag, or `Space` + drag | Pan |
| Wheel | Zoom |
| `F` / `0` / `+` / `-` | Fit / 100% / zoom in / zoom out |
| `R` / `Shift+R` | Rotate the selection a quarter turn (all images if nothing is selected) |
| `H` / `V` | Flip left-right / up-down |
| `G` | Grayscale on and off |
| `A` | Arrange into tidy rows |
| `?` | Show the key list |
| `Ctrl+Alt+T` | Click-through tracing mode |
| `Delete` | Remove the selection |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo |
| `Ctrl+A` / `Ctrl+D` | Select all / duplicate |
| Arrow keys | Nudge the selection (hold Shift for 10 px), or step through references |
| `Ctrl+[` / `Ctrl+]` | Window more / less see-through |
| `P` | Keep on top on or off |
| `Ctrl+S` | Save the board |
| `Esc` | Clear the selection |

## Run it

```bash
npm install
npm start
```

Build installers with `npm run build:win` or `npm run build:linux`.

## Tests

```bash
npm test
```

runs the unit tests for the board logic (`src/board.js`) and the file rules (`src/files.js`). The live checks drive the real app over the Chrome DevTools protocol:

```powershell
./test/live/launch.ps1
node test/live/cdp.js test/live/run-live.js
./test/live/kill.ps1
```

## Safety

The window runs sandboxed with context isolation and a strict content security policy. It reads only image files and `.kmini` boards, only from real local paths (no network or device paths, no URLs), and caps the size of what it reads. It never opens a network connection.

## License

MIT. Made by Atharva Patil | P4inz | P4inz Interactive Labs.
