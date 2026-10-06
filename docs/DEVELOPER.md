# Prima Vista developer guide

Read the [overview](OVERVIEW.md) first for the window split and the module map. This guide is how those pieces are implemented and how to change them safely.

## Stack

- Electron 33 for the two windows and the filesystem.
- React 18 and React Router 6 for the UI. The router is a `HashRouter` created in `src/main.tsx`.
- Vite 5 with `vite-plugin-electron` compiles `electron/main.ts`, `electron/preload.ts`, and the renderer together.
- Tailwind CSS for the controller. Stage colors are inline styles from theme records, not Tailwind classes, so the output can render a theme the controller just invented.
- TypeScript strict mode. Unused locals and parameters fail the build.

Path alias `@/` points at `src/`. Electron main and preload are outside that alias. They are compiled to `dist-electron/`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server plus Electron. The controller loads `VITE_DEV_SERVER_URL`. The output loads the same origin with `#/presentation`. |
| `npm start` | Launches Electron against the already built `dist-electron/main.js`. |
| `npm run start:built` | Production renderer build, then the same launch. |
| `npm run dist` | Build, then electron-builder. Output goes to `release/`. |
| `npm run dist:dir` | Unpacked build, useful for checking the bundle without an installer. |

Cursor and VS Code set `ELECTRON_RUN_AS_NODE` in their terminals. If Electron inherits it, `electron.app` is undefined and the process exits immediately. `vite.config.ts` and `scripts/start-electron.mjs` delete that variable before Electron starts. The start script also passes `--no-sandbox`.

The renderer content-security policy in `index.html` allows Google font stylesheets and the Vite websocket (`ws:`, `localhost`, `127.0.0.1`). Packaged builds still load those fonts from the network.

## Process boundary

The renderer has no Node access. Both windows use the same preload with `contextIsolation`, `sandbox`, and `nodeIntegration: false`. The only bridge is `window.primaVista`, typed as `PrimaVistaAPI` in `src/types.ts` and implemented in `electron/preload.ts`.

`SlidePayload` is declared three times on purpose: a loose copy in the main process, a loose copy in the preload, and the strict renderer type. The main process does not import the renderer, so it does not share the theme union. The renderer validates custom theme records before painting.

### IPC channels

| Channel | Style | Direction | Behavior |
| --- | --- | --- | --- |
| `presentation:open` | `invoke` | Controller → main | Creates the output, or focuses it and resends `lastSlide`. Returns `true`. Also pushes the current fullscreen flag. |
| `presentation:close` | `invoke` | Controller → main | Closes the output if it exists. |
| `presentation:toggle-fullscreen` | `invoke` | Controller → main | Toggles fullscreen. Returns the new boolean, or `false` if the output is gone. |
| `presentation:exit-fullscreen` | `invoke` | Output or controller → main | Leaves fullscreen and unmaximizes. Returns whether the window is still fullscreen. |
| `presentation:closed` | `on` | Main → controller | Output window closed. |
| `presentation:fullscreen` | `on` | Main → controller | Fullscreen entered or left. |
| `slide:update` | `send` | Controller → main → output | Main replaces `lastSlide` and forwards the object. There is no ack. |
| `slide:get` | `invoke` | Output → main | Returns `lastSlide`. The output calls this once on load, then subscribes to updates. |
| `songs:load` | `invoke` | Controller → main | Parsed `song-library.json`, or `null` if the file is missing or unreadable. |
| `songs:save` | `invoke` | Controller → main | Atomically replaces the song file. Throws if the write fails. |
| `themes:load` | `invoke` | Controller → main | Parsed array, or `null`. Shape is checked in the renderer. |
| `themes:save` | `invoke` | Controller → main | Atomically replaces the theme file. |
| `window:focus-fix` | `send` | Renderer → main | Blur then focus the sender window. No-op on macOS. |

Escape on the output is handled in the main process (`before-input-event`), not in the page, so it still works when the page is blacked out.

Initial `lastSlide` is blacked out with empty lines. The controller overwrites it as soon as `PresentationProvider` mounts.

## Controller state

`PresentationProvider` wraps only the `/` route. The output must not mount it. Doing so would open a second writer of the library and a second sender of slide payloads.

State that matters:

| Field | Role |
| --- | --- |
| `activeSong` | Song currently on screen. May be a library object or a freshly inserted blank. |
| `draft` | Editor copy. Section mode and paste mode both write this. |
| `slides` | Derived with `songToSlides`. The live index points into this array. |
| `currentIndex` | Slide shown on the output. |
| `blackout`, `clear` | Mutually exclusive in the UI. Both can be false. The payload sends both flags. The output treats either as "hide words." Blackout also replaces the background with black. |
| `setlist` | `{ entry, song }` pairs. Entries whose song disappeared are omitted. |
| `activeEntryId` | Setlist row being followed. `null` when the operator picked a song from the library, so Next/Previous stay inside that song. |
| `upcoming` | Next slide in the song, or the next setlist song's first slide. |
| `libraryVersion` | Bumped when `SONG_LIBRARY` is mutated in place, so memos that read the array recompute. |
| `savedThemes` | Custom themes plus built-in overrides. Split into `customThemes` and `defaultOverrides` for the picker. |

`usePresentation()` throws if it is called outside the provider.

### Live payload

A `useMemo` builds a `SlidePayload` from the active song, current slide, index, blackout, clear, and theme. An effect calls `setSlide` whenever that object changes. `draftRevision` and `savedThemes` are dependencies so a title-card tweak or a theme edit republishes even when the song object identity does not change.

`customTheme` on the payload is `customThemeRecord(songThemeId)`. For an unedited built-in theme that lookup misses, and the output uses `stageThemeById` on the theme id alone. For an override or a user theme, the record rides along and `themeFromRecord` paints it.

### New songs versus saved songs

`createNewSong` pushes a blank song (`custom-<timestamp>-<serial>`) onto `SONG_LIBRARY` and remembers its id in `mirroredNewIdsRef`.

While that id is active, a layout effect copies the draft onto the library object as the operator types, patches the title slide's lines, and debounces `saveSong` by 300ms. That is why a new song's title shows up in the library and on the title card before Update slides.

`applyEditor` is the path for every song, including new ones:

1. `draftToSong` trims fields, drops blank lines, and fills section labels.
2. The previous slide id is found in the new slide list. If it is gone, the index is clamped.
3. `saveSong` writes the whole library.
4. `updatingSlides` stays true for at least 700ms so the button spinner is visible even when the write is instant.

`flushPendingNewSong` runs when the operator selects a different song, so the debounced write is not abandoned.

`provisionalNewSong` plus `PROVISIONAL_REUSE_MS` (1 second) reuse an untouched "Untitled" if New song fires twice before anyone edits. `SongList` also disables its button for 1 second. The two guards solve different double-clicks: one in state, one on the control.

If the library file loads after the operator already started a new song, the load effect merges that pending song back into the stored list and saves it. If the operator has not touched the selection, the load replaces the on-screen song with the first stored song. `selectionTouchedRef` records the difference.

### Setlist navigation

`next` at the last slide of a followed setlist row calls `selectSetlistEntry` on the next row with `keepScreen: true`, which does not clear blackout or clear. `prev` at index 0 jumps to the previous row's last slide the same way. `selectSong` from the library clears `activeEntryId` and resets both flags.

Setlist order is `SetlistEntry[]` in `localStorage` (`prima-vista-setlist`). Each entry is `{ id, songId }`. Move operations treat `toIndex` as an insertion index measured before the row is removed, then adjust when the row is sliding downward. The same adjustment is used for section cards and paste-roadmap steps.

Songs missing from the library are filtered out of the setlist once `libraryReady` is true.

### Save errors

`saveSong` and `deleteSong` persist the entire `SONG_LIBRARY` array through a one-deep promise queue (`libraryWriteTail`). Each turn clones the array when the write starts. The queue swallows a rejection so the next save still runs, and `reportLibrarySaveError` notifies `ControllerView` through `subscribeLibrarySaveError`.

`deleteSong` adds the id to `removedSongIds` before the write. A `saveSong` that was already in flight cannot append the deleted song back onto the array after the splice.

Theme writes use the same queue pattern in `customThemes.ts` but do not surface a banner. `addCustomTheme` updates `CUSTOM_THEMES` synchronously and applies a brand-new theme to the current song. An update of an existing id does not change the song's theme selection.

## Domain model

Defined in `src/types.ts`.

```text
Song
  id, title, artist, key?, theme?, sections[]

LyricSection
  id, kind, label, number?, lines[]

Slide          (derived)
  id, sectionId, sectionLabel, kind, lines, titleSlide?, author?

SlidePayload   (wire format)
  songTitle, artist, sectionLabel, lines, index, total,
  blackout, clear, theme, customTheme?, titleSlide?
```

`SongDraft` is the editor shape: `key` is always a string, never omitted.

Section kinds: `verse`, `chorus`, `bridge`, `prechorus`, `tag`, `instrumental`, `intro`, `ending`, `other`. The palette the operator drags is only verse, chorus, bridge, instrumental, and tag. Paste headers can still produce the other kinds if you extend `HEADER_LINE` and the kind map. Today the paste splitter only uses headers to cut blocks. It does not read the header word as the section kind. The operator assigns kinds by dragging.

### Labels and numbers

`withSectionLabels` in `src/lib/slides.ts` is the single place labels are computed.

- A section that already has `number` keeps it.
- A section without a number inherits the number of an earlier section of the same kind with the same trimmed lyrics, when those lyrics are non-empty.
- Otherwise it takes the next free number for that kind.

`displayLabel` always appends the number for verse, chorus, and other. Every other kind is numbered only when more than one distinct number of that kind exists, so a single bridge reads "Bridge".

`LINES_PER_SLIDE` is 4. Slide ids are `${section.id}-${chunkIndex}`. The title slide id is `${song.id}:title`. `applyEditor` uses those ids to keep the live index stable.

### Paste roadmap

`splitLyricBlocks` splits on blank lines and on header lines matching verse, chorus, pre-chorus, bridge, tag, intro, outro, ending, instrumental, interlude, refrain, or hook, with optional brackets, a number, and an `x2` repeat mark.

`assignBlocks` walks the roadmap in order. Instrumental steps get no block. Every other step takes the next unused block, including a later step with the same kind and number. If the roadmap is longer than the pasted text, extra steps get `block: null` and empty lines.

`sectionsToPasteState` is the reverse. Each lyric section with lines becomes its own paragraph, in section order, so a repeated Chorus 1 keeps the words from that card. It drops lyric parts that have no lines so an empty card does not consume a paragraph that belongs to the next part.

`PasteLyricsMode` keeps `pasteCache` outside React so unused pasted text survives unmounting the editor. The cache is reused only when the song id and a signature of the draft sections still match.

## Library file

`SONG_LIBRARY` in `src/lib/songs.ts` is the live store. It starts empty. `loadLibrary`:

1. Asks the preload for `song-library.json`.
2. If the file exists and every record has `id`, `title`, `artist`, and `sections`, replaces the in-memory array.
3. If the file is missing (`null`), writes an empty library so the next launch is stable.
4. A corrupt file also returns `null` from the main process when it is not an array. Individual records that fail the main-process check are dropped. The renderer then rejects the whole array unless `every` record passes `isSong`.

Search is local. `normalize` lowercases and turns non-alphanumeric runs into spaces. The haystack is title, artist, and every lyric line.

There is no partial update on disk. Every `saveSong` and `deleteSong` rewrites the full JSON array through `writeJsonAtomic`.

## Themes

`StageTheme` is the painted form: background CSS, type, shadow, `sizeScale`, `light`, optional `frame`.

`CustomThemeRecord` is the saved form: `id`, `name`, `fill`, `colors`, `angle`.

`registerCustomThemes` fills a module-level map that `stageThemeById` consults before the built-in list. Call it whenever `CUSTOM_THEMES` changes (`sync` in `customThemes.ts` does this). Forgetting it leaves the output and the picker on Sanctuary for that id.

`themeFromRecord` builds colors with `buildCustomTheme`, then, if the id is a built-in, copies the original font, tracking, line height, size scale, frame, and blurb back on. Background and text color still come from the override.

`editableDefaultTheme` supplies a simplified fill that resembles each built-in, so the editor has colors to start from. It is not a pixel match of the original gradients.

`songThemeId` returns the song's theme when that id is a built-in or a registered custom theme. Anything else, including a deleted custom id still stored on a song, becomes `"sanctuary"`.

Luminance uses the sRGB coefficients. Average luminance above 0.4 selects dark text (`#14100c`) and no shadow. Glow fills sample only the base color, because the glow is a small portion of the stage.

## Stage text fitting

`FittedLyrics` measures the real DOM, not a canvas estimate.

1. `stageFontCapPx` caps the search at a fraction of the box height (`maxHeightRatio`, 0.13 for lyrics, 0.22 for titles) and at the height of the line stack.
2. `largestSizeThatFits` binary-searches the largest integer pixel size that does not overflow. The predicate must stay true once it becomes true.
3. A short loop steps down if web fonts change glyph widths after the search.
4. `ResizeObserver`, `document.fonts` `loadingdone`, and an explicit `fonts.load` of the theme family all remeasure.

Lyric lines use `whitespace-nowrap` and shrink. Title lines wrap, with `maxWidth` `14ch`. `theme.sizeScale` multiplies the chosen size so condensed faces (High Contrast) and display faces (Cathedral) stay balanced. The output and `DualPreview` share `LYRIC_STAGE_INSET` and `StageTitle`, so the preview is the same layout as the projector, not a separate design.

## Drag and drop

Custom MIME types keep the drags from being confused with text:

| Type | Payload | Used by |
| --- | --- | --- |
| `application/x-prima-vista-song` | song id | Library row → setlist |
| `application/x-prima-vista-setlist-entry` | entry id | Reorder setlist |
| `application/x-prima-vista-section-kind` | section kind | Palette → arrangement or roadmap |
| `application/x-prima-vista-section` | section or step id | Reorder cards or roadmap steps |

HTML5 drag-and-drop fires a click on the drop target after `dragend`. Song rows and setlist rows are buttons inside draggable wrappers, so that click would select the song or make a reordered row live. `beginDragClickGuard` / `ignoreClickAfterDrag` in `src/lib/dragClick.ts` swallow that one click.

## Dialogs and focus

`window.confirm` on Linux and Windows can leave the Electron window unable to take keyboard input until it is blurred and focused ([electron#31917](https://github.com/electron/electron/issues/31917)). `confirmDialog` runs the confirm, then `restoreWindowFocus` on a timeout so a button removed by the confirmed action is gone before focus returns. Do not call `window.confirm` directly.

## Adding a built-in theme

1. Append a `StageTheme` to `STAGE_THEMES` in `src/lib/stageThemes.ts`. `StageThemeId` is inferred from that array.
2. Add a matching entry to `DEFAULT_THEME_STARTS` so Edit has a starting fill.
3. The picker lists `STAGE_THEMES` automatically. Songs that omit `theme` stay on Sanctuary. Change `songThemeId` if the fallback should move.

## Adding a section kind to the palette

1. The kind must already be on `SectionKind` in `src/types.ts`, with a `KIND_NAME` and `kindTone` in `src/lib/slides.ts`.
2. Add it to `SECTION_PALETTE`. Both editors render that list.
3. Decide whether it belongs in `ALWAYS_NUMBERED`.
4. If the kind should not consume pasted lyrics, treat it like `instrumental` in `assignBlocks` and `sectionsToPasteState`.

## Adding an IPC call

1. Handle it in `electron/main.ts`.
2. Expose it in `electron/preload.ts` through `contextBridge`.
3. Add it to `PrimaVistaAPI` in `src/types.ts`.
4. Call `window.primaVista` from the renderer. Guard with optional chaining where the page might be opened in a plain browser.

Keep filesystem and window work in the main process. The preload should only forward.

## Files that are easy to break

- Mutating `SONG_LIBRARY` or `CUSTOM_THEMES` without bumping React state or calling `registerCustomThemes`. The arrays are the database. React will not notice a silent splice.
- Mounting `PresentationProvider` on the output route.
- Sending a slide that omits `customTheme` for a user theme. The output will fall through to Sanctuary.
- Changing slide id format without updating `applyEditor`'s match on the previous id. The live index will jump.
- Calling `window.confirm` instead of `confirmDialog`.
