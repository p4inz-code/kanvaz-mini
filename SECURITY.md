# Security

## Reporting a problem

If you think you found a security problem, please email atharva.patil.cg@gmail.com instead of opening a public issue. Include the version, your operating system and the steps to reproduce it.

## How Kanvaz Mini is built to be safe

- The window runs sandboxed with context isolation, no Node integration and a strict content security policy. New windows and navigation are denied.
- It makes no network requests and grants no permissions.
- It reads only image files (PNG, JPEG, GIF, WebP, BMP), `.kmini` boards and PureRef `.pur` files, and only from absolute local paths. UNC and device paths, URLs and NTFS alternate data streams are refused. File sizes are capped.
- A `.kmini` board is validated before it is loaded: only image data URLs, finite sizes, at most 500 items. SVG is refused.
- A `.pur` file is parsed in a worker thread with a 30 second limit, and only image data comes back.
- Boards and recovery copies are written atomically.
- Messages from the window to the main process are accepted only from Mini's own page, and each one is validated.
- A file counts as an image only if its contents match an image format, not just its name.
- DevTools are disabled in the installed app.

## Known limits

- Mini is not code-signed, so operating systems show a warning on first launch. Compare your download with the checksums on the release.
- A very large image can use a lot of memory when it is drawn. The board refuses to grow past about 250 MB of images.
