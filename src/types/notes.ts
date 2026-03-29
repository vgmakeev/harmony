export type NoteSource = 'midi' | 'keyboard' | 'ui' | 'arp';

export interface NoteEvent {
  type: 'noteOn' | 'noteOff';
  note: number;
  velocity: number;
  source: NoteSource;
}

export interface MidiCCEvent {
  cc: number;
  value: number;
}
