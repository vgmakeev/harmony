import type { NoteEvent, ChordResult } from '../types';
import { eventBus } from '../core/event-bus';
import { getState } from '../core/state';
import { NOTE_NAMES } from '../core/constants';
import {
  buildDiatonicChords,
  findScaleDegree,
  getScaleNotes,
  chordContainsPitchClass,
  resolveChord,
  type DiatonicChord,
} from './theory';

let diatonicChords: DiatonicChord[] = [];
let scaleNotes: number[] = [];

// Last voicing for Voice mode: classic voice leading
let lastVoicing: number[] | null = null;

const activeChords = new Map<number, number[]>();

function rebuildChords(): void {
  const { key, scale } = getState().harmonizer;
  diatonicChords = buildDiatonicChords(key, scale);
  scaleNotes = getScaleNotes(key, scale);
  lastVoicing = null;
}

function getKeyRootPc(): number {
  return NOTE_NAMES.indexOf(getState().harmonizer.key);
}

// ── Inversion generation ──

function generateInversions(intervals: number[], rootPc: number, centerOctave: number): number[][] {
  const results: number[][] = [];
  for (let octShift = -1; octShift <= 1; octShift++) {
    const oct = centerOctave + octShift;
    for (let inv = 0; inv < intervals.length; inv++) {
      const voicing: number[] = [];
      for (let i = 0; i < intervals.length; i++) {
        const idx = (inv + i) % intervals.length;
        let midi = oct * 12 + rootPc + intervals[idx];
        if (voicing.length > 0 && midi <= voicing[voicing.length - 1]) {
          midi += 12;
        }
        voicing.push(midi);
      }
      if (voicing.every(n => n >= 24 && n <= 108)) {
        results.push(voicing);
      }
    }
  }
  return results;
}

function rootPosition(intervals: number[], rootPc: number, octave: number): number[] {
  const notes: number[] = [];
  for (const interval of intervals) {
    let midi = octave * 12 + rootPc + interval;
    if (notes.length > 0 && midi <= notes[notes.length - 1]) {
      midi += 12;
    }
    notes.push(midi);
  }
  return notes;
}

function pickVoiceLed(inversions: number[][], prev: number[], inputNote: number): number[] {
  if (inversions.length === 0) return prev;

  let best = inversions[0];
  let bestScore = Infinity;

  for (const inv of inversions) {
    const sorted = [...inv].sort((a, b) => a - b);
    const prevSorted = [...prev].sort((a, b) => a - b);
    let voiceScore = 0;
    const len = Math.max(sorted.length, prevSorted.length);
    for (let i = 0; i < len; i++) {
      const a = sorted[Math.min(i, sorted.length - 1)];
      const b = prevSorted[Math.min(i, prevSorted.length - 1)];
      voiceScore += Math.abs(a - b);
    }
    // Small proximity bonus toward the input note's range
    const center = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const proximity = Math.abs(center - inputNote) * 0.2;
    const score = voiceScore + proximity;
    if (score < bestScore) {
      bestScore = score;
      best = sorted;
    }
  }
  return best;
}

// ── Detect inversion number ──

function detectInversion(notes: number[], chord: DiatonicChord): number {
  const bassPc = Math.min(...notes) % 12;
  if (bassPc === chord.thirdPc) return 1;
  if (bassPc === chord.fifthPc) return 2;
  if (bassPc === chord.seventhPc) return 3;
  return 0;
}

// ── Main chord builder ──

function getChordForNote(inputNote: number): ChordResult | null {
  const { fifths, voicingMode } = getState().harmonizer;
  const pc = inputNote % 12;
  const octave = Math.floor(inputNote / 12);
  const keyRootPc = getKeyRootPc();
  const isTonic = (pc === keyRootPc);

  // Find which chord to play
  let chord: DiatonicChord | null = null;
  let degree = findScaleDegree(pc, scaleNotes);

  if (degree >= 0 && degree < diatonicChords.length) {
    chord = diatonicChords[degree];
  } else {
    // Non-root scale note — find diatonic chord containing this pitch class
    for (const c of diatonicChords) {
      if (chordContainsPitchClass(c, pc, false)) {
        chord = c;
        degree = c.degree;
        break;
      }
    }
  }

  if (!chord) return null;

  // Resolve intervals and quality (auto-dom7 + toggle)
  const resolved = resolveChord(chord, fifths);

  let notes: number[];

  if (voicingMode === 'root') {
    // ── ROOT MODE ──
    // Always root position built upward from the pressed note's octave.
    notes = rootPosition(resolved.intervals, chord.rootPc, octave);
  } else {
    // ── VOICE LEAD MODE ──
    // Tonic: root position, sets anchor (same as Root mode)
    // Other notes: pick the INVERSION closest to last voicing (smooth voice leading)
    if (isTonic || !lastVoicing) {
      // First chord or tonic — root position, sets the register
      notes = rootPosition(resolved.intervals, chord.rootPc, octave);
    } else {
      // Voice leading: find inversion with minimal total movement from lastVoicing
      const searchOctave = Math.floor(lastVoicing[0] / 12);
      const inversions = generateInversions(resolved.intervals, chord.rootPc, searchOctave);
      notes = pickVoiceLed(inversions, lastVoicing, inputNote);
    }
    lastVoicing = [...notes].sort((a, b) => a - b);
  }

  return {
    root: inputNote,
    quality: resolved.quality,
    notes,
    name: resolved.name,
    degree: degree + 1,
    inversion: detectInversion(notes, chord),
  };
}

// ── Event handlers ──

function handleNoteOn(event: NoteEvent): void {
  if (!getState().harmonizer.enabled) {
    eventBus.emit('harmony:noteOn', { ...event });
    return;
  }

  const chord = getChordForNote(event.note);
  if (chord) {
    activeChords.set(event.note, chord.notes);
    eventBus.emit('harmony:noteOn', { ...event, chord });
    eventBus.emit('ui:chordDisplay', chord);
  }
}

function handleNoteOff(event: NoteEvent): void {
  if (!getState().harmonizer.enabled) {
    eventBus.emit('harmony:noteOff', event);
    return;
  }

  activeChords.delete(event.note);
  eventBus.emit('harmony:noteOff', event);

  if (activeChords.size === 0) {
    eventBus.emit('ui:chordDisplay', null);
  }
}

export function initHarmonizer(): void {
  rebuildChords();
  eventBus.on('input:noteOn', handleNoteOn);
  eventBus.on('input:noteOff', handleNoteOff);
  eventBus.on('state:harmonizerChanged', rebuildChords);
}
