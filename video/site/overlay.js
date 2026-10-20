// Injected into every page of a site film (site.mjs): the animation stepper, the visible cursor,
// and the captions and end card, which sit in the camera's frame so a push-in never crops them.
(() => {
  const owned = new WeakMap();
  window.__stepAnimations = (dt) => {
    for (const animation of document.getAnimations()) {
      if (animation.playState === 'finished' || animation.playState === 'idle') continue;
      // Scroll-driven animations follow the scroll position, not time.
      if (animation.timeline && !(animation.timeline instanceof DocumentTimeline)) continue;
      let mine = owned.get(animation);
      if (mine === undefined) mine = 0;
      else if (animation.playState === 'paused' && animation.currentTime !== mine)
        mine = Number(animation.currentTime) || 0;
      else mine += dt * (animation.playbackRate || 1);
      const timing = animation.effect?.getComputedTiming?.();
      const end = timing ? Number(timing.endTime) : Infinity;
      if (Number.isFinite(end) && mine >= end && (animation.playbackRate || 1) > 0) {
        owned.delete(animation);
        animation.finish();
        continue;
      }
      animation.pause();
      animation.currentTime = mine;
      owned.set(animation, mine);
    }
  };
  window.__settle = () =>
    new Promise((resolve) => {
      const channel = new MessageChannel();
      let turns = 0;
      channel.port1.onmessage = () => (++turns < 3 ? channel.port2.postMessage(0) : resolve());
      channel.port2.postMessage(0);
    });

  const css = `
  #film-root, #film-root * { box-sizing: border-box; }
  #film-cursor { position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none;
    margin: -2px 0 0 -3px; transform-origin: 3px 2px; filter: drop-shadow(0 2px 3px rgb(0 0 0 / .45)); }
  #film-frame { position: fixed; left: 0; top: 0; z-index: 2147483646; pointer-events: none;
    transform-origin: 0 0; overflow: hidden; font-family: var(--font-geist), system-ui, sans-serif; color: #f4f4f6; }
  .film-scrim { position: absolute; left: 0; right: 0; bottom: 0; height: 300px; opacity: 0;
    background: linear-gradient(to top, rgb(9 9 11 / .92), rgb(9 9 11 / .7) 45%, transparent); }
  .film-captions { position: absolute; left: 0; right: 0; bottom: 70px; display: grid; justify-items: center; }
  .film-captions--top { bottom: auto; top: 56px; }
  .film-scrim--top { top: 0; bottom: auto; background: linear-gradient(to bottom, rgb(9 9 11 / .92), rgb(9 9 11 / .7) 45%, transparent); }
  .film-mask { grid-area: 1 / 1; overflow: hidden; padding: 6px 10px 12px; }
  .film-line { display: block; visibility: hidden; font-size: 46px; font-weight: 700; letter-spacing: -0.04em;
    line-height: 1.1; text-align: center; text-shadow: 0 2px 28px rgb(0 0 0 / .6); }
  .film-line em { font-family: var(--font-serif), Georgia, serif; font-weight: 400; font-style: italic;
    letter-spacing: -0.01em; padding-right: .06em;
    background: linear-gradient(100deg, #9b82ff 10%, #f06aae 90%); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .film-end { position: absolute; inset: 0; display: grid; place-items: center; }
  .film-end__veil { position: absolute; inset: 0; visibility: hidden;
    background: radial-gradient(60% 55% at 50% 50%, rgb(9 9 11 / .9), rgb(9 9 11 / .7)); }
  .film-end__stack { position: relative; display: grid; justify-items: center; text-align: center; }
  .film-end__stack > * { visibility: hidden; }
  .film-end__mark { margin-bottom: 26px; color: #f4f4f6; }
  .film-end__name { font-size: 92px; font-weight: 700; letter-spacing: -0.05em; line-height: 1; }
  .film-end__name em { font-family: var(--font-serif), Georgia, serif; font-weight: 400; font-style: italic; letter-spacing: -0.01em;
    padding-right: .08em; background: linear-gradient(100deg, #9b82ff 10%, #f06aae 90%); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .film-end__line { margin-top: 20px; font-size: 26px; font-weight: 500; letter-spacing: -0.015em; color: #a8a8b3; }
  .film-end__install { margin-top: 40px; padding: 14px 24px; border-radius: 999px; background: rgb(255 255 255 / .06);
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / .1); font-family: var(--font-geist-mono), ui-monospace, monospace; font-size: 21px; color: #e6e6ea; }
  .film-end__install b { color: #9b82ff; font-weight: 400; }
  .film-end__url { margin-top: 18px; font-size: 19px; font-weight: 600; color: #7d7d87; }
  `;

  let built = null;
  function build() {
    if (built && built.root.isConnected) return built;
    const root = document.createElement('div');
    root.id = 'film-root';
    root.innerHTML = `<style>${css}</style>
      <div id="film-frame"><div class="film-scrim"></div><div class="film-scrim film-scrim--top"></div><div class="film-captions"></div><div class="film-captions film-captions--top"></div>
        <div class="film-end"><div class="film-end__veil"></div><div class="film-end__stack"></div></div></div>
      <div id="film-cursor"><svg width="26" height="30" viewBox="0 0 26 30"><path d="M3 2.2 L3 23.4 Q3 25 4.3 24 L9.2 19.6 L12.9 27.6 Q13.5 28.8 14.7 28.3 L17.3 27.1 Q18.4 26.5 17.9 25.4 L14.3 17.6 L21.2 17.3 Q22.8 17.2 21.6 16 L4.6 1.3 Q3 0.1 3 2.2 Z" fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg></div>`;
    document.documentElement.appendChild(root);
    built = {
      root,
      frame: root.querySelector('#film-frame'),
      scrim: root.querySelector('.film-scrim'),
      scrimTop: root.querySelector('.film-scrim--top'),
      captions: root.querySelector('.film-captions'),
      captionsTop: root.querySelector('.film-captions--top'),
      veil: root.querySelector('.film-end__veil'),
      stack: root.querySelector('.film-end__stack'),
      cursor: root.querySelector('#film-cursor'),
      lines: null,
      pieces: null,
      press: 0,
    };
    return built;
  }

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const progress = (t, a, b) => clamp01((t - a) / (b - a));
  const easeOut = (x) => 1 - Math.pow(1 - x, 3.2);
  function rise(t, from, to, enter = 520, exit = 280) {
    const inK = easeOut(progress(t, from, from + enter));
    const outK = Number.isFinite(to) ? easeOut(progress(t, to - exit, to)) : 0;
    const blur = (1 - inK) * 7 + outK * 7;
    return {
      visible: t >= from && t < to,
      y: (1 - inK) * 100 - outK * 60,
      blur: blur < 0.05 ? 0 : blur,
      opacity: clamp01(inK * 1.4) * (1 - outK),
    };
  }
  function place(element, phase, unit = '%', amount = 1) {
    element.style.visibility = phase.visible ? 'visible' : 'hidden';
    element.style.transform = `translate3d(0, ${phase.y * amount}${unit}, 0)`;
    element.style.filter = phase.blur ? `blur(${phase.blur}px)` : '';
    element.style.opacity = String(phase.opacity);
  }

  function find(aim) {
    let list = [...document.querySelectorAll(aim.el)];
    if (aim.text !== undefined)
      list = list.filter(
        (e) => e.textContent.trim() === aim.text || e.getAttribute('aria-label') === aim.text,
      );
    if (aim.visible !== false)
      list = list.filter((e) => {
        const box = e.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      });
    return list[aim.nth ?? 0] ?? null;
  }

  window.__overlay = {
    aim(aim) {
      const element = find(aim);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return {
        x: box.left + box.width * (aim.fx ?? 0.5) + (aim.dx ?? 0),
        y: box.top + box.height * (aim.fy ?? 0.5) + (aim.dy ?? 0),
      };
    },
    scrollFor(aim) {
      const element = find(aim);
      if (!element) return window.scrollY;
      return Math.max(0, element.getBoundingClientRect().top + window.scrollY - (aim.offset ?? 90));
    },
    frameFor(to) {
      const W = innerWidth;
      const H = innerHeight;
      if (to === 'full') return { x: 0, y: 0, z: 1 };
      let box;
      if (to.box) box = to.box;
      else {
        const element = find(to);
        if (!element) return { x: 0, y: 0, z: 1 };
        const r = element.getBoundingClientRect();
        box = { x: r.left, y: r.top, w: r.width, h: r.height };
      }
      const pad = to.pad ?? 40;
      let z = to.z ?? Math.min(W / (box.w + pad * 2), H / (box.h + pad * 2));
      z = Math.max(1, Math.min(to.max ?? 2.4, z));
      const w = W / z;
      const h = H / z;
      const cx = box.x + box.w * (to.fx ?? 0.5) + (to.dx ?? 0);
      const cy = box.y + box.h * (to.fy ?? 0.5) + (to.dy ?? 0);
      return { x: cx - w / 2, y: cy - h / 2, z };
    },
    paint({ t, cam, cursor, down, captions, end }) {
      const ui = build();
      const W = innerWidth;
      const H = innerHeight;
      ui.frame.style.width = `${W}px`;
      ui.frame.style.height = `${H}px`;
      ui.frame.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${1 / cam.z})`;

      ui.press += ((down ? 1 : 0) - ui.press) * 0.45;
      ui.cursor.style.transform = `translate3d(${cursor.x}px, ${cursor.y}px, 0) scale(${1 - ui.press * 0.14})`;
      const hideCursor = end && t >= end.from + 200;
      ui.cursor.style.opacity = hideCursor ? '0' : '1';

      if (!ui.lines) {
        ui.lines = captions.map((line) => {
          const mask = document.createElement('span');
          mask.className = 'film-mask';
          const span = document.createElement('span');
          span.className = 'film-line';
          span.innerHTML = line.html;
          mask.appendChild(span);
          (line.top ? ui.captionsTop : ui.captions).appendChild(mask);
          return span;
        });
      }
      const shade = [0, 0];
      captions.forEach((line, i) => {
        place(ui.lines[i], rise(t, line.from, line.to));
        const k = line.top ? 1 : 0;
        shade[k] = Math.max(shade[k], rise(t, line.from - 140, line.to + 140, 560, 380).opacity);
      });
      ui.scrim.style.opacity = String(shade[0]);
      ui.scrimTop.style.opacity = String(shade[1]);

      if (end) {
        if (!ui.pieces) {
          ui.stack.innerHTML = `
            <div class="film-end__mark"><svg viewBox="31 26 254 345" width="62" height="84"><path fill="currentColor" d="M31 65.5A39.5 39.5 0 0 1 110 65.5L110 255C110 278 130 294 148 294C172 294 214 262 214 222L214 184A35.5 35.5 0 0 1 285 184L285 292Q285 302 277 303L268 305C260 306.5 255 309 250 314L236 331C210 358 180 370.5 143 370.5A112 112 0 0 1 31 258.5Z"/><path fill="#7c5cff" d="M285.3 94A35.3 35.3 0 1 1 214.7 94A35.3 35.3 0 1 1 285.3 94Z"/></svg></div>
            <div class="film-end__name">${end.name}</div>
            <div class="film-end__line">${end.line}</div>
            <div class="film-end__install"><b>$</b> ${end.install}</div>
            <div class="film-end__url">${end.url}</div>`;
          ui.pieces = [...ui.stack.children];
        }
        const k = easeOut(progress(t, end.from, end.from + 1000));
        ui.veil.style.visibility = t >= end.from ? 'visible' : 'hidden';
        ui.veil.style.opacity = String(k);
        ui.veil.style.backdropFilter = `blur(${k * 12}px)`;
        const delays = [300, 420, 560, 760, 880];
        ui.pieces.forEach((piece, i) =>
          place(piece, rise(t, end.from + delays[i], Infinity, 640), 'px', 0.3),
        );
      }
    },
  };
})();
