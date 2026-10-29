# Changelog

## [0.1.0] first release

Kanvaz Mini is a separate, smaller app from Kanvaz: a quick reference window you drop images into.

### Added
- A small frameless window that stays on top, remembers where you put it, and opens in the bottom right corner the first time.
- Images and GIFs by drag and drop, paste, or `Ctrl+O`. Video, audio, 3D, PDF and Adobe files are refused with a short message.
- Move, scale from a corner with the aspect ratio kept, rotate a quarter turn, flip, duplicate, delete, undo and redo (50 steps).
- `A` arranges into a wall of rows shaped like the window. `G` toggles grayscale for a value check. Both work on the selection, or on everything when nothing is selected.
- Click-through tracing mode (`Ctrl+Alt+T`) and window opacity (`Ctrl+[` and `Ctrl+]`).
- Opens PureRef `.pur` boards with every image at its saved position and scale. The file is parsed in a worker thread so a large board never freezes the window.
- Boards save as single `.kmini` files with the images inside.
- Your last session comes back when you reopen the app. A recovery copy is written a few seconds after each change, atomically.
- A key list on `?`, and `Ctrl+N` for a new board.
- Windows installer and portable builds, and a Linux AppImage target.

### Safety
- No network. Every request that is not a local file or data URL is cancelled, and a live test checks that.
- No permissions are granted. The window is sandboxed with context isolation and a strict content security policy.
- Only image files and `.kmini` and `.pur` boards are read, only from real local paths (no UNC or device paths, no URLs, no alternate data streams), and the size of what is read is capped.
- Saved boards are validated before loading: only image data URLs, sane sizes, at most 500 items. A board that is too large is refused with a message.
- Crashes are written to a small local `crash.log` (home folder paths removed, capped at 200 KB). A renderer crash reloads the window and the recovery copy brings the board back.

### Tested
- Unit tests for the board logic and file rules.
- 34 live checks over the Chrome DevTools protocol against the source and the built Windows exe: drop, paste, move, scale, undo, redo, delete, zoom, fit, stepping, opacity, keep-on-top, `.kmini` and `.pur` opening, rotate, flip, grayscale, arrange, help, click-through, no network, real-path opening, recovery and restore after a restart.

### Not tested yet
- The Linux AppImage and the GitHub Actions workflow (neither has been run yet, because the repository does not exist yet), and anything on macOS.
