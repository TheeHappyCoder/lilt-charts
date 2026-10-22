'use client';

import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
  type PanInfo,
} from 'motion/react';
import { useRef, useState, type CSSProperties, type ReactNode } from 'react';

export interface SwipeAction {
  /** What it does, such as 'Archive'. Shown beside the icon and read to screen readers. */
  label: string;
  icon?: ReactNode;
  /** The action's colour. */
  tone: string;
  onAction?: () => void;
  /** Slide the row away and fold it shut (true, the default), or spring back after. */
  dismiss?: boolean;
}

export interface SwipeRowProps {
  children: ReactNode;
  /** Revealed by dragging right. */
  start?: SwipeAction;
  /** Revealed by dragging left. */
  end?: SwipeAction;
  /** How far to drag, in pixels, before letting go commits. Default 104. */
  threshold?: number;
  /** The row's background, which covers the actions until you drag. Default 'Canvas'. */
  surface?: string;
  className?: string;
  style?: CSSProperties;
}

type Side = 'start' | 'end';

const SNAP = { type: 'spring', stiffness: 520, damping: 40 } as const;
const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * A list row you can swipe, like a mail inbox. Drag it and the action shows underneath, faint;
 * cross the line and the colour floods in, the icon jumps and starts riding the edge with your
 * finger, and phones that can give a small tap of haptics. Let go past the line and the row slides
 * away and folds shut; short of it, it springs home. With a mouse or keyboard the same actions sit
 * at the row's end on hover and focus, and do exactly what the swipe does.
 */
export function SwipeRow({
  children,
  start,
  end,
  threshold = 104,
  surface = 'Canvas',
  className,
  style,
}: SwipeRowProps) {
  const reduced = Boolean(useReducedMotion());
  const x = useMotionValue(0);
  const row = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState<Side | null>(null);
  const [near, setNear] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [gone, setGone] = useState(false);
  const fired = useRef<SwipeAction | null>(null);

  const actionOf = (side: Side) => (side === 'start' ? start : end);

  const commit = (side: Side, velocity = 0) => {
    const action = actionOf(side);
    if (!action) return;
    const width = row.current?.offsetWidth ?? 400;
    const sign = side === 'start' ? 1 : -1;
    setArmed(side);
    if (action.dismiss === false) {
      action.onAction?.();
      void animate(x, sign * threshold * 1.15, { duration: reduced ? 0 : 0.16, ease: EASE }).then(
        () => {
          setArmed(null);
          return animate(x, 0, reduced ? { duration: 0 } : SNAP);
        },
      );
      return;
    }
    void animate(
      x,
      sign * (width + 24),
      reduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 38, velocity },
    ).then(() => {
      fired.current = action;
      setGone(true);
    });
  };

  const onDrag = () => {
    const at = x.get();
    const side: Side | null = at > threshold ? 'start' : at < -threshold ? 'end' : null;
    if (side !== armed) {
      setArmed(side);
      // A small tap where phones allow it, the moment it arms.
      if (side) navigator.vibrate?.(8);
    }
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    setDragging(false);
    if (armed) commit(armed, info.velocity.x);
    else void animate(x, 0, SNAP);
  };

  return (
    <motion.div
      ref={row}
      className={className}
      initial={false}
      animate={gone ? { height: 0, opacity: 0, filter: 'blur(4px)' } : { height: 'auto' }}
      transition={reduced ? { duration: 0 } : { duration: 0.32, ease: EASE }}
      onAnimationComplete={() => {
        if (gone && fired.current) {
          const action = fired.current;
          fired.current = null;
          action.onAction?.();
        }
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setNear(true);
      }}
      onPointerLeave={() => setNear(false)}
      onFocus={() => setNear(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setNear(false);
      }}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
    >
      {start ? (
        <Under
          side="start"
          action={start}
          x={x}
          armed={armed === 'start'}
          threshold={threshold}
          reduced={reduced}
        />
      ) : null}
      {end ? (
        <Under
          side="end"
          action={end}
          x={x}
          armed={armed === 'end'}
          threshold={threshold}
          reduced={reduced}
        />
      ) : null}
      <motion.div
        drag={gone ? false : 'x'}
        dragDirectionLock
        dragMomentum={false}
        // A side with no action barely gives.
        dragConstraints={{ ...(end ? {} : { left: 0 }), ...(start ? {} : { right: 0 }) }}
        dragElastic={0.08}
        onDragStart={() => setDragging(true)}
        onDrag={onDrag}
        onDragEnd={onDragEnd}
        tabIndex={0}
        style={{
          x,
          position: 'relative',
          background: surface,
          touchAction: 'pan-y',
          cursor: 'grab',
        }}
      >
        {children}
        <AnimatePresence>
          {near && !gone && !dragging && !armed ? (
            <motion.div
              initial={{ opacity: 0, x: 6, filter: 'blur(4px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 6, filter: 'blur(4px)', transition: { duration: 0.12 } }}
              transition={{ duration: 0.2, ease: EASE }}
              style={{
                position: 'absolute',
                top: '50%',
                right: 10,
                translate: '0 -50%',
                display: 'flex',
                gap: 4,
                padding: 3,
                borderRadius: 10,
                background: `color-mix(in srgb, ${surface} 92%, currentColor)`,
                boxShadow: `0 0 0 1px color-mix(in srgb, currentColor 10%, transparent), 0 0 18px 10px ${surface}`,
              }}
            >
              {[start && (['start', start] as const), end && (['end', end] as const)]
                .filter((entry) => Boolean(entry))
                .map((entry) => {
                  const [side, action] = entry as readonly [Side, SwipeAction];
                  return (
                    <button
                      key={side}
                      type="button"
                      aria-label={action.label}
                      title={action.label}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => commit(side)}
                      style={{
                        display: 'grid',
                        placeItems: 'center',
                        width: 28,
                        height: 28,
                        padding: 0,
                        border: 0,
                        borderRadius: 7,
                        background: 'none',
                        color: action.tone,
                        cursor: 'pointer',
                      }}
                    >
                      {action.icon ?? (
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{action.label[0]}</span>
                      )}
                    </button>
                  );
                })}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/**
 * The action under the row. Faint while you drag toward it; armed, it floods with colour and its
 * icon jumps, then rides the row's edge so it is always just beside your finger.
 */
function Under({
  side,
  action,
  x,
  armed,
  threshold,
  reduced,
}: {
  side: Side;
  action: SwipeAction;
  x: MotionValue<number>;
  armed: boolean;
  threshold: number;
  reduced: boolean;
}) {
  const sign = side === 'start' ? 1 : -1;
  const shown = useTransform(x, (v) => (v * sign > 0 ? 1 : 0));
  const appear = useTransform(x, (v) => Math.min(Math.max((v * sign) / (threshold * 0.6), 0), 1));
  // Past the line the label follows the edge; before it, it waits in place.
  const ride = useTransform(x, (v) => sign * Math.max(0, v * sign - threshold));
  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: side === 'start' ? 'flex-start' : 'flex-end',
        padding: '0 22px',
        opacity: shown,
        backgroundColor: armed
          ? action.tone
          : `color-mix(in srgb, ${action.tone} 16%, transparent)`,
        color: armed ? '#fff' : action.tone,
        transition: 'background-color 180ms ease, color 180ms ease',
      }}
    >
      <motion.span
        style={{ x: ride, opacity: appear, display: 'inline-flex', alignItems: 'center', gap: 8 }}
      >
        <motion.span
          animate={{ scale: armed ? 1.12 : 0.88 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 600, damping: 18 }}
          style={{ display: 'grid', placeItems: 'center' }}
        >
          {action.icon}
        </motion.span>
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em' }}>
          {action.label}
        </span>
      </motion.span>
    </motion.div>
  );
}
