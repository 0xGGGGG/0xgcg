# 0xGCG — Live Performance / Presentation Handoff

> Saved 2026-06-22 as a durable record before context compaction. Goal of the
> **next** phase: drive 0xGCG as a **live performance / presentation** via
> Playwright (a scripted "conductor" walking the three views, narrated by the
> built-in TTS entity). This file is the brief that survives compaction.

---

## 1. What the app is

**0xGCG — "Grow. Corrupt. Glitch."** A zero-build Three.js concept-explorer /
storyboard for an immersive installation at **Kunstkraftwerk Leipzig**
(Maschinenhalle). Three views, one narrated entity:

- **Script** (`/`) — the narrated story. ASCII `0xGCG` matrix boot reveal, then
  passage-by-passage TTS + karaoke. Left rail nav, `#section` hash anchors,
  embeds (YouTube/Wikipedia) with "↗ open" links.
- **Timeline** (`/timeline`, internal mode name `core`) — neuron-graph
  storyboard. 5 acts; auto camera tour; per-act overlay; per-act soundtrack
  with a navigable waveform; TTS narration when each overlay appears.
- **Layout** (`/layout`) — holographic wireframe of the venue FBX. Opens with an
  intro (framed room → hold → fly to Meta → begin stage), then a circular
  meta→data→loop→patch cycle; TTS narration on each surface card.

Stack: Three.js **r169** (npm). **Vite app** (since 2026-06-30 — no more CDN
importmap; `vite.config.js` aliases `three/addons/`→`three/examples/jsm/`). Web
Speech API for TTS. Web Audio API for procedural soundtracks. History-API
routing. Content lives in `src/config/{passages,stages}.js`. `styles.css` is
imported by `main.js`. Deploy: `npm run build`→`dist/`, fly.io app `0xg-0xgcg`
(Caddy static); curated runtime assets in `public/assets/`.

## 2. Run it

```bash
cd /Users/gungorkocak/Projects/0xG/0xG/projects/0xGCG   # moved here 2026-06-30
PATH="$HOME/.asdf/installs/nodejs/24.11.0/bin:$PATH" npm run dev   # Vite → http://localhost:5173/
# routes: / (Script) , /timeline (Timeline) , /layout (Layout)
```
(Old `serve.py` static server on :8123 is retired. node pinned to 24.11.0 via
`.tool-versions`; `npm install` already done.)

## 3. Controls (what the conductor can trigger)

**Global keyboard** (`src/main.js`):
- `s` → Script · `t` → Timeline (`core`) · `l` → Layout
- `space` → play/pause the Timeline tour (master: audio + camera + TTS)
- `← / →` → prev / next act (pauses auto) · `1`–`5` → jump to act
- `a` → cosmic-address overlay (venue→Earth→galaxy→universe); `↑/↓` zoom; `Esc` close
- `h` → toggle UI chrome · topbar brand click → Script

**Script page** (delegated to `scriptPage.key` while in Script mode):
- `←/→` prev/next passage · `space` play/pause narration · `r` reset (replays boot)
- Left rail ticks: click to jump; hover shows title
- Hash anchors: `/#boot`, `/#concept`, `/#recursion`, `/#paperclips`,
  `/#replicators`, `/#horizon` (load + live-updates via `replaceState`)
- Bottom nav buttons: `.sp-btn[data-a=reset|prev|play|next]`; doors `.sp-door[data-go=...]`

**Timeline transport** (`src/ui/player.js`): `.pl-toggle` play/pause,
`.pl-step[data-i]` jump, `.pl-head` is the playhead (style `left:%`).

**Layout transport** (`src/ui/circularPlayer.js`): circular meta/data/loop/patch,
center play/pause. Frame button reframes the whole room.

## 4. TTS narration model (built this session)

- Shared **`src/ui/narrator.js`** — `Narrator` wraps an element's text into
  `.kw` spans and lights each word on `onboundary`; speaks an ordered list of
  elements; `busy` flag + a watchdog so a missing voice never freezes callers.
  Exports `speechSeconds(text)` (~13 chars/s + 2.2s tail) to size dwells.
- **Script page** has its own richer narration loop (title → pause → body,
  auto-advance) — predates the shared Narrator.
- **Timeline**: on overlay arrival while playing, the entity speaks
  title→subtitle→body; soundtrack **ducks** under the voice. Dwell = `max(9s,
  speechSeconds)` so the **progress keeps animating** and the line finishes.
- **Layout**: on each surface card while playing, speaks label→body; phase dwell
  = `max(phase.dur, speechSeconds)`.
- Karaoke CSS: `.kw`, `.kw.lit`, `.kw.done` (shared); Script uses `.sp-* .w.*`.

**Voice/gesture caveat:** Web Speech `speechSynthesis.speak` needs a user gesture
to actually emit audio in a headed browser; `getVoices()` may be empty until
`onvoiceschanged`. Narrator prefers an **en-GB male** voice, falls back to any
`en`. In a Playwright **headed** session, one real click (or pointer event)
unlocks audio; word-wrapping happens regardless of audio.

## 5. Playwright harness (exact paths used this session)

- node 22: `~/.asdf/installs/nodejs/22.15.0/bin/node`
- chromium exe: `/Users/gungorkocak/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
- playwright module (CommonJS — import default then destructure):
  `/Users/gungorkocak/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.js`
  ```js
  import pkg from '/Users/.../playwright/index.js'; const { chromium } = pkg;
  ```
- Headed launch (left half of screen, audio unlocked):
  ```js
  chromium.launch({ executablePath: exe, headless: false,
    args: ['--window-position=0,0','--window-size=900,1000',
           '--autoplay-policy=no-user-gesture-required'] });
  // new context with viewport:null to use the real window size
  ```
- Keep a headed window alive: `await new Promise(r => browser.on('disconnected', r));`
- Gotchas seen: `mouse.move` doesn't fire `pointerenter` (dispatch a
  `PointerEvent('pointerenter')` instead); when two Players exist in the DOM,
  scope to the visible one.

## 6. Timings / behaviors to design the show around

- Script boot reveal replays on entry; passages auto-advance after each narration.
- Timeline: camera flight ~ a few seconds; dwell stretches to the narration
  (stage bodies are long → a fully narrated act can run ~25–35s).
- Layout intro: framed hold **2.5s** (`INTRO_HOLD`) → fly (~1.5s) → Meta stage.
  Manual interaction (wall click, frame button, phase select) cancels the intro.

## 7. Hard constraints (keep)

- **No YouTube ripping / re-hosting** of audio or video (ToS/copyright), and
  cross-origin iframe audio can't be read into Web Audio. Only use audio the
  user owns (`assets/<id>.mp3`) or procedurally generated soundtracks.

## 8. This session's commits

- `282953c` — Script rail + media links; shared Narrator; Timeline & Layout TTS
  + karaoke; adaptive dwell (continuous progress); Layout intro sequence.
- `d796322` — (prior) Script: rework Concept passage; remove phases section.

Unrelated parent-repo deletions (TOLsim, LICENSE, …) are intentionally left
untouched in `git status`.

## 9. Next phase — live performance ideas (to flesh out)

A Playwright **"conductor"** script that runs the piece as a timed, narrated
presentation for a live audience:

1. Open headed (audio unlocked), one synthetic gesture to unlock TTS.
2. **Script act**: land on `/`, let the boot reveal play, walk passages
   (`space`/rail/hash) pacing to the TTS karaoke.
3. **Timeline act**: `t`, `space` to start the tour; let the entity narrate each
   act over its soundtrack; optionally pause on a beat.
4. **Layout act**: `l`; let the intro fly to Meta, ride the meta→data→loop→patch
   cycle with card narration.
5. Optional flourishes: `a` cosmic-address zoom-out finale; `h` to hide chrome
   for a clean projection; cue-based pauses; a manifest of timed cues.

Open questions for the user to decide next: target runtime, whether the
conductor should be deterministic (fixed cues) or react to `narrator.busy` /
playhead state, single-window vs. projector resolution, and whether to record
the run.
