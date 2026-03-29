import { superdough, getAudioContext as getSdCtx } from 'superdough';
import type { SuperDoughParams } from '../types';

// Use cut groups keyed by MIDI note for noteOn/noteOff behavior
// noteOn: trigger with long duration + cut=note
// noteOff: trigger silent sound on same cut group to stop it

export function sdNoteOn(note: number, velocity: number, params: SuperDoughParams): void {
  const ctx = getSdCtx();
  const now = ctx.currentTime + 0.005;
  const vel = (velocity / 127) * (params.gain ?? 0.8);

  const value: Record<string, unknown> = {
    ...params,
    note,
    gain: vel,
    cut: note, // cut group = note, so noteOff can stop it
  };

  superdough(value, now, 30).catch(() => {}); // 30s max, will be cut on noteOff
}

export function sdNoteOff(note: number): void {
  const ctx = getSdCtx();
  const now = ctx.currentTime + 0.005;

  // Trigger a silent sound on the same cut group to stop the previous note
  superdough({ s: 'sine', cut: note, gain: 0 }, now, 0.001).catch(() => {});
}

export function sdAllNotesOff(): void {
  // Cut all possible note groups (MIDI range)
  const ctx = getSdCtx();
  const now = ctx.currentTime + 0.005;
  for (let n = 0; n < 128; n++) {
    superdough({ s: 'sine', cut: n, gain: 0 }, now, 0.001).catch(() => {});
  }
}
