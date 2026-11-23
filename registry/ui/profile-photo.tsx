'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from 'react';

export interface SavedPhoto {
  /** The cropped square, ready to upload. */
  blob: Blob;
  /** Its side, in pixels. */
  size: number;
}

export interface ProfilePhotoHandle {
  /** Opens the cropper on a file, a blob or an image URL, such as a sample photo. */
  edit: (source: File | Blob | string) => void;
}

export interface ProfilePhotoProps {
  /** Whose photo it is. Their initials stand in until there is one. */
  name: string;
  /** The photo they have now, if any. */
  src?: string;
  /** The line beside the title while nothing is happening. */
  description?: string;
  /**
   * Called with the cropped square when Save is pressed. Return a promise to show the upload while
   * it runs; if it rejects, the old photo comes back.
   */
  onSave?: (photo: SavedPhoto) => void | Promise<void>;
  /** Called when Remove is pressed. Without it there is no Remove button. */
  onRemove?: () => void | Promise<void>;
  /** The side of the saved square, in pixels. Default 400. */
  size?: number;
  /** A photo shorter than this on its short side gets a note that it may look soft. Default 400. */
  minSide?: number;
  /** MIME types the picker offers and a drop accepts. Default PNG, JPG and WebP. */
  accept?: string;
  /** Lets a parent open the cropper itself, on a sample photo for instance. */
  ref?: Ref<ProfilePhotoHandle>;
  className?: string;
  style?: CSSProperties;
}

// Lilt's blur fade: things sharpen in out of a 10px blur and leave faster than they came.
const EASE = [0.22, 1, 0.36, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;
const IN = 0.32;
const OUT = 0.17;
const BLUR = 'blur(10px)';
const SHARP = 'blur(0px)';

/** The circle's diameter as a share of the stage, the closest it zooms, and the preview sizes. */
const CIRCLE = 0.75;
const ZOOM_MAX = 4;
const PREVIEWS = [56, 40, 28] as const;

const KINDS: Partial<Record<string, string>> = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/gif': 'GIF',
  'image/avif': 'AVIF',
  'image/heic': 'HEIC',
  'image/svg+xml': 'SVG',
  'application/pdf': 'PDF',
};

/** A file type in words: 'JPG', 'Word', or '' when there is no good name for it. */
function kindOf(type: string) {
  const known = KINDS[type];
  if (known) return known;
  if (type.includes('word')) return 'Word';
  if (type.startsWith('video/')) return 'Video';
  if (type.startsWith('text/')) return 'Text';
  return '';
}

/** 'PNG, JPG or WebP' for the default accept list. */
function listKinds(accept: string) {
  const kinds = [
    ...new Set(
      accept
        .split(',')
        .map((rule) => rule.trim())
        .filter(Boolean)
        .map((rule) => (rule.endsWith('/*') ? 'image' : (KINDS[rule] ?? rule))),
    ),
  ];
  return kinds.length > 1
    ? `${kinds.slice(0, -1).join(', ')} or ${kinds.at(-1)}`
    : (kinds[0] ?? 'image');
}

/** Whether a MIME type is on the accept list. An empty type, hidden by some browsers mid-drag, passes. */
function accepts(accept: string, type: string) {
  if (!type) return true;
  return accept
    .split(',')
    .map((rule) => rule.trim().toLowerCase())
    .some((rule) => rule === type || (rule.endsWith('/*') && type.startsWith(rule.slice(0, -1))));
}

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';

interface DragRead {
  ok: boolean;
  title: string;
  detail: string;
}

/**
 * What a drag holds, said before the drop. Mid-drag a browser shares how many files there are and
 * their types, never their names or sizes, so that is all this claims.
 */
function readDrag(items: ArrayLike<{ kind: string; type: string }>, accept: string): DragRead {
  const files = Array.from(items).filter((item) => item.kind === 'file');
  const first = files[0];
  const kinds = listKinds(accept);
  if (!first) return { ok: false, title: 'Only a photo goes here', detail: `Drop a ${kinds}.` };
  if (!accepts(accept, first.type)) {
    const kind = kindOf(first.type);
    return {
      ok: false,
      title: `${kind ? `${kind} files` : 'Those files'} won’t work here`,
      detail: `Use a ${kinds} photo instead.`,
    };
  }
  if (files.length > 1)
    return {
      ok: true,
      title: 'Drop to use the first photo',
      detail: `${files.length} files. Let go and the first one opens here.`,
    };
  const kind = first.type ? `${kindOf(first.type) || 'image'} image` : 'image';
  return {
    ok: true,
    title: 'Drop to use this photo',
    detail: `1 ${kind}. Let go to crop it here.`,
  };
}

interface Draft {
  url: string;
  image: HTMLImageElement;
  width: number;
  height: number;
  type: string;
  label: string;
  /** Whether the URL is an object URL this component made, and so must let go of. */
  owned: boolean;
}

/** The photo's place under the circle: x and y are its offset from the circle's centre, in diameters. */
interface View {
  zoom: number;
  x: number;
  y: number;
  turns: number;
}

/** Opens with the photo filling the stage, which reads as 100%; zoom 1 only just covers the circle. */
const START: View = { zoom: 1 / CIRCLE, x: 0, y: 0, turns: 0 };
const percent = (zoom: number) => `${Math.round(zoom * CIRCLE * 100)}%`;

/** Keeps the zoom in range and the circle covered, whichever way the photo is turned. */
function settle(view: View, width: number, height: number): View {
  const zoom = Math.min(ZOOM_MAX, Math.max(1, view.zoom));
  const short = Math.min(width, height);
  const [wide, tall] = view.turns % 2 ? [height, width] : [width, height];
  const spanX = ((wide / short) * zoom - 1) / 2;
  const spanY = ((tall / short) * zoom - 1) / 2;
  return {
    ...view,
    zoom,
    x: Math.min(spanX, Math.max(-spanX, view.x)),
    y: Math.min(spanY, Math.max(-spanY, view.y)),
  };
}

/** Zooms about the circle's centre, so the face under it stays under it. */
function zoomed(view: View, zoom: number): View {
  const next = Math.min(ZOOM_MAX, Math.max(1, zoom));
  const ratio = next / view.zoom;
  return { ...view, zoom: next, x: view.x * ratio, y: view.y * ratio };
}

function load(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    if (/^https?:\/\//i.test(url) && new URL(url).origin !== window.location.origin)
      image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unreadable image'));
    image.src = url;
  });
}

const typeOfUrl = (url: string) =>
  /\.png($|\?)/i.test(url) ? 'image/png' : /\.webp($|\?)/i.test(url) ? 'image/webp' : 'image/jpeg';

/** Draws exactly what the circle shows into a square of `size` pixels. */
function crop(draft: Draft, view: View, size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new Error('No 2D canvas'));
  const type =
    draft.type === 'image/png' || draft.type === 'image/webp' ? draft.type : 'image/jpeg';
  if (type === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size, size);
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  const scale = (size / Math.min(draft.width, draft.height)) * view.zoom;
  context.translate(size / 2 + view.x * size, size / 2 + view.y * size);
  context.rotate((view.turns * Math.PI) / 2);
  context.drawImage(
    draft.image,
    (-draft.width * scale) / 2,
    (-draft.height * scale) / 2,
    draft.width * scale,
    draft.height * scale,
  );
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not export the photo'))),
      type,
      0.92,
    ),
  );
}

type Status =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; text: string };

/**
 * A profile photo you upload, crop and save in one place, without a modal. Drop a photo on the
 * circle and the row opens into a cropper: inside the circle the photo stays sharp, outside it
 * blurs and fades back, and live previews show it at the sizes people will see. Saving folds it
 * back into the row, where the new photo sharpens in out of a blur.
 */
export function ProfilePhoto({
  name,
  src,
  description = 'Shown on your profile and comments',
  onSave,
  onRemove,
  size = 400,
  minSide = 400,
  accept = 'image/png,image/jpeg,image/webp',
  ref,
  className,
  style,
}: ProfilePhotoProps) {
  const reduced = Boolean(useReducedMotion());
  const [photo, setPhoto] = useState(src);
  const [seenSrc, setSeenSrc] = useState(src);
  // Only a change the person makes lands with the blur, not a parent swapping in the uploaded URL.
  const [version, setVersion] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [drag, setDrag] = useState<DragRead | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [fresh, setFresh] = useState(false);
  const [spoken, setSpoken] = useState('');

  const input = useRef<HTMLInputElement>(null);
  const avatar = useRef<HTMLButtonElement>(null);
  const depth = useRef(0);
  const owned = useRef(new Set<string>());
  const latest = useRef({ photo, draft, onSave, onRemove });
  latest.current = { photo, draft, onSave, onRemove };

  if (src !== seenSrc) {
    setSeenSrc(src);
    setPhoto(src);
  }

  const own = useCallback((url: string) => {
    owned.current.add(url);
    return url;
  }, []);
  // Object URLs this made are let go once whatever showed them has finished leaving.
  const retire = useCallback((url: string | undefined) => {
    if (!url || !owned.current.has(url)) return;
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
      owned.current.delete(url);
    }, 1000);
  }, []);
  useEffect(
    () => () => {
      for (const url of owned.current) URL.revokeObjectURL(url);
    },
    [],
  );

  useEffect(() => {
    if (status.kind !== 'saved' && status.kind !== 'error') return;
    const timer = window.setTimeout(
      () => setStatus({ kind: 'idle' }),
      status.kind === 'saved' ? 3200 : 5200,
    );
    return () => window.clearTimeout(timer);
  }, [status]);

  const open = useCallback(
    async (source: File | Blob | string) => {
      depth.current = 0;
      setDrag(null);
      const isUrl = typeof source === 'string';
      if (!isUrl && source.type && !accepts(accept, source.type)) {
        const kind = kindOf(source.type);
        setStatus({
          kind: 'error',
          text: `${kind ? `${kind} files` : 'Those files'} won’t work. Use ${listKinds(accept)}.`,
        });
        return;
      }
      const url = isUrl ? source : own(URL.createObjectURL(source));
      try {
        const image = await load(url);
        const previous = latest.current.draft;
        if (previous?.owned) retire(previous.url);
        setDraft({
          url,
          image,
          width: image.naturalWidth,
          height: image.naturalHeight,
          type: isUrl ? typeOfUrl(source) : source.type || 'image/jpeg',
          label: isUrl
            ? source.split('/').pop()?.split('?')[0] || 'photo'
            : source instanceof File
              ? source.name
              : 'photo',
          owned: !isUrl,
        });
        setStatus({ kind: 'idle' });
        setFresh(false);
        setSpoken('Photo open to crop. Drag or use the arrow keys to place it.');
      } catch {
        if (!isUrl) retire(url);
        setStatus({ kind: 'error', text: 'That file couldn’t be opened as a photo.' });
      }
    },
    [accept, own, retire],
  );

  useImperativeHandle(ref, () => ({ edit: (source) => void open(source) }), [open]);

  const close = () => {
    const current = latest.current.draft;
    if (current?.owned) retire(current.url);
    setDraft(null);
    window.setTimeout(() => avatar.current?.focus({ preventScroll: true }), 0);
  };

  const commit = async (blob: Blob) => {
    const before = latest.current.photo;
    const url = own(URL.createObjectURL(blob));
    close();
    setPhoto(url);
    setVersion((n) => n + 1);
    setFresh(true);
    setStatus({ kind: 'saving' });
    setSpoken('Uploading your photo.');
    try {
      await latest.current.onSave?.({ blob, size });
      setStatus({ kind: 'saved' });
      setSpoken('Photo saved.');
      retire(before);
    } catch {
      setPhoto(before);
      setVersion((n) => n + 1);
      setFresh(false);
      retire(url);
      setStatus({ kind: 'error', text: 'That didn’t save, so your old photo is back.' });
      setSpoken('That didn’t save, so your old photo is back.');
    }
  };

  const remove = async () => {
    const before = latest.current.photo;
    setPhoto(undefined);
    setVersion((n) => n + 1);
    setFresh(false);
    try {
      await latest.current.onRemove?.();
      setSpoken('Photo removed.');
      retire(before);
    } catch {
      setPhoto(before);
      setVersion((n) => n + 1);
      setStatus({ kind: 'error', text: 'That didn’t remove the photo. Try again.' });
    }
  };

  const pick = () => input.current?.click();

  // The whole component takes a drop; the circle is where it shows.
  const carriesFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes('Files');
  const dragHandlers = {
    onDragEnter: (event: DragEvent<HTMLDivElement>) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth.current += 1;
      setDrag(readDrag(event.dataTransfer.items, accept));
    },
    onDragOver: (event: DragEvent<HTMLDivElement>) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = drag && !drag.ok ? 'none' : 'copy';
    },
    onDragLeave: (event: DragEvent<HTMLDivElement>) => {
      if (!carriesFiles(event)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDrag(null);
    },
    onDrop: (event: DragEvent<HTMLDivElement>) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      depth.current = 0;
      setDrag(null);
      if (file) void open(file);
    },
  };

  const soft = draft ? Math.min(draft.width, draft.height) < minSide : false;
  const head: { key: string; node: ReactNode } = draft
    ? soft
      ? {
          key: `soft-${draft.url}`,
          node: (
            <>
              <AlertIcon tone="warn" />
              {`Small photo, ${draft.width} × ${draft.height}. It may look soft.`}
            </>
          ),
        }
      : { key: `file-${draft.url}`, node: `${draft.label} · ${draft.width} × ${draft.height}` }
    : status.kind === 'saving'
      ? {
          key: 'saving',
          node: (
            <>
              <RingIcon reduced={reduced} />
              Uploading…
            </>
          ),
        }
      : status.kind === 'saved'
        ? {
            key: 'saved',
            node: (
              <>
                <TickIcon reduced={reduced} />
                Saved just now
              </>
            ),
          }
        : status.kind === 'error'
          ? {
              key: `error-${status.text}`,
              node: (
                <>
                  <AlertIcon tone="error" />
                  {status.text}
                </>
              ),
            }
          : { key: 'idle', node: description };

  const copy = drag
    ? { key: `drag-${drag.title}-${drag.detail}`, title: drag.title, detail: drag.detail }
    : photo
      ? fresh
        ? { key: 'fresh', title: name, detail: `Updated just now · ${size} × ${size}` }
        : { key: 'photo', title: name, detail: 'Drop a new photo on the circle to change it.' }
      : {
          key: 'empty',
          title: 'Add a photo',
          detail: `${listKinds(accept)}, at least ${minSide} × ${minSide}. Drop one on the circle or choose a file.`,
        };

  return (
    <>
      <style href="lilt-ui-profile-photo" precedence="default">
        {css}
      </style>
      <div
        className={['lilt-pph', className].filter(Boolean).join(' ')}
        style={style}
        {...dragHandlers}
      >
        <div className="lilt-pph-head">
          <span className="lilt-pph-heading">Profile photo</span>
          <Swap id={head.key} reduced={reduced} className="lilt-pph-status">
            {head.node}
          </Swap>
        </div>

        <div className="lilt-pph-card">
          <AnimatePresence initial={false}>
            {draft ? (
              <Fold key={`crop-${draft.url}`} reduced={reduced}>
                <Cropper
                  draft={draft}
                  name={name}
                  size={size}
                  reduced={reduced}
                  onCancel={close}
                  onSave={(blob) => void commit(blob)}
                  onFail={(text) => setStatus({ kind: 'error', text })}
                />
              </Fold>
            ) : (
              <Fold key="row" reduced={reduced}>
                <div className="lilt-pph-row">
                  <button
                    ref={avatar}
                    type="button"
                    className="lilt-pph-avatar"
                    data-over={drag ? (drag.ok ? 'ok' : 'no') : undefined}
                    onClick={pick}
                    aria-label={photo ? 'Change your photo' : 'Add a photo'}
                  >
                    <AnimatePresence initial={false}>
                      <motion.span
                        key={version}
                        className="lilt-pph-face"
                        initial={reduced ? { opacity: 0 } : { opacity: 0, filter: BLUR }}
                        animate={{
                          opacity: 1,
                          filter: SHARP,
                          transition: { duration: reduced ? 0.12 : IN, ease: EASE },
                        }}
                        exit={
                          reduced
                            ? { opacity: 0, transition: { duration: 0.1 } }
                            : {
                                opacity: 0,
                                filter: BLUR,
                                transition: { duration: OUT, ease: EASE_IN },
                              }
                        }
                      >
                        {photo ? (
                          <img src={photo} alt="" draggable={false} />
                        ) : (
                          <span className="lilt-pph-initials">{initialsOf(name)}</span>
                        )}
                      </motion.span>
                    </AnimatePresence>
                    {photo ? (
                      <span className="lilt-pph-lens" aria-hidden="true">
                        <CameraIcon />
                      </span>
                    ) : null}
                    <AnimatePresence>
                      {drag ? (
                        <motion.span
                          key={drag.ok ? 'ok' : 'no'}
                          className="lilt-pph-over"
                          data-no={drag.ok ? undefined : ''}
                          initial={reduced ? { opacity: 0 } : { opacity: 0, filter: 'blur(6px)' }}
                          animate={{
                            opacity: 1,
                            filter: SHARP,
                            transition: { duration: 0.2, ease: EASE },
                          }}
                          exit={{ opacity: 0, transition: { duration: 0.14, ease: EASE_IN } }}
                          aria-hidden="true"
                        >
                          {drag.ok ? <DropIcon /> : <NoIcon />}
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </button>

                  <Swap id={copy.key} reduced={reduced} className="lilt-pph-copy">
                    <span className="lilt-pph-title">{copy.title}</span>
                    <span className="lilt-pph-detail">{copy.detail}</span>
                  </Swap>

                  <div className="lilt-pph-actions" data-dim={drag ? '' : undefined}>
                    {photo ? (
                      <>
                        <button type="button" className="lilt-pph-btn" onClick={pick}>
                          Change
                        </button>
                        {onRemove ? (
                          <button
                            type="button"
                            className="lilt-pph-btn lilt-pph-btn--ghost"
                            onClick={() => void remove()}
                          >
                            Remove
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <button
                        type="button"
                        className="lilt-pph-btn lilt-pph-btn--ink"
                        onClick={pick}
                      >
                        <UploadIcon />
                        Upload
                      </button>
                    )}
                  </div>
                </div>
              </Fold>
            )}
          </AnimatePresence>
        </div>

        <input
          ref={input}
          type="file"
          accept={accept}
          hidden
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void open(file);
          }}
        />
        <span className="lilt-pph-sr" aria-live="polite">
          {spoken}
        </span>
      </div>
    </>
  );
}

/** One side of the row/cropper swap: it folds open as it sharpens in, and closes as it blurs out. */
function Fold({ children, reduced }: { children: ReactNode; reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0, filter: BLUR }}
      animate={{
        height: 'auto',
        opacity: 1,
        filter: SHARP,
        transition: reduced
          ? { duration: 0.12 }
          : { height: { duration: 0.42, ease: EASE }, default: { duration: IN, ease: EASE } },
      }}
      exit={
        reduced
          ? { opacity: 0, height: 0, transition: { duration: 0.1 } }
          : { height: 0, opacity: 0, filter: BLUR, transition: { duration: OUT, ease: EASE_IN } }
      }
      style={{ overflow: 'hidden' }}
    >
      {children}
    </motion.div>
  );
}

/** Text that rolls up out of a blur when it changes, the way every Lilt label does. */
function Swap({
  id,
  reduced,
  className,
  children,
}: {
  id: string;
  reduced: boolean;
  className: string;
  children: ReactNode;
}) {
  return (
    <span className={className}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={id}
          className={`${className}-line`}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: SHARP }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8, filter: 'blur(4px)' }}
          transition={{ duration: reduced ? 0.12 : 0.24, ease: EASE }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** The photo, placed by the view, for a circle of `circle` pixels: the stage's or a preview's. */
function Layer({
  draft,
  view,
  circle,
  className,
}: {
  draft: Draft;
  view: View;
  circle: number;
  className?: string;
}) {
  const base = circle / Math.min(draft.width, draft.height);
  return (
    <img
      src={draft.url}
      alt=""
      draggable={false}
      className={['lilt-pph-layer', className].filter(Boolean).join(' ')}
      style={{
        width: draft.width * base,
        height: draft.height * base,
        transform: `translate(-50%, -50%) translate(${view.x * circle}px, ${view.y * circle}px) rotate(${view.turns * 90}deg) scale(${view.zoom})`,
      }}
    />
  );
}

function Cropper({
  draft,
  name,
  size,
  reduced,
  onCancel,
  onSave,
  onFail,
}: {
  draft: Draft;
  name: string;
  size: number;
  reduced: boolean;
  onCancel: () => void;
  onSave: (blob: Blob) => void;
  onFail: (text: string) => void;
}) {
  const zoomId = useId();
  const stage = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState(320);
  const [view, setView] = useState<View>(START);
  const [live, setLive] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const circle = side * CIRCLE;
  const { width, height } = draft;

  const adjust = useCallback(
    (change: (view: View) => View) => setView((current) => settle(change(current), width, height)),
    [width, height],
  );

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSide(entry.contentRect.width);
    });
    observer.observe(element);
    element.focus({ preventScroll: true });
    return () => observer.disconnect();
  }, []);

  // Wheel zoom needs a listener that may stop the page scrolling, which React's may not.
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    let rest = 0;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setTouched(true);
      setLive(true);
      window.clearTimeout(rest);
      rest = window.setTimeout(() => setLive(false), 160);
      adjust((current) => zoomed(current, current.zoom * Math.exp(-event.deltaY * 0.0015)));
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      element.removeEventListener('wheel', onWheel);
      window.clearTimeout(rest);
    };
  }, [adjust]);

  const spread = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) pinch.current = { distance: spread(), zoom: view.zoom };
    setLive(true);
    setTouched(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const last = pointers.current.get(event.pointerId);
    if (!last) return;
    const next = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, next);
    if (pointers.current.size === 1) {
      adjust((current) => ({
        ...current,
        x: current.x + (next.x - last.x) / circle,
        y: current.y + (next.y - last.y) / circle,
      }));
    } else if (pinch.current && pinch.current.distance > 0) {
      const { distance, zoom } = pinch.current;
      adjust((current) => zoomed(current, (zoom * spread()) / distance));
    }
  };
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) setLive(false);
  };

  // A quarter turn clockwise, carrying the offset round with it so the same face stays centred.
  const rotate = () => {
    setTouched(true);
    adjust((current) => ({ ...current, turns: current.turns + 1, x: -current.y, y: current.x }));
  };

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      onSave(await crop(draft, view, size));
    } catch {
      setBusy(false);
      onFail('That photo couldn’t be cropped here. Try saving it first.');
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = (event.shiftKey ? 16 : 4) / circle;
    const moves: Partial<Record<string, [number, number]>> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (move) adjust((current) => ({ ...current, x: current.x + move[0], y: current.y + move[1] }));
    else if (event.key === '+' || event.key === '=')
      adjust((current) => zoomed(current, current.zoom * 1.1));
    else if (event.key === '-' || event.key === '_')
      adjust((current) => zoomed(current, current.zoom / 1.1));
    else if (event.key === 'r' || event.key === 'R') rotate();
    else if (event.key === 'Enter') void save();
    else return;
    event.preventDefault();
    setTouched(true);
  };

  return (
    <div
      className="lilt-pph-crop"
      data-live={live ? '' : undefined}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        onCancel();
      }}
    >
      <div
        ref={stage}
        className="lilt-pph-stage"
        tabIndex={0}
        aria-label="Photo position. Drag, or use the arrow keys, to move it. Plus and minus zoom, R turns it, Enter saves and Escape cancels."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
      >
        <Layer draft={draft} view={view} circle={circle} className="lilt-pph-outside" />
        <span className="lilt-pph-veil" aria-hidden="true" />
        <span className="lilt-pph-keep" aria-hidden="true">
          <Layer draft={draft} view={view} circle={circle} />
        </span>
        <span className="lilt-pph-ring" aria-hidden="true">
          <span className="lilt-pph-thirds" />
        </span>
        <AnimatePresence>
          {touched ? null : (
            <motion.span
              key="hint"
              className="lilt-pph-hint"
              aria-hidden="true"
              initial={false}
              exit={
                reduced
                  ? { opacity: 0, transition: { duration: 0.1 } }
                  : {
                      opacity: 0,
                      filter: 'blur(6px)',
                      transition: { duration: OUT, ease: EASE_IN },
                    }
              }
            >
              <MoveIcon />
              Drag to move
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="lilt-pph-side">
        <div className="lilt-pph-group">
          <span className="lilt-pph-label">Preview</span>
          <div className="lilt-pph-sizes">
            {PREVIEWS.map((preview) => (
              <span
                key={preview}
                className="lilt-pph-mini"
                style={{ width: preview, height: preview }}
              >
                <Layer draft={draft} view={view} circle={preview} />
              </span>
            ))}
          </div>
          <span className="lilt-pph-context">
            <span className="lilt-pph-mini" style={{ width: 20, height: 20 }}>
              <Layer draft={draft} view={view} circle={20} />
            </span>
            <span className="lilt-pph-who">{name}</span>
          </span>
        </div>

        <div className="lilt-pph-group">
          <label className="lilt-pph-meter" htmlFor={zoomId}>
            <span>Zoom</span>
            <span className="lilt-pph-value">{percent(view.zoom)}</span>
          </label>
          <input
            id={zoomId}
            className="lilt-pph-zoom"
            type="range"
            min={1}
            max={ZOOM_MAX}
            step={0.01}
            value={view.zoom}
            aria-valuetext={percent(view.zoom)}
            onPointerDown={() => setLive(true)}
            onPointerUp={() => setLive(false)}
            onChange={(event) => {
              setTouched(true);
              const next = Number(event.target.value);
              adjust((current) => zoomed(current, next));
            }}
            style={
              { '--pph-fill': `${((view.zoom - 1) / (ZOOM_MAX - 1)) * 100}%` } as CSSProperties
            }
          />
          <button type="button" className="lilt-pph-btn lilt-pph-btn--small" onClick={rotate}>
            <RotateIcon />
            Rotate
          </button>
        </div>

        <div className="lilt-pph-decide">
          <button type="button" className="lilt-pph-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="lilt-pph-btn lilt-pph-btn--ink"
            onClick={() => void save()}
            disabled={busy}
          >
            Save photo
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Icons ---------- */

const line = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function UploadIcon() {
  return (
    <svg aria-hidden="true" width={14} height={14} viewBox="0 0 24 24" strokeWidth={2} {...line}>
      <path d="M12 15V4.5M7.5 9 12 4.5 16.5 9" />
      <path d="M4.5 14.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function DropIcon() {
  return (
    <svg aria-hidden="true" width={22} height={22} viewBox="0 0 24 24" strokeWidth={1.9} {...line}>
      <path d="M12 4.5V16M7 11l5 5 5-5" />
    </svg>
  );
}

function NoIcon() {
  return (
    <svg aria-hidden="true" width={20} height={20} viewBox="0 0 14 14" strokeWidth={1.3} {...line}>
      <circle cx="7" cy="7" r="5.4" />
      <path d="M3.2 10.8l7.6-7.6" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg aria-hidden="true" width={18} height={18} viewBox="0 0 24 24" strokeWidth={1.8} {...line}>
      <path d="M4.5 8.5A2 2 0 0 1 6.5 6.5h1.6l1.4-2h5l1.4 2h1.6a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2Z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </svg>
  );
}

function MoveIcon() {
  return (
    <svg aria-hidden="true" width={12} height={12} viewBox="0 0 24 24" strokeWidth={2.2} {...line}>
      <path d="M12 3v18M3 12h18M12 3 9 6M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" />
    </svg>
  );
}

function RotateIcon() {
  return (
    <svg aria-hidden="true" width={14} height={14} viewBox="0 0 24 24" strokeWidth={2} {...line}>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4.5v4h-4" />
    </svg>
  );
}

/** Done: a tick that draws itself, in the status colour. */
function TickIcon({ reduced }: { reduced: boolean }) {
  return (
    <svg aria-hidden="true" width={12} height={12} viewBox="0 0 14 14" className="lilt-pph-ico">
      <motion.path
        d="M3 7.2 5.8 10 11 4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: reduced ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.34, delay: 0.06, ease: [0.65, 0, 0.35, 1] }}
      />
    </svg>
  );
}

/** Under way: a dashed ring that turns. */
function RingIcon({ reduced }: { reduced: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width={12}
      height={12}
      viewBox="0 0 14 14"
      className={reduced ? 'lilt-pph-ico' : 'lilt-pph-ico lilt-pph-spin'}
    >
      <circle
        cx="7"
        cy="7"
        r="5.4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeDasharray="2.4 3.25"
      />
    </svg>
  );
}

function AlertIcon({ tone }: { tone: 'warn' | 'error' }) {
  return (
    <svg
      aria-hidden="true"
      width={12}
      height={12}
      viewBox="0 0 14 14"
      className="lilt-pph-ico"
      data-tone={tone}
      strokeWidth={1.4}
      {...line}
    >
      <circle cx="7" cy="7" r="5.6" />
      <path d="M7 4.2v3.3M7 9.8h.01" />
    </svg>
  );
}

const css = /* css */ `
.lilt-pph {
  --pph-plinth: #f4f4f2;
  --pph-edge: rgb(26 26 24 / 0.08);
  --pph-card: #ffffff;
  --pph-line: rgb(26 26 24 / 0.08);
  --pph-ink: #1a1a18;
  --pph-on-ink: #ffffff;
  --pph-muted: #6b6b66;
  --pph-faint: #8c8c87;
  --pph-chip: #44443f;
  --pph-well: #f4f4f2;
  --pph-well-hover: #ededea;
  --pph-stage: #e9e9e6;
  --pph-veil: rgb(250 250 248 / 0.46);
  --pph-track: rgb(26 26 24 / 0.14);
  --pph-thumb: #ffffff;
  --pph-thumb-edge: rgb(26 26 24 / 0.16);
  --pph-hint: rgb(255 255 255 / 0.94);
  --pph-accent: #7c5cff;
  --pph-warn: #c2701c;
  --pph-error: #d93848;
  --pph-ease: cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
  box-sizing: border-box;
  /* A real width, so a parent that sizes to its content gets the whole row rather than a squeeze. */
  width: 560px;
  max-width: 100%;
  padding: 6px;
  border: 1px solid var(--pph-edge);
  border-radius: 16px;
  background: var(--pph-plinth);
  color: var(--pph-ink);
  -webkit-font-smoothing: antialiased;
}
:where(.dark, [data-theme="dark"]) .lilt-pph {
  --pph-plinth: #1c1c1a;
  --pph-edge: rgb(244 244 242 / 0.11);
  --pph-card: #111110;
  --pph-line: rgb(244 244 242 / 0.08);
  --pph-ink: #f4f4f2;
  --pph-on-ink: #0b0b0c;
  --pph-muted: #a3a39d;
  --pph-faint: #73736e;
  --pph-chip: #c9c9c4;
  --pph-well: #1f1f1d;
  --pph-well-hover: #262624;
  --pph-stage: #1b1b19;
  --pph-veil: rgb(17 17 16 / 0.52);
  --pph-track: rgb(244 244 242 / 0.16);
  --pph-thumb: #f4f4f2;
  --pph-thumb-edge: rgb(0 0 0 / 0.4);
  --pph-hint: rgb(28 28 26 / 0.94);
  --pph-accent: #9a82ff;
  --pph-warn: #e7a04f;
  --pph-error: #f05d6c;
}
[data-theme="light"] .lilt-pph {
  --pph-plinth: #f4f4f2;
  --pph-edge: rgb(26 26 24 / 0.08);
  --pph-card: #ffffff;
  --pph-line: rgb(26 26 24 / 0.08);
  --pph-ink: #1a1a18;
  --pph-on-ink: #ffffff;
  --pph-muted: #6b6b66;
  --pph-faint: #8c8c87;
  --pph-chip: #44443f;
  --pph-well: #f4f4f2;
  --pph-well-hover: #ededea;
  --pph-stage: #e9e9e6;
  --pph-veil: rgb(250 250 248 / 0.46);
  --pph-track: rgb(26 26 24 / 0.14);
  --pph-thumb: #ffffff;
  --pph-thumb-edge: rgb(26 26 24 / 0.16);
  --pph-hint: rgb(255 255 255 / 0.94);
  --pph-accent: #7c5cff;
  --pph-warn: #c2701c;
  --pph-error: #d93848;
}
.lilt-pph *, .lilt-pph *::before, .lilt-pph *::after { box-sizing: border-box; }

/* ---------- head ---------- */
.lilt-pph-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 34px;
  padding: 6px 8px 8px 10px;
}
.lilt-pph-heading {
  flex: none;
  font-size: 13.5px;
  font-weight: 500;
  line-height: 20px;
  letter-spacing: -0.015em;
}
.lilt-pph-status {
  position: relative;
  display: grid;
  justify-items: end;
  min-width: 0;
  overflow: hidden;
  color: var(--pph-faint);
  font-size: 12px;
  line-height: 16px;
}
.lilt-pph-status-line {
  grid-area: 1 / 1;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.lilt-pph-ico { flex: none; color: var(--pph-accent); }
.lilt-pph-ico[data-tone="warn"] { color: var(--pph-warn); }
.lilt-pph-ico[data-tone="error"] { color: var(--pph-error); }
.lilt-pph-spin { transform-origin: center; animation: lilt-pph-spin 1.6s linear infinite; }
@keyframes lilt-pph-spin { to { transform: rotate(360deg); } }

/* ---------- card and row ---------- */
.lilt-pph-card {
  overflow: hidden;
  border: 1px solid var(--pph-line);
  border-radius: 11px;
  background: var(--pph-card);
}
.lilt-pph-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px 18px;
  padding: 18px;
}
.lilt-pph-avatar {
  position: relative;
  flex: none;
  width: 72px;
  height: 72px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  overflow: hidden;
  background: var(--pph-well);
  color: var(--pph-muted);
  font: inherit;
  cursor: pointer;
  transition: background-color 200ms, box-shadow 240ms var(--pph-ease);
}
.lilt-pph-avatar:hover { background: var(--pph-well-hover); }
.lilt-pph-avatar:focus-visible { outline: 2px solid var(--pph-accent); outline-offset: 3px; }
.lilt-pph-avatar[data-over] { box-shadow: 0 0 0 4px var(--pph-line); }
.lilt-pph-face {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}
.lilt-pph-face img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.lilt-pph-initials {
  font-size: 22px;
  font-weight: 500;
  line-height: 28px;
  letter-spacing: -0.02em;
}
.lilt-pph-lens {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgb(20 20 18 / 0.38);
  color: #ffffff;
  opacity: 0;
  transition: opacity 200ms var(--pph-ease);
}
.lilt-pph-avatar:hover .lilt-pph-lens,
.lilt-pph-avatar:focus-visible .lilt-pph-lens { opacity: 1; }
.lilt-pph-avatar[data-over] .lilt-pph-lens { opacity: 0; }
.lilt-pph-over {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--pph-ink);
  color: var(--pph-on-ink);
}
.lilt-pph-over[data-no] { background: var(--pph-well-hover); color: var(--pph-faint); }
.lilt-pph-copy {
  position: relative;
  display: grid;
  flex: 1 1 220px;
  min-width: 0;
  overflow: hidden;
}
.lilt-pph-copy-line {
  grid-area: 1 / 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.lilt-pph-title {
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  letter-spacing: -0.01em;
}
.lilt-pph-detail {
  color: var(--pph-muted);
  font-size: 13px;
  line-height: 19px;
}
.lilt-pph-actions {
  display: flex;
  flex: none;
  gap: 4px;
  transition: opacity 200ms var(--pph-ease);
}
.lilt-pph-actions[data-dim] { opacity: 0.35; pointer-events: none; }

/* ---------- buttons ---------- */
.lilt-pph-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 13px;
  border: 0;
  border-radius: 10px;
  background: var(--pph-well);
  color: var(--pph-chip);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 160ms, color 160ms, transform 160ms var(--pph-ease);
}
.lilt-pph-btn:hover { background: var(--pph-well-hover); }
.lilt-pph-btn:active { transform: scale(0.97); }
.lilt-pph-btn:focus-visible { outline: 2px solid var(--pph-accent); outline-offset: 2px; }
.lilt-pph-btn:disabled { cursor: default; opacity: 0.6; }
.lilt-pph-btn--ink { padding: 0 13px 0 11px; background: var(--pph-ink); color: var(--pph-on-ink); }
.lilt-pph-btn--ink:hover { background: color-mix(in srgb, var(--pph-ink) 86%, var(--pph-card)); }
.lilt-pph-btn--ghost { padding: 0 11px; background: transparent; color: var(--pph-faint); }
.lilt-pph-btn--ghost:hover { background: var(--pph-well); color: var(--pph-chip); }
.lilt-pph-btn--small { align-self: flex-start; height: 30px; padding: 0 10px 0 8px; border-radius: 9px; font-size: 12.5px; }

/* ---------- cropper ---------- */
.lilt-pph-crop {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 14px;
}
.lilt-pph-stage {
  position: relative;
  flex: none;
  width: min(320px, 100%);
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 10px;
  background: var(--pph-stage);
  cursor: grab;
  outline: none;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.lilt-pph-crop[data-live] .lilt-pph-stage { cursor: grabbing; }
.lilt-pph-stage:focus-visible { box-shadow: 0 0 0 2px var(--pph-card), 0 0 0 4px var(--pph-accent); }
.lilt-pph-layer {
  position: absolute;
  left: 50%;
  top: 50%;
  display: block;
  max-width: none;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
  transition: transform 320ms var(--pph-ease);
}
.lilt-pph-crop[data-live] .lilt-pph-layer { transition: none; }
.lilt-pph-outside { filter: blur(10px); }
.lilt-pph-veil {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle closest-side, transparent 75%, var(--pph-veil) calc(75% + 0.5px));
  pointer-events: none;
}
.lilt-pph-keep {
  position: absolute;
  inset: 0;
  clip-path: circle(37.5% at 50% 50%);
  pointer-events: none;
}
.lilt-pph-ring {
  position: absolute;
  left: 12.5%;
  top: 12.5%;
  width: 75%;
  height: 75%;
  overflow: hidden;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1.5px rgb(255 255 255 / 0.92), 0 0 0 1px rgb(26 26 24 / 0.06);
  pointer-events: none;
}
.lilt-pph-thirds {
  position: absolute;
  inset: 0;
  --pph-rule: rgb(255 255 255 / 0.5);
  background:
    linear-gradient(to right, transparent calc(100% / 3 - 0.5px), var(--pph-rule) 0, var(--pph-rule) calc(100% / 3 + 0.5px), transparent 0, transparent calc(200% / 3 - 0.5px), var(--pph-rule) 0, var(--pph-rule) calc(200% / 3 + 0.5px), transparent 0),
    linear-gradient(to bottom, transparent calc(100% / 3 - 0.5px), var(--pph-rule) 0, var(--pph-rule) calc(100% / 3 + 0.5px), transparent 0, transparent calc(200% / 3 - 0.5px), var(--pph-rule) 0, var(--pph-rule) calc(200% / 3 + 0.5px), transparent 0);
  opacity: 0;
  transition: opacity 240ms var(--pph-ease);
}
.lilt-pph-crop[data-live] .lilt-pph-thirds { opacity: 1; }
.lilt-pph-hint {
  position: absolute;
  left: 50%;
  top: calc(93.75% - 13px);
  translate: -50% 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 11px 0 9px;
  border-radius: 13px;
  background: var(--pph-hint);
  box-shadow: 0 0 0 1px var(--pph-line), 0 4px 12px rgb(26 26 24 / 0.08);
  color: var(--pph-muted);
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  white-space: nowrap;
  pointer-events: none;
}
.lilt-pph-side {
  display: flex;
  flex: 1 1 168px;
  flex-direction: column;
  justify-content: space-between;
  gap: 22px;
  min-width: 168px;
  padding-top: 2px;
}
.lilt-pph-group { display: flex; flex-direction: column; gap: 12px; }
.lilt-pph-label {
  color: var(--pph-faint);
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
}
.lilt-pph-sizes { display: flex; align-items: flex-end; gap: 14px; }
.lilt-pph-mini {
  position: relative;
  flex: none;
  overflow: hidden;
  border-radius: 50%;
  background: var(--pph-stage);
}
.lilt-pph-context {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  height: 28px;
  padding: 0 11px 0 4px;
  border-radius: 14px;
  background: var(--pph-well);
  font-size: 12.5px;
  font-weight: 500;
  line-height: 16px;
}
.lilt-pph-who { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.lilt-pph-meter {
  display: flex;
  justify-content: space-between;
  color: var(--pph-faint);
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
}
.lilt-pph-value { color: var(--pph-ink); font-variant-numeric: tabular-nums; }
.lilt-pph-zoom {
  --pph-fill: 0%;
  width: 100%;
  height: 18px;
  margin: -4px 0;
  background: transparent;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}
.lilt-pph-zoom:focus-visible { outline: none; }
.lilt-pph-zoom::-webkit-slider-runnable-track {
  height: 2px;
  border-radius: 1px;
  background: linear-gradient(to right, var(--pph-ink) var(--pph-fill), var(--pph-track) var(--pph-fill));
}
.lilt-pph-zoom::-webkit-slider-thumb {
  width: 16px;
  height: 16px;
  margin-top: -7px;
  border-radius: 50%;
  background: var(--pph-thumb);
  box-shadow: 0 0 0 1px var(--pph-thumb-edge), 0 2px 6px rgb(26 26 24 / 0.14);
  transition: transform 160ms var(--pph-ease);
  appearance: none;
  -webkit-appearance: none;
}
.lilt-pph-zoom:active::-webkit-slider-thumb { transform: scale(1.12); }
.lilt-pph-zoom:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 2px var(--pph-card), 0 0 0 4px var(--pph-accent); }
.lilt-pph-zoom::-moz-range-track { height: 2px; border-radius: 1px; background: var(--pph-track); }
.lilt-pph-zoom::-moz-range-progress { height: 2px; border-radius: 1px; background: var(--pph-ink); }
.lilt-pph-zoom::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: 0;
  border-radius: 50%;
  background: var(--pph-thumb);
  box-shadow: 0 0 0 1px var(--pph-thumb-edge), 0 2px 6px rgb(26 26 24 / 0.14);
}
.lilt-pph-zoom:focus-visible::-moz-range-thumb { box-shadow: 0 0 0 2px var(--pph-card), 0 0 0 4px var(--pph-accent); }
.lilt-pph-decide { display: flex; gap: 6px; }
.lilt-pph-decide .lilt-pph-btn { flex: 1; height: 36px; }

.lilt-pph-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .lilt-pph-spin { animation: none; }
  .lilt-pph-layer, .lilt-pph-thirds, .lilt-pph-lens, .lilt-pph-btn, .lilt-pph-avatar, .lilt-pph-actions { transition: none; }
}
`;
