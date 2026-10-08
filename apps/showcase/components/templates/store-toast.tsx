'use client';

import CheckmarkCircle02Icon from '@hugeicons/core-free-icons/CheckmarkCircle02Icon';
import { HugeiconsIcon as Icon } from '@hugeicons/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Toast {
  id: number;
  title: string;
  detail?: string;
}

const LIFETIME = 3200;

/** One confirmation at a time: a new toast replaces the last, so they never pile up. */
export function useStoreToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const show = useCallback(
    (title: string, detail?: string) => setToast({ id: Date.now(), title, detail }),
    [],
  );
  const dismiss = useCallback(() => setToast(null), []);
  return { toast, show, dismiss };
}

export function StoreToast({ toast, onDismiss }: { toast: Toast | null; onDismiss: () => void }) {
  const reduced = useReducedMotion();
  const timer = useRef<number | undefined>(undefined);
  const start = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(onDismiss, LIFETIME);
  }, [onDismiss]);
  useEffect(() => {
    if (toast) start();
    return () => window.clearTimeout(timer.current);
  }, [toast, start]);

  // Enters and leaves through the same edge; leaving is quicker than arriving.
  return (
    <div className="store-toast-region" role="status" aria-live="polite">
      <AnimatePresence initial={false} mode="popLayout">
        {toast ? (
          <motion.div
            key={toast.id}
            className="store-toast"
            initial={
              reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97, filter: 'blur(4px)' }
            }
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={
              reduced
                ? { opacity: 0, transition: { duration: 0.12 } }
                : {
                    opacity: 0,
                    y: 12,
                    filter: 'blur(4px)',
                    transition: { duration: 0.16, ease: [0.23, 1, 0.32, 1] },
                  }
            }
            transition={{ type: 'spring', duration: 0.38, bounce: 0 }}
            onPointerEnter={() => window.clearTimeout(timer.current)}
            onPointerLeave={start}
          >
            <Icon icon={CheckmarkCircle02Icon} size={18} strokeWidth={1.8} aria-hidden="true" />
            <div>
              <strong>{toast.title}</strong>
              {toast.detail ? <span>{toast.detail}</span> : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
