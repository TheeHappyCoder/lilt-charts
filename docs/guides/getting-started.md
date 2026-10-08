# Getting started

Lilt is a private React/TypeScript chart package. Build a local package tarball, then install it in your app.

```powershell
pnpm install
pnpm --filter @lilt-ui/charts build
New-Item -ItemType Directory .local-pack -Force
pnpm --dir packages/charts pack --pack-destination ../../.local-pack
```

Install `@lilt-ui/charts` in a React 19 app with your package manager, for example `npm install @lilt-ui/charts`. Import `@lilt-ui/charts/styles.css` once. Visit the [chart browser](/charts), choose a chart, and copy the complete client component from its Code tab. The copied source includes fixture data, descriptors, formatters, and public imports. Next.js App Router consumers place that component behind a `'use client'` directive. Lilt inherits the host font.

Use the integrated Data and Setup tabs to inspect the same example. See [public contracts](/docs/api-contract.md) and [styling](/docs/styling.md).
