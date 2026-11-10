# Kanvaz Mini 0.2.0

Clearer colors, a tighter lock, and three tools for artists.

## New
- **Palette** (`E`): the main colors of your pictures. Click a swatch to copy its hex code.
- **Guides** (`T`): rule of thirds, center cross, golden ratio.
- **Export** (`Ctrl+E`): the whole board as one PNG.

## Changed
- Lighter text, borders, grid and top bar, so nothing looks washed out.

## Security
- Only Mini's own window can send commands to the main process.
- A file must really be an image by its contents, not only by its name.
- A stricter content security policy, and DevTools off in the installed app.

## Downloads
- Windows: `Kanvaz-Mini-Setup-0.2.0.exe` (installer) or `Kanvaz-Mini-0.2.0.exe` (portable).
- Linux: `Kanvaz-Mini-0.2.0.AppImage`.
- Checksums: the `SHA256SUMS-*.txt` files.

Mini is not code-signed, so Windows SmartScreen warns the first time: More info, then Run anyway.
