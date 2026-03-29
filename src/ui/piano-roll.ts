import { eventBus } from '../core/event-bus';
import type { NoteSource } from '../types';

interface NoteRect {
  note: number;
  startTime: number;
  endTime: number;
  source: NoteSource;
}

const NOTE_LOW = 36;  // C2
const NOTE_HIGH = 84; // C6
const NOTE_RANGE = NOTE_HIGH - NOTE_LOW;
const VISIBLE_MS = 8000;

const SOURCE_COLORS: Record<string, string> = {
  keyboard: '#6ea8fe',
  midi: '#b392f0',
  arp: '#f778ba',
  ui: '#6ea8fe',
};

export function createPianoRoll(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'px-3 shrink-0';

  const canvas = document.createElement('canvas');
  canvas.className = 'w-full rounded-lg border border-border';
  canvas.style.height = '100px';
  wrapper.appendChild(canvas);

  const rects: NoteRect[] = [];
  let animId = 0;
  let idleTimeout = 0;

  function getCanvasSize(): { w: number; h: number; dpr: number } {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    return { w: rect.width * dpr, h: rect.height * dpr, dpr };
  }

  function resizeCanvas(): void {
    const { w, h } = getCanvasSize();
    canvas.width = w;
    canvas.height = h;
  }

  const ro = new ResizeObserver(resizeCanvas);
  ro.observe(canvas);

  function render(): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h } = getCanvasSize();
    const now = performance.now();
    const noteH = h / NOTE_RANGE;

    ctx.clearRect(0, 0, w, h);

    // Background grid lines (every octave)
    ctx.strokeStyle = '#2a2a3e';
    ctx.lineWidth = 1;
    for (let n = NOTE_LOW; n <= NOTE_HIGH; n += 12) {
      const y = h - (n - NOTE_LOW) * noteH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Prune old rects
    while (rects.length > 0 && rects[0].endTime > 0 && now - rects[0].endTime > VISIBLE_MS) {
      rects.shift();
    }

    // Draw note rects
    for (const r of rects) {
      const end = r.endTime > 0 ? r.endTime : now;
      const x1 = w * (1 - (now - r.startTime) / VISIBLE_MS);
      const x2 = w * (1 - (now - end) / VISIBLE_MS);
      if (x2 < 0) continue;

      const y = h - (r.note - NOTE_LOW + 1) * noteH;
      const rectW = Math.max(x2 - x1, 2);

      ctx.fillStyle = SOURCE_COLORS[r.source] ?? '#6ea8fe';
      ctx.globalAlpha = r.endTime > 0 ? 0.7 : 0.9;
      ctx.fillRect(Math.max(x1, 0), y, rectW, noteH - 1);
    }
    ctx.globalAlpha = 1;

    animId = requestAnimationFrame(render);
  }

  function startAnim(): void {
    clearTimeout(idleTimeout);
    if (!animId) {
      animId = requestAnimationFrame(render);
    }
    idleTimeout = window.setTimeout(() => {
      cancelAnimationFrame(animId);
      animId = 0;
    }, VISIBLE_MS + 2000);
  }

  eventBus.on('sound:noteOn', (event) => {
    if (event.note < NOTE_LOW || event.note > NOTE_HIGH) return;
    rects.push({
      note: event.note,
      startTime: performance.now(),
      endTime: 0,
      source: event.source,
    });
    startAnim();
  });

  eventBus.on('sound:noteOff', (event) => {
    // Find the most recent active rect for this note
    for (let i = rects.length - 1; i >= 0; i--) {
      if (rects[i].note === event.note && rects[i].endTime === 0) {
        rects[i].endTime = performance.now();
        break;
      }
    }
  });

  return wrapper;
}
