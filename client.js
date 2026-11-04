window.__ModuleLoader__.load({
  id: 'dsh-liang-backdrop',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'liang-backdrop';
    const FRAME_BASE = '/plugins/liang-backdrop/frames/';
    const STORE_KEY = 'dsh.liang-backdrop:v1';

    // The six named stages only. Each keyframe is the first frame of its band in
    // the source scale (SCORES_PER_STAGE = 6 over -15 … +15).
    const LEVELS = [
      { name: '小难梁', frame: 0 },
      { name: '牢梁', frame: 6 },
      { name: '梁子', frame: 12 },
      { name: '梁圣', frame: 18 },
      { name: '梁神', frame: 24 },
      { name: '梁祖', frame: 30 },
    ];
    const TOTAL = LEVELS.length;

    const MIN_SIZE = 14;
    const MAX_SIZE = 76;

    const DEFAULT_STATE = {
      level: 3,
      reverse: true,
      strength: 1,
      size: 42,
      // Image centre as a fraction of the frame: 0 = left/top edge, 1 = right/bottom edge.
      px: 0.5,
      py: 0.5,
      collapsed: false,
      x: null,
      y: null,
    };

    function clampNumber(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    /**
     * Keep the portrait fully inside the frame: its centre may only travel while
     * the whole square still fits, so the reachable area shrinks as it grows.
     */
    function clampPosition(x, y, size) {
      const vw = Math.max(1, window.innerWidth);
      const vh = Math.max(1, window.innerHeight);
      const sizePx = (clampNumber(size, MIN_SIZE, MAX_SIZE) / 100) * Math.min(vw, vh);
      const halfX = Math.min(0.5, sizePx / (2 * vw));
      const halfY = Math.min(0.5, sizePx / (2 * vh));
      return {
        px: clampNumber(Number.isFinite(x) ? x : 0.5, halfX, 1 - halfX),
        py: clampNumber(Number.isFinite(y) ? y : 0.5, halfY, 1 - halfY),
      };
    }

    function clampLevel(value) {
      if (!Number.isFinite(value)) return DEFAULT_STATE.level;
      return Math.min(TOTAL - 1, Math.max(0, Math.round(value)));
    }

    function readState() {
      try {
        const raw = window.localStorage.getItem(STORE_KEY);
        if (!raw) return { ...DEFAULT_STATE };
        const parsed = JSON.parse(raw);
        const strength = [0, 1, 2].includes(parsed && parsed.strength) ? parsed.strength : DEFAULT_STATE.strength;
        return {
          level: clampLevel(parsed && Number(parsed.level)),
          reverse: typeof (parsed && parsed.reverse) === 'boolean' ? parsed.reverse : DEFAULT_STATE.reverse,
          strength,
          size: Number.isFinite(parsed && Number(parsed.size))
            ? clampNumber(Number(parsed.size), MIN_SIZE, MAX_SIZE)
            : DEFAULT_STATE.size,
          px: Number.isFinite(parsed && parsed.px) ? parsed.px : DEFAULT_STATE.px,
          py: Number.isFinite(parsed && parsed.py) ? parsed.py : DEFAULT_STATE.py,
          collapsed: (parsed && parsed.collapsed) === true,
          x: Number.isFinite(parsed && parsed.x) ? parsed.x : null,
          y: Number.isFinite(parsed && parsed.y) ? parsed.y : null,
        };
      } catch {
        return { ...DEFAULT_STATE };
      }
    }

    // Loaded lazily so the module factory itself stays side-effect free.
    let state = null;
    const listeners = new Set();

    function getState() {
      if (state === null) state = readState();
      return state;
    }

    function emit() {
      for (const listener of Array.from(listeners)) listener();
    }

    function subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    }

    function update(patch, options) {
      state = { ...getState(), ...patch };
      if (!options || options.persist !== false) {
        try {
          window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
        } catch {
          /* a blocked storage quota must not break the control */
        }
      }
      emit();
    }

    function useLadder() {
      return React.useSyncExternalStore(subscribe, getState, getState);
    }

    /** Slider position (0 … 5, always left-to-right) → level index (小难梁 … 梁祖). */
    function levelAtPosition(position, reverse) {
      const index = reverse ? TOTAL - 1 - position : position;
      return Math.min(TOTAL - 1, Math.max(0, index));
    }

    function positionOfLevel(level, reverse) {
      return reverse ? TOTAL - 1 - level : level;
    }

    function frameUrl(frame) {
      return `${FRAME_BASE}frame-${String(frame).padStart(2, '0')}.webp`;
    }

    const ZH = {
      'dock.label': '梁圣滑杆背景',
      'slider.aria': '背景等级',
      'drag.title': '拖动移动 · 双击复位',
      'drag.label': '拖动',
      'collapse.title': '收起面板',
      'expand.title': '展开面板',
      'size.label': '大小',
      'position.label': '位置',
      'position.title': '按住画布拖动，背景跟着走',
      'flip.title': '反转方向',
      'strength.title': '背景浓度',
      'strength.0': '淡',
      'strength.1': '中',
      'strength.2': '浓',
      'badge.level': '/6 级',
    };

    const EN = {
      'dock.label': 'Liang Ladder Backdrop',
      'slider.aria': 'Backdrop level',
      'drag.title': 'Drag to move · double-click to reset',
      'drag.label': 'Drag',
      'collapse.title': 'Collapse panel',
      'expand.title': 'Expand panel',
      'size.label': 'Size',
      'position.label': 'Position',
      'position.title': 'Drag inside the box; the portrait follows',
      'flip.title': 'Reverse direction',
      'strength.title': 'Backdrop strength',
      'strength.0': 'Faint',
      'strength.1': 'Medium',
      'strength.2': 'Strong',
      'badge.level': '/6',
    };

    const BACKDROP_CSS = `
      .lb-root {
        position: fixed;
        overflow: hidden;
        pointer-events: none;
        opacity: 0;
        animation: lb-root-in .45s ease forwards;
      }
      @keyframes lb-root-in { to { opacity: 1; } }
      .lb-frame {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: 50% 50%;
        filter: saturate(.92) contrast(1.02);
        animation: lb-frame-in .3s ease;
        -webkit-mask-image: radial-gradient(closest-side at 50% 50%,
          rgba(0,0,0,1) 0%, rgba(0,0,0,1) 58%, rgba(0,0,0,.55) 80%, rgba(0,0,0,0) 100%);
        mask-image: radial-gradient(closest-side at 50% 50%,
          rgba(0,0,0,1) 0%, rgba(0,0,0,1) 58%, rgba(0,0,0,.55) 80%, rgba(0,0,0,0) 100%);
      }
      @keyframes lb-frame-in { from { opacity: 0; } }
      .lb-root[data-strength="0"] .lb-frame { opacity: .35; }
      .lb-root[data-strength="1"] .lb-frame { opacity: .55; }
      .lb-root[data-strength="2"] .lb-frame { opacity: .8; }
      @media (max-width: 640px), (max-height: 520px) {
        .lb-root { display: none; }
      }
    `;

    const CONTROL_CSS = `
      .lbd-card {
        position: fixed;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        width: 172px;
        box-sizing: border-box;
        padding: 9px;
        display: flex;
        flex-direction: column;
        gap: 7px;
        pointer-events: auto;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 15px;
        background: var(--dsw-alias-bg-overlay);
        color: var(--dsw-alias-label-primary);
        box-shadow: 0 6px 22px rgba(0, 0, 0, .12);
        font-size: 12.5px;
        line-height: 1.3;
        font-family: inherit;
      }
      .lbd-card[data-dragging="true"] {
        user-select: none;
        box-shadow: 0 10px 30px rgba(0, 0, 0, .22);
      }
      .lbd-card[data-collapsed="true"] {
        width: 126px;
        gap: 0;
        padding: 7px 9px;
      }
      .lbd-card[data-collapsed="true"] .lbd-chips,
      .lbd-card[data-collapsed="true"] .lbd-range,
      .lbd-card[data-collapsed="true"] .lbd-meta,
      .lbd-card[data-collapsed="true"] .lbd-field,
      .lbd-card[data-collapsed="true"] .lbd-pad-wrap {
        display: none;
      }
      .lbd-collapse {
        flex: 0 0 auto;
        margin-left: auto;
        width: 21px;
        height: 18px;
        padding: 0;
        display: grid;
        place-items: center;
        border: 0;
        border-radius: 5px;
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        font: inherit;
        font-size: 13px;
        line-height: 1;
        cursor: pointer;
      }
      .lbd-collapse:hover {
        color: var(--dsw-alias-label-primary);
        background: var(--dsw-alias-bg-layer-2);
      }
      .lbd-grip {
        display: flex;
        align-items: center;
        gap: 5px;
        height: 18px;
        margin: -2px 0 -1px;
        padding: 0 2px;
        color: var(--dsw-alias-label-secondary);
        font-size: 11px;
        cursor: grab;
        touch-action: none;
        user-select: none;
      }
      .lbd-grip:active { cursor: grabbing; }
      .lbd-grip-dots {
        letter-spacing: 1px;
        font-size: 12px;
        line-height: 1;
      }
      .lbd-grip-label {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .lbd-chips {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 3px;
      }
      .lbd-chip {
        padding: 4px 8px;
        border: 1px solid transparent;
        border-radius: 7px;
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        font: inherit;
        font-size: 12px;
        text-align: left;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: pointer;
      }
      .lbd-chip:hover {
        background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-primary);
      }
      .lbd-chip[data-active="true"] {
        border-color: var(--dsw-alias-brand-primary);
        background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-primary);
        font-weight: 600;
      }
      .lbd-range {
        width: 100%;
        height: 18px;
        margin: 0;
        cursor: pointer;
        accent-color: var(--dsw-alias-brand-primary);
      }
      .lbd-range-compact {
        flex: 1 1 auto;
        width: auto;
        min-width: 0;
      }
      .lbd-field {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .lbd-field-label {
        flex: 0 0 auto;
        color: var(--dsw-alias-label-secondary);
        font-size: 11px;
      }
      .lbd-field-value {
        flex: 0 0 auto;
        min-width: 18px;
        text-align: right;
        color: var(--dsw-alias-label-secondary);
        font-size: 11px;
        font-variant-numeric: tabular-nums;
      }
      .lbd-pad-wrap {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .lbd-pad {
        position: relative;
        height: 86px;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 8px;
        overflow: hidden;
        cursor: crosshair;
        touch-action: none;
        background:
          repeating-linear-gradient(to right,
            var(--dsw-alias-border-l1) 0 1px, transparent 1px 33.34%),
          repeating-linear-gradient(to bottom,
            var(--dsw-alias-border-l1) 0 1px, transparent 1px 50%),
          var(--dsw-alias-bg-layer-2);
      }
      .lbd-pad-knob {
        position: absolute;
        width: 12px;
        height: 12px;
        margin: -6px 0 0 -6px;
        border-radius: 999px;
        background: var(--dsw-alias-brand-primary);
        box-shadow: 0 0 0 2px var(--dsw-alias-bg-overlay);
        pointer-events: none;
      }
      .lbd-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 5px;
      }
      .lbd-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        min-width: 0;
        padding: 2px 7px;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 999px;
        background: var(--dsw-alias-bg-layer-2);
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .lbd-badge span {
        color: var(--dsw-alias-label-secondary);
        font-weight: 500;
      }
      .lbd-icons {
        display: flex;
        gap: 5px;
        flex: 0 0 auto;
      }
      .lbd-icon {
        width: 22px;
        height: 22px;
        padding: 0;
        display: inline-grid;
        place-items: center;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 7px;
        background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-secondary);
        font: inherit;
        font-size: 12px;
        line-height: 1;
        cursor: pointer;
      }
      .lbd-icon:hover {
        color: var(--dsw-alias-label-primary);
        border-color: var(--dsw-alias-border-l2);
      }
    `;

    /**
     * Small portrait pinned to the bottom-right corner. Click-through: the shell
     * overlay already ignores pointer events, and this layer never opts back in.
     */
    function Backdrop() {
      const ladder = useLadder();
      const frame = LEVELS[clampLevel(ladder.level)].frame;
      const [stack, setStack] = React.useState([frame]);

      const size = clampNumber(ladder.size, MIN_SIZE, MAX_SIZE);
      const spot = clampPosition(ladder.px, ladder.py, size);
      const layout = {
        left: `${spot.px * 100}%`,
        top: `${spot.py * 100}%`,
        transform: 'translate(-50%, -50%)',
        width: `${size}vmin`,
        height: `${size}vmin`,
      };

      React.useEffect(() => {
        setStack((prev) => {
          if (prev[prev.length - 1] === frame) return prev;
          return [...prev.slice(-1), frame];
        });
      }, [frame]);

      React.useEffect(() => {
        if (stack.length < 2) return undefined;
        const timer = window.setTimeout(() => setStack((prev) => prev.slice(-1)), 340);
        return () => window.clearTimeout(timer);
      }, [stack]);

      React.useEffect(() => {
        // Six frames only: warm them once so dragging the slider stays instant.
        const timer = window.setTimeout(() => {
          for (const level of LEVELS) {
            const image = new window.Image();
            image.src = frameUrl(level.frame);
          }
        }, 600);
        return () => window.clearTimeout(timer);
      }, []);

      return h('div', {
        className: 'lb-root',
        style: layout,
        'data-strength': String(ladder.strength),
        'aria-hidden': 'true',
      },
        h('style', null, BACKDROP_CSS),
        stack.map((item) => h('img', {
          key: item,
          className: 'lb-frame',
          src: frameUrl(item),
          alt: '',
          draggable: false,
        })),
      );
    }

    /**
     * The slider panel: six stage chips, the level picker, direction, strength.
     * Drag it by the grip; the position is stored in the shared ladder state.
     */
    function Control({ ctx }) {
      const t = ctx.locale.bind(NS);
      React.useSyncExternalStore(
        (callback) => ctx.locale.subscribe(callback),
        () => ctx.locale.getSnapshot().revision,
        () => 0,
      );

      const ladder = useLadder();
      const level = clampLevel(ladder.level);
      const position = positionOfLevel(level, ladder.reverse);
      const stage = LEVELS[level];
      const strengthName = t(`strength.${ladder.strength}`);
      const valueText = `${stage.name} ${level + 1}${t('badge.level')}`;
      const size = clampNumber(ladder.size, MIN_SIZE, MAX_SIZE);
      const spot = clampPosition(ladder.px, ladder.py, size);
      const collapsed = ladder.collapsed === true;

      const cardRef = React.useRef(null);
      const [drag, setDrag] = React.useState(null);

      const storedX = Number.isFinite(ladder.x) ? ladder.x : null;
      const storedY = Number.isFinite(ladder.y) ? ladder.y : null;
      const placed = storedX !== null && storedY !== null;
      const left = drag ? drag.left : (placed ? storedX : null);
      const top = drag ? drag.top : (placed ? storedY : null);

      const cardStyle = left === null || top === null
        ? undefined
        : { left: `${left}px`, top: `${top}px`, transform: 'none' };

      // Keep a restored position inside the viewport after a window resize.
      const clampIntoView = React.useCallback(() => {
        const element = cardRef.current;
        const current = getState();
        if (!element || !Number.isFinite(current.x) || !Number.isFinite(current.y)) return;
        const rect = element.getBoundingClientRect();
        const maxX = Math.max(0, window.innerWidth - rect.width);
        const maxY = Math.max(0, window.innerHeight - rect.height);
        const nextX = clampNumber(current.x, 0, maxX);
        const nextY = clampNumber(current.y, 0, maxY);
        if (nextX !== current.x || nextY !== current.y) {
          update({ x: Math.round(nextX), y: Math.round(nextY) });
        }
      }, []);

      React.useEffect(() => {
        clampIntoView();
        window.addEventListener('resize', clampIntoView);
        return () => window.removeEventListener('resize', clampIntoView);
      }, [clampIntoView, storedX, storedY, collapsed]);

      const onGripDown = (event) => {
        if (typeof event.button === 'number' && event.button !== 0) return;
        const card = cardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
        setDrag({
          left: rect.left,
          top: rect.top,
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top,
          width: rect.width,
          height: rect.height,
        });
      };

      const onGripMove = (event) => {
        if (!drag) return;
        const maxX = Math.max(0, window.innerWidth - drag.width);
        const maxY = Math.max(0, window.innerHeight - drag.height);
        setDrag({
          ...drag,
          left: clampNumber(event.clientX - drag.offsetX, 0, maxX),
          top: clampNumber(event.clientY - drag.offsetY, 0, maxY),
        });
      };

      const onGripUp = (event) => {
        if (!drag) return;
        try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* already released */ }
        update({ x: Math.round(drag.left), y: Math.round(drag.top) });
        setDrag(null);
      };

      const resetPosition = () => {
        update({ x: null, y: null });
      };

      // Trackpad: dragging inside the mini frame moves the portrait anywhere.
      const padRef = React.useRef(null);
      const padActive = React.useRef(false);
      const lastPad = React.useRef(null);

      const movePadTo = (event) => {
        const pad = padRef.current;
        if (!pad) return;
        const rect = pad.getBoundingClientRect();
        const next = clampPosition(
          (event.clientX - rect.left) / Math.max(1, rect.width),
          (event.clientY - rect.top) / Math.max(1, rect.height),
          size,
        );
        lastPad.current = next;
        update(next, { persist: false });
      };

      const onPadDown = (event) => {
        if (typeof event.button === 'number' && event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        padActive.current = true;
        movePadTo(event);
      };

      const onPadMove = (event) => {
        if (!padActive.current) return;
        movePadTo(event);
      };

      const onPadUp = (event) => {
        if (!padActive.current) return;
        padActive.current = false;
        try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* already released */ }
        if (lastPad.current) update(lastPad.current);
      };

      const chips = [];
      for (let i = 0; i < TOTAL; i += 1) {
        const chipLevel = levelAtPosition(i, ladder.reverse);
        chips.push(h('button', {
          key: chipLevel,
          type: 'button',
          className: 'lbd-chip',
          'data-active': chipLevel === level ? 'true' : 'false',
          onClick: () => update({ level: chipLevel }),
        }, LEVELS[chipLevel].name));
      }

      return h('div', {
        className: 'lbd-card',
        ref: cardRef,
        style: cardStyle,
        'data-dragging': drag ? 'true' : 'false',
        'data-collapsed': collapsed ? 'true' : 'false',
        role: 'group',
        'aria-label': t('dock.label'),
      },
        h('style', null, CONTROL_CSS),
        h('div', {
          className: 'lbd-grip',
          title: t('drag.title'),
          onPointerDown: onGripDown,
          onPointerMove: onGripMove,
          onPointerUp: onGripUp,
          onPointerCancel: onGripUp,
          onDoubleClick: resetPosition,
        },
          h('span', { className: 'lbd-grip-dots', 'aria-hidden': 'true' }, '⠿'),
          h('span', { className: 'lbd-grip-label' }, collapsed ? stage.name : t('drag.label')),
          h('button', {
            type: 'button',
            className: 'lbd-collapse',
            title: collapsed ? t('expand.title') : t('collapse.title'),
            'aria-label': collapsed ? t('expand.title') : t('collapse.title'),
            'aria-expanded': collapsed ? 'false' : 'true',
            onPointerDown: (event) => event.stopPropagation(),
            onClick: () => update({ collapsed: !collapsed }),
          }, h('span', { 'aria-hidden': 'true' }, collapsed ? '▸' : '▾')),
        ),
        h('div', { className: 'lbd-chips' }, chips),
        h('input', {
          type: 'range',
          className: 'lbd-range',
          min: 0,
          max: TOTAL - 1,
          step: 1,
          value: position,
          'aria-label': t('slider.aria'),
          'aria-valuetext': valueText,
          onChange: (event) => update({
            level: levelAtPosition(Number(event.target.value), ladder.reverse),
          }),
        }),
        h('div', { className: 'lbd-meta' },
          h('span', { className: 'lbd-badge' },
            stage.name,
            h('span', null, `${level + 1}${t('badge.level')}`),
          ),
          h('div', { className: 'lbd-icons' },
            h('button', {
              type: 'button',
              className: 'lbd-icon',
              title: t('flip.title'),
              'aria-label': t('flip.title'),
              onClick: () => update({ reverse: !ladder.reverse }),
            }, h('span', { 'aria-hidden': 'true' }, '⇄')),
            h('button', {
              type: 'button',
              className: 'lbd-icon',
              title: `${t('strength.title')}：${strengthName}`,
              'aria-label': `${t('strength.title')}：${strengthName}`,
              onClick: () => update({ strength: (ladder.strength + 1) % 3 }),
            }, h('span', { 'aria-hidden': 'true' }, '◐')),
          ),
        ),
        h('div', { className: 'lbd-field' },
          h('span', { className: 'lbd-field-label' }, t('size.label')),
          h('input', {
            type: 'range',
            className: 'lbd-range lbd-range-compact',
            min: MIN_SIZE,
            max: MAX_SIZE,
            step: 1,
            value: size,
            'aria-label': t('size.label'),
            'aria-valuetext': String(size),
            onChange: (event) => update({ size: Number(event.target.value) }),
          }),
          h('span', { className: 'lbd-field-value' }, String(size)),
        ),
        h('div', { className: 'lbd-pad-wrap' },
          h('span', { className: 'lbd-field-label' }, t('position.label')),
          h('div', {
            className: 'lbd-pad',
            ref: padRef,
            role: 'group',
            'aria-label': t('position.label'),
            title: t('position.title'),
            onPointerDown: onPadDown,
            onPointerMove: onPadMove,
            onPointerUp: onPadUp,
            onPointerCancel: onPadUp,
          },
            h('span', {
              className: 'lbd-pad-knob',
              style: { left: `${spot.px * 100}%`, top: `${spot.py * 100}%` },
              'aria-hidden': 'true',
            }),
          ),
        ),
      );
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          const zh = ctx.locale.register(NS, 'zh', ZH);
          const en = ctx.locale.register(NS, 'en', EN);
          return () => { zh(); en(); };
        }, 'liang-backdrop: locale');

        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'liang-backdrop',
          order: -100,
          label: () => ctx.locale.bind(NS)('dock.label'),
        }, Backdrop));

        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'liang-backdrop-control',
          order: 0,
          label: () => ctx.locale.bind(NS)('dock.label'),
        }, () => h(Control, { ctx })));
      },
    };
  },
});
