import { eventBus } from '../core/event-bus';
import { synthUpdateParam } from '../engine/synth-engine';

interface CcMapping {
  param: string;
  min: number;
  max: number;
  log?: boolean; // logarithmic scaling (for frequency params)
}

const CC_MAP: Record<number, CcMapping> = {
  1:  { param: 'cutoff',    min: 20,    max: 20000, log: true },  // Mod wheel
  7:  { param: 'gain',      min: 0,     max: 1 },                 // Volume
  71: { param: 'resonance', min: 0,     max: 30 },                // Filter resonance
  73: { param: 'attack',    min: 0.001, max: 2 },                 // Attack time
  72: { param: 'release',   min: 0.01,  max: 3 },                 // Release time
  74: { param: 'cutoff',    min: 20,    max: 20000, log: true },  // Brightness
};

function scaleValue(cc7bit: number, mapping: CcMapping): number {
  const t = cc7bit / 127;
  if (mapping.log) {
    // Logarithmic scaling: exponential interpolation between min and max
    return mapping.min * Math.pow(mapping.max / mapping.min, t);
  }
  return mapping.min + t * (mapping.max - mapping.min);
}

export function initMidiCcMap(): void {
  eventBus.on('input:cc', ({ cc, value }) => {
    const mapping = CC_MAP[cc];
    if (!mapping) return;
    const scaled = scaleValue(value, mapping);
    synthUpdateParam(mapping.param, scaled);
  });
}
