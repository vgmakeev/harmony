import type { NoteName, ScaleType } from '../types';

export const NOTE_NAMES: readonly NoteName[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
];

export const SCALE_INTERVALS: Record<ScaleType, readonly number[]> = {
  major:         [0, 2, 4, 5, 7, 9, 11],
  minor:         [0, 2, 3, 5, 7, 8, 10],
  dorian:        [0, 2, 3, 5, 7, 9, 10],
  phrygian:      [0, 1, 3, 5, 7, 8, 10],
  lydian:        [0, 2, 4, 6, 7, 9, 11],
  mixolydian:    [0, 2, 4, 5, 7, 9, 10],
  locrian:       [0, 1, 3, 5, 6, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  melodicMinor:  [0, 2, 3, 5, 7, 9, 11],
  pentatonic:    [0, 2, 4, 7, 9],
  blues:         [0, 3, 5, 6, 7, 10],
  chromatic:     [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

export const SCALE_LABELS: Record<ScaleType, string> = {
  major: 'Major',
  minor: 'Minor',
  dorian: 'Dorian',
  phrygian: 'Phrygian',
  lydian: 'Lydian',
  mixolydian: 'Mixolydian',
  locrian: 'Locrian',
  harmonicMinor: 'Harm. Minor',
  melodicMinor: 'Mel. Minor',
  pentatonic: 'Pentatonic',
  blues: 'Blues',
  chromatic: 'Chromatic',
};

// Mac keyboard mapping — DAW-style two-row layout
// Lower row: Z=C3, S=C#3, X=D3, D=D#3, C=E3, V=F3, G=F#3, B=G3, H=G#3, N=A3, J=A#3, M=B3
// Upper row: Q=C4, 2=C#4, W=D4, 3=D#4, E=E4, R=F4, 5=F#4, T=G4, 6=G#4, Y=A4, 7=A#4, U=B4, I=C5
export const KEY_TO_NOTE: Record<string, number> = {
  z: 48, s: 49, x: 50, d: 51, c: 52,
  v: 53, g: 54, b: 55, h: 56, n: 57,
  j: 58, m: 59,
  q: 60, '2': 61, w: 62, '3': 63, e: 64,
  r: 65, '5': 66, t: 67, '6': 68, y: 69,
  '7': 70, u: 71, i: 72,
};

// Reverse mapping: MIDI note → keyboard label (for piano display)
export const NOTE_TO_KEY: Record<number, string> = Object.fromEntries(
  Object.entries(KEY_TO_NOTE).map(([k, v]) => [v, k.toUpperCase()])
);

export const BLACK_KEYS = new Set([1, 3, 6, 8, 10]);

export function isBlackKey(midiNote: number): boolean {
  return BLACK_KEYS.has(midiNote % 12);
}

export function midiToNoteName(midi: number): string {
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

export function noteNameToMidi(name: NoteName): number {
  return NOTE_NAMES.indexOf(name);
}
