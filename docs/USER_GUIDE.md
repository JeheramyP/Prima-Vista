# Prima Vista user guide

This guide is for the person running lyrics during a gathering. Installation and source layout are in the [developer guide](DEVELOPER.md). How the windows stay in sync is in the [overview](OVERVIEW.md).

## Start the app

From a development checkout:

```bash
npm install
npm run dev
```

The controller window opens on its own. Packaged builds are produced with `npm run dist` (AppImage and `.deb` on Linux, `.dmg` on macOS, NSIS installer on Windows).

## Open the output

Click **Open output** in the controller header.

- With a second display connected, the output fills that display.
- With one display, a separate window opens. Drag it onto the projector. The top edge of the output is the drag handle.
- **Fullscreen output** fills the display the output is on. **Exit fullscreen**, the Escape key, or a double-click on the output's top edge returns it to a movable window.
- **Close output** hides the stage. The controller keeps your place.

The header shows the song title, artist, and slide number (`Slide 3 of 12`).

## Move through the service

| Key | Action |
| --- | --- |
| Space, Right arrow, Down arrow, Page Down | Next slide |
| Left arrow, Up arrow, Page Up, Backspace | Previous slide |
| Home / End | First / last slide of the current song |
| B | Toggle blackout |
| C | Toggle clear |
| Ctrl+Enter or Cmd+Enter | Update slides from the editor, even while a text field is focused |

Shortcuts are ignored while you are typing in a text field, except Ctrl/Cmd+Enter. They are also ignored when a button has focus and you press Enter, so confirming a dialog does not also advance the slide.

You can also use **Previous** and **Next** in the header, or click any tile in the **Slides** grid.

### Blackout and clear

- **Blackout** turns the output solid black, including the background. Use it between songs or when the screen should go dark.
- **Clear** removes the words and leaves the song background up. Use it when the band is playing and the screen should stay in the song's color.

Turning one on turns the other off. Both stay on when you advance from one setlist song into the next. Picking a different song from the library turns them off.

### What the previews mean

**Current slide** matches the output, including blackout and clear.

**Next slide** is the following cue in this song. On the last slide, if another song is queued in the setlist, the card becomes **Next song** and shows that song's title slide in its own theme. The next card is dimmed so it does not compete with the live cue.

## Setlist

The left column is the order of the gathering.

- Drag a song from the library onto the setlist, or drop it between rows. The highlight shows where it will land.
- Drag a setlist row by its handle to reorder it.
- Click a row to make that song live, starting at its title slide.
- Remove one row, or **Clear** the whole list. Clearing asks for confirmation.
- The same song can be on the setlist twice. Each row is its own cue, so editing the song updates both.

The setlist is remembered on this computer. It is separate from the song library. If a song is deleted, its setlist rows disappear the next time the library finishes loading.

At the end of a song, **Next** walks into the following setlist song. At the start of a song, **Previous** walks back to the last slide of the previous setlist song.

## Library and search

The middle column lists songs. Search matches the title, artist, and lyric lines. Punctuation is ignored, so `10,000` and `10000` find the same song. An empty search shows the whole library.

Click a song to edit and present it. That leaves setlist follow: the next cue is the next slide of this song, not the next setlist row, until you click a setlist row again.

**New song** opens a blank song titled "Untitled" and switches to the editor. A second click within a second reuses that blank song if you have not typed yet, so a double-click does not create two songs.

**Delete** asks for confirmation, removes the song from the library and the setlist, and selects another song if you deleted the one on screen.

The first time Prima Vista runs, the library is Amazing Grace, How Great Thou Art, In Christ Alone, 10,000 Reasons, Goodness of God, Great Are You Lord, Build My Life, and Holy Spirit. After that, the copy on this computer is the one that loads. Editing those hymns does not change the originals shipped with the app until you delete the saved library file.

## Themes

The theme row above the previews is the look of the **selected song**. Choosing a theme saves it on that song immediately and updates the output if the song is live.

Built-in themes:

| Theme | Look |
| --- | --- |
| Sanctuary | Warm gold glow, serif lyrics. This is the default when a song has no theme. |
| Midnight | Cool indigo, sans-serif. |
| Parchment | Aged vellum, brown ink. |
| Cathedral | Wine field, gold display type, thin gold frame. |
| Daylight | Muted stone with a warm sun. |
| High Contrast | Flat black and white, condensed type. |
| Pine | Deep green, soft serif. |
| Ember | Amber glow, open sans-serif. |
| Washed | Sunlit shallows, ocean blue. |
| Blood | Deep red, warm serif. |

The **+** control (**Create custom theme**) opens an editor:

- **Solid**, **Linear**, **Radial**, or **Glow**.
- One to three colors, depending on the fill. Glow uses a base color and a glow color.
- A direction slider for linear gradients.
- Named starting points (Sunrise, Ocean, Aurora, and others).

The preview in that panel uses the same type and fitting as the stage. Saving a new theme applies it to the selected song. Saving again on an existing custom theme updates every song that already uses it.

Hover a swatch and click the pencil to recolor that theme. The original typeface stays. **Reset built-in themes** restores every edited built-in theme. The button stays disabled until a built-in theme has been edited. Custom themes you created are left as they are.

Deleting a custom theme asks for confirmation. Songs that used it return to Sanctuary.

## Editor

Switch the main pane from **Slides** to **Editor**. The Slides grid is a map of the current song: title card first, then lyric slides. Click a tile to jump the live output there.

The editor has two modes. The mode you pick is remembered when you flip back to Slides.

### Sections

Build the song as cards.

1. Fill in title, artist, and key. The key is for the operator. It is not shown on the output.
2. Drag **Verse**, **Chorus**, **Bridge**, **Instrumental**, or **Tag** into the arrangement, or drop one between cards.
3. Type lyrics on each card. Each pair of lines becomes one slide. A card that says "2 slides" will produce two lyric slides after you update.
4. Drag a card's handle to reorder it. Duplicate a card when a part returns with the same words. Change the number chip when it should be labeled as the same part (`Chorus 1` sung again) or a new one (`Chorus 2`).
5. Press **Update slides** or Ctrl/Cmd+Enter.

Update slides writes the song, rebuilds the grid, and stays on the slide you were showing when that slide still exists. Empty lines are removed. A blank title is saved as "Untitled".

Instrumental cards have no lyric lines. They still occupy a slide so the operator can land on them.

### Copy-paste

Use this when you already have the full lyrics in another app.

1. Paste the song into the text box. A blank line, or a header such as `[Verse 1]`, `(Chorus)`, `Bridge:`, or `Chorus x2`, starts a new block. The header line itself is discarded.
2. Drag section kinds into the roadmap on the right, in the order the song is sung.
3. Each new part takes the next pasted block. A later step with the same kind and number, such as a second Chorus 1, reuses that block. Instrumental steps take no block.
4. The number menu offers every number already used for that kind, plus the next new number.
5. **Update slides** writes the arrangement into the song.

Unused pasted paragraphs stay in the text box until you clear them. They are kept if you leave the editor and come back, as long as the song's sections have not changed underneath you.

Switching an existing song into copy-paste rebuilds the text from its sections. Each kind and number contributes one paragraph, taken from the first card of that part that has lyrics. Empty parts are left out of the text so they do not steal a paragraph from the next part. Instrumentals stay in the roadmap.

## Title slides

Every song starts with a title slide: the song name large, the artist in the lower right. It is created from the title and artist. You do not add it as a section.

On a new song, the title card follows what you type before you press Update slides. On a song already in the library, the live title card updates when you press Update slides.

## If a save fails

A banner under the header appears when the song library cannot be written. The change is still on screen. It can be lost if you quit before a later save succeeds. Theme saves do not use that banner. Check that the app can write its user-data folder if saves keep failing.

## Keyboard focus after a confirmation

Delete and clear actions use the system confirmation dialog. On Linux and Windows that dialog can leave the window unable to receive keys. Prima Vista blurs and refocuses the window after the dialog closes. If keys still do nothing, click the controller once.
