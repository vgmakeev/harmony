import { eventBus } from '../core/event-bus';
import { isBlackKey, NOTE_TO_KEY } from '../core/constants';
import { getState } from '../core/state';
import { getScaleNotes } from '../music/theory';
import { initPianoInput } from '../input/piano-input';

const START_NOTE = 36; // C2
const END_NOTE = 84;   // C6

export function createPianoKeyboard(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'shrink-0 bg-bg-surface border-t border-border px-2 py-3';

  const keyboard = document.createElement('div');
  keyboard.className = 'relative flex h-36 mx-auto';
  keyboard.id = 'piano-keyboard';

  const keyElements = new Map<number, HTMLElement>();
  let whiteKeyCount = 0;

  // First pass: count white keys for width calculation
  for (let note = START_NOTE; note <= END_NOTE; note++) {
    if (!isBlackKey(note)) whiteKeyCount++;
  }

  // Create keys
  let whiteIndex = 0;
  for (let note = START_NOTE; note <= END_NOTE; note++) {
    const black = isBlackKey(note);
    const key = document.createElement('div');
    key.dataset.note = String(note);

    const kbLabel = NOTE_TO_KEY[note - getState().octaveOffset] ?? '';

    if (black) {
      key.className = 'absolute z-10 flex flex-col items-center justify-end pb-1 cursor-pointer transition-colors duration-75 rounded-b bg-[#1a1a2e] border border-[#2a2a3e] hover:bg-[#2a2a4e]';
      key.style.width = `${100 / whiteKeyCount * 0.65}%`;
      key.style.height = '60%';
      key.style.left = `${(whiteIndex - 0.325) * (100 / whiteKeyCount)}%`;
    } else {
      key.className = 'relative flex flex-col items-center justify-end pb-1 cursor-pointer transition-colors duration-75 rounded-b bg-[#d8d8e8] border border-[#b0b0c0] hover:bg-[#c0c0d8]';
      key.style.width = `${100 / whiteKeyCount}%`;
      whiteIndex++;
    }

    // Keyboard shortcut label
    if (kbLabel) {
      const label = document.createElement('span');
      label.className = `text-[8px] pointer-events-none ${black ? 'text-text-secondary' : 'text-[#666]'}`;
      label.textContent = kbLabel;
      key.appendChild(label);
    }

    keyElements.set(note, key);
    keyboard.appendChild(key);
  }

  wrapper.appendChild(keyboard);

  // Highlight active notes
  eventBus.on('ui:pianoHighlight', ({ note, active, source }) => {
    const key = keyElements.get(note);
    if (!key) return;
    const black = isBlackKey(note);

    if (active) {
      const color = source === 'midi' ? 'bg-accent-purple' : source === 'ui' ? 'bg-accent-pink' : 'bg-accent-blue';
      key.classList.add(color, 'shadow-lg');
      if (!black) key.classList.remove('bg-[#d8d8e8]');
      else key.classList.remove('bg-[#1a1a2e]');
    } else {
      key.classList.remove('bg-accent-blue', 'bg-accent-purple', 'bg-accent-pink', 'shadow-lg');
      if (black) key.classList.add('bg-[#1a1a2e]');
      else key.classList.add('bg-[#d8d8e8]');
    }
  });

  // Highlight scale notes
  eventBus.on('state:harmonizerChanged', () => {
    highlightScale(keyElements);
  });

  // Initialize after rendering
  requestAnimationFrame(() => {
    highlightScale(keyElements);
    initPianoInput(keyboard);
  });

  return wrapper;
}

function highlightScale(keyElements: Map<number, HTMLElement>): void {
  const { key, scale } = getState().harmonizer;
  const scaleNotes = getScaleNotes(key, scale);

  for (const [note, el] of keyElements) {
    const dot = el.querySelector('.scale-dot');
    if (scaleNotes.includes(note % 12)) {
      if (!dot) {
        const d = document.createElement('div');
        d.className = 'scale-dot w-1.5 h-1.5 rounded-full bg-accent-purple/50 mb-1 pointer-events-none';
        el.insertBefore(d, el.firstChild);
      }
    } else {
      dot?.remove();
    }
  }
}
