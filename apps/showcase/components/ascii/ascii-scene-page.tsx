import { AsciiPlayground } from '@/components/ascii/ascii-stage';
import { RegistryFiles } from '@/components/ascii/registry-files';
import { InstallCommand } from '@/components/docs/install-command';
import { adjacentRoutes } from '@/components/shell/nav-model';
import { canvasControls, literal, typeOf, type AsciiSceneDoc } from '@/lib/ascii-scenes';
import { registryInstall } from '@/lib/registry';

/**
 * One ASCII detail page: split studio workbench + editorial code, install, usage and props.
 */
export function AsciiScenePage({ scene }: { scene: AsciiSceneDoc }) {
  const install = registryInstall(scene.id);
  if (!install) throw new Error(`No registry item for the ${scene.id} page.`);
  const { prev, next } = adjacentRoutes('ascii', `/ascii/${scene.id}`);
  const own = scene.props ?? [];
  const canvas = scene.kind !== 'dom';
  const props = [
    ...own.filter((prop) => prop.name !== 'label'),
    ...[...scene.controls, ...(canvas ? canvasControls : [])]
      .filter((control) => !scene.demoOnly?.includes(control.name))
      .map((control) => ({
        name: control.name,
        type: typeOf(control),
        defaultValue: literal(control.defaultValue),
        description: control.description,
      })),
    // A scene's canvas is a hidden background unless labelled; an entry can say otherwise.
    ...(own.filter((prop) => prop.name === 'label').length
      ? own.filter((prop) => prop.name === 'label')
      : canvas
        ? [
            {
              name: 'label',
              type: 'string',
              defaultValue: '—',
              description:
                'Describes the picture for screen readers. Without one it is a hidden background.',
            },
          ]
        : []),
  ];
  return (
    <AsciiPlayground
      id={scene.id}
      from={install.importPath}
      line="ascii"
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
      usageSlot={
        <p>
          {scene.usage ?? (
            <>
              The scene fills its parent, so give the parent a size. The canvas takes its type from
              CSS <code>font-family</code> and its ink from <code>color</code>. It pauses off screen
              and in hidden tabs, and shows one still frame when the reader prefers reduced motion.
            </>
          )}
        </p>
      }
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
