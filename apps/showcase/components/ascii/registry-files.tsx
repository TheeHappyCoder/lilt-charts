import { GuideCode } from '@/components/docs/guide-code';
import type { RegistryInstall } from '@/lib/registry';

/**
 * Every file the CLI would write, for readers who copy by hand: the item's own files open, then
 * the shared pieces folded under their item's name. Paths are where each file goes, so the
 * relative imports between them keep working.
 */
export function RegistryFiles({ files }: { files: RegistryInstall['files'] }) {
  const own = files.filter((file) => !file.shared);
  const shared = files.filter((file) => file.shared);
  return (
    <div className="lilt-registry-files">
      {own.map((file) => (
        <details key={file.target} className="lilt-registry-files__file">
          <summary>
            <code>{file.target}</code>
          </summary>
          <GuideCode code={file.source} title={file.target.split('/').pop()} />
        </details>
      ))}
      {shared.map((file) => (
        <details key={file.target} className="lilt-registry-files__file" data-shared="">
          <summary>
            <code>{file.target}</code>
            <span>{file.shared}</span>
          </summary>
          <GuideCode code={file.source} title={file.target.split('/').pop()} />
        </details>
      ))}
    </div>
  );
}
