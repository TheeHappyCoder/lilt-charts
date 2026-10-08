# Lilt Charts films

Short launch films rendered from the real components. Nothing is mocked: loading skeletons,
hover pills, period switches, variants and entrances are the package's own.

| Film    | What it shows                                                                  |
| ------- | ------------------------------------------------------------------------------ |
| `depth` | 3D charts: loading, hover, period switch, the `depth` prop, a wall of families |
| `looks` | One card through every look prop, then each family through its variants        |
| `cool`  | The Cool charts: a drone pass over the skyline, then a tour of all thirteen    |
| `cool2` | Cool charts part 2: an orbit by the `yaw` prop, then the other ten             |

## How it works

- `src/films/<name>.tsx` is one film: a stage of real cards plus its script (camera shots,
  cursor path, cues, captions). Register it in `src/films/index.ts`.
- `src/kit/` is shared: the virtual-time `runtime` (cues, cursor), `camera` (frame a card, a
  point, or hop `between` two), `tilt`, `kick` (beat push), `captions`, `prop-ticker` (the prop
  that just changed, as code), `code-chip`, `end-card`, `cursor`, and `stage` (frame size).
- `render.mjs` opens the built page in headless Chromium with a virtual clock. Each frame it
  advances time by exactly one frame, moves the real mouse to the film's cursor, steps every CSS
  and WAAPI animation by the same amount, and screenshots. Frames are a pure function of time.
- Pages render against `.lilt/dist`, a snapshot of `packages/charts/dist`, so work elsewhere in
  the repo can't change a render halfway through. Refresh it after rebuilding the package:
  `pnpm snapshot`. This also links the package dependencies on Windows, macOS, and Linux.

## Commands

First install the root workspace and build the library with
`pnpm --filter @lilt-ui/charts build`. Then run from `video/`, which has its own pnpm workspace:

```bash
pnpm install --frozen-lockfile
pnpm exec playwright-core install chromium
pnpm snapshot
pnpm build
node render.mjs --film=looks --scale=2 --sub=6
```

- `--film` picks the film; output goes to `out/<film>.mp4` (1080 wide, 60fps, H.264).
- `--height=900` (with the default `--width=720`) renders a 4:5 cut; films frame by fractions
  of the stage, so any aspect works. `--size` sets the output width.
- `--stills=1200,6300` renders only those moments (ms) to `frames/still-*.png`; `sheet.py`
  tiles them into a contact sheet.
- `--from` / `--until` (ms) render a section. `--sub` blends subframes per frame for motion
  blur (6 for finals). `--scale` is the device pixel ratio of the 720px stage.
- `node check-pops.mjs out/looks.mp4` flags single-frame pops.
- Live preview: `node ../node_modules/vite/bin/vite.js`, then open `/?film=looks&play`.
- To use an existing compatible Chromium installation, set `CHROMIUM_EXECUTABLE_PATH` to
  its executable instead of running the browser installation command.

## Open-source announcement image

`src/stills/open-source.tsx` composes the Lilt wordmark and the real Skyline card into a
static announcement. It uses the existing renderer and produces only a PNG:

```bash
pnpm build
node render.mjs --film=open-source --width=1200 --height=675 --scale=2 --stills=0 --until=0 --frames=out/open-source
```

The 2400 × 1350 image is written to `out/open-source/still-0.png`.

Run the setup above before building a still on a new machine.

Films are cut on a 120 BPM grid (500ms beats), so a track starting on a downbeat lines up.
