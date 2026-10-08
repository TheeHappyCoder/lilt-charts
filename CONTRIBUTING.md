# Contributing to Lilt Charts

Bug fixes, clear reproductions, documentation improvements, and chart ideas are welcome.
For a new chart family or a change to the public API, open an issue describing the use case
before investing in a large implementation.

## Run locally

Use Node.js 24 (see `.node-version`) and pnpm 11.9.0 (pinned in `package.json`). If pnpm is
not installed, run `npm install --global pnpm@11.9.0`.

```bash
git clone https://github.com/TheeHappyCoder/lilt-charts.git
cd lilt-charts
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:5173](http://localhost:5173). No account, API key, or environment file is
needed. npm downloads and GitHub stars are fetched from public APIs; the page still works
when either service is unavailable. The documentation build downloads its Google fonts, so
the first build needs network access.

`pnpm dev` builds the chart package before starting Next.js. While editing the library, run
`pnpm --filter @lilt-ui/charts build --watch` in a second terminal to keep its output current.

## Find your way around

| Path                          | Purpose                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| `packages/charts/src`         | Published React library, styles, geometry, interactions, and tests |
| `packages/charts/src/finance` | The separate `@lilt-ui/charts/finance` entry point                 |
| `apps/showcase`               | Documentation, examples, and generated copyable source             |
| `examples/consumers/react`    | A plain React app that installs the actual package tarball         |
| `docs/product.md`             | Product direction and chart contracts                              |
| `video`                       | Optional still and film renderer; see its own README               |

The package must remain independent of Next.js, app icons, fonts, and app styling tools.
Use functional React, strict TypeScript, named exports, kebab-case filenames, and scoped
`--lilt-*` CSS variables. Keep examples and generated source aligned with public props.
Preserve keyboard interaction, visible hover marks, loading/data truth, and reduced motion.

## Check your change

```bash
pnpm lint
pnpm audit --prod
pnpm typecheck
pnpm test
pnpm build
pnpm test:package
```

CI runs these checks on pull requests. `test:package` packs the library into
`.local-pack/lilt-ui-charts.tgz`, installs it into the standalone consumer, checks the public
entry points and included files, then type-checks and builds the consumer. It does not
publish anything. Its install uses `--force` to refresh a tarball with an unchanged version.

Add tests that demonstrate the bug or exercise meaningful geometry, interaction, or type
contracts. For visual changes, include screenshots at relevant viewport sizes and check
keyboard and reduced-motion behavior. Format changed files with
`pnpm exec prettier --write <paths>`.

## Send a pull request

Explain the problem, the resulting behavior, and how you checked it. Keep unrelated edits
separate. Use small, fictional datasets in reproductions and remove credentials or private
customer information. Contributions are made under the repository's existing MIT license;
retain third-party license notices where required.

For security reports, follow [SECURITY.md](SECURITY.md).
