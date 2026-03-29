import type { ChordResult } from '../types';
import { eventBus } from '../core/event-bus';
import { midiToNoteName } from '../core/constants';

export function createChordDisplay(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex flex-col items-center justify-center flex-1 p-4 bg-bg-surface rounded-lg border border-border min-h-[120px]';

  const chordName = document.createElement('div');
  chordName.className = 'text-3xl font-bold text-accent-blue';
  chordName.textContent = '--';

  const chordNotes = document.createElement('div');
  chordNotes.className = 'text-sm text-text-secondary mt-2';
  chordNotes.textContent = '';

  const degreeLabel = document.createElement('div');
  degreeLabel.className = 'text-xs text-accent-purple mt-1';
  degreeLabel.textContent = '';

  container.append(chordName, chordNotes, degreeLabel);

  const DEGREE_ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  eventBus.on('ui:chordDisplay', (chord: ChordResult | null) => {
    if (!chord) {
      chordName.textContent = '--';
      chordNotes.textContent = '';
      degreeLabel.textContent = '';
      return;
    }

    chordName.textContent = chord.name;
    chordNotes.textContent = chord.notes.map(midiToNoteName).join(' \u00B7 ');

    const roman = DEGREE_ROMAN[chord.degree] || '';
    const invText = chord.inversion > 0 ? ` (inv ${chord.inversion})` : '';
    degreeLabel.textContent = `${roman}${invText}`;
  });

  return container;
}
