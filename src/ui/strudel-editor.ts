import { strudelEval, strudelStop, getStrudelError } from '../strudel/strudel-engine';
import { eventBus } from '../core/event-bus';

// ── Track layers (toggleable, combinable via stack()) ──

interface Track {
  id: string;
  label: string;
  code: string;
  active: boolean;
}

function createTracks(): Track[] {
  return [
    { id: 'kick',   label: 'Kick',   code: `s('bd bd ~ bd')`,            active: false },
    { id: 'snare',  label: 'Snare',  code: `s('~ sd ~ sd')`,             active: false },
    { id: 'hihat',  label: 'HiHat',  code: `s('hh*8').gain(0.4)`,        active: false },
    { id: 'bass',   label: 'Bass',   code: `note('c2 [~ c2] eb2 ~').sound('sawtooth').lpf(600).release(0.1)`, active: false },
    { id: 'lead',   label: 'Lead',   code: `note('c4 e4 g4 b4 g4 e4').fast(2).sound('sine').lpf(3000).release(0.3)`, active: false },
    { id: 'pads',   label: 'Pads',   code: `note('<[c3,e3,g3] [f3,a3,c4] [g3,b3,d4]>').sound('triangle').release(0.5).lpf(1500).room(0.4)`, active: false },
  ];
}

// ── Templates (ready-made patterns, replace editor) ──

const TEMPLATES = [
  // ── Drum machines ──
  { label: '808',
    code: `stack(\n  s('bd:3 ~ ~ bd:3 ~ ~ bd:3 ~').gain(0.9),\n  s('~ ~ ~ ~ sd:3 ~ ~ ~'),\n  s('hh*8').gain(0.35),\n  s('~ ~ ~ ~ ~ ~ oh ~').gain(0.3)\n)` },
  { label: '909',
    code: `stack(\n  s('bd:5 ~ bd:5 ~ bd:5 ~ ~ bd:5'),\n  s('~ ~ ~ ~ cp ~ ~ ~').room(0.2),\n  s('[hh hh] [hh oh] [hh hh] [hh oh]').gain(0.35),\n  s('~ ~ ~ ~ ~ ~ rim ~').gain(0.4)\n)` },
  { label: 'Funk Kit',
    code: `stack(\n  s('bd ~ [~ bd] ~ bd ~ ~ bd').gain(0.85),\n  s('~ sd ~ [sd:2 sd] ~ sd:2 ~ sd'),\n  s('hh hh [hh oh] hh hh [hh hh] oh hh').gain(0.3),\n  s('~ ~ ~ ~ ~ ~ cb ~').gain(0.25)\n)` },
  // ── Melodic / textured ──
  { label: 'Arp',
    code: `note('c3 e3 g3 b3 c4 b3 g3 e3').fast(2).sound('sine').lpf(3000).delay(0.3).delaytime(0.125).delayfeedback(0.4).room(0.15)` },
  { label: 'Acid',
    code: `note('c2 c2 [eb2 c2] ~ c2 g1 [c2 eb2] ~').sound('sawtooth').lpf('<800 400 1600 500>').resonance(18).decay(0.15).sustain(0).release(0.05).gain(0.7)` },
  { label: 'Ambient',
    code: `stack(\n  note('<[c3,e3,g3] [a2,c3,e3] [f2,a2,c3] [g2,b2,d3]>').sound('sine').room(0.8).release(3).gain(0.3).slow(2),\n  note('g4 ~ e4 ~ c4 ~ e4 g4').sound('triangle').lpf(1500).delay(0.5).delaytime(0.33).delayfeedback(0.5).gain(0.15).slow(2)\n)` },
  { label: 'Lo-Fi',
    code: `stack(\n  s('bd ~ [~ bd] ~ bd ~ ~ [bd bd]').gain(0.8),\n  s('~ sd:3 ~ sd:3').room(0.3).gain(0.6),\n  s('hh*8').gain(0.2),\n  note('<[e3,g3,b3] [c3,e3,a3] [d3,f3,a3] [g2,b2,d3]>').sound('triangle').lpf(800).release(0.8).room(0.4).gain(0.35)\n)` },
  { label: 'Techno',
    code: `stack(\n  s('bd*4').gain(0.9),\n  s('~ cp ~ cp').room(0.15).gain(0.5),\n  s('[~ hh] [hh oh] [~ hh] [hh ~]').gain(0.3),\n  note('c1 ~ c1 ~ ~ c1 ~ [c1 eb1]').sound('sawtooth').lpf('<400 600 300 800>').resonance(12).decay(0.12).sustain(0).gain(0.7)\n)` },
  { label: 'DnB',
    code: `stack(\n  s('bd ~ ~ ~ bd ~ ~ bd ~ ~ bd ~ ~ ~ ~ ~').fast(2).gain(0.85),\n  s('~ ~ ~ ~ sd ~ ~ ~ ~ ~ ~ ~ sd ~ ~ ~').fast(2).room(0.12),\n  s('hh*16').gain(0.25),\n  note('c2 ~ ~ c2 ~ ~ eb2 ~ ~ ~ c2 ~ g1 ~ ~ ~').fast(2).sound('sawtooth').lpf(500).release(0.05).gain(0.6)\n)` },
  { label: 'Euclidean',
    code: `stack(\n  s('bd(3,8)').gain(0.85),\n  s('sd(2,8)').room(0.15),\n  s('hh(5,8)').gain(0.35),\n  note('c3(5,8) e3(3,8)').sound('triangle').release(0.2).lpf(2500).delay(0.2).delaytime(0.15)\n)` },
  { label: 'Breakbeat',
    code: `s('breaks125').loopAt(4).chop(16).every(4, x => x.rev())` },
  { label: 'Latin',
    code: `stack(\n  s('bd ~ ~ bd ~ bd ~ ~'),\n  s('~ ~ rim ~ ~ ~ rim ~').gain(0.5),\n  s('~ cp ~ ~ ~ cp ~ ~').gain(0.4).room(0.2),\n  s('[hh hh] [hh hh] [oh hh] [hh hh]').gain(0.3),\n  note('c3 ~ e3 g3 ~ e3 c3 ~').sound('sine').lpf(2500).release(0.15).gain(0.4)\n)` },
  // ── Sample-heavy ──
  { label: 'Jungle',
    code: `stack(\n  s('breaks165').loopAt(2).chop(8).every(3, x => x.rev()).gain(0.7),\n  s('~ jungbass:4 ~ jungbass:2').gain(0.8),\n  s('~ ~ ~ ~ [rave:3 ~] ~ ~ rave:5').gain(0.3).room(0.2)\n)` },
  { label: 'World',
    code: `stack(\n  s('tabla:2 [tabla:5 tabla:8] tabla:1 tabla:4').gain(0.7),\n  s('~ [hand:3 hand:1] ~ hand:5').gain(0.5),\n  note('<[c3,e3,g3] [d3,f3,a3]>').sound('sitar:1').slow(2).room(0.4).gain(0.35),\n  s('wind:1').loopAt(8).gain(0.1)\n).slow(1.5)` },
  { label: 'Glitch',
    code: `stack(\n  s('glitch:0 [~ glitch:3] glitch:7 [glitch:1 ~]').fast(2).gain(0.5).pan('<0.2 0.8 0.5 0.3>'),\n  s('bd:5(3,8)').gain(0.8).crush(6),\n  s('~ click:2 ~ click:4').gain(0.3).delay(0.4).delaytime(0.08),\n  s('noise:1').loopAt(4).gain(0.08).hpf(6000)\n)` },
  { label: 'Retro',
    code: `stack(\n  s('casio:0 [~ casio:1] casio:2 ~').gain(0.5).delay(0.2).delaytime(0.15),\n  s('bd:0 ~ [~ bd:0] ~').gain(0.7),\n  s('~ sd:1 ~ sd:1').room(0.15),\n  note('c4 e4 g4 c5 g4 e4').fast(2).sound('square').lpf(2000).crush(8).gain(0.3)\n)` },
  { label: 'Hoover',
    code: `stack(\n  s('bd*4').gain(0.9),\n  s('~ cp ~ cp').room(0.2),\n  s('hh*8').gain(0.3),\n  s('hoover:0').loopAt(2).gain(0.5).lpf('<2000 4000 1000 3000>').phaser(2),\n  note('c1 ~ ~ c1 ~ ~ eb1 ~').sound('sawtooth').lpf(400).distort(0.3).gain(0.6)\n)` },
];

function buildCodeFromTracks(tracks: Track[]): string {
  const active = tracks.filter(t => t.active);
  if (active.length === 0) return '';
  if (active.length === 1) return active[0].code;
  return `stack(\n${active.map(t => `  ${t.code}`).join(',\n')}\n)`;
}

export function createStrudelEditor(): HTMLElement {
  const tracks = createTracks();
  const container = document.createElement('div');
  container.className = 'flex flex-col gap-2 p-3 bg-bg-surface border border-border rounded-lg';
  container.dataset.testid = 'strudel-editor';

  // ── Header ──
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between';

  const title = document.createElement('span');
  title.className = 'text-xs font-bold text-accent-purple tracking-wider uppercase';
  title.textContent = 'Strudel Live';

  const btnRow = document.createElement('div');
  btnRow.className = 'flex gap-2';

  const playBtn = document.createElement('button');
  playBtn.className = 'px-3 py-1 text-xs rounded border bg-bg-elevated border-border text-text-secondary hover:border-accent-blue hover:text-accent-blue transition-colors';
  playBtn.textContent = 'Play';

  const stopBtn = document.createElement('button');
  stopBtn.className = 'px-3 py-1 text-xs rounded border bg-bg-elevated border-border text-text-secondary hover:border-accent-pink hover:text-accent-pink transition-colors';
  stopBtn.textContent = 'Stop';

  btnRow.append(playBtn, stopBtn);
  header.append(title, btnRow);

  // ── Tracks row ──
  const tracksRow = document.createElement('div');
  tracksRow.className = 'flex items-center gap-1.5 flex-wrap';

  const tracksLabel = document.createElement('span');
  tracksLabel.className = 'text-[10px] text-text-secondary uppercase tracking-wider mr-1';
  tracksLabel.textContent = 'Tracks';
  tracksRow.appendChild(tracksLabel);

  // "All" button
  const allBtn = document.createElement('button');
  allBtn.className = 'px-2 py-0.5 text-[10px] rounded border border-border text-text-secondary hover:border-accent-purple hover:text-accent-purple transition-colors';
  allBtn.textContent = 'All';
  tracksRow.appendChild(allBtn);

  // Track toggle buttons
  const trackBtns = new Map<string, HTMLButtonElement>();
  for (const track of tracks) {
    const btn = document.createElement('button');
    btn.className = 'px-2 py-0.5 text-[10px] rounded border border-border text-text-secondary hover:border-accent-purple hover:text-accent-purple transition-colors';
    btn.textContent = track.label;
    btn.dataset.trackId = track.id;
    tracksRow.appendChild(btn);
    trackBtns.set(track.id, btn);
  }

  function updateTrackButtons(): void {
    const anyActive = tracks.some(t => t.active);
    const allActive = tracks.every(t => t.active);

    // All button styling
    if (allActive) {
      allBtn.className = 'px-2 py-0.5 text-[10px] rounded border border-accent-purple bg-accent-purple/20 text-accent-purple transition-colors';
    } else {
      allBtn.className = 'px-2 py-0.5 text-[10px] rounded border border-border text-text-secondary hover:border-accent-purple hover:text-accent-purple transition-colors';
    }

    // Track button styling
    for (const track of tracks) {
      const btn = trackBtns.get(track.id)!;
      if (track.active) {
        btn.className = 'px-2 py-0.5 text-[10px] rounded border border-accent-purple bg-accent-purple/20 text-accent-purple transition-colors';
      } else {
        btn.className = 'px-2 py-0.5 text-[10px] rounded border border-border text-text-secondary hover:border-accent-purple hover:text-accent-purple transition-colors';
      }
    }

    // Update tracks label to show count
    if (anyActive) {
      const count = tracks.filter(t => t.active).length;
      tracksLabel.textContent = `Tracks (${count})`;
    } else {
      tracksLabel.textContent = 'Tracks';
    }
  }

  function syncTextareaFromTracks(): void {
    const code = buildCodeFromTracks(tracks);
    textarea.value = code;
    updateTrackButtons();
  }

  function syncTracksFromTextarea(): void {
    const code = textarea.value;
    for (const track of tracks) {
      track.active = code.includes(track.code);
    }
    updateTrackButtons();
  }

  // Track button clicks
  for (const track of tracks) {
    const btn = trackBtns.get(track.id)!;
    btn.addEventListener('click', () => {
      track.active = !track.active;
      syncTextareaFromTracks();
    });
  }

  // All button
  allBtn.addEventListener('click', () => {
    const allActive = tracks.every(t => t.active);
    // If all are on, turn all off. Otherwise turn all on.
    const newState = !allActive;
    for (const t of tracks) t.active = newState;
    syncTextareaFromTracks();
  });

  // ── Textarea ──
  const textarea = document.createElement('textarea');
  textarea.className = 'w-full h-24 bg-[#09090d] border border-border rounded px-3 py-2 text-sm text-text-primary font-mono resize-y outline-none focus:border-accent-purple placeholder:text-text-secondary/40';
  textarea.placeholder = 'Toggle tracks above, pick a template, or type Strudel code... (Ctrl+Enter to play)';
  textarea.spellcheck = false;

  // Sync track buttons to match textarea content
  textarea.addEventListener('input', () => {
    syncTracksFromTextarea();
  });

  // ── Templates row ──
  const tplRow = document.createElement('div');
  tplRow.className = 'flex items-center gap-2 flex-wrap';

  const tplLabel = document.createElement('span');
  tplLabel.className = 'text-[10px] text-text-secondary uppercase tracking-wider mr-1';
  tplLabel.textContent = 'Templates';
  tplRow.appendChild(tplLabel);

  for (const tpl of TEMPLATES) {
    const btn = document.createElement('button');
    btn.className = 'text-[10px] text-text-secondary hover:text-accent-purple transition-colors underline decoration-dotted underline-offset-2';
    btn.textContent = tpl.label;
    btn.addEventListener('click', () => {
      textarea.value = tpl.code;
      syncTracksFromTextarea();
    });
    tplRow.appendChild(btn);
  }

  // ── Error & Status ──
  const errorEl = document.createElement('div');
  errorEl.className = 'text-[10px] text-accent-pink font-mono min-h-[1em] truncate';
  errorEl.textContent = '';

  const statusEl = document.createElement('div');
  statusEl.className = 'text-[10px] text-text-secondary';
  statusEl.textContent = '';

  function updateStatus(playing: boolean): void {
    if (playing) {
      playBtn.className = 'px-3 py-1 text-xs rounded border bg-accent-blue/20 border-accent-blue text-accent-blue';
      playBtn.textContent = 'Playing';
      statusEl.textContent = '';
    } else {
      playBtn.className = 'px-3 py-1 text-xs rounded border bg-bg-elevated border-border text-text-secondary hover:border-accent-blue hover:text-accent-blue transition-colors';
      playBtn.textContent = 'Play';
      statusEl.textContent = '';
    }
  }

  // ── Actions ──
  async function evalCode(): Promise<void> {
    const code = textarea.value.trim();
    if (!code) return;
    errorEl.textContent = '';
    try {
      await strudelEval(code);
    } catch {
      errorEl.textContent = getStrudelError() ?? 'Eval error';
    }
  }

  playBtn.addEventListener('click', evalCode);

  stopBtn.addEventListener('click', () => {
    strudelStop();
    errorEl.textContent = '';
  });

  // Ctrl+Enter to eval
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      evalCode();
    }
  });

  // Prevent keyboard input from capturing
  textarea.addEventListener('keydown', (e) => e.stopPropagation());
  textarea.addEventListener('keyup', (e) => e.stopPropagation());

  // Sync textarea when code is evaluated externally (e.g., by AI chat)
  eventBus.on('strudel:eval', (code) => {
    textarea.value = code;
    syncTracksFromTextarea();
    errorEl.textContent = '';
  });

  eventBus.on('strudel:toggle', updateStatus);
  eventBus.on('strudel:error', (msg) => {
    errorEl.textContent = msg;
  });

  container.append(header, tracksRow, textarea, tplRow, errorEl, statusEl);
  return container;
}
