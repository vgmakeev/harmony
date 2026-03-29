import type { NoteName, ScaleType, ChordQuality } from '../types';
import { NOTE_NAMES, SCALE_INTERVALS } from '../core/constants';

export function getScaleNotes(key: NoteName, scale: ScaleType): number[] {
  const root = NOTE_NAMES.indexOf(key);
  return SCALE_INTERVALS[scale].map((interval) => (root + interval) % 12);
}

export function isNoteInScale(midiNote: number, scaleNotes: number[]): boolean {
  return scaleNotes.includes(midiNote % 12);
}

export function findScaleDegree(pitchClass: number, scaleNotes: number[]): number {
  return scaleNotes.indexOf(pitchClass);
}

export interface DiatonicChord {
  degree: number;
  rootPc: number;
  thirdPc: number;
  fifthPc: number;
  seventhPc: number;
  triadIntervals: number[];
  seventhIntervals: number[];
  triadQuality: ChordQuality;
  seventhQuality: ChordQuality;
  name: string;         // current display name (set by harmonizer based on mode)
}

function semitonesBetween(from: number, to: number): number {
  return ((to - from) + 12) % 12;
}

function detectTriadQuality(rootToThird: number, rootToFifth: number): 'maj' | 'min' | 'dim' | 'aug' {
  if (rootToThird === 4 && rootToFifth === 7) return 'maj';
  if (rootToThird === 3 && rootToFifth === 7) return 'min';
  if (rootToThird === 3 && rootToFifth === 6) return 'dim';
  if (rootToThird === 4 && rootToFifth === 8) return 'aug';
  return 'maj';
}

function detectSeventhQuality(triadQ: 'maj' | 'min' | 'dim' | 'aug', rootToSeventh: number): ChordQuality {
  if (triadQ === 'maj' && rootToSeventh === 11) return 'maj7';
  if (triadQ === 'maj' && rootToSeventh === 10) return 'dom7';
  if (triadQ === 'min' && rootToSeventh === 10) return 'min7';
  if (triadQ === 'min' && rootToSeventh === 11) return 'minMaj7';
  if (triadQ === 'dim' && rootToSeventh === 10) return 'min7b5';
  if (triadQ === 'dim' && rootToSeventh === 9) return 'dim7';
  if (triadQ === 'aug' && rootToSeventh === 11) return 'maj7';
  return 'dom7';
}

const QUALITY_SUFFIX: Record<ChordQuality, string> = {
  maj: '', min: 'm', dim: 'dim', aug: 'aug', '5': '5',
  maj7: 'maj7', min7: 'm7', dom7: '7',
  min7b5: 'm7b5', dim7: 'dim7', minMaj7: 'mMaj7',
};

export function qualitySuffix(q: ChordQuality): string {
  return QUALITY_SUFFIX[q];
}

/**
 * Resolve chord voicing: fifths mode (power chord) or full triad.
 */
export function resolveChord(chord: DiatonicChord, fifths: boolean): {
  intervals: number[];
  quality: ChordQuality;
  name: string;
} {
  const rootName = NOTE_NAMES[chord.rootPc];
  if (fifths) {
    const rootToFifth = chord.triadIntervals[2];
    return { intervals: [0, rootToFifth], quality: '5', name: `${rootName}5` };
  }
  return {
    intervals: chord.triadIntervals,
    quality: chord.triadQuality,
    name: `${rootName}${QUALITY_SUFFIX[chord.triadQuality]}`,
  };
}

export function buildDiatonicChords(key: NoteName, scale: ScaleType): DiatonicChord[] {
  const scaleNotes = getScaleNotes(key, scale);
  const chords: DiatonicChord[] = [];

  const len = scaleNotes.length;
  for (let deg = 0; deg < len; deg++) {
    const rPc = scaleNotes[deg];
    const tPc = scaleNotes[(deg + 2) % len];
    const fPc = scaleNotes[(deg + 4) % len];
    const sPc = scaleNotes[(deg + 6) % len];

    const rootToThird = semitonesBetween(rPc, tPc);
    const rootToFifth = semitonesBetween(rPc, fPc);
    const rootToSeventh = semitonesBetween(rPc, sPc);

    const triadQ = detectTriadQuality(rootToThird, rootToFifth);
    const seventhQ = detectSeventhQuality(triadQ, rootToSeventh);

    chords.push({
      degree: deg,
      rootPc: rPc,
      thirdPc: tPc,
      fifthPc: fPc,
      seventhPc: sPc,
      triadIntervals: [0, rootToThird, rootToFifth],
      seventhIntervals: [0, rootToThird, rootToFifth, rootToSeventh],
      triadQuality: triadQ,
      seventhQuality: seventhQ,
      name: '',  // resolved at play time
    });
  }

  return chords;
}

export function chordContainsPitchClass(chord: DiatonicChord, pc: number, includeSeventh: boolean): boolean {
  if (chord.rootPc === pc) return true;
  if (chord.thirdPc === pc) return true;
  if (chord.fifthPc === pc) return true;
  if (includeSeventh && chord.seventhPc === pc) return true;
  return false;
}
