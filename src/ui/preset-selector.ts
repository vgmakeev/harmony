import type { PresetCategory, EngineType, Preset } from '../types';
import { getState, setPreset } from '../core/state';
import { getAllPresets, addUserPreset, deleteUserPreset, validatePreset, isFavorite, toggleFavorite, getRecentIds, pushRecent } from '../data/presets';
import { eventBus } from '../core/event-bus';

const CATEGORIES: PresetCategory[] = ['keys', 'bass', 'pad', 'lead', 'fx', 'orch'];
const ENGINES: { label: string; value: EngineType; color: string }[] = [
  { label: 'FM', value: 'synth', color: 'accent-blue' },
  { label: 'SD', value: 'superdough', color: 'accent-purple' },
  { label: 'WAF', value: 'webaudiofont', color: 'green-400' },
];

type SourceFilter = 'all' | 'factory' | 'user' | 'ai' | 'recent';

function engineLabel(engine: EngineType): string {
  return engine === 'synth' ? 'FM' : engine === 'superdough' ? 'SD' : 'WAF';
}

// Static class maps for preset cards (avoid dynamic Tailwind)
const CARD_ACTIVE_CLS: Record<EngineType, string> = {
  synth: 'flex flex-col gap-0.5 p-2 rounded border text-left bg-accent-blue/10 border-accent-blue',
  superdough: 'flex flex-col gap-0.5 p-2 rounded border text-left bg-accent-purple/10 border-accent-purple',
  webaudiofont: 'flex flex-col gap-0.5 p-2 rounded border text-left bg-green-400/10 border-green-400',
};
const CARD_INACTIVE_CLS = 'flex flex-col gap-0.5 p-2 rounded border text-left transition-colors border-border hover:border-text-secondary/30 hover:bg-bg-elevated';

const BADGE_CLS: Record<EngineType, string> = {
  synth: 'text-[8px] px-1 py-0.5 rounded bg-accent-blue/20 text-accent-blue font-bold leading-none',
  superdough: 'text-[8px] px-1 py-0.5 rounded bg-accent-purple/20 text-accent-purple font-bold leading-none',
  webaudiofont: 'text-[8px] px-1 py-0.5 rounded bg-green-400/20 text-green-400 font-bold leading-none',
};

export function createPresetSelector(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'flex flex-col bg-bg-surface border-b border-border shrink-0';

  let expanded = false;
  let searchQuery = '';
  let engineFilter: EngineType | null = null;
  let categoryFilter: PresetCategory | null = null;
  let sourceFilter: SourceFilter = 'all';

  // === COLLAPSED BAR ===
  const bar = document.createElement('div');
  bar.className = 'flex items-center gap-2 px-4 py-1.5 flex-wrap';

  // Engine badge + preset name
  const currentInfo = document.createElement('button');
  currentInfo.className = 'flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-bg-elevated transition-colors';
  currentInfo.addEventListener('click', () => toggleExpanded());

  const badgeEl = document.createElement('span');
  badgeEl.className = 'text-[9px] px-1.5 py-0.5 rounded font-bold';

  const nameEl = document.createElement('span');
  nameEl.className = 'text-xs text-text-primary font-medium truncate max-w-[180px]';

  const favStar = document.createElement('button');
  favStar.className = 'text-xs';
  favStar.addEventListener('click', (e) => {
    e.stopPropagation();
    const preset = getState().currentPreset;
    if (!preset) return;
    toggleFavorite(preset.id);
    updateBar();
    if (expanded) renderGrid();
  });

  currentInfo.append(badgeEl, nameEl);

  // Search input
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'bg-bg-elevated border border-border rounded px-2 py-0.5 text-xs text-text-primary font-mono outline-none focus:border-accent-blue placeholder:text-text-secondary/40 w-32';
  searchInput.placeholder = 'Search...';
  searchInput.addEventListener('keydown', (e) => e.stopPropagation());
  searchInput.addEventListener('keyup', (e) => e.stopPropagation());
  searchInput.addEventListener('focus', () => {
    if (!expanded) toggleExpanded(true);
  });
  let searchTimer: ReturnType<typeof setTimeout>;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = searchInput.value;
      renderGrid();
    }, 150);
  });

  // Category pills
  const catPills = document.createElement('div');
  catPills.className = 'flex gap-1';

  // Prev/next buttons
  const navBtns = document.createElement('div');
  navBtns.className = 'flex gap-0.5 ml-auto';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'w-5 h-5 rounded bg-bg-elevated border border-border text-text-secondary hover:text-text-primary text-[10px] flex items-center justify-center';
  prevBtn.textContent = '‹';
  prevBtn.addEventListener('click', () => navPreset(-1));

  const nextBtn = document.createElement('button');
  nextBtn.className = 'w-5 h-5 rounded bg-bg-elevated border border-border text-text-secondary hover:text-text-primary text-[10px] flex items-center justify-center';
  nextBtn.textContent = '›';
  nextBtn.addEventListener('click', () => navPreset(1));

  navBtns.append(prevBtn, nextBtn);

  // Import button
  const importBtn = document.createElement('button');
  importBtn.className = 'px-2 py-0.5 text-[10px] rounded border bg-bg-elevated border-border text-text-secondary hover:border-accent-purple hover:text-accent-purple transition-colors';
  importBtn.textContent = 'Import';
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.style.display = 'none';
  importBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result as string);
        if (!validatePreset(obj)) { alert('Invalid preset format'); return; }
        const preset = obj as Preset;
        if (!preset.meta) preset.meta = { createdAt: Date.now(), source: 'import' };
        addUserPreset(preset);
        setPreset(preset);
        if (expanded) renderGrid();
      } catch { alert('Failed to parse preset JSON'); }
    };
    reader.readAsText(file);
    fileInput.value = '';
  });

  bar.append(currentInfo, favStar, searchInput, catPills, navBtns, importBtn, fileInput);
  wrapper.appendChild(bar);

  // === EXPANDED PANEL ===
  const panel = document.createElement('div');
  panel.className = 'hidden flex-col gap-2 px-4 pb-3';
  wrapper.appendChild(panel);

  // Filter row: engine pills
  const filterRow = document.createElement('div');
  filterRow.className = 'flex items-center gap-3 flex-wrap';

  const enginePills = document.createElement('div');
  enginePills.className = 'flex gap-1';

  const catFilterPills = document.createElement('div');
  catFilterPills.className = 'flex gap-1';

  const sourcePills = document.createElement('div');
  sourcePills.className = 'flex gap-1 ml-auto';

  filterRow.append(enginePills, catFilterPills, sourcePills);
  panel.appendChild(filterRow);

  // Grid container
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-1.5 max-h-[280px] overflow-y-auto';
  panel.appendChild(grid);

  // === HELPERS ===

  // Static pill class maps to avoid dynamic Tailwind class construction
  const PILL_ACTIVE: Record<string, string> = {
    'accent-blue': 'px-2 py-0.5 text-[10px] rounded border transition-colors capitalize bg-accent-blue/20 border-accent-blue text-accent-blue',
    'accent-purple': 'px-2 py-0.5 text-[10px] rounded border transition-colors capitalize bg-accent-purple/20 border-accent-purple text-accent-purple',
    'green-400': 'px-2 py-0.5 text-[10px] rounded border transition-colors capitalize bg-green-400/20 border-green-400 text-green-400',
  };
  const PILL_INACTIVE = 'px-2 py-0.5 text-[10px] rounded border transition-colors capitalize border-border text-text-secondary hover:text-text-primary';

  function pillBtn(text: string, active: boolean, colorClass: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = active ? (PILL_ACTIVE[colorClass] ?? PILL_ACTIVE['accent-blue']) : PILL_INACTIVE;
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function toggleExpanded(force?: boolean): void {
    expanded = force ?? !expanded;
    panel.className = expanded
      ? 'flex flex-col gap-2 px-4 pb-3'
      : 'hidden flex-col gap-2 px-4 pb-3';
    if (expanded) {
      renderFilters();
      renderGrid();
    }
  }

  function getFilteredPresets(): Preset[] {
    let list = getAllPresets();
    const recentIdList = getRecentIds();

    if (engineFilter) list = list.filter(p => p.engine === engineFilter);
    if (categoryFilter) list = list.filter(p => p.category === categoryFilter);

    if (sourceFilter === 'factory') list = list.filter(p => !p.meta);
    else if (sourceFilter === 'user') list = list.filter(p => p.meta?.source === 'user');
    else if (sourceFilter === 'ai') list = list.filter(p => p.tags?.includes('ai-generated'));
    else if (sourceFilter === 'recent') {
      const recentSet = new Set(recentIdList);
      list = list.filter(p => recentSet.has(p.id));
      list.sort((a, b) => recentIdList.indexOf(a.id) - recentIdList.indexOf(b.id));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q)
        || p.tags?.some(t => t.toLowerCase().includes(q))
        || p.category.includes(q)
      );
    }

    return list;
  }

  function navPreset(dir: number): void {
    const all = getFilteredPresets();
    if (all.length === 0) return;
    const current = getState().currentPreset;
    const idx = current ? all.findIndex(p => p.id === current.id) : -1;
    const next = (idx + dir + all.length) % all.length;
    selectPreset(all[next]);
  }

  function selectPreset(preset: Preset): void {
    pushRecent(preset.id);
    setPreset(preset);
  }

  function renderFilters(): void {
    enginePills.innerHTML = '';
    catFilterPills.innerHTML = '';
    sourcePills.innerHTML = '';

    // Engine filter
    enginePills.appendChild(pillBtn('All', !engineFilter, 'accent-blue', () => {
      engineFilter = null;
      renderFilters();
      renderGrid();
    }));
    for (const eng of ENGINES) {
      enginePills.appendChild(pillBtn(eng.label, engineFilter === eng.value, eng.color, () => {
        engineFilter = engineFilter === eng.value ? null : eng.value;
        renderFilters();
        renderGrid();
      }));
    }

    // Category filter
    catFilterPills.appendChild(pillBtn('All', !categoryFilter, 'accent-blue', () => {
      categoryFilter = null;
      renderFilters();
      renderGrid();
    }));
    for (const cat of CATEGORIES) {
      catFilterPills.appendChild(pillBtn(cat, categoryFilter === cat, 'accent-blue', () => {
        categoryFilter = categoryFilter === cat ? null : cat;
        renderFilters();
        renderGrid();
      }));
    }

    // Source filter
    const sources: { label: string; value: SourceFilter }[] = [
      { label: 'All', value: 'all' },
      { label: 'Factory', value: 'factory' },
      { label: 'User', value: 'user' },
      { label: 'AI', value: 'ai' },
      { label: 'Recent', value: 'recent' },
    ];
    for (const src of sources) {
      sourcePills.appendChild(pillBtn(src.label, sourceFilter === src.value, 'accent-purple', () => {
        sourceFilter = src.value;
        renderFilters();
        renderGrid();
      }));
    }
  }

  function renderGrid(): void {
    grid.innerHTML = '';
    const presets = getFilteredPresets();
    const currentId = getState().currentPreset?.id;

    for (const preset of presets) {
      const card = document.createElement('button');
      const isActive = preset.id === currentId;
      const fav = isFavorite(preset.id);

      card.className = isActive ? CARD_ACTIVE_CLS[preset.engine] : CARD_INACTIVE_CLS;

      // Build card content with proper DOM (avoid innerHTML for static class safety)
      const topRow = document.createElement('div');
      topRow.className = 'flex items-center gap-1';
      const badge = document.createElement('span');
      badge.className = BADGE_CLS[preset.engine];
      badge.textContent = engineLabel(preset.engine);
      const nameSpan = document.createElement('span');
      nameSpan.className = 'text-[11px] text-text-primary truncate flex-1 font-medium';
      nameSpan.textContent = preset.name;
      const star = document.createElement('span');
      star.className = fav ? 'text-[10px] text-yellow-400' : 'text-[10px] text-text-secondary/30';
      star.textContent = fav ? '★' : '☆';
      star.setAttribute('data-star', '');
      topRow.append(badge, nameSpan, star);

      const botRow = document.createElement('div');
      botRow.className = 'flex items-center gap-1';
      const catSpan = document.createElement('span');
      catSpan.className = 'text-[9px] text-text-secondary/60 capitalize';
      catSpan.textContent = preset.category;
      botRow.appendChild(catSpan);
      if (preset.tags?.length) {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'text-[9px] text-text-secondary/40';
        tagSpan.textContent = `· ${preset.tags[0]}`;
        botRow.appendChild(tagSpan);
      }
      if (preset.meta?.source === 'ai' || preset.tags?.includes('ai-generated')) {
        const aiSpan = document.createElement('span');
        aiSpan.className = 'text-[9px] text-accent-purple/60';
        aiSpan.textContent = 'AI';
        botRow.appendChild(aiSpan);
      }

      card.append(topRow, botRow);

      card.addEventListener('click', () => {
        selectPreset(preset);
        renderGrid();
      });

      // Favorite toggle on star click
      const starEl = card.querySelector('[data-star]') as HTMLElement | null;
      if (starEl) {
        starEl.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleFavorite(preset.id);
          updateBar();
          renderGrid();
        });
      }

      // Context menu
      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e as MouseEvent, preset);
      });

      grid.appendChild(card);
    }

    if (presets.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'text-xs text-text-secondary/50 col-span-full text-center py-4';
      empty.textContent = 'No presets found';
      grid.appendChild(empty);
    }
  }

  function showContextMenu(e: MouseEvent, preset: Preset): void {
    // Remove any existing context menu
    document.querySelectorAll('.preset-ctx-menu').forEach(el => el.remove());

    const menu = document.createElement('div');
    menu.className = 'preset-ctx-menu fixed z-50 bg-bg-surface border border-border rounded shadow-lg py-1 min-w-[120px]';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;

    const items: { label: string; action: () => void; danger?: boolean }[] = [
      {
        label: isFavorite(preset.id) ? 'Unfavorite' : 'Favorite',
        action: () => { toggleFavorite(preset.id); updateBar(); renderGrid(); },
      },
      {
        label: 'Duplicate',
        action: () => {
          const dup: Preset = {
            ...preset,
            id: `user-${Date.now()}`,
            name: `${preset.name} Copy`,
            tags: [...(preset.tags || []), 'user'],
            meta: { createdAt: Date.now(), source: 'user', basedOn: preset.id },
          };
          addUserPreset(dup);
          selectPreset(dup);
          renderGrid();
        },
      },
      {
        label: 'Export JSON',
        action: () => {
          const json = JSON.stringify(preset, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${preset.id}.json`;
          a.click();
          URL.revokeObjectURL(url);
        },
      },
    ];

    // Delete only for user presets
    if (preset.meta || preset.tags?.includes('user')) {
      items.push({
        label: 'Delete',
        danger: true,
        action: () => {
          deleteUserPreset(preset.id);
          renderGrid();
        },
      });
    }

    for (const item of items) {
      const btn = document.createElement('button');
      btn.className = `block w-full text-left px-3 py-1 text-xs transition-colors ${
        item.danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
      }`;
      btn.textContent = item.label;
      btn.addEventListener('click', () => {
        item.action();
        menu.remove();
        document.removeEventListener('click', dismiss);
      });
      menu.appendChild(btn);
    }

    document.body.appendChild(menu);
    const dismiss = (ev: Event) => {
      if (!menu.contains(ev.target as Node)) {
        menu.remove();
        document.removeEventListener('click', dismiss);
      }
    };
    setTimeout(() => document.addEventListener('click', dismiss), 0);
  }

  // === BAR UPDATE ===
  function updateBar(): void {
    const preset = getState().currentPreset;
    if (!preset) {
      nameEl.textContent = '—';
      badgeEl.textContent = '';
      favStar.textContent = '';
      return;
    }

    const BAR_BADGE_CLS: Record<EngineType, string> = {
      synth: 'text-[9px] px-1.5 py-0.5 rounded font-bold bg-accent-blue/20 text-accent-blue',
      superdough: 'text-[9px] px-1.5 py-0.5 rounded font-bold bg-accent-purple/20 text-accent-purple',
      webaudiofont: 'text-[9px] px-1.5 py-0.5 rounded font-bold bg-green-400/20 text-green-400',
    };
    badgeEl.className = BAR_BADGE_CLS[preset.engine];
    badgeEl.textContent = engineLabel(preset.engine);
    nameEl.textContent = preset.name;
    favStar.textContent = isFavorite(preset.id) ? '★' : '☆';
    favStar.className = `text-xs ${isFavorite(preset.id) ? 'text-yellow-400' : 'text-text-secondary/40 hover:text-yellow-400'}`;

    // Rebuild category pills in collapsed bar
    catPills.innerHTML = '';
    catPills.appendChild(pillBtn('All', !categoryFilter, 'accent-blue', () => {
      categoryFilter = null;
      updateBar();
      if (expanded) { renderFilters(); renderGrid(); }
    }));
    for (const cat of CATEGORIES) {
      catPills.appendChild(pillBtn(cat, categoryFilter === cat, 'accent-blue', () => {
        categoryFilter = categoryFilter === cat ? null : cat;
        updateBar();
        if (expanded) { renderFilters(); renderGrid(); }
      }));
    }
  }

  // === EVENTS ===
  eventBus.on('state:presetChanged', () => {
    updateBar();
    if (expanded) renderGrid();
  });

  updateBar();
  return wrapper;
}
