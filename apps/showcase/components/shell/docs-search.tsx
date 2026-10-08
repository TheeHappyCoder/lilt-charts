'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import Search01Icon from '@hugeicons/core-free-icons/Search01Icon';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { DocsCommand } from '@/components/docs/docs-command';
import { TooltipHint } from '@/components/ui/tooltip';
import {
  CommandDialog,
  CommandDialogClose,
  CommandDialogPopup,
  CommandDialogTrigger,
} from '@/components/ui/command';

interface DocsSearchScope {
  handle: ReturnType<typeof DialogPrimitive.createHandle>;
  shortcut: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
}

const DocsSearchContext = createContext<DocsSearchScope | null>(null);

/** The header and keyboard shortcut share one palette, independently of the mobile drawer. */
export function DocsSearchProvider({
  children,
  onOpen,
}: {
  children: ReactNode;
  onOpen: () => void;
}) {
  const router = useRouter();
  const [handle] = useState(() => DialogPrimitive.createHandle());
  const [shortcut, setShortcut] = useState('Ctrl K');
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const scope = useMemo(() => ({ handle, shortcut, triggerRef }), [handle, shortcut]);

  useEffect(() => {
    setShortcut(/Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘K' : 'Ctrl K');
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (!event.repeat) handle.open(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handle]);

  return (
    <DocsSearchContext.Provider value={scope}>
      {children}
      <CommandDialog
        handle={handle}
        onOpenChange={(open) => {
          if (open) onOpen();
        }}
      >
        <CommandDialogPopup initialFocus={inputRef} finalFocus={triggerRef}>
          <DocsCommand
            inputRef={inputRef}
            closeAction={
              <CommandDialogClose className="lilt-ui-command-close">
                Esc to close
              </CommandDialogClose>
            }
            onSelect={(route) => {
              handle.close();
              router.push(route.href);
            }}
          />
        </CommandDialogPopup>
      </CommandDialog>
    </DocsSearchContext.Provider>
  );
}

export function HeaderSearch({
  className = 'lilt-shell__search',
  side = 'bottom',
}: {
  className?: string;
  side?: 'bottom' | 'right';
} = {}) {
  const scope = useContext(DocsSearchContext);
  if (!scope) throw new Error('HeaderSearch requires DocsSearchProvider.');

  return (
    <TooltipHint content={`Search (${scope.shortcut})`} side={side}>
      <CommandDialogTrigger
        ref={scope.triggerRef}
        handle={scope.handle}
        className={className}
        aria-label="Search documentation"
        aria-keyshortcuts="Control+K Meta+K"
      >
        <Icon icon={Search01Icon} aria-hidden="true" size={17} strokeWidth={1.7} />
      </CommandDialogTrigger>
    </TooltipHint>
  );
}
