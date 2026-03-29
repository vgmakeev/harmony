import { eventBus } from '../core/event-bus';

let activeNote: number | null = null;

function getNoteFromElement(el: HTMLElement): number | null {
  const note = el.dataset.note;
  return note ? parseInt(note, 10) : null;
}

function handlePointerDown(e: PointerEvent): void {
  const el = e.target as HTMLElement;
  const note = getNoteFromElement(el);
  if (note === null) return;

  e.preventDefault();
  el.setPointerCapture(e.pointerId);
  activeNote = note;

  eventBus.emit('input:noteOn', {
    type: 'noteOn', note, velocity: 100, source: 'ui',
  });
}

function handlePointerUp(_e: PointerEvent): void {
  if (activeNote === null) return;
  const note = activeNote;
  activeNote = null;

  eventBus.emit('input:noteOff', {
    type: 'noteOff', note, velocity: 0, source: 'ui',
  });
}

function handlePointerEnter(e: PointerEvent): void {
  if (e.buttons === 0) return;
  const el = e.target as HTMLElement;
  const note = getNoteFromElement(el);
  if (note === null || note === activeNote) return;

  // Release previous note
  if (activeNote !== null) {
    eventBus.emit('input:noteOff', {
      type: 'noteOff', note: activeNote, velocity: 0, source: 'ui',
    });
  }

  activeNote = note;
  eventBus.emit('input:noteOn', {
    type: 'noteOn', note, velocity: 100, source: 'ui',
  });
}

export function initPianoInput(container: HTMLElement): void {
  container.addEventListener('pointerdown', handlePointerDown);
  container.addEventListener('pointerup', handlePointerUp);
  container.addEventListener('pointerleave', handlePointerUp);

  // Glissando: trigger notes when dragging across keys
  container.querySelectorAll('[data-note]').forEach((key) => {
    key.addEventListener('pointerenter', handlePointerEnter as EventListener);
  });
}
