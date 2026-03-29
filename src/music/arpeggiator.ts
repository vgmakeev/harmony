import type { NoteEvent, ArpPatternName, ChordResult } from '../types';
import { eventBus } from '../core/event-bus';
import { getState } from '../core/state';

type PatternFn = (notes: number[], step: number) => number | number[] | null;

function bjorklund(onsets: number, steps: number): boolean[] {
  if (onsets >= steps) return Array(steps).fill(true);
  if (onsets <= 0) return Array(steps).fill(false);
  let groupA: number[][] = Array.from({ length: onsets }, () => [1]);
  let groupB: number[][] = Array.from({ length: steps - onsets }, () => [0]);
  while (groupB.length > 1) {
    const min = Math.min(groupA.length, groupB.length);
    const merged: number[][] = [];
    for (let i = 0; i < min; i++) merged.push([...groupA[i], ...groupB[i]]);
    const leftA = groupA.slice(min);
    const leftB = groupB.slice(min);
    groupA = merged;
    groupB = leftA.length > 0 ? leftA : leftB;
  }
  return [...groupA, ...groupB].flat().map(v => v === 1);
}

const PATTERNS: Record<ArpPatternName, PatternFn> = {
  chord: (notes) => notes,
  up: (notes, step) => notes[step % notes.length],
  down: (notes, step) => notes[notes.length - 1 - (step % notes.length)],
  upDown: (notes, step) => {
    if (notes.length <= 1) return notes[0];
    const cycle = notes.length * 2 - 2;
    const pos = step % cycle;
    return pos < notes.length ? notes[pos] : notes[cycle - pos];
  },
  downUp: (notes, step) => {
    if (notes.length <= 1) return notes[0];
    const rev = [...notes].reverse();
    const cycle = rev.length * 2 - 2;
    const pos = step % cycle;
    return pos < rev.length ? rev[pos] : rev[cycle - pos];
  },
  random: (notes) => notes[Math.floor(Math.random() * notes.length)],
  alberti: (notes, step) => {
    const pattern = [0, 2, 1, 2];
    const idx = pattern[step % pattern.length];
    return notes[Math.min(idx, notes.length - 1)];
  },
  gallop: (notes, step) => {
    const idx = step % 3;
    return notes[Math.min(idx, notes.length - 1)];
  },
  tremolo: (notes, step) => {
    if (notes.length <= 1) return notes[0];
    return step % 2 === 0 ? notes[0] : notes.slice(1);
  },
  broken: (notes, step) => {
    const pattern = [0, 2, 1, 3];
    const idx = pattern[step % pattern.length];
    return notes[Math.min(idx, notes.length - 1)];
  },
  triplet: (notes, step) => {
    const group = Math.floor(step / 3) % notes.length;
    const pos = step % 3;
    return notes[(group + pos) % notes.length];
  },
  swing: (notes, step) => notes[step % notes.length],
  rootFifth: (notes, step) => {
    const root = notes[0];
    const fifth = root + 7;
    const seq = [root, fifth, root, fifth];
    return seq[step % seq.length];
  },
  rootOctave: (notes, step) => {
    const root = notes[0];
    const oct = root + 12;
    const seq = [root, oct, root, oct];
    return seq[step % seq.length];
  },
  bassLine: (notes, step) => {
    const root = notes[0];
    const fifth = root + 7;
    const oct = root + 12;
    const seq = [root, fifth, oct, fifth];
    return seq[step % seq.length];
  },
  funk: (notes, step) => {
    const root = notes[0];
    const fifth = root + 7;
    // R _ R _ _ R 5 _  (syncopated funk)
    const seq: (number | null)[] = [root, null, root, null, null, root, fifth, null];
    return seq[step % seq.length];
  },
  reggae: (notes, step) => {
    const root = notes[0];
    const fifth = root + 7;
    // _ R _ R _ 5 _ R  (offbeat skank)
    const seq: (number | null)[] = [null, root, null, root, null, fifth, null, root];
    return seq[step % seq.length];
  },
  disco: (notes, step) => {
    const root = notes[0];
    const oct = root + 12;
    // R 8 R 8 R R 8 R  (pumping octave)
    const seq = [root, oct, root, oct, root, root, oct, root];
    return seq[step % seq.length];
  },
  tumbao: (notes, step) => {
    const root = notes[0];
    const fifth = root + 7;
    const oct = root + 12;
    // R _ _ 8 _ R 5 _  (Latin/Cuban anticipation)
    const seq: (number | null)[] = [root, null, null, oct, null, root, fifth, null];
    return seq[step % seq.length];
  },
  pedal: (notes) => {
    // Drone — root every hit
    return notes[0];
  },
  bounce: (notes, step) => {
    const root = notes[0];
    const fifth = root + 7;
    const oct = root + 12;
    // R R 5 5 8 8 5 5  (bouncing between intervals)
    const seq = [root, root, fifth, fifth, oct, oct, fifth, fifth];
    return seq[step % seq.length];
  },
  euclidean: (notes, step) => {
    const { euclideanOnsets, euclideanSteps } = getState().arp;
    const rhythm = bjorklund(euclideanOnsets, euclideanSteps);
    const rhythmStep = step % rhythm.length;
    if (!rhythm[rhythmStep]) return null;
    const onsetIndex = rhythm.slice(0, rhythmStep + 1).filter(Boolean).length - 1;
    return notes[onsetIndex % notes.length];
  },
};

let currentNotes: number[] = [];
let step = 0;
let intervalId: number | null = null;
let lastPlayedNotes: number[] = [];

// Track chord notes in bypass mode: input MIDI note → array of sounded notes
const bypassActiveNotes = new Map<number, number[]>();

function getGateForStep(s: number): number {
  const { pattern, gate } = getState().arp;
  if (pattern === 'gallop') {
    return (s % 3) === 2 ? gate * 1.5 : gate * 0.5;
  }
  if (pattern === 'swing') {
    return (s % 2) === 0 ? gate * 1.33 : gate * 0.67;
  }
  return gate;
}

function getMsPerStep(): number {
  const { bpm, subdivision } = getState().arp;
  return (60000 / bpm) / subdivision;
}

function stopLastNotes(): void {
  for (const n of lastPlayedNotes) {
    eventBus.emit('sound:noteOff', { type: 'noteOff', note: n, velocity: 0, source: 'arp' });
  }
  lastPlayedNotes = [];
}

function tick(): void {
  if (currentNotes.length === 0) return;

  stopLastNotes();

  const { pattern } = getState().arp;
  const result = PATTERNS[pattern](currentNotes, step);
  const notesToPlay = result === null ? [] : Array.isArray(result) ? result : [result];

  for (const n of notesToPlay) {
    eventBus.emit('sound:noteOn', { type: 'noteOn', note: n, velocity: 100, source: 'arp' });
  }
  lastPlayedNotes = [...notesToPlay];

  // Schedule note-off based on gate
  const gateMs = getMsPerStep() * getGateForStep(step);
  const capturedNotes = [...notesToPlay];
  setTimeout(() => {
    for (const n of capturedNotes) {
      eventBus.emit('sound:noteOff', { type: 'noteOff', note: n, velocity: 0, source: 'arp' });
    }
    // Clean up lastPlayedNotes if they haven't changed
    if (lastPlayedNotes === capturedNotes) {
      lastPlayedNotes = [];
    }
  }, gateMs);

  step++;
}

function startArp(): void {
  stopArp();
  step = 0;
  const ms = getMsPerStep();
  tick();
  intervalId = window.setInterval(tick, ms);
}

function stopArp(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  stopLastNotes();
  step = 0;
}

function expandWithOctaves(notes: number[]): number[] {
  const { octaves } = getState().arp;
  if (octaves <= 1) return notes;
  const expanded = [...notes];
  for (let oct = 1; oct < octaves; oct++) {
    for (const n of notes) {
      expanded.push(n + oct * 12);
    }
  }
  return expanded;
}

function handleHarmonyNoteOn(event: NoteEvent & { chord?: ChordResult }): void {
  const { enabled } = getState().arp;

  if (!enabled) {
    // Bypass: play all chord notes immediately
    const notes = event.chord ? event.chord.notes : [event.note];
    bypassActiveNotes.set(event.note, notes);
    for (const n of notes) {
      eventBus.emit('sound:noteOn', { type: 'noteOn', note: n, velocity: event.velocity, source: event.source });
    }
    return;
  }

  // Arp enabled: set chord notes and start/restart arp
  const notes = event.chord ? event.chord.notes : [event.note];
  currentNotes = expandWithOctaves([...notes].sort((a, b) => a - b));
  startArp();
}

function handleHarmonyNoteOff(event: NoteEvent): void {
  const { enabled } = getState().arp;

  if (!enabled) {
    // Release all chord notes that were triggered for this input note
    const notes = bypassActiveNotes.get(event.note);
    if (notes) {
      for (const n of notes) {
        eventBus.emit('sound:noteOff', { type: 'noteOff', note: n, velocity: 0, source: event.source });
      }
      bypassActiveNotes.delete(event.note);
    } else {
      eventBus.emit('sound:noteOff', event);
    }
    return;
  }

  // Stop arp when all notes are released
  currentNotes = [];
  stopArp();
}

export function initArpeggiator(): void {
  eventBus.on('harmony:noteOn', handleHarmonyNoteOn);
  eventBus.on('harmony:noteOff', handleHarmonyNoteOff);

  eventBus.on('state:arpChanged', () => {
    if (intervalId !== null && currentNotes.length > 0) {
      startArp();
    }
  });

  eventBus.on('state:bpmChanged', () => {
    if (intervalId !== null && currentNotes.length > 0) {
      startArp();
    }
  });
}
