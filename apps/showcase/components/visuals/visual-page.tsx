import { AsciiPlayground } from '@/components/ascii/ascii-stage';
import { RegistryFiles } from '@/components/ascii/registry-files';
import { InstallCommand } from '@/components/docs/install-command';
import { adjacentRoutes } from '@/components/shell/nav-model';
import { literal, typeOf } from '@/lib/ascii-scenes';
import { registryInstall } from '@/lib/registry';
import { visualPath, type VisualDoc } from '@/lib/visual-docs';

/**
 * One Visuals detail page: split studio workbench + editorial live code, install, usage and props.
 */
export function VisualPage({ doc }: { doc: VisualDoc }) {
  const install = registryInstall(doc.id);
  if (!install) throw new Error(`No registry item for the ${doc.id} page.`);
  const { prev, next } = adjacentRoutes('visuals', visualPath(doc));
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
      name: 'className',
      type: 'string',
      defaultValue: '—',
      description: 'Passed to the outer 3:2 container.',
    },
  ];
  return (
    <AsciiPlayground
      id={doc.id}
      from={install.importPath}
      line="visuals"
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
