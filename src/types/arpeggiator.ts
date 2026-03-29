export type ArpPatternName =
  | 'chord' | 'up' | 'down' | 'upDown' | 'downUp'
  | 'random' | 'alberti' | 'gallop' | 'tremolo'
  | 'broken' | 'triplet' | 'swing'
  | 'rootFifth' | 'rootOctave' | 'bassLine' | 'funk'
  | 'reggae' | 'disco' | 'tumbao' | 'pedal' | 'bounce'
  | 'euclidean';

export interface ArpConfig {
  enabled: boolean;
  pattern: ArpPatternName;
  bpm: number;
  subdivision: number;
  octaves: number;
  gate: number;
  euclideanOnsets: number;
  euclideanSteps: number;
}
