import { eventBus } from '../core/event-bus';
import { getState, setOctaveOffset } from '../core/state';
import { KEY_TO_NOTE } from '../core/constants';

const heldKeys = new Set<string>();

function onKeyDown(e: KeyboardEvent): void {
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;

  const key = e.key.toLowerCase();

  if (key === '[') {
    setOctaveOffset(getState().octaveOffset - 12);
    return;
  }
  if (key === ']') {
    setOctaveOffset(getState().octaveOffset + 12);
    return;
  }

  const baseNote = KEY_TO_NOTE[key];
  if (baseNote === undefined) return;

  e.preventDefault();
  if (heldKeys.has(key)) return;
  heldKeys.add(key);

  eventBus.emit('input:noteOn', {
    type: 'noteOn',
    note: baseNote + getState().octaveOffset,
    velocity: 100,
    source: 'keyboard',
  });
}

function onKeyUp(e: KeyboardEvent): void {
  const key = e.key.toLowerCase();
  const baseNote = KEY_TO_NOTE[key];
  if (baseNote === undefined) return;

  heldKeys.delete(key);

  eventBus.emit('input:noteOff', {
    type: 'noteOff',
    note: baseNote + getState().octaveOffset,
    velocity: 0,
    source: 'keyboard',
  });
}

export function initKeyboardInput(): void {
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
}
