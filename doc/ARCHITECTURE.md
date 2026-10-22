# Architecture

MTT is a local Electron desktop application. `electron-vite` builds the main process, preload, and React renderer. The renderer owns the toolbar and panel controls; remote pages run in native `WebContentsView` instances managed by the main process.

## Process boundaries

- `electron/main.ts` creates the `BrowserWindow`, registers IPC, and wires window lifecycle events.
- `electron/preload.ts` exposes a narrow `window.mtt` API through `contextBridge`.
- `src/renderer/src/ui` provides the compact dark interface. It never receives Electron objects.
- `electron/session-manager.ts` creates a unique in-memory session partition for each browser instance, denies permission requests, and clears session data on reset.
- `electron/browser-view-manager.ts` owns each `WebContentsView`, navigation, reload, reset, and cleanup.
- `electron/grid-layout.ts` calculates fixed grid dimensions independently of browser lifecycle code.

## Session isolation and reset

Every panel receives its own uniquely named, non-persistent Electron partition (`mtt-<panel>-<generation>`). Electron therefore gives each panel separate cookies, local storage, IndexedDB, cache, and other session data. Reload preserves that partition and its data. Reset clears the panel's session data and loads the current shared URL again. Offline mode uses network emulation on that panel's isolated session, so other panels remain connected; reconnecting disables emulation. Removed panels are closed and their sessions are no longer used; re-adding one receives a fresh partition name.

## Views and layout

The toolbar occupies 48 DIP at the top of the window. Each grid cell has a 26 DIP React header; a `WebContentsView` is placed below it so it cannot cover the toolbar or panel buttons. The main process calculates columns and rows (1×1, 2×1, 2×2, or 3×2) and updates view bounds after resizing. Renderer layout and main-process bounds use the same fixed toolbar, header, and one-pixel gap measurements. A panel can fill the browser area while keeping the toolbar and its header controls visible. Resizing reapplies that layout, and reducing the session count exits fullscreen when it removes the selected panel.

`BrowserViewManager` handles view creation and destruction. `GridLayoutManager` is intentionally a pure calculation (`calculateGrid`) so geometry can be adjusted independently. The BrowserWindow resize handler reapplies geometry to all active views.

## Security boundaries

Remote pages use `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, and `webSecurity: true`; they receive no preload bridge. The app renderer also has context isolation and a sandbox, and gets only the small validated API described above. IPC handlers check that messages originate from the app renderer and validate URL, count, and panel identifiers. Only HTTP and HTTPS navigation is allowed. New windows are denied, and session permission requests are denied by default.

## Extension points

Future device emulation and network simulation belong on individual `WebContents`/`Session` instances. Per-panel console and DevTools tools should build on `BrowserViewManager` while keeping remote content isolated from the app IPC bridge. See the phased roadmap in `doc/TODO.md`.
