import type { Preset, EngineType, PresetCategory } from '../types';
import { getState, setPreset } from '../core/state';
import { addUserPreset } from '../data/presets';
import { eventBus } from '../core/event-bus';
import { getWafCategories, searchWafCatalog, findWafInstrument } from '../data/waf-catalog';
import { wafNoteOn, wafNoteOff, loadInstrument } from '../engine/webaudiofont-engine';

interface ParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  log?: boolean;
}

const SD_SOUNDS = ['sawtooth', 'square', 'triangle', 'sine', 'supersaw', 'pulse', 'white', 'pink'];
const CATEGORIES: PresetCategory[] = ['keys', 'bass', 'pad', 'lead', 'fx', 'orch'];

const SD_ADSR: ParamDef[] = [
  { key: 'attack', label: 'Atk', min: 0.001, max: 2, step: 0.001 },
  { key: 'decay', label: 'Dec', min: 0.01, max: 3, step: 0.01 },
  { key: 'sustain', label: 'Sus', min: 0, max: 1, step: 0.01 },
  { key: 'release', label: 'Rel', min: 0.01, max: 5, step: 0.01 },
];

const SD_FILTER: ParamDef[] = [
  { key: 'cutoff', label: 'Cut', min: 20, max: 20000, step: 1, log: true },
  { key: 'resonance', label: 'Res', min: 0, max: 30, step: 0.1 },
  { key: 'hcutoff', label: 'HP', min: 20, max: 20000, step: 1, log: true },
];

const SD_FX: ParamDef[] = [
  { key: 'distort', label: 'Dist', min: 0, max: 1, step: 0.01 },
  { key: 'crush', label: 'Crush', min: 0, max: 16, step: 1 },
  { key: 'delay', label: 'Dly', min: 0, max: 1, step: 0.01 },
  { key: 'delaytime', label: 'Time', min: 0, max: 1, step: 0.01 },
  { key: 'delayfeedback', label: 'Fb', min: 0, max: 0.95, step: 0.01 },
  { key: 'room', label: 'Room', min: 0, max: 1, step: 0.01 },
  { key: 'roomsize', label: 'Size', min: 0, max: 10, step: 0.1 },
  { key: 'pan', label: 'Pan', min: 0, max: 1, step: 0.01 },
];

function toSlider(value: number, def: ParamDef): number {
  if (def.log) return Math.log(Math.max(value, def.min) / def.min) / Math.log(def.max / def.min);
  return (value - def.min) / (def.max - def.min);
}

function fromSlider(t: number, def: ParamDef): number {
  if (def.log) return def.min * Math.pow(def.max / def.min, t);
  return def.min + t * (def.max - def.min);
}

function formatValue(value: number, def: ParamDef): string {
  if (def.log && def.max >= 10000) return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${Math.round(value)}`;
  if (def.step >= 1) return String(Math.round(value));
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function defaultForDef(def: ParamDef): number {
  return def.log ? def.min : def.min;
}

// SVG waveform icons for oscillator type buttons
const WAVE_PATHS: Record<string, string> = {
  sine:      'M1,6 Q4,0 7,6 Q10,12 13,6',
  sawtooth:  'M1,10 L7,2 L7,10 L13,2',
  square:    'M1,10 L1,2 L7,2 L7,10 L13,10 L13,2',
  triangle:  'M1,10 L4,2 L7,10 L10,2 L13,10',
  supersaw:  'M1,10 L3,2 L3,10 L6,3 L6,10 L9,2 L9,10 L12,3 L12,10',
  pulse:     'M1,10 L1,2 L5,2 L5,10 L9,10 L9,2 L13,2',
  white:     'M1,6 L2,3 L3,8 L4,5 L5,9 L6,2 L7,7 L8,4 L9,10 L10,3 L11,8 L12,5 L13,6',
  pink:      'M1,6 L3,4 L5,8 L7,3 L9,7 L11,5 L13,6',
};

function createWaveIcon(type: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 14 12');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '12');
  svg.setAttribute('class', 'inline-block');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', WAVE_PATHS[type] ?? WAVE_PATHS.sine);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.2');
  path.setAttribute('stroke-linejoin', 'round');
  path.setAttribute('stroke-linecap', 'round');
  svg.appendChild(path);
  return svg;
}

// WAF recently used instruments (localStorage)
const WAF_RECENT_KEY = 'harmonia_waf_recent';
const WAF_RECENT_MAX = 5;

function getWafRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(WAF_RECENT_KEY) ?? '[]');
  } catch { return []; }
}

function pushWafRecent(code: string): void {
  const list = getWafRecent().filter(c => c !== code);
  list.unshift(code);
  localStorage.setItem(WAF_RECENT_KEY, JSON.stringify(list.slice(0, WAF_RECENT_MAX)));
}

export function createSynthPanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'flex flex-col gap-1.5 p-3 bg-bg-surface rounded-lg border border-border flex-1 min-w-[260px] overflow-y-auto';
  panel.dataset.testid = 'synth-panel';

  // Header
  const header = document.createElement('div');
  header.className = 'flex items-center gap-2 mb-1 flex-wrap';

  const titleLabel = document.createElement('span');
  titleLabel.className = 'text-xs font-semibold text-text-secondary uppercase tracking-wider';
  titleLabel.textContent = 'Synth';

  const engineBtns = document.createElement('div');
  engineBtns.className = 'flex gap-0.5';

  const ENGINE_NAME_COLORS: Record<EngineType, string> = {
    superdough: 'text-accent-purple',
    webaudiofont: 'text-green-400',
  };

  const presetNameEl = document.createElement('span');
  presetNameEl.className = 'text-xs font-semibold truncate flex-1 text-accent-blue';

  function updatePresetNameColor(): void {
    const engine = getState().currentPreset?.engine;
    if (!engine) return;
    presetNameEl.className = `text-xs font-semibold truncate flex-1 ${ENGINE_NAME_COLORS[engine]}`;
  }

  const unsavedDot = document.createElement('span');
  unsavedDot.className = 'text-accent-pink text-xs hidden';
  unsavedDot.textContent = '•';

  const saveContainer = document.createElement('div');
  saveContainer.className = 'relative ml-auto';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'px-2 py-0.5 text-[10px] rounded border border-border text-text-secondary hover:border-accent-blue hover:text-accent-blue transition-colors';
  saveBtn.textContent = 'Save ▾';
  saveContainer.appendChild(saveBtn);

  header.append(titleLabel, engineBtns, presetNameEl, unsavedDot, saveContainer);
  panel.appendChild(header);

  const content = document.createElement('div');
  content.className = 'flex flex-col gap-1';
  panel.appendChild(content);

  const saveForm = document.createElement('div');
  saveForm.className = 'hidden';
  panel.appendChild(saveForm);

  // === STATE ===
  let wafSearch = '';
  let wafCategory: string | undefined;
  let originalParams: string | null = null;
  // Track what's currently rendered to avoid full rebuild on param-only changes
  let renderedPresetId: string | null = null;
  let renderedEngine: EngineType | null = null;
  let renderedSoundType: string | null = null;
  // Guard against re-entrant builds triggered by our own setPreset calls
  let suppressRebuild = false;

  function updateParam(key: string, value: unknown): void {
    const preset = getState().currentPreset;
    if (!preset) return;
    const params = { ...(preset.params as unknown as Record<string, unknown>), [key]: value };
    suppressRebuild = true;
    setPreset({ ...preset, params: params as unknown as Preset['params'] });
    suppressRebuild = false;
    checkUnsaved();
  }

  function checkUnsaved(): void {
    const preset = getState().currentPreset;
    if (!preset || !originalParams) {
      unsavedDot.classList.add('hidden');
      return;
    }
    const current = JSON.stringify(preset.params);
    unsavedDot.classList.toggle('hidden', current === originalParams);
  }

  // Static engine button class maps (avoid dynamic Tailwind)
  const ENGINE_CLASSES: Record<EngineType, { active: string; inactive: string }> = {
    superdough:   { active: 'px-2 py-0.5 text-[10px] rounded border-2 font-extrabold bg-accent-purple/20 border-accent-purple text-accent-purple shadow-[0_0_6px_rgba(168,130,255,0.4)]',
                    inactive: 'px-1.5 py-0.5 text-[9px] rounded border font-bold border-border text-text-secondary/40 hover:text-text-secondary cursor-pointer' },
    webaudiofont: { active: 'px-2 py-0.5 text-[10px] rounded border-2 font-extrabold bg-green-400/20 border-green-400 text-green-400 shadow-[0_0_6px_rgba(74,222,128,0.4)]',
                    inactive: 'px-1.5 py-0.5 text-[9px] rounded border font-bold border-border text-text-secondary/40 hover:text-text-secondary cursor-pointer' },
  };

  function buildEngineButtons(): void {
    engineBtns.innerHTML = '';
    const preset = getState().currentPreset;
    if (!preset) return;

    const engines: { label: string; value: EngineType }[] = [
      { label: 'SuperDough', value: 'superdough' },
      { label: 'SoundFont', value: 'webaudiofont' },
    ];

    for (const eng of engines) {
      const btn = document.createElement('button');
      const active = preset.engine === eng.value;
      btn.className = ENGINE_CLASSES[eng.value][active ? 'active' : 'inactive'];
      btn.textContent = eng.label;
      if (!active) btn.addEventListener('click', () => switchEngine(eng.value));
      engineBtns.appendChild(btn);
    }
  }

  function switchEngine(engine: EngineType): void {
    const preset = getState().currentPreset;
    if (!preset || preset.engine === engine) return;
    const oldParams = preset.params as unknown as Record<string, unknown>;
    const gain = (oldParams.gain as number) ?? 0.7;

    let newParams: Record<string, unknown>;
    if (engine === 'superdough') {
      const s = (oldParams.s as string) ?? 'sawtooth';
      newParams = {
        s: SD_SOUNDS.includes(s) ? s : 'sawtooth',
        attack: oldParams.attack ?? 0.01, decay: oldParams.decay ?? 0.3,
        sustain: oldParams.sustain ?? 0.5, release: oldParams.release ?? 0.5,
        cutoff: oldParams.cutoff ?? 4000, resonance: oldParams.resonance ?? 2, gain,
      };
    } else {
      newParams = { instrument: '0000_FluidR3_GM', gain };
    }

    setPreset({ ...preset, engine, params: newParams as unknown as Preset['params'] });
  }

  // === SAVE DROPDOWN ===
  saveBtn.addEventListener('click', () => {
    const preset = getState().currentPreset;
    if (!preset) return;
    showSaveDropdown(preset);
  });

  function showSaveDropdown(preset: Preset): void {
    document.querySelectorAll('.synth-save-menu').forEach(el => el.remove());
    const menu = document.createElement('div');
    menu.className = 'synth-save-menu absolute right-0 top-full mt-1 z-50 bg-bg-surface border border-border rounded shadow-lg py-1 min-w-[120px]';

    const isUser = !!(preset.meta || preset.tags?.includes('user'));
    const items: { label: string; action: () => void }[] = [];

    if (isUser) {
      items.push({ label: 'Save', action: () => {
        addUserPreset(preset);
        originalParams = JSON.stringify(preset.params);
        checkUnsaved();
      }});
    }
    items.push({ label: 'Save As...', action: () => showSaveAsForm(preset) });
    if (originalParams) {
      items.push({ label: 'Revert', action: () => {
        if (!originalParams) return;
        const p = getState().currentPreset;
        if (p) setPreset({ ...p, params: JSON.parse(originalParams) as Preset['params'] });
      }});
    }
    items.push({ label: 'Export JSON', action: () => {
      const json = JSON.stringify(preset, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${preset.id}.json`; a.click();
      URL.revokeObjectURL(url);
    }});

    for (const item of items) {
      const btn = document.createElement('button');
      btn.className = 'block w-full text-left px-3 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors';
      btn.textContent = item.label;
      btn.addEventListener('click', () => { item.action(); menu.remove(); document.removeEventListener('click', dismiss); });
      menu.appendChild(btn);
    }

    saveContainer.appendChild(menu);
    const dismiss = (ev: Event) => {
      if (!menu.contains(ev.target as Node) && ev.target !== saveBtn) {
        menu.remove();
        document.removeEventListener('click', dismiss);
      }
    };
    setTimeout(() => document.addEventListener('click', dismiss), 0);
  }

  function showSaveAsForm(preset: Preset): void {
    saveForm.innerHTML = '';
    saveForm.className = 'flex flex-col gap-1.5 p-2 bg-bg-elevated rounded border border-border mt-1';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'bg-[#09090d] border border-border rounded px-2 py-1 text-xs text-text-primary outline-none focus:border-accent-blue';
    nameInput.placeholder = 'Preset name';
    nameInput.value = preset.name;
    nameInput.addEventListener('keydown', (e) => e.stopPropagation());

    const catSelect = document.createElement('select');
    catSelect.className = 'bg-[#09090d] border border-border rounded px-2 py-1 text-xs text-text-primary outline-none';
    for (const cat of CATEGORIES) {
      const opt = document.createElement('option');
      opt.value = cat; opt.textContent = cat;
      if (preset.category === cat) opt.selected = true;
      catSelect.appendChild(opt);
    }

    const tagsInput = document.createElement('input');
    tagsInput.type = 'text';
    tagsInput.className = 'bg-[#09090d] border border-border rounded px-2 py-1 text-xs text-text-primary outline-none focus:border-accent-blue';
    tagsInput.placeholder = 'Tags (comma-separated)';
    tagsInput.value = (preset.tags || []).join(', ');
    tagsInput.addEventListener('keydown', (e) => e.stopPropagation());

    const btnRow = document.createElement('div');
    btnRow.className = 'flex gap-2';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'px-2 py-1 text-[10px] rounded border border-border text-text-secondary hover:text-text-primary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => { saveForm.className = 'hidden'; });

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'px-2 py-1 text-[10px] rounded border border-accent-blue bg-accent-blue/20 text-accent-blue';
    confirmBtn.textContent = 'Save';
    confirmBtn.addEventListener('click', () => {
      const name = nameInput.value.trim() || preset.name;
      const tags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
      const saved: Preset = {
        ...preset, id: `user-${Date.now()}`, name,
        category: catSelect.value as PresetCategory,
        tags: [...tags, 'user'],
        meta: { createdAt: Date.now(), source: 'user', basedOn: preset.id },
      };
      addUserPreset(saved);
      setPreset(saved);
      saveForm.className = 'hidden';
    });

    btnRow.append(cancelBtn, confirmBtn);
    saveForm.append(nameInput, catSelect, tagsInput, btnRow);
    nameInput.focus();
  }

  // === MAIN BUILD — only full rebuild on preset/engine/sound-type change ===
  function onPresetChanged(): void {
    if (suppressRebuild) {
      // Only update header name (param-only change from our own slider)
      const p = getState().currentPreset;
      if (p) presetNameEl.textContent = p.name;
      return;
    }

    const preset = getState().currentPreset;
    if (!preset) {
      presetNameEl.textContent = '—';
      engineBtns.innerHTML = '';
      content.innerHTML = '';
      renderedPresetId = null;
      renderedEngine = null;
      renderedSoundType = null;
      return;
    }

    const params = preset.params as unknown as Record<string, unknown>;
    const soundType = (params.s as string) ?? null;

    // Only full rebuild when preset ID, engine, or sound type changes
    const needsRebuild = preset.id !== renderedPresetId
      || preset.engine !== renderedEngine
      || soundType !== renderedSoundType;

    if (needsRebuild) {
      buildControls();
    } else {
      // Just update header
      presetNameEl.textContent = preset.name;
      checkUnsaved();
    }
  }

  function buildControls(): void {
    content.innerHTML = '';
    saveForm.className = 'hidden';
    const preset = getState().currentPreset;
    if (!preset) {
      presetNameEl.textContent = '—';
      engineBtns.innerHTML = '';
      renderedPresetId = null;
      renderedEngine = null;
      renderedSoundType = null;
      return;
    }

    presetNameEl.textContent = preset.name;
    updatePresetNameColor();
    originalParams = JSON.stringify(preset.params);
    unsavedDot.classList.add('hidden');
    buildEngineButtons();

    const params = preset.params as unknown as Record<string, unknown>;

    // Track what we've rendered
    renderedPresetId = preset.id;
    renderedEngine = preset.engine;
    renderedSoundType = (params.s as string) ?? null;

    if (preset.engine === 'webaudiofont') {
      buildWafBrowser(content, params);
      return;
    }

    const accentClass = 'accent-purple';

    // Waveform / sound selector
    const sounds = SD_SOUNDS;
    const soundKey = 's';
    const currentSound = (params[soundKey] as string) ?? sounds[0];

    const waveRow = document.createElement('div');
    waveRow.className = 'flex gap-1 mb-1 flex-wrap';
    for (const s of sounds) {
      const btn = document.createElement('button');
      const short = s === 'sawtooth' ? 'saw' : s === 'triangle' ? 'tri' : s === 'supersaw' ? 'ssaw' : s;
      const active = s === currentSound;
      btn.className = active
        ? 'px-1.5 py-1 text-[10px] rounded border bg-accent-purple/20 border-accent-purple text-accent-purple'
        : 'px-1.5 py-1 text-[10px] rounded border border-border text-text-secondary hover:text-text-primary transition-colors';
      btn.append(createWaveIcon(s), document.createTextNode(` ${short}`));
      btn.addEventListener('click', () => updateParam(soundKey, s));
      waveRow.appendChild(btn);
    }
    content.appendChild(waveRow);

    // Build param groups
    buildParamGroup('ADSR', SD_ADSR, params, accentClass);
    buildParamGroup('Filter', SD_FILTER, params, accentClass);
    const oscParams: ParamDef[] = [{ key: 'gain', label: 'Vol', min: 0, max: 1, step: 0.01 }];
    if (currentSound === 'supersaw') {
      oscParams.push(
        { key: 'unison', label: 'Uni', min: 1, max: 16, step: 1 },
        { key: 'spread', label: 'Spr', min: 0, max: 1, step: 0.01 },
        { key: 'detune', label: 'Det', min: 0, max: 1, step: 0.01 },
      );
    }
    if (currentSound === 'pulse') {
      oscParams.push({ key: 'pw', label: 'PW', min: 0, max: 1, step: 0.01 });
    }
    buildParamGroup('Osc', oscParams, params, accentClass);
    if (['sawtooth', 'square', 'supersaw', 'pulse'].includes(currentSound)) {
      buildVowelSelector(params);
    }
    buildParamGroup('FX', SD_FX, params, accentClass);
  }

  function buildParamGroup(title: string, defs: ParamDef[], params: Record<string, unknown>, accentClass: string): void {
    const groupEl = document.createElement('div');
    groupEl.className = 'flex flex-col gap-0.5';
    const groupTitle = document.createElement('div');
    groupTitle.className = 'text-[9px] text-text-secondary/50 uppercase tracking-widest mt-0.5';
    groupTitle.textContent = title;
    groupEl.appendChild(groupTitle);
    for (const def of defs) {
      groupEl.appendChild(buildSlider(def, params, accentClass));
    }
    content.appendChild(groupEl);
  }

  function buildSlider(def: ParamDef, params: Record<string, unknown>, accentClass: string): HTMLElement {
    const val = (params[def.key] as number) ?? defaultForDef(def);
    const row = document.createElement('div');
    row.className = 'flex items-center gap-1.5';

    const label = document.createElement('span');
    label.className = 'text-[10px] text-text-secondary w-8 shrink-0';
    label.textContent = def.label;

    const input = document.createElement('input');
    input.type = 'range'; input.min = '0'; input.max = '1'; input.step = '0.001';
    input.value = String(toSlider(val, def));
    // Static accent classes (no dynamic interpolation)
    input.className = accentClass === 'accent-purple'
      ? 'flex-1 h-1 cursor-pointer accent-accent-purple'
      : 'flex-1 h-1 cursor-pointer accent-accent-blue';

    const valueEl = document.createElement('span');
    valueEl.className = 'text-[9px] text-text-secondary/70 w-10 text-right font-mono shrink-0';
    valueEl.textContent = formatValue(val, def);

    input.addEventListener('input', () => {
      const raw = fromSlider(parseFloat(input.value), def);
      const v = def.step >= 1 ? Math.round(raw) : raw;
      updateParam(def.key, v);
      valueEl.textContent = formatValue(v, def);
    });

    row.append(label, input, valueEl);
    return row;
  }

  function buildVowelSelector(params: Record<string, unknown>): void {
    const vowels = ['off', 'a', 'e', 'i', 'o', 'u'];
    const current = (params.vowel as string) ?? 'off';
    const row = document.createElement('div');
    row.className = 'flex gap-1 mt-0.5';

    const label = document.createElement('span');
    label.className = 'text-[9px] text-text-secondary/50 uppercase tracking-widest mr-1 self-center';
    label.textContent = 'Vowel';
    row.appendChild(label);

    for (const v of vowels) {
      const btn = document.createElement('button');
      const active = v === current || (v === 'off' && !current);
      btn.className = active
        ? 'px-1.5 py-0.5 text-[10px] rounded border bg-accent-purple/20 border-accent-purple text-accent-purple'
        : 'px-1.5 py-0.5 text-[10px] rounded border border-border text-text-secondary hover:text-text-primary transition-colors';
      btn.textContent = v;
      btn.addEventListener('click', () => {
        if (v === 'off') {
          const preset = getState().currentPreset;
          if (!preset) return;
          const p = { ...(preset.params as unknown as Record<string, unknown>) };
          delete p.vowel;
          suppressRebuild = true;
          setPreset({ ...preset, params: p as unknown as Preset['params'] });
          suppressRebuild = false;
          checkUnsaved();
        } else {
          updateParam('vowel', v);
        }
      });
      row.appendChild(btn);
    }
    content.appendChild(row);
  }

  function buildWafBrowser(container: HTMLElement, params: Record<string, unknown>): void {
    const currentCode = (params.instrument as string) ?? '';
    const currentEntry = findWafInstrument(currentCode);

    const currentRow = document.createElement('div');
    currentRow.className = 'flex items-center gap-2 py-1';
    const currentName = document.createElement('span');
    currentName.className = 'text-xs text-green-400 font-semibold';
    currentName.textContent = currentEntry?.name ?? currentCode;
    const currentGm = document.createElement('span');
    currentGm.className = 'text-[9px] text-text-secondary/50 font-mono';
    currentGm.textContent = currentEntry ? `GM ${currentEntry.gm}` : '';
    currentRow.append(currentName, currentGm);
    container.appendChild(currentRow);

    // Recently used instruments
    const recentCodes = getWafRecent();
    if (recentCodes.length > 0) {
      const recentSection = document.createElement('div');
      recentSection.className = 'flex gap-1 flex-wrap mb-1';
      const recentLabel = document.createElement('span');
      recentLabel.className = 'text-[9px] text-text-secondary/50 w-full';
      recentLabel.textContent = 'Recent:';
      recentSection.appendChild(recentLabel);
      for (const code of recentCodes) {
        const entry = findWafInstrument(code);
        if (!entry) continue;
        const chip = document.createElement('button');
        const isActive = code === currentCode;
        chip.className = isActive
          ? 'px-1.5 py-0.5 text-[9px] rounded border bg-green-400/20 border-green-400 text-green-400 truncate max-w-[100px]'
          : 'px-1.5 py-0.5 text-[9px] rounded border border-border text-text-secondary hover:text-text-primary truncate max-w-[100px] transition-colors';
        chip.textContent = entry.name;
        chip.title = entry.name;
        chip.addEventListener('click', () => {
          const p = getState().currentPreset;
          if (p) {
            pushWafRecent(code);
            const newParams = { ...(p.params as unknown as Record<string, unknown>), instrument: code };
            setPreset({ ...p, name: entry.name, params: newParams as unknown as Preset['params'] });
          }
        });
        recentSection.appendChild(chip);
      }
      container.appendChild(recentSection);
    }

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'w-full bg-[#09090d] border border-border rounded px-2 py-1 text-xs text-text-primary font-mono outline-none focus:border-green-400 placeholder:text-text-secondary/40';
    searchInput.placeholder = 'Search instruments...';
    searchInput.value = wafSearch;
    searchInput.addEventListener('keydown', (e) => e.stopPropagation());
    searchInput.addEventListener('keyup', (e) => e.stopPropagation());
    container.appendChild(searchInput);

    const pillRow = document.createElement('div');
    pillRow.className = 'flex gap-1 flex-wrap mt-1';
    const categories = getWafCategories();
    const allCatBtns: HTMLButtonElement[] = [];

    function makeActiveCls(active: boolean): string {
      return active
        ? 'px-1.5 py-0.5 text-[9px] rounded border bg-green-400/20 border-green-400 text-green-400'
        : 'px-1.5 py-0.5 text-[9px] rounded border border-border text-text-secondary hover:text-text-primary transition-colors';
    }

    const allBtn = document.createElement('button');
    allBtn.className = makeActiveCls(!wafCategory);
    allBtn.textContent = 'All';
    allCatBtns.push(allBtn);
    pillRow.appendChild(allBtn);

    for (const cat of categories) {
      const btn = document.createElement('button');
      btn.className = makeActiveCls(wafCategory === cat);
      btn.textContent = cat;
      allCatBtns.push(btn);
      pillRow.appendChild(btn);
    }
    container.appendChild(pillRow);

    const listEl = document.createElement('div');
    listEl.className = 'flex flex-col gap-0.5 max-h-[200px] overflow-y-auto mt-1';
    container.appendChild(listEl);

    function renderList(): void {
      listEl.innerHTML = '';
      const results = searchWafCatalog(wafSearch, wafCategory);
      for (const entry of results) {
        const row = document.createElement('button');
        const isActive = entry.code === currentCode;
        row.className = isActive
          ? 'flex items-center gap-2 px-2 py-1 rounded text-left bg-green-400/10 text-green-400'
          : 'flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'text-[11px] flex-1 truncate';
        nameSpan.textContent = entry.name;
        const gmBadge = document.createElement('span');
        gmBadge.className = 'text-[9px] text-text-secondary/50 font-mono shrink-0';
        gmBadge.textContent = `${entry.gm}`;
        // Preview button — plays C4 for 0.5s without switching preset
        const previewBtn = document.createElement('span');
        previewBtn.className = 'text-[10px] text-text-secondary/40 hover:text-green-400 cursor-pointer shrink-0 transition-colors';
        previewBtn.textContent = '▶';
        previewBtn.title = 'Preview';
        previewBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            await loadInstrument(entry.code);
            wafNoteOn(60, 100, entry.code, (params.gain as number) ?? 0.8);
            setTimeout(() => wafNoteOff(60), 500);
          } catch { /* ignore load errors */ }
        });

        row.append(previewBtn, nameSpan, gmBadge);
        row.addEventListener('click', () => {
          // Single setPreset call — update both instrument and name
          const p = getState().currentPreset;
          if (p) {
            pushWafRecent(entry.code);
            const newParams = { ...(p.params as unknown as Record<string, unknown>), instrument: entry.code };
            setPreset({ ...p, name: entry.name, params: newParams as unknown as Preset['params'] });
          }
        });
        listEl.appendChild(row);
      }
    }

    let searchTimer: ReturnType<typeof setTimeout>;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        wafSearch = searchInput.value;
        renderList();
      }, 150);
    });

    function activatePill(btn: HTMLButtonElement, cat: string | undefined): void {
      wafCategory = cat;
      for (const b of allCatBtns) b.className = makeActiveCls(b === btn);
      renderList();
    }

    allBtn.addEventListener('click', () => activatePill(allBtn, undefined));
    let idx = 1;
    for (const cat of categories) {
      const b = allCatBtns[idx];
      b.addEventListener('click', () => activatePill(b, cat));
      idx++;
    }

    renderList();

    // Gain slider
    const gainGroup = document.createElement('div');
    gainGroup.className = 'flex items-center gap-1.5 mt-1.5';
    const gainLabel = document.createElement('span');
    gainLabel.className = 'text-[10px] text-text-secondary w-8 shrink-0';
    gainLabel.textContent = 'Gain';
    const gainInput = document.createElement('input');
    gainInput.type = 'range'; gainInput.min = '0'; gainInput.max = '1'; gainInput.step = '0.01';
    gainInput.value = String((params.gain as number) ?? 0.8);
    gainInput.className = 'flex-1 h-1 cursor-pointer accent-green-400';
    const gainVal = document.createElement('span');
    gainVal.className = 'text-[9px] text-text-secondary/70 w-10 text-right font-mono shrink-0';
    gainVal.textContent = ((params.gain as number) ?? 0.8).toFixed(2);
    gainInput.addEventListener('input', () => {
      const v = parseFloat(gainInput.value);
      updateParam('gain', v);
      gainVal.textContent = v.toFixed(2);
    });
    gainGroup.append(gainLabel, gainInput, gainVal);
    container.appendChild(gainGroup);
  }

  eventBus.on('state:presetChanged', onPresetChanged);
  buildControls();

  return panel;
}
