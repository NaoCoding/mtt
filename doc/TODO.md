# Roadmap

Priorities are provisional and should change with user needs.

## Phase 1 — MVP hardening

- [ ] Add focused automated coverage for grid calculations and session lifecycle.
- [ ] Add packaging and cross-platform release configuration.
- [ ] Review window and navigation behavior on macOS, Windows, and Linux.

## Phase 2 — Device emulation

- [ ] Add desktop and mobile modes with mobile and tablet presets.
- [ ] Support custom viewport dimensions and device pixel ratio.
- [ ] Set a mobile user-agent and emulate touch events.
- [ ] Support portrait/landscape rotation and fit-to-panel scaling.
- [ ] Keep device configuration independent for each session.
- [ ] Investigate Electron `webContents.enableDeviceEmulation()` and the Chromium DevTools Protocol; distinguish actual device emulation from CSS scaling.

## Phase 3 — Network simulation

- [x] Add per-session offline mode.
- [x] Add configurable latency and download/upload bandwidth throttling.
- [ ] Support reconnection testing.
- [ ] Investigate packet loss simulation feasibility.

## Phase 4 — Developer tools

- [ ] Add per-session console and DevTools integration.
- [ ] Add network and WebSocket message inspection.
- [x] Add screenshot capture.
- [x] Add fullscreen for individual browser panels.

## Phase 5 — Automation

- [ ] Investigate Playwright integration when it provides concrete value.
- [ ] Support automated multiplayer tests and session creation/control.
- [ ] Add interaction recording and replay.
- [ ] Add reusable test scenario presets.

## Phase 6 — User experience

- [ ] Add custom grid layouts and resizable panel boundaries.
- [ ] Add keyboard shortcuts and saved workspaces.
- [x] Add session presets.
- [ ] Add cross-platform packaging improvements.
- [x] Add an optional light theme.
