import { repl } from '@strudel/core';
import { webaudioOutput } from '@strudel/webaudio';
import '@strudel/tonal';
import '@strudel/mini';
import { setAudioContext as setSuperdoughCtx, initAudio as initSuperdough, registerSynthSounds } from 'superdough';
import { getAudioContext } from '../engine/audio-engine';
import { eventBus } from '../core/event-bus';
import { getState } from '../core/state';

interface StrudelRepl {
  evaluate: (code: string) => Promise<unknown>;
  start: () => void;
  stop: () => void;
  setCps: (cps: number) => void;
  scheduler: { started: boolean };
}

let strudelRepl: StrudelRepl | null = null;
let currentCode = '';
let isPlaying = false;
let lastError: string | null = null;

function bpmToCps(bpm: number): number {
  return bpm / 60 / 4; // 4 beats per cycle = 1 cycle per bar
}

export async function initStrudel(): Promise<void> {
  const ctx = getAudioContext();

  // Share our AudioContext with superdough
  setSuperdoughCtx(ctx);
  await initSuperdough();
  registerSynthSounds();

  const r = repl({
    defaultOutput: webaudioOutput,
    getTime: () => ctx.currentTime,
    onEvalError: (err: Error) => {
      lastError = err.message;
      eventBus.emit('strudel:error', err.message);
    },
    onToggle: (started: boolean) => {
      isPlaying = started;
      eventBus.emit('strudel:toggle', started);
    },
  });

  strudelRepl = r as StrudelRepl;
  r.setCps(bpmToCps(getState().bpm));

  // Sync BPM changes
  eventBus.on('state:bpmChanged', (bpm) => {
    strudelRepl?.setCps(bpmToCps(bpm));
  });
}

export async function strudelEval(code: string): Promise<void> {
  if (!strudelRepl) {
    throw new Error('Strudel not initialized');
  }

  currentCode = code;
  lastError = null;

  try {
    await strudelRepl.evaluate(code);
    if (!isPlaying) {
      strudelRepl.start();
    }
    eventBus.emit('strudel:eval', code);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    lastError = msg;
    eventBus.emit('strudel:error', msg);
    throw err;
  }
}

export function strudelStop(): void {
  strudelRepl?.stop();
  isPlaying = false;
  eventBus.emit('strudel:toggle', false);
}

export function strudelStart(): void {
  if (!strudelRepl || !currentCode) return;
  strudelRepl.start();
}

export function isStrudelPlaying(): boolean {
  return isPlaying;
}

export function getStrudelCode(): string {
  return currentCode;
}

export function getStrudelError(): string | null {
  return lastError;
}
