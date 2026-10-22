import { AsciiPlayground } from '@/components/ascii/ascii-stage';
import { RegistryFiles } from '@/components/ascii/registry-files';
import { InstallCommand } from '@/components/docs/install-command';
import { PageHeader } from '@/components/docs/page-header';
import { GuideSection } from '@/components/guide-page';
import { literal, typeOf } from '@/lib/ascii-scenes';
import type { ComponentDoc } from '@/lib/component-docs';
import { registryInstall } from '@/lib/registry';

/**
 * One Components page: the playground, how to add its source, how to use it, then its props.
 */
export function ComponentPage({ doc }: { doc: ComponentDoc }) {
  const install = registryInstall(doc.id);
  if (!install) throw new Error(`No registry item for the ${doc.id} page.`);
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
    <article className="lilt-main lilt-docs lilt-ascii-page">
      <PageHeader title={doc.title} lede={doc.lede} badge="New" />
      <AsciiPlayground id={doc.id} from={install.importPath} line="components" />
      <GuideSection title="Installation">
        <p>
          This is source, not a package: the shadcn CLI copies it into your project and it is yours
          to change. Take it whole, or lift the one detail you like. Or copy the files below
          yourself.
        </p>
        <InstallCommand item={install.url} />
        <RegistryFiles files={install.files} />
      </GuideSection>
      <GuideSection title="Usage">
        <p>{doc.usage}</p>
      </GuideSection>
      <GuideSection title="Props">
        <table className="lilt-ascii-options">
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
      </GuideSection>
    </article>
  );
}
