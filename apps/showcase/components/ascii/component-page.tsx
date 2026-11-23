import { AsciiPlayground } from '@/components/ascii/ascii-stage';
import { RegistryFiles } from '@/components/ascii/registry-files';
import { InstallCommand } from '@/components/docs/install-command';
import { adjacentRoutes } from '@/components/shell/nav-model';
import { literal, typeOf } from '@/lib/ascii-scenes';
import { componentPath, type ComponentDoc } from '@/lib/component-docs';
import { registryInstall } from '@/lib/registry';

/**
 * One Components detail page: split studio workbench + editorial code, install, usage and props.
 */
export function ComponentPage({ doc }: { doc: ComponentDoc }) {
  const install = registryInstall(doc.id);
  if (!install) throw new Error(`No registry item for the ${doc.id} page.`);
  const { prev, next } = adjacentRoutes('components', componentPath(doc));
  const props = [
    ...doc.controls
      .filter((control) => !doc.demoOnly?.includes(control.name))
      .map((control) => ({
        name: control.name,
        type: typeOf(control),
        defaultValue: literal(control.defaultValue),
        description: control.description,
      })),
    ...(doc.props ?? []),
    {
      name: 'className, style',
      type: 'string, CSSProperties',
      defaultValue: '—',
      description: 'Passed to the outer element.',
    },
  ];
  return (
    <AsciiPlayground
      id={doc.id}
      from={install.importPath}
      line="components"
      prev={prev ? { href: prev.href, label: prev.label } : null}
      next={next ? { href: next.href, label: next.label } : null}
      filesCount={install.files.length}
      propsCount={props.length}
      installSlot={
        <>
          <InstallCommand item={install.url} />
          <RegistryFiles files={install.files} />
        </>
      }
      usageSlot={<p>{doc.usage}</p>}
      propsSlot={
        <div className="lilt-docs__table">
          <table>
            <thead>
              <tr>
                <th scope="col">Prop</th>
                <th scope="col">Type</th>
                <th scope="col">Default</th>
                <th scope="col">What it does</th>
              </tr>
            </thead>
            <tbody>
              {props.map((prop) => (
                <tr key={prop.name}>
                  <th scope="row">
                    <code>{prop.name}</code>
                  </th>
                  <td>
                    <code>{prop.type}</code>
                  </td>
                  <td>
                    <code>{prop.defaultValue}</code>
                  </td>
                  <td>{prop.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    />
  );
}
