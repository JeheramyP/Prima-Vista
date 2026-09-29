# Prima Vista

Desktop lyric presentation software for churches and worship gatherings. Built with Electron, React, Vite, and Tailwind CSS.

## What it does

- **Controller window** searches a local song library, builds slides from verses and choruses, and lets you jump, edit, or preview the next cue.
- **Output window** is a frameless, high-contrast stage display meant to drag onto a projector or second monitor.
- **Electron IPC** keeps the live slide in sync between the two windows.

## Run locally

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
| Click a slide tile | Jump to that slide |

Lyric editor headings use `[Verse 1]`, `[Chorus]`, and `[Bridge]`. Each pair of lines becomes one slide. **Rebuild slides** applies edits immediately.

Songs currently load from a mock library in `src/lib/songs.ts`. Swap `searchSongs` for a remote lyrics API when you are ready.
