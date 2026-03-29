declare module '@strudel/core' {
  interface ReplOptions {
    defaultOutput: (...args: unknown[]) => unknown;
    getTime: () => number;
    onEvalError?: (err: Error) => void;
    onToggle?: (started: boolean) => void;
  }

  interface Scheduler {
    started: boolean;
    cps: number;
  }

  interface ReplInstance {
    scheduler: Scheduler;
    evaluate: (code: string, autoStart?: boolean) => Promise<unknown>;
    start: () => void;
    stop: () => void;
    pause: () => void;
    setCps: (cps: number) => void;
    setPattern: (pattern: unknown, start?: boolean) => Promise<unknown>;
    toggle: () => void;
  }

  export function repl(options: ReplOptions): ReplInstance;
}

declare module '@strudel/webaudio' {
  export const webaudioOutput: (...args: unknown[]) => unknown;
  export function initAudio(options?: Record<string, unknown>): Promise<void>;
  export function getAudioContext(): AudioContext;
  export function setAudioContext(ctx: AudioContext): AudioContext;
  export function registerSynthSounds(): void;
  export function superdough(
    value: Record<string, unknown>,
    time: number,
    duration: number,
    cps?: number,
    cycle?: number,
  ): Promise<void>;
  export function samples(
    sampleMap: string | Record<string, unknown>,
    baseUrl?: string,
    options?: Record<string, unknown>,
  ): Promise<void>;
}

declare module '@strudel/tonal' {}
declare module '@strudel/mini' {}

declare module 'superdough' {
  export function initAudio(options?: Record<string, unknown>): Promise<void>;
  export function getAudioContext(): AudioContext;
  export function setAudioContext(ctx: AudioContext): AudioContext;
  export function registerSynthSounds(): void;
  export function registerZZFXSounds(): void;
  export function superdough(
    value: Record<string, unknown>,
    time: number,
    duration: number,
    cps?: number,
    cycle?: number,
  ): Promise<void>;
}
