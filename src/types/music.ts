export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export type ScaleType =
  | 'major' | 'minor' | 'dorian' | 'phrygian'
  | 'lydian' | 'mixolydian' | 'locrian'
  | 'harmonicMinor' | 'melodicMinor'
  | 'pentatonic' | 'blues' | 'chromatic';

export type ChordQuality =
  | 'maj' | 'min' | 'dim' | 'aug' | '5'
  | 'maj7' | 'min7' | 'dom7' | 'min7b5' | 'dim7' | 'minMaj7';
