# Prima Vista

Desktop lyric presentation software for churches, youth groups, and worship gatherings. Built with Electron, React, Vite, and Tailwind CSS.

# Inspiration

Italian for "at first sight," prima vista is a musical phrase meaning sight-reading. This application is meant to provide an at-a-glance overview of the program, including the setlist and full lyrics of the current song.

No more guessing what comes next - overview all the lyrics and make necessary edits on the fly. No more tedious Google Slides work, either. Adding songs is as easy as copy-pasting the full lyrics. Customizable background themes give each song an appropriate vibe. Highly customizable, easily navigable, extremely stress-free.

## What it does

- **Controller window** searches a local song library, builds slides from verses and choruses, and lets you jump, edit, or preview the next slide.
- **Output window** is a frameless, high-contrast stage display meant to be dragged onto a projector or second monitor.
- **Electron IPC** keeps the live slide in sync between the two windows.

## Run locally

To install the application as a desktop app, run the installer for the operating system being used. Windows runs .exe, Linux runs .AppImage or .deb.

Clone from the GitHub repo, then run:

```bash
npm install
npm run dev
```

The controller opens first. Use **Open output** to spawn the presentation window. If a second display is connected, the output window is placed on it automatically.

## Controls

| Key | Action |
| --- | --- |
| Space, Right Arrow, Page Down | Next slide |
| Left Arrow, Page Up, Backspace | Previous slide |
| Home / End | First / last slide |
| B | Blackout |
| C | Clear (blank lyrics, keep background) |
| Click a slide tile or song | Jump to that slide |

The editor builds a song from sections. Drag **Verse**, **Chorus**, **Bridge**, **Instrumental**, or **Tag** into the arrangement, reorder them by the handle, and type lyrics on each card. **Update slides** applies the arrangement. Each pair of lines becomes one slide.

Switch the editor to **Copy-paste** to paste a whole song at once. Blank lines (or headers like `[Verse 1]`) split the lyrics into blocks. Drag blocks into the roadmap on the right in the order they are sung: each block takes the next pasted paragraph. Every section has a number picker (Chorus 1, Chorus 2, and so on) in both editors, and that label carries through to the slides. In the roadmap, giving a block the same number as an earlier one reuses its lyrics instead of taking a new paragraph.

Songs live in a local library. The first launch seeds it from the bundled hymns in `src/lib/songs.ts`; later edits are saved on this machine.

## Documentation

- [Overview](docs/OVERVIEW.md) — the two windows, how a slide reaches the screen, and where data is stored.
- [User guide](docs/USER_GUIDE.md) — running a gathering: output, setlist, editor, and themes.
- [Developer guide](docs/DEVELOPER.md) — IPC, persistence, the slide model, and how to extend the app.
