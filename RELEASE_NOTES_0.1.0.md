Kanvaz Mini is the quick version of [Kanvaz](https://github.com/p4inz-code/kanvaz): a small reference window that stays on top of your work. Drop images in, keep them beside you, get on with drawing. No setup, no account, and it never uses the network.

This is the first release.

## What you can do

- Drop, paste or open images and GIFs. Move, scale from a corner, rotate a quarter turn, flip, duplicate, delete. Undo and redo go back 50 steps.
- Press `A` to arrange everything into a tidy wall of rows. Press `G` for grayscale, to check values.
- Press `Ctrl+Alt+T` for click-through tracing mode and `Ctrl+[` to make the window see-through, so you can draw straight over a reference.
- Open PureRef `.pur` boards with each image at its saved position and scale.
- Save a board as one `.kmini` file. Your last session comes back when you reopen the app.
- Press `?` for the key list.

Mini shows images and GIFs only. Open video, 3D models, PDFs and Adobe files in Kanvaz.

## Which file to download

| System | File |
|---|---|
| Windows, installer | `Kanvaz-Mini-Setup-0.1.0.exe` |
| Windows, no install | `Kanvaz-Mini-0.1.0.exe` (portable) |
| Linux | `Kanvaz-Mini-0.1.0.AppImage`. Run `chmod +x` on it, then start it |

The portable build unpacks itself every time it starts, so it opens more slowly than the installed one.

## Before you run it

Mini is not code-signed, so Windows SmartScreen warns you the first time. Choose More info, then Run anyway. To check a download, put the matching `SHA256SUMS-*.txt` next to it and run `sha256sum -c`.

## What was tested

- Unit tests for the board logic and file rules, run in CI.
- 34 live checks driving the real app: drop, paste, move, scale, undo, redo, delete, zoom, fit, arrow-key stepping, opacity, keep-on-top, `.kmini` and `.pur` opening, rotate, flip, grayscale, arrange, key list, click-through, a blocked network request, opening an image by its real path, recovery and restore after a restart. They passed against the installed `Kanvaz-Mini-Setup-0.1.0.exe` from this release.
- The portable exe and the Linux AppImage were built by CI and the checksums verify. The AppImage has not been run, and nothing has been tested on macOS.

Guide: [Kanvaz Mini in the user guide](https://p4inz-code.github.io/kanvaz/guide/kanvaz-mini.html). Questions and bug reports go in the issues.
