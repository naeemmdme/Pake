# Pake + vBlockTube (experimental)

This starter packages YouTube as a Pake Linux AppImage and injects vBlockTube.

## Why this needs a Pake patch

vBlockTube declares `@run-at document-start` and hooks YouTube globals such as `ytInitialData`, `fetch`, and XHR. Pake's standard CLI wraps injected JavaScript in a `DOMContentLoaded` listener. That is too late for some of those hooks.

The workflow:
1. Downloads the pinned vBlockTube 2.1.0 userscript from Greasy Fork.
2. Removes its userscript metadata block.
3. Builds Pake CLI from source after a small patch to `bin/utils/combine.ts`.
4. Leaves injected JavaScript unwrapped so it runs as a WebView initialization script.
5. Injects `pake-gm-compat.js` before `vblocktube.js`.

## Build

Push this repository to GitHub, then open **Actions → Build YouTube with vBlockTube → Run workflow**. The AppImage is uploaded as an Actions artifact.

This sample targets Linux x86_64 (AppImage), suitable for an x86_64 Linux Mint PC.

## Compatibility limitations

This is an experimental compatibility port, not a full userscript manager.

- GM storage is emulated with YouTube-origin `localStorage`.
- `unsafeWindow` maps to the page's `window`.
- `GM_xmlhttpRequest` uses page-context XMLHttpRequest. It **does not bypass CORS** like a real userscript manager. Third-party APIs work only if their servers permit cross-origin requests from YouTube.
- Clipboard and download APIs are best-effort WebView implementations.
- YouTube and vBlockTube internals change; the integration may need maintenance.
- The Pake patch changes the timing of all injected JavaScript in this build to document-start. Do not add unrelated scripts that assume the DOM already exists. CSS injection keeps Pake's normal handling.

## Security

The workflow downloads executable JavaScript from Greasy Fork. Review upstream source before changing the pinned version. Injected code runs inside YouTube and can access data available to that page.

## Updating

Review https://github.com/vippium/vBlockTube and its Greasy Fork source. Update `VBLOCKTUBE_VERSION` in the workflow and `GM_info.script.version` in `tools/pake-gm-compat.js` together.

## Files

- `tools/pake-gm-compat.js` — minimal GM API compatibility layer.
- `scripts/prepare-vblocktube.mjs` — downloads and validates the pinned userscript.
- `scripts/patch-pake-injection.py` — patches Pake's injection timing.
- `.github/workflows/build-youtube.yml` — GitHub Actions build.
