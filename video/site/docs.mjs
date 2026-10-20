// A tour of the docs site for X: the home page, the playground, the live catalog, a chart page and
// its variants, the Style panel restyling everything, then search into the new finance cards.
// Cut on a 120 BPM grid (500ms beats).

const click = (t) => [
  { t, down: true },
  { t: t + 90, down: false },
];
const typed = (t, text, gap = 70) => [...text].map((char, i) => ({ t: t + i * gap, type: char }));

const play = '.lilt-play';
const next = { el: '.lilt-card-carousel__arrow', nth: 1 };
const option = (text) => ({ el: '.lilt-play button', text });

export const film = {
  base: 'https://liltui.vercel.app',
  viewport: { width: 1440, height: 810 },
  start: '/',
  duration: 37000,

  captions: [
    { from: 700, to: 3600, html: 'The new <em>Lilt</em> docs' },
    { from: 5600, to: 9300, html: 'Every control is <em>one prop</em>' },
    { from: 10400, to: 13600, html: '55 chart families, <em>all live</em>' },
    { from: 15000, to: 20700, html: 'Each chart with its <em>variants</em>', top: true },
    { from: 21200, to: 25600, html: 'One Style panel <em>restyles</em> every chart' },
    { from: 28400, to: 32600, html: 'And new <em>finance</em> cards' },
  ],

  end: {
    from: 33500,
    name: 'Lilt <em>charts</em>',
    line: 'Chart cards for React that arrive finished.',
    install: 'npm install @lilt-ui/charts',
    url: 'liltui.vercel.app',
  },

  actions: [
    // Home: switch the install tab.
    ...click(2900),
    // Playground: bar styles, a palette, 3D.
    ...click(6300),
    ...click(7300),
    ...click(8300),
    ...click(9300),
    // Chart page.
    { t: 14000, goto: '/charts/area' },
    ...click(17000),
    ...click(17800),
    ...click(19000),
    ...click(19800),
    ...click(20400),
    // Style panel.
    ...click(21100),
    ...click(22200),
    ...click(23300),
    ...click(24400),
    { t: 25600, press: 'Escape' },
    // Search into finance.
    { t: 26300, press: 'Control+k' },
    ...typed(26800, 'watchlist'),
    { t: 27700, press: 'Enter' },
    ...click(30000),
    ...click(30800),
  ],

  scrolls: [
    { t: 5200, move: 1400, to: { el: play, offset: 110 } },
    { t: 11600, move: 1500, to: { el: '.lilt-catalog__cell', offset: 150 } },
  ],

  cursor: [
    { t: 0, at: { x: 1180, y: 760 } },
    { t: 2850, move: 1100, at: { el: '.lilt-landing__install button', text: 'pnpm' } },
    { t: 4600, move: 900, at: { x: 1000, y: 620 } },
    { t: 6250, move: 700, at: option('Solid') },
    { t: 7250, move: 500, at: option('Line') },
    { t: 8250, move: 600, at: { el: '.lilt-play__swatches button', nth: 1 } },
    { t: 9250, move: 600, at: option('3D') },
    { t: 11000, move: 1000, at: { x: 720, y: 520 } },
    { t: 13200, move: 900, at: { el: '.lilt-catalog__card', nth: 1, fx: 0.62, fy: 0.62 } },
    // Area page: sweep the plot, change period, flip through variants.
    { t: 14000, at: { x: 1300, y: 760 } },
    {
      t: 15200,
      move: 900,
      at: { el: '.lilt-docs-stage .lilt-card svg, .lilt-card svg', fx: 0.25, fy: 0.6 },
    },
    { t: 16300, move: 1000, at: { el: '.lilt-card svg', fx: 0.8, fy: 0.5 } },
    { t: 16950, move: 550, at: { el: '.lilt-range-select__trigger' } },
    { t: 17750, move: 450, at: { el: '[role="option"]', nth: 1 } },
    { t: 18950, move: 700, at: next },
    { t: 19750, move: 300, at: next },
    // Style panel.
    { t: 20400, move: 200, at: next },
    { t: 21050, move: 600, at: { el: '.lilt-style-trigger__open' } },
    { t: 22150, move: 700, at: { el: '.lilt-style-menu__palette', nth: 2 } },
    { t: 23250, move: 500, at: { el: '.lilt-style-menu__palette', nth: 4 } },
    { t: 24350, move: 600, at: { el: '.lilt-style-menu__seg button', text: '3D' } },
    { t: 26000, move: 900, at: { x: 760, y: 470 } },
    // Watchlist: change the period.
    { t: 29950, move: 900, at: { el: '.lilt-range-select__trigger' } },
    { t: 30750, move: 450, at: { el: '[role="option"]', text: '1M' } },
    { t: 32200, move: 900, at: { x: 1120, y: 700 } },
  ],

  camera: [
    { t: 0, to: { el: '.lilt-landing__hero', z: 1.45, fy: 0.42 } },
    { t: 3400, move: 2600, to: 'full' },
    { t: 6600, move: 1200, to: { el: play, pad: 30, max: 1.15 } },
    { t: 10200, move: 900, to: 'full' },
    { t: 14000, to: { el: '.lilt-card', z: 1.5, fy: 0.5, dy: -50 } },
    { t: 18600, move: 1000, to: { el: '.lilt-card-carousel', pad: 16, max: 1.35 } },
    { t: 21300, move: 900, to: 'full' },
    { t: 28000, to: { el: '.lilt-watchlist, .lilt-card', z: 1.5 } },
    { t: 33200, move: 900, to: { el: '.lilt-watchlist, .lilt-card', z: 1.2 } },
  ],
};
