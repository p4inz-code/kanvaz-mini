# Privacy

Kanvaz Mini collects nothing. It has no accounts, no analytics, no crash reporting and no servers.

It makes no network requests. The app cancels every request that is not a local file or data URL, and a test confirms that a request to a website is blocked.

## What it stores on your computer

| File | Where | Why |
|---|---|---|
| `window.json` | the app's data folder | window position, size, opacity and the keep-on-top choice |
| `recovery.kmini` | the app's data folder | a copy of your current board so your last session comes back |
| `crash.log` | the app's data folder | a short record if the app hits an error: time, message and stack, with your home folder replaced by `~`. Capped at 200 KB. Never uploaded |
| your boards | wherever you save them | `.kmini` files you chose to save |

Delete any of these whenever you like. Nothing else is written, and nothing leaves your machine unless you share a board file yourself.

If you report a bug you may choose to attach `crash.log`.
