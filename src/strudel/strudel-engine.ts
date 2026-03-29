import { repl } from '@strudel/core';
import * as strudelCore from '@strudel/core';
import * as strudelMini from '@strudel/mini';
import * as strudelTonal from '@strudel/tonal';
import { webaudioOutput } from '@strudel/webaudio';

// evalScope is exported but not in type declarations
const evalScope: (...args: unknown[]) => Promise<unknown[]> =
  (strudelCore as Record<string, unknown>).evalScope as (...args: unknown[]) => Promise<unknown[]>;
import { initAudio as initSuperdough, registerSynthSounds, samples } from '@strudel/webaudio';
import { registerZZFXSounds } from 'superdough';
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
let initPromise: Promise<void> | null = null;
let currentCode = '';
let isPlaying = false;
let lastError: string | null = null;

function bpmToCps(bpm: number): number {
  return bpm / 60 / 4; // 4 beats per cycle = 1 cycle per bar
}

export async function initStrudel(): Promise<void> {
  initPromise = doInitStrudel();
  return initPromise;
}

async function doInitStrudel(): Promise<void> {
  const ctx = getAudioContext();

  // superdough AudioContext is already set in initAudio()
  await initSuperdough();
  registerSynthSounds();
  registerZZFXSounds();

  // Load dirt-samples (bd, sd, hh, cp, etc.) from GitHub
  // Only fetches manifest — actual audio loaded on first use
  await samples('github:tidalcycles/dirt-samples');

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

  // Register all strudel functions (note, s, sound, scale, etc.) into eval scope
  await evalScope(strudelCore, strudelMini, strudelTonal, { samples });

  // Enable mini-notation parsing for string arguments (e.g. note('c3 e3 g3'))
  const miniAll = (strudelMini as Record<string, unknown>).miniAllStrings as () => void;
  miniAll();

  r.setCps(bpmToCps(getState().bpm));

  // Sync BPM changes
  eventBus.on('state:bpmChanged', (bpm) => {
    strudelRepl?.setCps(bpmToCps(bpm));
  });
}

function prepareCode(code: string): string {
  // If code contains variable declarations (let/const/var), wrap in an async IIFE.
  // Strudel's safeEval uses arrow expression body: (async ()=>CODE)()
  // Declarations are statements and need a block body to work.
  if (!/\b(let|const|var)\s/.test(code)) return code;

  // Remove trailing semicolons/whitespace
  const trimmed = code.trim().replace(/;\s*$/, '');

  // Find the last statement boundary (semicolon or newline)
  const lastSemi = trimmed.lastIndexOf(';');
  const lastNl = trimmed.lastIndexOf('\n');
  const boundary = Math.max(lastSemi, lastNl);

  if (boundary < 0) {
    // Single statement — just wrap without return
    return `await (async () => {\n${trimmed}\n})()`;
  }

  const before = trimmed.slice(0, boundary + 1);
  const lastStmt = trimmed.slice(boundary + 1).trim();

  // Add return before the last expression so the pattern is returned to the REPL
  if (lastStmt && !/^(let|const|var)\s/.test(lastStmt)) {
    return `await (async () => {\n${before}\nreturn ${lastStmt}\n})()`;
  }

  return `await (async () => {\n${trimmed}\n})()`;
}

export async function strudelEval(code: string): Promise<void> {
  if (!strudelRepl && initPromise) {
    await initPromise;
  }
  if (!strudelRepl) {
    throw new Error('Strudel not initialized');
  }

  currentCode = code;
  lastError = null;

  try {
    await strudelRepl.evaluate(prepareCode(code));
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
