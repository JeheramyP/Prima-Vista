# Prima Vista overview

Prima Vista is a desktop lyric presenter for worship gatherings. One process opens two windows that share a live slide: a controller the operator uses, and a frameless output meant for a projector or second monitor.

The name is the musical term for sight-reading. The controller is built so the operator can see the whole song, the next cue, and the setlist without leaving the live slide.

## The two windows

Both windows load the same React app. Routing is a hash router (`/#/` and `/#/presentation`) so a packaged `file://` build and the Vite dev server can open either view from one bundle.

| Window | Route | What it owns |
| --- | --- | --- |
| Controller | `#/` | Song library, setlist, editor, themes, and the live slide index. Wrapped in `PresentationProvider`. |
| Output | `#/presentation` | A full-bleed stage. It does not read React state from the controller. It paints whatever slide payload Electron last forwarded. |

Closing the controller closes the output. Closing the output leaves the controller running and clears its "output is open" flag. On macOS, closing every window does not quit the app; activating it again opens a new controller if none exists.

If a second display is connected, the output opens fullscreen on that display. Otherwise it opens as a 1280×720 window offset from the primary display so it can be dragged onto a projector. The top 32 pixels of the output are a drag region. Escape, or a double-click on that strip, leaves fullscreen. The window is frameless, so those are the exits.

## How a slide reaches the screen

```text
Controller UI
  PresentationContext  (index, blackout, clear, theme)
        │  setSlide(payload)
        ▼
preload.ts  →  ipc "slide:update"
        │
        ▼
electron/main.ts  stores lastSlide, forwards it
        │
        ▼
PresentationView  paints lyrics, a title, a scripture reading, blackout, or clear
```

The main process keeps the latest payload even when the output window is closed. Opening the output replays that payload after the page loads, so the stage does not flash empty.

The output never looks up songs or themes on its own. A custom or edited built-in theme is copied onto the payload as `customTheme`, because that window has no theme library.

## What the operator sees

The controller is three columns:

1. **Setlist.** An ordered run of songs for this gathering, with scripture readings placed among them. The same song can appear more than once. Drag a library row in, add a scripture row with **+ Scripture**, reorder rows, or remove them. Advancing past the last slide of a song moves to the next setlist row. Stepping back from the first slide moves to the previous row's last slide. A scripture reading is a single slide.
2. **Library.** Search by title, artist, or lyric line. A fresh install starts with an empty library. Songs you add are saved on this computer.
3. **Stage.** Current and next preview, theme picker, then either the slide grid or the lyric editor.

**Blackout** paints the output solid black. **Clear** hides the words and keeps the song's background. The two modes cancel each other. Moving to the next song in the setlist keeps whichever mode is on. Choosing a song from the library turns both off.

## Songs, sections, and slides

A song is a title, artist, optional musical key, optional theme, and an ordered list of sections. A section has a kind (`verse`, `chorus`, `bridge`, and so on), a number, and lyric lines.

Slides are derived, not stored:

- The first slide is a title card built from the song title and artist. It is not a section.
- Remaining slides take the sections in order. Every four lyric lines become one slide. A section with no lines still produces one empty slide.

Verse, chorus, and "other" sections always show a number (`Chorus 2`). Other kinds show a number only when that kind is used more than once. In the copy-paste editor, each roadmap step reads the next block of the lyric field, including when the same kind and number appears again.

The section editor edits a draft. **Update slides** (or Ctrl/Cmd+Enter) writes that draft into the library, rebuilds slides, and tries to stay on the same slide. A brand-new song is different: its draft is mirrored into the library as you type, so the title card and the song list update before you press Update slides.

A scripture reading is not a song. **+ Scripture** appends a setlist row with a reference, a passage, and an optional theme. The passage is derived into one slide: line breaks become spaces, the stage wraps the words to the full width, and the reference is painted under the verse rather than as a lyric line. A short passage stays one line across the slide. A longer passage uses more words on each line so the reading still fits. The passage editor writes the setlist row as you type. Ctrl/Cmd+Enter does not save a song while that reading is live.

## Where data lives

| Data | Location | Notes |
| --- | --- | --- |
| Song library | `song-library.json` in Electron `userData` | Whole file replaced on each save. A fresh install writes an empty library. |
| Custom themes and built-in edits | `custom-themes.json` in the same folder | Built-in theme ids that appear here are edits of Sanctuary, Midnight, and the rest. Other ids are user-made themes. |
| Setlist | `localStorage` key `prima-vista-setlist` | Stays on this machine's controller profile. It is not inside the song file. Song rows are `{ id, songId }`. Scripture rows also store the reference, passage, and an optional theme. Songs deleted from the library are dropped after the library loads. Scripture rows stay. |

On Linux, `userData` is typically `~/.config/prima-vista/`. macOS uses `~/Library/Application Support/prima-vista/`. Windows uses `%APPDATA%\prima-vista\`.

Saves write a temp file, flush it, then rename it over the real file. A crash mid-save leaves the previous file in place. Song saves and theme saves each run one at a time, so a slow write cannot finish last and put an older copy back on disk.

If the page is opened without Electron, songs and themes fall back to `localStorage`. The output view then shows a short "connect to controller" card instead of a live slide.

## Themes

Ten built-in looks ship in `src/lib/stageThemes.ts`: Sanctuary, Midnight, Parchment, Cathedral, Daylight, High Contrast, Pine, Ember, Washed, and Blood. A song with no theme uses Sanctuary. A scripture row stores its own theme the same way; a missing theme is also Sanctuary. The output still receives that theme on the slide payload, including a custom theme record when the look is not a built-in.

Custom themes store a fill (`solid`, `linear`, `radial`, or `glow`), up to three hex colors, and a gradient angle. Text color is chosen from the background's luminance. Editing a built-in theme stores an override with that theme's id and keeps the original typeface. **Reset built-in themes** removes those overrides and leaves user-made themes alone. Deleting a custom theme sends songs that used it back to Sanctuary.

## Module map

```text
electron/main.ts            windows, IPC, JSON files
electron/preload.ts         window.primaVista bridge
electron/writeJsonAtomic.ts crash-safe JSON replace

src/main.tsx                React root, hash router
src/App.tsx                 controller route vs output route
src/types.ts                songs, slides, payload, bridge types

src/state/PresentationContext.tsx   controller state and live payload
src/views/ControllerView.tsx        layout and keyboard shortcuts
src/views/PresentationView.tsx      output stage

src/lib/songs.ts            in-memory library, search, disk sync
src/lib/slides.ts           sections → slides, labels, editor helpers
src/lib/pasteLyrics.ts      pasted text → roadmap → sections
src/lib/setlist.ts          setlist entries in localStorage
src/lib/stageThemes.ts      built-in looks and custom theme rendering
src/lib/customThemes.ts     theme file load/save
src/lib/fitStageText.ts     largest font size that stays inside the stage
src/lib/dragClick.ts        ignore the click that follows a drag
src/lib/confirm.ts          confirm dialog, then restore window focus

src/components/             controller panes: library, setlist, editor, themes, previews
```

Further reading:

- [User guide](USER_GUIDE.md) for operating a service.
- [Developer guide](DEVELOPER.md) for IPC, persistence, and how to change the model.
