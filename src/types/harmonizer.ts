import type { NoteName, ScaleType, ChordQuality } from './music';

export type VoicingMode = 'root' | 'voiceLead';

export interface HarmonizerConfig {
  key: NoteName;
  scale: ScaleType;
  fifths: boolean;
  enabled: boolean;
  voicingMode: VoicingMode;
}

export interface ChordResult {
  root: number;
  quality: ChordQuality;
  notes: number[];
  name: string;
  degree: number;
  inversion: number;
}
