import { resolve } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';
import { documentedCharts } from '../llms';
import { cardComponents, cardModule } from './examples';

it('documents every public card prop, with only supported literal choices', () => {
  // Override during a release audit to check the actual npm tarball, not a workspace alias.
  const dist = resolve(process.env.LILT_AUDIT_PACKAGE_DIR ?? 'packages/charts', 'dist');
  const paths = ['index.d.ts', 'finance/index.d.ts'].map((file) => resolve(dist, file));
  const program = ts.createProgram(paths, {
    strict: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  });
  const checker = program.getTypeChecker();
  const failures: string[] = [];
  for (const { doc } of documentedCharts()) {
    for (const form of [doc, ...(doc.forms ?? [])]) {
      const component = cardComponents[form.kind];
      const file = program.getSourceFile(
        paths[cardModule(form.kind).endsWith('/finance') ? 1 : 0],
      )!;
      const symbol = checker
        .getExportsOfModule(checker.getSymbolAtLocation(file)!)
        .find((entry) => entry.name === component);
      expect(symbol, component).toBeDefined();
      const signature = checker.getTypeOfSymbolAtLocation(symbol!, file).getCallSignatures()[0];
      const props = checker
        .getTypeOfSymbolAtLocation(signature.parameters[0], file)
        .getProperties();
      expect(form.props.map((row) => row.name).sort(), component).toEqual(
        props.map((prop) => prop.name).sort(),
      );
      for (const row of form.props) {
        // Prose types such as "key of Row" are intentional. Literal-only unions must be exact.
        if (!/^(?:'[^']+'|boolean)(?:\s*\|\s*(?:'[^']+'|boolean))*$/.test(row.type)) continue;
        const prop = props.find((entry) => entry.name === row.name)!;
        const type = checker.getTypeOfSymbolAtLocation(prop, file);
        const members = type.isUnion() ? type.types : [type];
        const actual = members
          .filter((member): member is ts.StringLiteralType => member.isStringLiteral())
          .map((member) => member.value)
          .sort();
        const printed = [...row.type.matchAll(/'([^']+)'/g)].map((match) => match[1]).sort();
        if (JSON.stringify(actual) !== JSON.stringify(printed))
          failures.push(
            `${component}.${row.name}: documented ${printed.join(', ')}; exported ${actual.join(', ')}`,
          );
      }
    }
  }
  expect(failures).toEqual([]);
}, 60_000);
