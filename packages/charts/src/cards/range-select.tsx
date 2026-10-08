import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { MotionScope } from '../motion/motion-scope';

/** What a card hands its period select: the periods, the chosen one, and how to change it. */
export interface ChartRangeSelectProps {
  value: string;
  options: readonly { id: string; label: string }[];
  onValueChange: (id: string) => void;
  /** Accessible name for the control, e.g. "Period". */
  'aria-label': string;
}

const RangeSelectContext = createContext<ComponentType<ChartRangeSelectProps> | null>(null);

/**
 * Swap in your own components for the controls cards draw. `rangeSelect` replaces every card's
 * period select below it, so an app can use its design system's select (shadcn, Base UI, …).
 * Without it, cards use Lilt's own.
 */
export function ChartComponentsProvider({
  rangeSelect,
  children,
}: {
  rangeSelect?: ComponentType<ChartRangeSelectProps>;
  children: ReactNode;
}) {
  return (
    <RangeSelectContext.Provider value={rangeSelect ?? null}>
      {children}
    </RangeSelectContext.Provider>
  );
}

export function useCustomRangeSelect() {
  return useContext(RangeSelectContext);
}

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
/** Each option's height in the list, matching `.lilt-range-select__option`. */
const OPTION_HEIGHT = 30;

/**
 * Lilt's period select: a pill that opens a frosted list of periods. It follows the listbox
 * pattern, so arrows, Home, End, Enter, Escape and typing a period's first letter all work,
 * and focus returns to the pill when the list closes.
 */
function RangeSelectContent({
  value,
  options,
  onValueChange,
  'aria-label': ariaLabel,
}: ChartRangeSelectProps) {
  const id = useId();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.id === value),
  );
  const [active, setActive] = useState(selectedIndex);
  const root = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const selected = options[selectedIndex];

  const show = (index = selectedIndex) => {
    setActive(index);
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  };
  const choose = (index: number) => {
    const option = options[index];
    if (option && option.id !== value) onValueChange(option.id);
    close();
  };

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  const onTriggerKey = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      show(
        event.key === 'ArrowDown'
          ? Math.min(options.length - 1, selectedIndex + 1)
          : Math.max(0, selectedIndex - 1),
      );
    }
  };
  const onListKey = (event: KeyboardEvent) => {
    const move = (index: number) => {
      event.preventDefault();
      setActive(Math.max(0, Math.min(options.length - 1, index)));
    };
    if (event.key === 'ArrowDown') move(active + 1);
    else if (event.key === 'ArrowUp') move(active - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(options.length - 1);
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(active);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') close(false);
    else if (event.key.length === 1) {
      const letter = event.key.toLowerCase();
      const after = options.findIndex(
        (option, index) => index > active && option.label.toLowerCase().startsWith(letter),
      );
      const match =
        after >= 0
          ? after
          : options.findIndex((option) => option.label.toLowerCase().startsWith(letter));
      if (match >= 0) move(match);
    }
  };

  return (
    <span
      ref={root}
      className="lilt-card__range lilt-card__range--select"
      data-value={selected?.id}
      data-open={open || undefined}
    >
      <button
        ref={trigger}
        type="button"
        className="lilt-range-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-label={`${ariaLabel}: ${selected?.label ?? ''}`}
        onClick={() => (open ? close() : show())}
        onKeyDown={onTriggerKey}
      >
        <span className="lilt-range-select__value">
          <AnimatePresence mode="popLayout" initial={false}>
            <m.span
              key={selected?.id}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4, filter: 'blur(3px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4, filter: 'blur(3px)' }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
            >
              {selected?.label}
            </m.span>
          </AnimatePresence>
        </span>
        <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12">
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      <AnimatePresence>
        {open ? (
          <m.ul
            ref={list}
            id={`${id}-list`}
            role="listbox"
            tabIndex={-1}
            aria-label={ariaLabel}
            aria-activedescendant={`${id}-option-${active}`}
            className="lilt-range-select__list"
            onKeyDown={onListKey}
            initial={
              reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4, filter: 'blur(4px)' }
            }
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={
              reduced
                ? { opacity: 0, transition: { duration: 0.1 } }
                : { opacity: 0, scale: 0.97, filter: 'blur(3px)', transition: { duration: 0.12 } }
            }
            transition={{ duration: 0.18, ease: EASE_OUT }}
          >
            {/* One highlight glides between rows by its own offset, so it stays true inside a
                scaled or moving card, and needs no layout animation. */}
            <m.li
              role="presentation"
              aria-hidden="true"
              className="lilt-range-select__highlight"
              initial={false}
              animate={{ y: active * OPTION_HEIGHT }}
              transition={reduced ? { duration: 0 } : { type: 'spring', duration: 0.28, bounce: 0 }}
            />
            {options.map((option, index) => (
              <li
                key={option.id}
                id={`${id}-option-${index}`}
                role="option"
                data-value={option.id}
                aria-selected={index === selectedIndex}
                className="lilt-range-select__option"
                data-active={index === active || undefined}
                onPointerMove={() => setActive(index)}
                onClick={() => choose(index)}
              >
                <span className="lilt-range-select__label">{option.label}</span>
                {index === selectedIndex ? (
                  <svg
                    aria-hidden="true"
                    className="lilt-range-select__check"
                    viewBox="0 0 12 12"
                    width="12"
                    height="12"
                  >
                    <path
                      d="M2.5 6.5 5 9l4.5-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                  </svg>
                ) : null}
              </li>
            ))}
          </m.ul>
        ) : null}
      </AnimatePresence>
    </span>
  );
}

/** RangeSelect with its own MotionScope, so it animates wherever it is rendered. */
export function RangeSelect(props: ChartRangeSelectProps) {
  return (
    <MotionScope>
      <RangeSelectContent {...props} />
    </MotionScope>
  );
}
