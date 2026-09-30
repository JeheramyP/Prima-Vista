import type { LyricSection, SectionKind, Song } from "../types";

function section(
  id: string,
  kind: SectionKind,
  label: string,
  lines: string[],
): LyricSection {
  return { id, kind, label, lines };
}

export const SONG_LIBRARY: Song[] = structuredClone([
  {
    id: "amazing-grace",
    title: "Amazing Grace",
    artist: "John Newton",
    key: "G",
    sections: [
      section("ag-v1", "verse", "Verse 1", [
        "Amazing grace, how sweet the sound",
        "That saved a wretch like me",
        "I once was lost, but now am found",
        "Was blind, but now I see",
      ]),
      section("ag-v2", "verse", "Verse 2", [
        "Twas grace that taught my heart to fear",
        "And grace my fears relieved",
        "How precious did that grace appear",
        "The hour I first believed",
      ]),
      section("ag-v3", "verse", "Verse 3", [
        "Through many dangers, toils and snares",
        "I have already come",
        "Tis grace hath brought me safe thus far",
        "And grace will lead me home",
      ]),
      section("ag-v4", "verse", "Verse 4", [
        "When we've been there ten thousand years",
        "Bright shining as the sun",
        "We've no less days to sing God's praise",
        "Than when we'd first begun",
      ]),
    ],
  },
  {
    id: "how-great-thou-art",
    title: "How Great Thou Art",
    artist: "Carl Boberg / Stuart K. Hine",
    key: "A",
    sections: [
      section("hg-v1", "verse", "Verse 1", [
        "O Lord my God, when I in awesome wonder",
        "Consider all the worlds Thy hands have made",
        "I see the stars, I hear the rolling thunder",
        "Thy power throughout the universe displayed",
      ]),
      section("hg-c", "chorus", "Chorus", [
        "Then sings my soul, my Savior God, to Thee",
        "How great Thou art, how great Thou art",
        "Then sings my soul, my Savior God, to Thee",
        "How great Thou art, how great Thou art",
      ]),
      section("hg-v2", "verse", "Verse 2", [
        "And when I think that God, His Son not sparing",
        "Sent Him to die, I scarce can take it in",
        "That on the cross, my burden gladly bearing",
        "He bled and died to take away my sin",
      ]),
    ],
  },
  {
    id: "in-christ-alone",
    title: "In Christ Alone",
    artist: "Keith Getty / Stuart Townend",
    key: "D",
    sections: [
      section("ica-v1", "verse", "Verse 1", [
        "In Christ alone my hope is found",
        "He is my light, my strength, my song",
        "This Cornerstone, this solid Ground",
        "Firm through the fiercest drought and storm",
        "What heights of love, what depths of peace",
        "When fears are stilled, when strivings cease",
        "My Comforter, my All in All",
        "Here in the love of Christ I stand",
      ]),
      section("ica-v2", "verse", "Verse 2", [
        "In Christ alone, who took on flesh",
        "Fullness of God in helpless babe",
        "This gift of love and righteousness",
        "Scorned by the ones He came to save",
        "Till on that cross as Jesus died",
        "The wrath of God was satisfied",
        "For every sin on Him was laid",
        "Here in the death of Christ I live",
      ]),
      section("ica-v3", "verse", "Verse 3", [
        "There in the ground His body lay",
        "Light of the world by darkness slain",
        "Then bursting forth in glorious Day",
        "Up from the grave He rose again",
        "And as He stands in victory",
        "Sin's curse has lost its grip on me",
        "For I am His and He is mine",
        "Bought with the precious blood of Christ",
      ]),
    ],
  },
  {
    id: "10000-reasons",
    title: "10,000 Reasons (Bless the Lord)",
    artist: "Matt Redman",
    key: "G",
    sections: [
      section("10k-c", "chorus", "Chorus", [
        "Bless the Lord, O my soul, O my soul",
        "Worship His holy name",
        "Sing like never before, O my soul",
        "I'll worship Your holy name",
      ]),
      section("10k-v1", "verse", "Verse 1", [
        "The sun comes up, it's a new day dawning",
        "It's time to sing Your song again",
        "Whatever may pass and whatever lies before me",
        "Let me be singing when the evening comes",
      ]),
      section("10k-v2", "verse", "Verse 2", [
        "You're rich in love and You're slow to anger",
        "Your name is great and Your heart is kind",
        "For all Your goodness I will keep on singing",
        "Ten thousand reasons for my heart to find",
      ]),
      section("10k-v3", "verse", "Verse 3", [
        "And on that day when my strength is failing",
        "The end draws near and my time has come",
        "Still my soul will sing Your praise unending",
        "Ten thousand years and then forevermore",
      ]),
    ],
  },
  {
    id: "goodness-of-god",
    title: "Goodness of God",
    artist: "Bethel Music / Jenn Johnson",
    key: "Ab",
    sections: [
      section("gog-v1", "verse", "Verse 1", [
        "I love You, Lord",
        "For Your mercy never fails me",
        "All my days, I've been held in Your hands",
        "From the moment that I wake up",
        "Until I lay my head",
        "I will sing of the goodness of God",
      ]),
      section("gog-c", "chorus", "Chorus", [
        "All my life You have been faithful",
        "All my life You have been so, so good",
        "With every breath that I am able",
        "I will sing of the goodness of God",
      ]),
      section("gog-v2", "verse", "Verse 2", [
        "I love Your voice",
        "You have led me through the fire",
        "In darkest night, You are close like no other",
        "I've known You as a father",
        "I've known You as a friend",
        "I have lived in the goodness of God",
      ]),
      section("gog-b", "bridge", "Bridge", [
        "Your goodness is running after",
        "It's running after me",
        "Your goodness is running after",
        "It's running after me",
        "With my life laid down, I'm surrendered now",
        "I give You everything",
        "Your goodness is running after",
        "It's running after me",
      ]),
    ],
  },
  {
    id: "great-are-you-lord",
    title: "Great Are You Lord",
    artist: "All Sons & Daughters",
    key: "A",
    sections: [
      section("gayl-v1", "verse", "Verse 1", [
        "You give life, You are love",
        "You bring light to the darkness",
        "You give hope, You restore",
        "Every heart that is broken",
        "And great are You, Lord",
      ]),
      section("gayl-c", "chorus", "Chorus", [
        "It's Your breath in our lungs",
        "So we pour out our praise",
        "We pour out our praise",
        "It's Your breath in our lungs",
        "So we pour out our praise to You only",
      ]),
      section("gayl-b", "bridge", "Bridge", [
        "And all the earth will shout Your praise",
        "Our hearts will cry, these bones will sing",
        "Great are You, Lord",
      ]),
    ],
  },
  {
    id: "build-my-life",
    title: "Build My Life",
    artist: "Pat Barrett / Housefires",
    key: "G",
    sections: [
      section("bml-v1", "verse", "Verse 1", [
        "Worthy of every song we could ever sing",
        "Worthy of all the praise we could ever bring",
        "Worthy of every breath we could ever breathe",
        "We live for You",
      ]),
      section("bml-v2", "verse", "Verse 2", [
        "Jesus, the name above every other name",
        "Jesus, the only one who could ever save",
        "Worthy of every breath we could ever breathe",
        "We live for You, we live for You",
      ]),
      section("bml-c", "chorus", "Chorus", [
        "Holy, there is no one like You",
        "There is none besides You",
        "Open up my eyes in wonder",
        "And show me who You are",
        "And fill me with Your heart",
        "And lead me in Your love to those around me",
      ]),
      section("bml-b", "bridge", "Bridge", [
        "I will build my life upon Your love",
        "It is a firm foundation",
        "I will put my trust in You alone",
        "And I will not be shaken",
      ]),
    ],
  },
  {
    id: "holy-spirit",
    title: "Holy Spirit",
    artist: "Bryan & Katie Torwalt",
    key: "D",
    sections: [
      section("hs-v1", "verse", "Verse 1", [
        "There's nothing worth more that will ever come close",
        "No thing can compare, You're our living hope",
        "Your presence, Lord",
      ]),
      section("hs-v2", "verse", "Verse 2", [
        "I've tasted and seen of the sweetest of loves",
        "Where my heart becomes free and my shame is undone",
        "In Your presence, Lord",
      ]),
      section("hs-c", "chorus", "Chorus", [
        "Holy Spirit, You are welcome here",
        "Come flood this place and fill the atmosphere",
        "Your glory, God, is what our hearts long for",
        "To be overcome by Your presence, Lord",
      ]),
      section("hs-b", "bridge", "Bridge", [
        "Let us become more aware of Your presence",
        "Let us experience the glory of Your goodness",
      ]),
    ],
  },
]);

const STORAGE_KEY = "prima-vista-song-library";
const removedSongIds = new Set<string>();

function replaceLibrary(songs: Song[]) {
  SONG_LIBRARY.splice(0, SONG_LIBRARY.length, ...songs);
}

function isSong(value: unknown): value is Song {
  if (!value || typeof value !== "object") return false;
  const song = value as Song;
  return (
    typeof song.id === "string" &&
    typeof song.title === "string" &&
    typeof song.artist === "string" &&
    Array.isArray(song.sections)
  );
}

async function readPersistedLibrary(): Promise<Song[] | null> {
  if (window.primaVista?.loadSongs) {
    const songs = await window.primaVista.loadSongs();
    if (songs && songs.every(isSong)) return songs;
    return null;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.every(isSong)) return parsed;
  } catch {
    // Ignore corrupt browser storage and fall back to defaults.
  }
  return null;
}

async function commitPersistedLibrary(songs: Song[]) {
  if (window.primaVista?.saveSongs) {
    await window.primaVista.saveSongs(songs);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
}

let libraryWriteTail: Promise<void> = Promise.resolve();

/**
 * Whole-library saves must run one at a time. Each turn copies the in-memory
 * library when the write starts, so a slower save cannot finish last and
 * replace the file with a stale copy.
 */
function persistLibrary(): Promise<void> {
  const write = libraryWriteTail.then(() => commitPersistedLibrary(structuredClone(SONG_LIBRARY)));
  libraryWriteTail = write.then(
    () => undefined,
    () => undefined,
  );
  return write;
}

export async function loadLibrary(): Promise<Song[]> {
  const stored = await readPersistedLibrary();
  if (stored) {
    replaceLibrary(stored);
  } else {
    await persistLibrary();
  }
  return [...SONG_LIBRARY];
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function searchSongs(query: string): Promise<Song[]> {
  await wait(60);
  const q = normalize(query);
  if (!q) return [...SONG_LIBRARY];
  return SONG_LIBRARY.filter((song) => {
    const haystack = normalize(
      `${song.title} ${song.artist} ${song.sections.map((s) => s.lines.join(" ")).join(" ")}`,
    );
    return haystack.includes(q);
  });
}

export async function getSongById(id: string): Promise<Song | undefined> {
  await wait(80);
  return SONG_LIBRARY.find((song) => song.id === id);
}

export async function saveSong(song: Song): Promise<Song> {
  await wait(40);
  if (removedSongIds.has(song.id)) return song;
  const index = SONG_LIBRARY.findIndex((existing) => existing.id === song.id);
  if (index === -1) SONG_LIBRARY.push(song);
  else SONG_LIBRARY[index] = song;
  if (removedSongIds.has(song.id)) {
    const lateIndex = SONG_LIBRARY.findIndex((existing) => existing.id === song.id);
    if (lateIndex !== -1) SONG_LIBRARY.splice(lateIndex, 1);
    return song;
  }
  await persistLibrary();
  return song;
}

export async function deleteSong(id: string): Promise<boolean> {
  removedSongIds.add(id);
  const index = SONG_LIBRARY.findIndex((existing) => existing.id === id);
  if (index === -1) return false;
  SONG_LIBRARY.splice(index, 1);
  await persistLibrary();
  return true;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
