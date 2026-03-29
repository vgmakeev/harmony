import type { ChordResult } from '../types';
import { eventBus } from '../core/event-bus';
import { getState, setBpm, setMidiOut } from '../core/state';
import { isRecording, startRecording, stopRecording } from '../engine/wav-export';
import { midiToNoteName } from '../core/constants';

export function createHeader(): HTMLElement {
  const header = document.createElement('header');
  header.className = 'flex items-center justify-between px-4 h-12 bg-bg-surface border-b border-border shrink-0';

  // Logo
  const logo = document.createElement('div');
  logo.className = 'text-accent-blue font-bold text-lg tracking-wide';
  logo.textContent = 'Harmonia';

  // MIDI indicator
  const midiDot = document.createElement('div');
  midiDot.className = 'flex items-center gap-2 text-xs text-text-secondary';
  midiDot.innerHTML = `MIDI: <span class="inline-block w-2 h-2 rounded-full bg-text-secondary" id="midi-dot"></span>`;

  // BPM control
  const bpmContainer = document.createElement('div');
  bpmContainer.className = 'flex items-center gap-2';

  const bpmDown = document.createElement('button');
  bpmDown.className = 'w-6 h-6 rounded bg-bg-elevated border border-border text-text-secondary hover:text-text-primary text-xs';
  bpmDown.textContent = '-';

  const bpmDisplay = document.createElement('span');
  bpmDisplay.className = 'text-sm font-medium w-20 text-center';
  bpmDisplay.textContent = `BPM: ${getState().bpm}`;

  const bpmUp = document.createElement('button');
  bpmUp.className = 'w-6 h-6 rounded bg-bg-elevated border border-border text-text-secondary hover:text-text-primary text-xs';
  bpmUp.textContent = '+';

  bpmDown.addEventListener('click', () => setBpm(getState().bpm - 5));
  bpmUp.addEventListener('click', () => setBpm(getState().bpm + 5));

  bpmContainer.append(bpmDown, bpmDisplay, bpmUp);

  // MIDI Out toggle
  const midiOutBtn = document.createElement('button');
  const updateMidiOutBtn = (enabled: boolean) => {
    midiOutBtn.className = `px-3 py-1 text-xs rounded border ${
      enabled
        ? 'bg-accent-purple/20 border-accent-purple text-accent-purple'
        : 'bg-bg-elevated border-border text-text-secondary'
    }`;
    midiOutBtn.textContent = enabled ? 'MIDI Out ON' : 'MIDI Out';
  };
  updateMidiOutBtn(getState().midiOutEnabled);
  midiOutBtn.addEventListener('click', () => {
    const next = !getState().midiOutEnabled;
    setMidiOut(next);
    updateMidiOutBtn(next);
  });

  // Record button
  const recBtn = document.createElement('button');
  const updateRecBtn = (recording: boolean) => {
    recBtn.className = `px-3 py-1 text-xs rounded border ${
      recording
        ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
        : 'bg-bg-elevated border-border text-text-secondary'
    }`;
    recBtn.textContent = recording ? 'REC' : 'Rec';
  };
  updateRecBtn(false);
  recBtn.addEventListener('click', () => {
    if (isRecording()) {
      stopRecording();
      updateRecBtn(false);
    } else {
      startRecording();
      updateRecBtn(true);
    }
  });

  eventBus.on('recording:start', () => updateRecBtn(true));
  eventBus.on('recording:stop', () => updateRecBtn(false));

  // Chord display (inline in header)
  const DEGREE_ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const chordEl = document.createElement('div');
  chordEl.className = 'flex items-center gap-1.5 min-w-[120px]';
  const chordName = document.createElement('span');
  chordName.className = 'text-sm font-bold text-accent-blue transition-opacity opacity-0';
  const chordNotes = document.createElement('span');
  chordNotes.className = 'text-[10px] text-text-secondary/60 transition-opacity opacity-0';
  chordEl.append(chordName, chordNotes);

  let chordFadeTimer: ReturnType<typeof setTimeout>;
  eventBus.on('ui:chordDisplay', (chord: ChordResult | null) => {
    clearTimeout(chordFadeTimer);
    if (!chord) {
      chordName.classList.replace('opacity-100', 'opacity-0');
      chordNotes.classList.replace('opacity-100', 'opacity-0');
      return;
    }
    const roman = DEGREE_ROMAN[chord.degree] || '';
    const invText = chord.inversion > 0 ? `/${chord.inversion}` : '';
    chordName.textContent = `${chord.name} ${roman}${invText}`;
    chordNotes.textContent = chord.notes.map(midiToNoteName).join(' ');
    chordName.classList.replace('opacity-0', 'opacity-100');
    chordNotes.classList.replace('opacity-0', 'opacity-100');
    chordFadeTimer = setTimeout(() => {
      chordName.classList.replace('opacity-100', 'opacity-0');
      chordNotes.classList.replace('opacity-100', 'opacity-0');
    }, 3000);
  });

  header.append(logo, chordEl, midiDot, midiOutBtn, recBtn, bpmContainer);

  // Event listeners
  eventBus.on('state:bpmChanged', (bpm) => {
    bpmDisplay.textContent = `BPM: ${bpm}`;
  });

  eventBus.on('midi:connected', () => {
    const dot = document.getElementById('midi-dot');
    if (dot) dot.className = 'inline-block w-2 h-2 rounded-full bg-green-400';
  });

  eventBus.on('midi:disconnected', () => {
    const dot = document.getElementById('midi-dot');
    if (dot) dot.className = 'inline-block w-2 h-2 rounded-full bg-text-secondary';
  });

  return header;
}
